const axios = require('axios');
const AWS = require('aws-sdk');

AWS.config.update({region: 'eu-west-3'});

exports.handler = async (event) => {
    
    axios.defaults.withCredentials = true;
    const instance = axios.create({
      withCredentials: true,
      baseURL: 'https://server.fseconomy.net/'
    });
    
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
        const getParams = {
          headers: {
            'Cookie': cookie
          }
        };

        res = await instance.post('userctl', 'offset=1&user='+process.env.username+'&password='+process.env.password+'&event=Agree+%26+Log+in&basil=', params);

        res = await instance.get('fbosforsale.jsp', getParams);

        const match = [...res.data.toString('latin1').matchAll(/<tr>.*?updateMapFbo\('(.*?)'\).*?\$([0-9,]+).*?<\/tr>/gs)];
        const forSale = match.map(elm => [elm[1], parseInt(elm[2].replace(/,/g, ''))]);

        const s3 = new AWS.S3({apiVersion: '2006-03-01'});
        var uploadParams = {
            Bucket: 'fse-planner-data',
            Key: 'forsale.json',
            Body: JSON.stringify(forSale, null, '  '),
            CacheControl: 'no-cache'
        };
        const stored = await s3.upload(uploadParams).promise();
    
        return {
            statusCode: 200,
            body: stored
        };
    }
    catch (e) {
        console.log(e);
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        };
    }
};
