const axios = require('axios');
const AWS = require('aws-sdk');

AWS.config.update({region: 'eu-west-3'});

exports.handler = async (event) => {
    
    const instance = axios.create({
      baseURL: 'https://server.fseconomy.net/'
    })
    
    try {
        let res = await axios.get('https://server.fseconomy.net/score.jsp?type=groups', {
                responseType: 'arraybuffer',
                reponseEncoding: 'binary'
            });
        const groups = [...res.data.toString('latin1').matchAll(/<tr>\s*<td>(.*)<\/td>/g)].map(elm => elm[1]);
    
        res = await axios.get('https://server.fseconomy.net/score.jsp?type=pilots');
        
        const pilots = [...res.data.toString('latin1').matchAll(/<tr>\s*<td>(.*)<\/td>/g)].map(elm => elm[1]);
    
        const file = JSON.stringify([...groups, ...pilots], null, '  ');

        const s3 = new AWS.S3({apiVersion: '2006-03-01'});
        var uploadParams = {
            Bucket: 'fse-planner-data',
            Key: 'users.json',
            Body: file,
            CacheControl: 'no-cache'
        };
        const stored = await s3.upload(uploadParams).promise();
    
        return {
            statusCode: 200,
            body: stored
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
