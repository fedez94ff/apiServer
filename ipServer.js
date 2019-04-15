const Alpine = require('alpine');
const {createReadStream} = require('fs');
const request = require('request-promise');

const alpine = new Alpine();

let Coordinates = require('./model/coordinates');

function findIpAddresses() {
  console.log('in find ip addresses');
  let ipAddresses = [];
  
  alpine.parseReadStream(
    createReadStream('access.log', {encoding: 'utf8'}).on('end', () => {
      console.log('qui');
      let uniqueIpsFromLog = [...new Set(ipAddresses)];

      Coordinates.findAll({
        raw: true,
        attributes: ['ip']
      })
        .then(ipsFromDB => {
          let diff = makeDiff(uniqueIpsFromLog, ipsFromDB);

          if (diff.length > 100) {
            return makeApiCall(diff.splice(100, diff.length));
          }

          console.log(JSON.stringify(diff));
          return makeApiCall(diff);
        })
        .then(function(response) {
          console.log('mandata get');
          storeIps(response);
          // SALVARE NEL DB
        })
        .catch(function(err) {
          console.log(err);
        });
    }),
    data => {
      if (data.request === 'POST /service/meter/ HTTP/1.1') {
        ipAddresses.push(data.remoteHost);
      }
    }
  );
}

function makeDiff(ipsFromLog, ipsFromDB) {
  //console.log(array);
  let arrayFromDb = ipsFromDB.map(item => item.ip); // da db
  let difference = ipsFromLog
    .filter(item => !arrayFromDb.includes(item))
    .map(value => ({
      query: value,
      fields: 'query,lat,lon'
    }));

  // differences è un array di ip che  non sono presenti nel db ma solo sul access.log
  //console.log(difference);

  return difference;
}

function makeApiCall(unlocalizedIps) {
  //console.log('array' + array)
  //let array1 = JSON.stringify(array);
  const options = {
    method: 'POST',
    uri: 'http://ip-api.com/batch/',
    body: unlocalizedIps,
    json: true // Automatically stringifies the body to JSON
  };

  return request(options);
}

// TODO: bulka instead of looping
function storeIps(localizedIps) {
  for (let i = 0; i < localizedIps.length; i++) {
    console.log(localizedIps[i].ip);
    console.log(localizedIps[i].lat);
    console.log(localizedIps[i].longitude);

    Coordinates.create({
      ip: localizedIps[i].query,
      latitude: localizedIps[i].lat,
      longitude: localizedIps[i].lon
    }).then(coordiantes => {
      console.log('inserted');
    });
  }
}
// fare la chiamata in batch ip-api con al massimo cento
// inserire il tutto nel database,

setInterval(findIpAddresses, 15000, 'funky');
