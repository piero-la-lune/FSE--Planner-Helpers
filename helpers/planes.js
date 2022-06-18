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
        for (p of planes) {
          const model = p.MakeModel;
          const fuelCapacity = (p.Ext1 + p.LTip + p.LAux + p.LMain + p.Center1
                              + p.Center2 + p.Center3 + p.RMain + p.RAux
                              + p.RTip + p.RExt2);
          obj[model] = {
            // Total plane seats - 1 seat for pilot - 1 seat if additionnal crew
            maxPax: p.Seats - (p.Crew > 0 ? 2 : 1),
            maxCargo: p.MaxCargo,
            fuelCapacity: fuelCapacity,
            speed: p.CruiseSpeed,
            GPH: p.GPH,
            fuelType: p.FuelType,
            // Max total weight - Empty plane weight - Weight of pilot and crew
            maxKg: Math.floor(p.MTOW - p.EmptyWeight - 77*(1+p.Crew))
          };
        }
        fs.writeFileSync(argv.o, JSON.stringify(obj, null, '  '), (err) => { console.log(err); });
      });
  });