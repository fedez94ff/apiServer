var express = require("express");
const Alpine = require("alpine");
const { createReadStream } = require("fs");
var rp = require('request-promise');

var app = express();

const alpine = new Alpine();

let Coordinates = require("./model/coordinates");

function findIpAddresses() {
  console.log("in find ip addresses");
  let ipAddresses = [];
  alpine.parseReadStream(
    createReadStream("access.log", { encoding: "utf8" }).on("end", () => {
      console.log("qui");
      let unique = new Set(ipAddresses);
      // reconvert to array
      let ipArray = [...unique];

      checkinDb(ipArray);
     
    }),
    data => {
      if (data.request === "POST /service/meter/ HTTP/1.1") {
        ipAddresses.push(data.remoteHost);
      }
    }
  );
}

function checkinDb(array) {
   /* let arr1 = ['a','b','c','d']; // access log
    let arr2 = ['b','c'];// db
    let difference = arr1.filter(x => !arr2.includes(x));
    console.log(difference)*/

  //array --> from access.log 
  Coordinates.findAll({
    raw: true,
    attributes: ["ip"]
  }).then(ips=>{
    //ips da db 
    // array from access.log 
    difference(array,ips);
        })
  

}


function difference(array,object){
  //console.log(array);
  let arrayFromDb= object.map(ip=>ip.ip); // da db
  let difference = array.filter(x => !arrayFromDb.includes(x));

  const difference1=difference.map(value => ({query: value, fields: "query,lat,lon"}));
  //console.log(difference1);
 

  // differences è un array di ip che  non sono presenti nel db ma solo sul access.log 
 //console.log(difference);


 if (difference1.length >100){
    let difference = difference1.splice(100,difference1.length);
    console.log('difference' + difference);


    makeApiCall(difference)
  }
 else{
   console.log(JSON.stringify(difference1));
  makeApiCall(difference1);

   
 }
 
}

function makeApiCall(array){
  //console.log('array' + array)
 //let array1 = JSON.stringify(array);
    var options = {
      method: 'POST',
      uri: 'http://ip-api.com/batch/',
      body:array,
      json: true // Automatically stringifies the body to JSON
  };
  
  
  rp(options)
      .then(function (parsedBody) {
         console.log('mandata get');
         writeinDb(parsedBody);;
         // SALVARE NEL DB
      })
      .catch(function (err) {
          console.log(err)
      });
  }

 

  // credo che sia possibile bulkare il create
  function writeinDb(array){
 for (let i=0;i<array.length;i++){
   console.log(array[i].ip);
   console.log(array[i].lat);
   console.log(array[i].longitude);
 
  Coordinates.create({
    ip:array[i].query,
    latitude:array[i].lat,
    longitude:array[i].lon
    
    }).then(coordiantes =>{
      console.log('inserted')
    })
  }
  }
  // fare la chiamata in batch ip-api con al massimo cento 
  // inserire il tutto nel database, 




setInterval(findIpAddresses,15000 , "funky");
var listener = app.listen(8888);
