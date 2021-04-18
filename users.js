/*

Get the list of users and groups

-o    Output .json file
-u    FSE Server username
-p    FSE Server password

*/


const axios = require('axios');
const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));

if (!argv.o) {
  throw new Error('Missing parameter -o');
}
if (!argv.u) {
  throw new Error('Missing parameter -u');
}
if (!argv.p) {
  throw new Error('Missing parameter -p');
}

const instance = axios.create({
  baseURL: 'https://server.fseconomy.net/'
})




instance
  .get('score.jsp?type=groups')
  .then(res => {

    const groups = [...res.data.matchAll(/<tr>\s*<td>(.*)<\/td>/g)].map(elm => elm[1]);

    instance
      .get('score.jsp?type=pilots')
      .then(res => {

        const pilots = [...res.data.matchAll(/<tr>\s*<td>(.*)<\/td>/g)].map(elm => elm[1]);

        fs.writeFileSync(argv.o, JSON.stringify([...groups, ...pilots], null, '  '), (err) => { console.log(err); });

      })
      .catch(error => {
        console.log(error);
      });

  })
  .catch(error => {
    console.log(error);
  });
