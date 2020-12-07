/*

Compute MSFS airports within each FSE airport landing zone

You first need to load MSFS assets with Little Navmap, then export table `airport`
from Little Navmap MSFS SQLite database to a CSV file

-f    CSV file (export from Little Navmap)
-i    FSE Planner icaodata-with-zones.json file
-o    Output icaodata-with-zones.json file
-m   Output msfs.json file

*/

const geolib = require('geolib');
const fs = require('fs');
const csv = require('csv-parser');
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
if (!argv.m) {
  throw new Error('Missing parameter -m');
}

console.log('Loading data');

// Load icaodata file, clean and arrange data
const icaodata = require(argv.i);
const icaos = Object.keys(icaodata);
for (const icao of icaos) {
  icaodata[icao].zone = icaodata[icao].zone.map(([lat, lon]) => [lon, lat]);
  icaodata[icao].msfs = [];
}

// Load MSFS extract CSV file
const msfs = [];
fs.createReadStream(argv.f)
  .pipe(csv())
  .on('data', (data) => msfs.push(data))
  .on('end', () => {

    // Initiate progress bar
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    console.log('Analyzing all MSFS airports');
    bar.start(msfs.length, 0);

    const notFound = [];
    const obj = {};

    // Counter
    for (const airport of msfs) {
      var found = false;

      // Search the matching zone
      for (const icao of icaos) {
        if (geolib.isPointInPolygon([airport.lonx, airport.laty], icaodata[icao].zone)) {
          icaodata[icao].msfs.push({
            icao: airport.ident,
            lat: airport.laty,
            lon: airport.lonx
          });
          found = icao;
          break;
        }
      }
      // Should never happen
      if (!found) {
        notFound.push(airport.ident);
      }
      obj[airport.ident] = {
        lon: parseFloat(airport.lonx),
        lat: parseFloat(airport.laty)
      }
      bar.increment();
    }

    bar.stop();

    console.log('Not found: ', notFound.join(' '));

    console.log('Cleaning up');
    for (const icao of icaos) {
      icaodata[icao].zone = icaodata[icao].zone.map(([lon, lat]) => [lat, lon]);
      if (icaodata[icao].msfs.length > 0) {
        const sortedArr = geolib.orderByDistance(icaodata[icao], icaodata[icao].msfs);
        if (icao !== sortedArr[0].icao && geolib.getDistance(sortedArr[0], icaodata[icao]) > 2000) {
          sortedArr.unshift(null);
        }
        icaodata[icao].msfs = sortedArr.map(obj => obj ? obj.icao : null);
      }
      else {
        icaodata[icao].msfs.unshift(null);
      }
    }

    console.log('Saving file');

    fs.writeFile(argv.o, JSON.stringify(icaodata, null, '  '), (err) => { console.log(err); });
    fs.writeFile(argv.m, JSON.stringify(obj, null, '  '), (err) => { console.log(err); });

    console.log('Done');

    process.exit();

  });