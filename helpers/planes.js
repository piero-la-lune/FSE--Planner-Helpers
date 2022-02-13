/*

Get the list of all FSE plane models in JSON file.

-o    Output aircraft.json file
-k    FSE datafeed user key

*/

const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const { Readable } = require('stream');

const argv = require('minimist')(process.argv.slice(2));

if (!argv.o) {
  throw new Error('Missing parameter -o');
}
if (!argv.k) {
  throw new Error('Missing parameter -i');
}

const planes = [];
axios
  .get('https://server.fseconomy.net/data?format=csv&query=aircraft&search=configs&userkey='+argv.k)
  .then(res => {
    const readable = Readable.from([res.data]);
    readable
      .pipe(csv({
        mapValues: ({ header, index, value }) => header === "MakeModel" ? value : parseInt(value)
      }))
      .on('data', (data) => planes.push(data))
      .on('end', () => {
        planes.pop();
        const obj = {};
        for (plane of planes) {
          const model = plane.MakeModel;
          delete plane.MakeModel;
          delete plane[''];
          obj[model] = plane;
        }
        fs.writeFileSync(argv.o, JSON.stringify(obj, null, '  '), (err) => { console.log(err); });
      });
  });