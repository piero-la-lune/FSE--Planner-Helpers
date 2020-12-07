/*

Compute FSE landing zones from a FSE Planner `icaodata.json` file

-i    FSE Planner icaodata.json file
-o    Output file

*/


const turf = require('turf');
const fs = require('fs');
const voronoi = require('d3-geo-voronoi');

const argv = require('minimist')(process.argv.slice(2));

if (!argv.i) {
  throw new Error('Missing parameter -i');
}
if (!argv.o) {
  throw new Error('Missing parameter -o');
}



const icaodata = require(argv.i);

const points = Object.entries(icaodata).map(([key, obj]) => turf.point([obj.lon, obj.lat], {name: key}));

// Compute Voronoi
const v = voronoi.geoVoronoi(points);
const polygons = v.polygons();

const fixLon = (lon, plon) => {
  if (Math.abs(lon - plon) > Math.abs(lon - 360 - plon)) {
    lon -= 360;
  }
  else if (Math.abs(lon - plon) > Math.abs(lon + 360 - plon)) {
    lon += 360;
  }
  return lon;
}

for (const [icao, a] of Object.entries(icaodata)) {
  for (const obj of polygons.features) {
    if (icao === obj.properties.site.properties.name) {
      a.icao = icao;
      a.zone = obj.geometry.coordinates[0].map(([lon, lat]) => [lat, fixLon(lon, a.lon)]);
    }
  }
}

fs.writeFile(argv.o, JSON.stringify(icaodata, null, '  '), (err) => { console.log(err); });

process.exit();