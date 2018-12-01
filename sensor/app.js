const args = require('./shared/processargs.js');
const aes = require('./shared/AES-crypto.js');
const os = require('os');
const http = require('http');
const iface = os.networkInterfaces();
const express = require('express');
const app = express();
app.use(express.json());
var port = 3000;
var parentPort;
var parent;
var nodes;
var id;
var iv = 'JpC10OoCLYs5u+lS7APMaA==';
var factoryKeys = ['09e0ff82691c1fe063b49714c7375088'];
var assignedKeys = [];

app.put('/sensors/key/:id',function(req,res){
    //adds a key for node with id id
});

app.put('/sensors/connect/:id', function(req,res){
    //forwards a connect request and adds this node to the request
    //wrap the request body, encrypt using sink key and add id
    var body = req.body;
    console.log(`getting request from ${req.params.id}`);
    setImmediate(()=>{
         //var found = nodes.find(function(element){
         //    return element.id === body.id;
         //});
         //if(found !== 'undefined' || found !== null){
             //the message was encrypted lets decrypt
         //    var decryptedBody = aes.decrypt(found.key,128,iv,body);
        //
        var decryptedBody = body;
        //var encryptedBody = aes.encrypt(sinkKey,128,iv,decryptedBody.toString());
        var newBody = {
            node : {
                id : id, //the ID of the current node
                port: port,
                iv : iv //someIV
                //maybe a MAC at some point
            },
            message : body//aes.encrypt(parent.key,128,iv,encryptedBody)
        };
        var options = optionsGenerator('127.0.0.1',
                                       parentPort,
                                       `/sensors/connect/${req.params.id}`,
                                       'PUT',
                                       newBody);
        httpRequest(options,(data)=>{},newBody);
        console.log(`forwarding message to ${parent}:${parentPort}`);
    });
    res.sendStatus(200);
});

app.put('/sink/connect/:id', function(req,res){
    //callback from sink when it is ready, with id id.
    var decryptedKey = aes.decrypt(factoryKeys[0],128,req.body.iv, req.body.key);
    console.log(decryptedKey);
    res.sendStatus(200);
});

app.get('/forward/:id',function(req,res){
    //forwards a message
});

app.get('/keys/number/nopre', function(req,res){
    //get the number of non pre keys shared by this node
});

app.get('/keys/number/pre', function(req,res){
    //get current number of pre keys used by this node
});


function connectThisNode(){
    //this is the challenge to send
    var msg = aes.randomString(16);
    var encryptedmsg = aes.encrypt(factoryKeys[0],128, iv,msg);
    var message = {
        node : {
            id : id,
            port: port,
            iv : iv //change this to a more appropriate iv
        },
        msg : {
            plaintext : msg,
            ciphertext : encryptedmsg,
        }
    };
    var options = optionsGenerator('127.0.0.1',parentPort,`/sensors/connect/${id}`,'PUT',message);
    httpRequest(options, (data)=>{},message);
}

function httpRequest(options, callback, data){
    var req = http.request(options, (res) =>{
        //console.log(`status: ${res.statusCode}`);
        //console.log(`headers: ${JSON.stringify(res.headers)}`);
        if(res.statusCode === 202){
            return;
        }
        res.setEncoding('utf8');
        var output = '';
        res.on('data', (chunk) => {
            //chunk the data
            output += chunk;
            //console.log(`body: ${chunk}`);
        });
        res.on('end', () => {
            //do something with the data
            //us the callback
            callback(output);
            //var obj = JSON.parse(output);
            //console.log('no more data');
        });
    });
    req.on('error', (e) =>{
        console.error(`a problem with request: ${e.message}`);
    });
    if(typeof data === 'undefined') {data = '';};
    req.write(JSON.stringify(data));
    req.end();
}

function optionsGenerator(ip,port,path,method,data){
    var datalength;
    var stringData = JSON.stringify(data).toString();
    datalength =(typeof data === 'undefined') ? 0 : Buffer.byteLength(stringData);
    return {
        hostname: ip,
        port: port,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/JSON',
            'Content-Length': datalength
        }
    };
}

function thisNode(){
    return {
        id : id
    };
}

function getIP(req){
    return (req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress).split(",")[0];
}

function Node(ip, port, id, isSink,key){
    this.ip = ip;
    this.port = port;
    this.id = id;
    this.isSink = isSink;
    this.key = (key === 'undefined') ? undefined : key;
}
function mainAppLoop(){
    //this is where data should be collected and send to the
    //sink
}
function startServer(port){
    app.listen(port, ()=>console.log(`Sensor is started on port ${port}`));
}

function main(){
    var cmdArgs = args.args();
    if(args.length < 3){
        console.log(`usage: [listning port] [connect port] [node id] [JSON array of keys]`);
        console.log(`what you typed ${cmdArgs}`);
        process.exit(1);
    }
    port = cmdArgs[0];
    parentPort = cmdArgs[1];
    id = cmdArgs[2];
    cmdArgs.slice(3).forEach((element) =>{
        factoryKeys.push(element);
    });
    setInterval(mainAppLoop,1000);
    startServer(port);
    connectThisNode();
}

main();

module.exports.startServer = startServer;
