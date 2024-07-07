const axios = require('axios');
const AWS = require('aws-sdk');
const icaodata = require('./icaodata.json');

AWS.config.update({region: 'eu-west-3'});

exports.handler = async (event) => {

    axios.defaults.withCredentials = true;
    const instance = axios.create({
      withCredentials: true,
      baseURL: 'https://server.fseconomy.net/'
    })

    try {

        let res = await instance.post('index.jsp');

        // Get session cookie
        const cookie = res.headers['set-cookie'][0];
        const params = {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie
          }
        };

        res = await instance.post('userctl', 'offset=1&user='+process.env.username+'&password='+process.env.password+'&event=Agree+%26+Log+in&basil=', params);

        res = await instance.get('rest/api2/map/fbos/open', params);

        if (res.data && res.data.data && res.data.data.airports && Array.isArray(res.data.data.airports)) {

            const airports = res.data.data.airports;
            const unbuilt = airports.map(e => e.icao);

            const s3 = new AWS.S3({apiVersion: '2006-03-01'});
            var uploadParams = {
                Bucket: 'fse-planner-data',
                Key: 'unbuilt.json',
                Body: JSON.stringify(unbuilt, null, '  '),
                CacheControl: 'no-cache'
            };
            const stored = await s3.upload(uploadParams).promise();
    
            return {
                statusCode: 200,
                body: stored
            }
        
        }
        return {
            statusCode: 400,
            body: 'Unable to load unbuilt lots'
        }
    }
    catch (e) {
        console.log(e)
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        }
    }
};
