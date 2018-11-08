/*
  The networking module is responsible for starting a server and connecting to a server
*/


const http = require('http');
var server = http.createServer();

server.on('request',(request,response) =>{
    response.writeHead(200,{'Content-Type':'application/json'});
} )
