/*

Compute X-Plane airports within each FSE airport landing zone

-i    FSE Planner icaodata.json file
-z    FSE Planner zones.json file
-o    Output icaodata.json file
-x    Output xplane.json file

*/

const geolib = require('geolib');
const fs = require('fs');
const cliProgress = require('cli-progress');
const axios = require('axios');

const argv = require('minimist')(process.argv.slice(2));

if (!argv.i) {
  throw new Error('Missing parameter -i');
}
if (!argv.z) {
  throw new Error('Missing parameter -z');
}
if (!argv.o) {
  throw new Error('Missing parameter -o');
}
if (!argv.x) {
  throw new Error('Missing parameter -x');
}

console.log('Loading data');

// Load icaodata file, clean and arrange data
const icaodata = require(argv.i);
const icaos = Object.keys(icaodata);
const zones = require(argv.z);
for (const icao of icaos) {
  zones[icao] = zones[icao].map(([lat, lon]) => [lon, lat]);
  icaodata[icao].xplane = [];
}


axios
  .get('https://gateway.x-plane.com/apiv1/release/11.55')
  .then(res => {
    const packIds = res.data.SceneryPacks;

    axios
      .get('https://gateway.x-plane.com/apiv1/airports')
      .then(res => {
        const xplane = res.data.airports;

        // Initiate progress bar
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        console.log('Analyzing all X-Plane airports');
        bar.start(xplane.length, 0);

        const notFound = [];
        const obj = {};

        var i = 0;

        const doAirport = () => {
          if (i >= xplane.length) {
            bar.stop();

            console.log('Not found: ', notFound.join(' '));

            console.log('Cleaning up');
            for (const icao of icaos) {
              if (icaodata[icao].xplane.length > 0) {
                const sortedArr = geolib.orderByDistance(icaodata[icao], icaodata[icao].xplane);
                if (icao !== sortedArr[0].icao && geolib.getDistance(sortedArr[0], icaodata[icao]) > 2000) {
                  sortedArr.unshift(null);
                }
                icaodata[icao].xplane = sortedArr.map(obj => obj ? obj.icao : null);
              }
              else {
                icaodata[icao].xplane.unshift(null);
              }
            }

            console.log('Saving file');

            fs.writeFileSync(argv.o, JSON.stringify(icaodata, null, '  '), (err) => { console.log(err); });
            fs.writeFileSync(argv.x, JSON.stringify(obj, null, '  '), (err) => { console.log(err); });

            console.log('Done');

            process.exit();
          }
          else {
            const airport = xplane[i];
            axios
              .get('https://gateway.x-plane.com/apiv1/airport/'+airport.AirportCode)
              .then(res => {

                bar.increment();
                var found = false;
                const data = res.data.airport;

                var f = false;
                for (const scenery of data.scenery) {
                  if (packIds.includes(scenery.sceneryId)) {
                    f = true;
                    break;
                  }
                }

                if (!f) {
                  i++;
                  doAirport();
                  return false;
                }

                let code = airport.AirportCode;
                if (airport.metadata) {
                  if (airport.metadata.icao_code) {
                    code = airport.metadata.icao_code;
                  }
                  else if (airport.metadata.iata_code) {
                    code = airport.metadata.iata_code;
                  }
                  else if (airport.metadata.faa_code) {
                    code = airport.metadata.faa_code;
                  }
                  else if (airport.metadata.local_code) {
                    code = airport.metadata.local_code;
                  }
                }

                // Search the matching zone
                if (icaodata[code] && geolib.isPointInPolygon([airport.Longitude, airport.Latitude], zones[code])) {
                  icaodata[code].xplane.push({
                    icao: code,
                    lat: airport.Latitude,
                    lon: airport.Longitude
                  });
                  found = code;
                }
                else {
                  for (const icao of icaos) {
                    if (geolib.isPointInPolygon([airport.Longitude, airport.Latitude], zones[icao])) {
                      icaodata[icao].xplane.push({
                        icao: code,
                        lat: airport.Latitude,
                        lon: airport.Longitude
                      });
                      found = icao;
                      break;
                    }
                  }
                }
                // Should never happen
                if (!found) {
                  notFound.push(code);
                }
                obj[code] = {
                  lon: parseFloat(airport.Longitude),
                  lat: parseFloat(airport.Latitude)
                }

                // Next airport;
                i++;
                doAirport();
              })
              .catch(error => {
                bar.increment();
                i++;
                doAirport();
              });
            }
        }

        doAirport();

      });
  });
