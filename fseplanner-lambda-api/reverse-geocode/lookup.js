const regions = require('./regions.json');

const pointInPolygon = (polygon, point) => {
  let nvert = polygon.length;
  let c = false;
  for(let i = 0, j = nvert-1; i < nvert; j = i++) {
      let pI = polygon[i];
      let pJ = polygon[j];
      if(((pI[1] > point[1]) !== (pJ[1] > point[1])) &&
       (point[0] < (pJ[0] - pI[0]) * (point[1] - pI[1]) / (pJ[1] - pI[1]) + pI[0]) ) {
          c = !c;
      }
  }
  return c;
};

function lookUp(lat, lon) {
  const point = [lon, lat];
  let i = 0;
  let found = false;

  do {
    let region = regions[i];
    if (region.geo.type === 'Polygon') {
      found = pointInPolygon(region.geo.coordinates[0], point);
    }
    else if (region.geo.type === 'MultiPolygon') {
      let j = 0;
      do {
        found = pointInPolygon(region.geo.coordinates[j][0], point);
        j++;
      } while (j < region.geo.coordinates.length && !found);
    }
    i++;
  } while (i < regions.length && !found);

  if (found) {
    return regions[i-1].loc;
  }
  return [];
}

module.exports = {
  lookUp
};