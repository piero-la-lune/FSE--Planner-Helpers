const AWS = require('aws-sdk');
const Ajv = require("ajv");

AWS.config.update({region: 'eu-west-3'});

var dbb = new AWS.DynamoDB.DocumentClient();

const ajv = new Ajv()

const schema = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["all", "unbuilt", "forsale", "custom", "gps"]
    },
    filters: {
      type: "object",
      properties: {
        size: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 23500 },
          minItems: 2,
          maxItems: 2
        },
        surface: {
          type: "array",
          items: { type: "integer", minimum: 1, maximum: 8 },
          maxItems: 8
        },
        runway: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 30000 },
          minItems: 2,
          maxItems: 2
        },
        onlySim: { type: "boolean" },
        onlyBM: { type: "boolean" },
        onlyILS: { type: "boolean" },
        excludeMilitary: { type: "boolean" },
        price: {
          type: "array",
          items: { type: "integer" },
          minItems: 2,
          maxItems: 2
        }
      },
      required: ["size", "surface", "runway", "price"],
      additionalProperties: false
    },
    display: {
      type: "object",
      properties: {
        name: {
          type: "string",
          maxLength: 60
        },
        color: {
          type: "string",
          pattern: "^#(?:[0-9a-fA-F]{3}){1,2}$"
        },
        size: {
          type: "integer",
          enum: [3, 8, 13, 20, 25]
        },
        desc: {
          type: "string",
          maxLength: 3000
        }
      },
      required: ["name", "color", "size"],
      additionalProperties: false
    },
    data: {
      type: "object",
      properties: {
        icaos: {
          type: "array",
          items: { type: "string", maxLength: 4 },
          maxItems: 10000
        },
        connections: {
          type: "array",
          anyOf: [
            {
              items: {
                type: "array",
                items: { type: "string", maxLength: 4 },
                minItems: 2,
                maxItems: 2
              }
            },
            {
              items: {
                type: "array",
                items: { type: "integer", minimum: 0, maximum: 10000 },
                minItems: 2,
                maxItems: 2
              }
            }
          ],
          maxItems: 10000
        },
        points: {
          type: "array",
          items: {
            type: "array",
            items: [{ type: "number" }, { type: "number" }, { type: "string", maxLength: 100 }],
            minItems: 3,
            additionalItems: false
          },
          maxItems: 10000
        }
      }
    },
    shareID: { type: "string" }
  },
  required: ["type", "filters", "display", "data"],
  additionalProperties: false
};

const Response = (code, obj) => {
    return {
        statusCode: code,
        body: JSON.stringify(obj, null, 4),
        headers: {
            'Content-Type': 'application/json',
        }
    };
};

exports.handler = async function (event, context, callback) {
    let body = '';

    if (event.routeKey === 'GET /layer') {
        const data = await dbb.query({
            TableName: 'fse-layers',
            IndexName: 'sharePublic-index',
            KeyConditionExpression: 'sharePublic = :v',
            ExpressionAttributeValues: {
              ":v": "x"
            }
        }).promise();
        if (!data.Items) {
            return Response(500, {message: 'Internal error'});
        }
        else {
            return Response(200, data.Items);
        }
    }

    else if (event.routeKey === 'GET /layer/{id}') {
        const id = event.pathParameters.id;
        const data = await dbb.get({
            TableName: 'fse-layers',
            Key: {
                id: id
            }
        }).promise();
        if (!data.Item) {
            return Response(404, {message: 'Not found'});
        }
        else {
            delete data.Item.editId;
            return Response(200, data.Item);
        }
    }

    else if (event.routeKey === 'POST /layer') {
        const id = context.awsRequestId;
        const editId = require("crypto").randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]+/g, "");
        try {
            body = JSON.parse(event.body);
        }
        catch (error) {
            return Response(400, {message: error});
        }
        if (!body.version || !/^[0-9]+\.[0-9]+\.[0-9]+(-alpha\.[0-9]+)?$/.test(body.version) || !body.info || typeof body.info !== "object") {
            return Response(400, {message: 'Bad request'});
        }
        body.info.shareID = id;
        const validate = ajv.compile(schema);
        if (!validate(body.info)) {
          return Response(400, {message: 'Bad request'});
        }
        await dbb.put({
            TableName: 'fse-layers',
            Item: {
                id: id,
                version: body.version,
                info: body.info,
                editId: editId
            }
        }).promise();
        return Response(200, {id: id, editId: editId});
    }

    else if (event.routeKey === 'POST /layer/{id}') {
        const id = event.pathParameters.id;
        try {
            body = JSON.parse(event.body);
        }
        catch (error) {
            return Response(400, {message: error});
        }
        if (!body.editId || !body.version || !/^[0-9]+\.[0-9]+\.[0-9]+(-alpha\.[0-9]+)?$/.test(body.version) || !body.info || typeof body.info !== "object") {
            return Response(400, {message: 'Bad request'});
        }
        let data = await dbb.get({
            TableName: 'fse-layers',
            Key: {
                id: id
            }
        }).promise();
        if (!data.Item) {
            return Response(404, {message: 'Not found'});
        }
        if (data.Item.editId !== body.editId) {
            return Response(403, {message: 'Unauthorized'});
        }
        body.info.shareID = id;
        const validate = ajv.compile(schema);
        if (!validate(body.info)) {
          return Response(400, {message: 'Bad request'});
        }
        data = await dbb.put({
            TableName: 'fse-layers',
            Item: {
                id: id,
                version: body.version,
                info: body.info,
                editId: body.editId,
                sharePublic: data.Item.sharePublic
            }
        }).promise();
        return Response(200, {id: id, editId: body.editId});
    }

    else if (event.routeKey === 'POST /layer/{id}/public') {
        const id = event.pathParameters.id;
        try {
            body = JSON.parse(event.body);
        }
        catch (error) {
            return Response(400, {message: error});
        }
        if (!body.editId) {
            return Response(400, {message: 'Bad request'});
        }
        let data = await dbb.get({
            TableName: 'fse-layers',
            Key: {
                id: id
            }
        }).promise();
        if (!data.Item) {
            return Response(404, {message: 'Not found'});
        }
        if (data.Item.editId !== body.editId) {
            return Response(403, {message: 'Unauthorized'});
        }
        data.Item.sharePublic = 'x';
        data = await dbb.put({
            TableName: 'fse-layers',
            Item: data.Item
        }).promise();
        return Response(200, {id: id, editId: body.editId});
    }

    else {
        return {
            statusCode: 404,
            body: JSON.stringify(event, null, 4)
        };
    }
};
