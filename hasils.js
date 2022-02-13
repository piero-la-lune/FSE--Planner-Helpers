/*

Edit icaodata to add ILS information

You first need to load MSFS assets with Little Navmap, then export table `ils`
from Little Navmap MSFS SQLite database to a CSV file, then extract an JSON
array with all icaos

-f    JSON file (export from Little Navmap)
-i    FSE Planner icaodata.json file
-o    Output icaodata.json file

*/

const fs = require('fs');
const cliProgress = require('cli-progress');

const argv = require('minimist')(process.argv.slice(2));

if (!argv.f) {
  throw new Error('Missing parameter -f');
}
if (!argv.i) {
  throw new Error('Missing parameter -i');
}
if (!argv.o) {
  throw new Error('Missing parameter -o');
}


// Load icaodata file, clean and arrange data
const icaodata = require(argv.i);
const icaos = Object.keys(icaodata);
const arr = require(argv.f);


for (const icao of icaos) {
  delete icaodata[icao].ils;
  if (arr.includes(icaodata[icao].msfs[0])) {
    icaodata[icao].ils = true;
  }
}

fs.writeFileSync(argv.o, JSON.stringify(icaodata, null, '  '), (err) => { console.log(err); });