const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-west-3'});

var dbb = new AWS.DynamoDB.DocumentClient();

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

    if (event.routeKey === 'GET /layer/{id}') {
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
        if (!body.version || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(body.version) || !body.info || typeof body.info !== "object") {
            return Response(400, {message: 'Bad request'});
        }
        body.info.shareID = id;
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
        if (!body.editId || !body.version || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(body.version) || !body.info || typeof body.info !== "object") {
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
        data = await dbb.put({
            TableName: 'fse-layers',
            Item: {
                id: id,
                version: body.version,
                info: body.info,
                editId: body.editId
            }
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
