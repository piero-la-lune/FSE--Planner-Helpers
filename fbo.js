/*

Compute the list of unbuilt FBOs

-i    FSE Planner icaodata-with-zones.json file
-o    Output .json file
-u    FSE Server username
-p    FSE Server password

*/


const axios = require('axios');
const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));

if (!argv.i) {
  throw new Error('Missing parameter -i');
}
if (!argv.o) {
  throw new Error('Missing parameter -o');
}
if (!argv.u) {
  throw new Error('Missing parameter -u');
}
if (!argv.p) {
  throw new Error('Missing parameter -p');
}

const icaodata = require(argv.i);

axios.defaults.withCredentials = true;
const instance = axios.create({
  withCredentials: true,
  baseURL: 'https://server.fseconomy.net/'
})


instance
  .post('index.jsp')
  .then(res => {

    // Get session cookie
    const cookie = res.headers['set-cookie'][0];
    const params = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie
      }
    };

    instance
      .post('userctl', 'offset=1&user='+argv.u+'&password='+argv.p+'&event=Agree+%26+Log+in&basil=', params)
      .then(res => {

        instance
          .post('gmapfbo.jsp', 'fboCheck=checkbox&icao=&name=&country=&state=&region=&submit=Get+Map&return=gmapfbo.jsp', params)
          .then(res => {

            const matchBuilt = [...res.data.matchAll(/\\">([A-Z0-9]+)<\/a>/g)];
            const active = matchBuilt.map(elm => elm[1]);

            instance
              .post('gmapfbo.jsp', 'inactiveCheck=checkbox&icao=&name=&country=&state=&region=&submit=Get+Map&return=gmapfbo.jsp', params)
              .then(res => {

                const matchInactive = [...res.data.matchAll(/\\">([A-Z0-9]+)<\/a>/g)];
                const inactive = matchInactive.map(elm => elm[1]);

                instance
                  .get('rest/api2/map/fbos/lottery', params)
                  .then(({ data }) => {
                    const { meta } = data;
                    const { error, info } = meta;
                    if (error) throw new Error(info);

                    const closed = data.data.map(({ icao }) => icao);

                    const unbuilt = Object.keys(icaodata).filter(elm => !active.includes(elm) && !inactive.includes(elm) && !closed.includes(elm));

                    fs.writeFileSync(argv.o, JSON.stringify(unbuilt, null, '  '), (err) => { console.log(err); });

                    process.exit();

                  })
                  .catch(error => {
                    console.log(error);
                  });

              })
              .catch(error => {
                console.log(error);
              });

          })
          .catch(error => {
            console.log(error);
          });

      })
      .catch(error => {
        console.error(error);
      });

  })
  .catch(error => {
    console.error(error);
  });
