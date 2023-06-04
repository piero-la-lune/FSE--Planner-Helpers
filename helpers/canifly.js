/*

Transform an FSE Planner `icaodata.json` file to a Can I Fly There file

-i    FSE Planner icaodata.json file
-o    Output file

*/

const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));

if (!argv.i) {
  throw new Error('Missing parameter -i');
}
if (!argv.o) {
  throw new Error('Missing parameter -o');
}

const icaodata = require(argv.i);
const icaos = Object.keys(icaodata);

let txt = '{';

for (const icao of icaos) {
  const micao = icaodata[icao]["msfs"][0];
  if (!micao) {
    txt += `
   "${icao}":{
      "status":"missing"
   },`;
  }
  else if (micao === icao) {
    txt += `
   "${icao}":{
      "status":"exists"
   },`;
  }
  else {
    txt += `
   "${icao}":{
      "status":"renamed",
      "simIcao":"${micao}"
   },`;
  }
}

txt = txt.slice(0, -1); // Remove last coma
txt += `
}`;


fs.writeFileSync(argv.o, txt, (err) => { console.log(err); });

process.exit();
