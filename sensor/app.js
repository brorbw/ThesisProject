const args = require('./shared/processargs.js');
const aes = require('./shared/AES-crypto.js');
const os = require('os');
const http = require('http');
const iface = os.networkInterfaces();
const express = require('express');
const app = express();
app.use(express.json());
var port = 3000;
var parent;
var sinkKey;
var nodes;
var id;
var ip;
var iv = 'JpC10OoCLYs5u+lS7APMaA==';
var factoryKeys = ['09e0ff82691c1fe063b49714c7375088'];
var assignedKeys = [];
var keyPairMap = new Map();
var routeMap = new Map(); //a map that contains the nodes that have made requests for a specific id
// var _privatelog = console.log;
// var _privateerr = console.error;
// console.log = idlog;
// console.error = iderror;
// function idlog (text){
//     _privatelog(`${id}: ${text}`);
// };
// function iderror(text){
//     _privateerr(`${id}: ${text}`);
// }


app.put('/key/sink/:id',function(req,res){
    //recive key from sink
    var body = req.body;
    setImmediate(()=> {
        if(body.hasOwnProperty('encryptedKeyPair')){
            var decryptedKeys = JSON.parse(aes.decrypt(sinkKey,128,body.node.iv,JSON.stringify(body.encryptedKeyPair)));
            //the key for this node
            var decryptedKey = aes.decrypt(sinkKey, 128, decryptedKeys.node1.iv,JSON.stringify(decryptedKeys.node1.key));
            if(decryptedKeys.hasOwnProperty('node2')){
                var keyToSendToNode2 = decryptedKeys.node2;
                keyPairMap.set(decryptedKeys.node2.id, decryptedKey);
                var options;
                if(typeof(routeMap.get(keyToSendToNode2.id)) !== 'undefined'){
                    var child = routeMap.get(keyToSendToNode2.id);
                    console.log(child);
                    options = optionsGenerator(child.ip,
                                               child.port,
                                              `/key/sensor/${keyToSendToNode2.id}`,
                                               'put',
                                               keyToSendToNode2);
                } else {
                    options = optionsGenerator(parent.ip,
                                               parent.port,
                                               `/key/sensor/${keyToSendToNode2.id}`,
                                               'put',
                                               keyToSendToNode2);
                }
                httpRequest(options,(data)=>{},keyToSendToNode2);
                console.log(`sending key ${decryptedKey} to ${keyToSendToNode2.id}`);
            } else {
                keyPairMap.set(decryptedKeys.sink.id,decryptedKey);
                console.log(`assigning ${decryptedKey} as pair key for sink`);
            }
        }
        else {
            var decryptedMessage = JSON.parse(aes.decrypt(sinkKey,128,body.iv,JSON.stringify(body.message)));
            var nodeToForwardTo = routeMap.get(req.params.id);
            var options = optionsGenerator(nodeToForwardTo.ip,
                                           nodeToForwardTo.port,
                                           `/key/sink/${req.params.id}`,
                                           'put',
                                           decryptedMessage);
            httpRequest(options,(data)=>{},decryptedMessage);
            console.log(`forwarding key message to ${nodeToForwardTo.id}`);
        }
    });
    res.sendStatus(200);
});

app.put('/key/sensor/:id',function(req,res){
    //recieve second part of key
    var body = req.body;
    if(req.params.id === id){
        //recive key from other node
        var decryptedKey = aes.decrypt(sinkKey,128,body.iv,JSON.stringify(body.key));
        keyPairMap.set(req.params.id,decryptedKey);
        console.log(`using key: ${decryptedKey} for node: ${body.toNode}`);
    } else if (typeof(routeMap.get(body.id)) !== 'undefined') {
        var child = routeMap.get(body.id);
        var options = optionsGenerator(child.ip,
                                       child.port,
                                       `/key/sensor/${body.id}`,
                                       'put',
                                       body);
        httpRequest(options,(data)=>{},body);
        console.log(`forward to child ${child.id}`);
    } else {
        console.log(`forward to parent ${parent.id}`);
        //
        var options = optionsGenerator(parent.ip,
                                       parent.port,
                                       `/key/sensor/${body.id}`,
                                       'put',
                                       body);
        httpRequest(options,(data)=>{},body);
    }
    res.sendStatus(200);
});

app.put('/sensors/keypair',function(req,res){
    //forward keyrequest to sink
    var body = req.body;
    setImmediate(()=>{
        var encryptedBody = aes.encrypt(sinkKey,128,iv,JSON.stringify(body));
        var newBody = {
            node :{
                id: id,
                port: port,
                iv: iv
            },
            message: encryptedBody
        };
        var options = optionsGenerator('127.0.0.1',
                                   parent.port,
                                   '/sensors/keypair',
                                   'PUT',
                                   newBody);
        httpRequest(options,(data)=>{},newBody);
        console.log(`forwarding key request to ${parent.id}`);
    });
    res.sendStatus(200);
    //adds a key for node with id id
});

app.get('/id',function(req,res){
    res.send(id);
});

app.put('/sensors/connect/:id', function(req,res){
    //forwards a connect request and adds this node to the request
    //wrap the request body, encrypt using sink key and add id
    var body = req.body;
    setImmediate(()=>{
        var decryptedBody = body;
        //console.log(decryptedBody);
        var encryptedBody = aes.encrypt(sinkKey,128,iv,JSON.stringify(decryptedBody));
        var newBody = {
            node : {
                id : id, //the ID of the current node
                port: port,
                iv : iv //someIV
                //maybe a MAC at some point
            },
            message : encryptedBody
        };
        var options = optionsGenerator('127.0.0.1',
                                       parent.port,
                                       `/sensors/connect/${req.params.id}`,
                                       'PUT',
                                       newBody);
        httpRequest(options,(data)=>{},newBody);
        console.log(`forwarding message from ${req.params.id} to ${parent.id}`);
        routeMap.set(req.params.id, new Node('127.0.0.1',body.node.port,body.node.id,undefined));
    });
    res.sendStatus(200);
});

app.put('/sink/connect/:id', function(req,res){
    //callback from sink when it is ready, with id id.
    var body = req.body;
    if(body.hasOwnProperty('key')){
        var decryptedKey = aes.decrypt(factoryKeys[0],128,req.body.iv, req.body.key);
        sinkKey = decryptedKey;
        parent.id = body.parentID;
        console.log(`setting key ${decryptedKey} as the sinkKey for this node`);
    } else {
        setImmediate(()=>{
            var forwardMessage = JSON.parse(aes.decrypt(sinkKey,128,body.iv,body.message));
            //console.log(forwardMessage);
            var nodeToForwardTo = routeMap.get(req.params.id);
            //console.log(nodeToForwardTo);
            //forward the response
            var options = optionsGenerator('127.0.0.1',
                                           nodeToForwardTo.port,
                                           `/sink/connect/${req.params.id}`,
                                           'put',
                                           forwardMessage);
            httpRequest(options, (data)=>{},forwardMessage);
            console.log(`forwarding message from sink to ${nodeToForwardTo.id}`);
        });

    }
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


function connectThisNode(ip,paranPort,paranID){
    //initialising the connection protocol with node ip
    parent = new Node(ip,paranPort,undefined,undefined);
    console.log(`connecting to ${parent.port}`);
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
    var options = optionsGenerator(parent.ip,parent.port,`/sensors/connect/${id}`,'PUT',message);
    httpRequest(options, (data)=>{},message);
}

function requestPairKeyToNode(node){
    console.log(node.port);
    //this requests a key for a pair of nodes
    var message = {
        pair: {
            node1:{
                id: id,
                port: port,
                ip: ip
            },
            node2:{
                id:node.id,
                port:node.port,
                ip: node.ip}
        }
    };
    //send request to the sink
    var requestBody = {
        node: {
            id: id,
            port: port,
            iv: iv
        },
        pair: aes.encrypt(sinkKey,128,iv, JSON.stringify(message))
    };
    var options = optionsGenerator(parent.ip,
                                   parent.port,
                                   `/sensors/keypair`,
                                   'put',
                                   requestBody);
    console.log(`requesting key for ${node.id}`);
    httpRequest(options, (call)=>{},requestBody);
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
    if(options.method !== 'get'){
    req.write(JSON.stringify(data));
    }
    req.end();
}

function optionsGenerator(ip,port,path,method,data){
    var datalength;
    var stringData = JSON.stringify(data).toString();
    datalength =(typeof data === 'undefined') ? 0 : Buffer.byteLength(stringData);
    if(method === 'get'){
        return {
            hostname: ip,
            port: port,
            path: path,
            method: method,
            headers: {
                //'Content-Type': 'application/JSON',
                //'Content-Length': datalength
            }
        };
    } else {
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

function Node(ip, port, id, key){
    this.ip = ip;
    this.port = port;
    this.id = id;
    this.key = (key === 'undefined') ? undefined : key;
}
function mainAppLoop(){
    //this is where data should be collected and send to the
    //sink
}
function startServer(port){
    app.listen(port, ()=>console.log(`Sensor is started on port ${port}`));
}

async function getID(ip,port,callback){
    var nodeID;
    var options = optionsGenerator(ip,port,'/id','get','{}');
    var res = await httpRequest(options, (callback)=>{nodeID = callback;},'{}');
    await sleep(500);
    //console.log(nodeID);
    return nodeID;
}

async function main(){
    var cmdArgs = args.args();
    if(args.length < 3){
        console.log(`usage: [listning port] [connect port] [node id] [JSON array of keys]`);
        console.log(`what you typed ${cmdArgs}`);
        process.exit(1);
    }
    port = cmdArgs[0];
    ip = cmdArgs[1];
    id = aes.generateKey(1);
    console.log(`ID: ${id}`);
    cmdArgs.slice(3).forEach((element) =>{
        factoryKeys.push(element);
    });
    setInterval(mainAppLoop,1000);
    startServer(port);
    connectThisNode('127.0.0.1',cmdArgs[1]);
    //setTimeout(()=>{requestPairKeyToNode(parent);},500);
}

app.get('/connectToNode',async function (req,res){
    var nodeIP = req.query.ip;
    var nodePORT = req.query.port;
    console.log(nodePORT,nodeIP);
    var nodeID = await getID(nodeIP,nodePORT);
    console.log(nodeID);
    var nodeToConnect = new Node(nodeIP,nodePORT,nodeID,undefined);
    requestPairKeyToNode(nodeToConnect);
    res.send(`Node ${id} is connecting to ${nodeID}`);
});

main();

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}


module.exports.startServer = startServer;
