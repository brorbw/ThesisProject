const args = require('./shared/processargs.js');
const aes = require('./shared/AES-crypto.js');
const os = require('os');
const fs = require('fs');
const http = require('http');
const iface = os.networkInterfaces();
const express = require('express');
const jsonSize = require('json-size');
var streamForward;
var streamOriginal;
var streamCover;
const app = express();
app.use(express.json());
var port = 3000;
var parent;
var sinkKey;
var sinkID;
var toggleData = true;
var toggleCover = false;
var id;
var ip;
var iv = 'JpC10OoCLYs5u+lS7APMaA==';
var factoryKeys = ['09e0ff82691c1fe063b49714c7375088'];
var keyPairMap = new Map();
var routeMap = new Map(); //a map that contains the nodes that have made requests for a specific id
var isConnected = false;


var filelogger = false;
var dataLog = false;
if(dataLog){
    var _privatelog = console.log;
    // var _privateerr = console.error;
    console.log = (string)=>{};
    // console.error = iderror;
    // function idlog (text){
    //     _privatelog(`${id}: ${text}`);
    // };
    // function iderror(text){
    //     _privateerr(`${id}: ${text}`);
    // }
} else {
    var _privatelog = (string)=>{};
}
function dataPrint(key,value){
    _privatelog(`${id},${key},${value}`);
}
var data = {
    log : dataPrint
};
app.get('/info',function (req,res){
    var message = {
        ip : ip,
        id : id,
        listeningport : port,
        parent : parent,
        keyPairMap : JSON.stringify([...keyPairMap]),
        routeMap : JSON.stringify([...routeMap]),
        sinkKey : sinkKey
    };
    res.send(message);
});

app.put('/key/sink/:id',function(req,res){
    //recive key from sink
    var body = req.body;
    setImmediate(()=> {
        if(body.hasOwnProperty('encryptedKeyPair')){
            isConnected = true;
            var decryptedKeys = JSON.parse(aes.decrypt(sinkKey,128,body.node.iv,JSON.stringify(body.encryptedKeyPair)));
            //the key for this node
            var decryptedKey = aes.decrypt(sinkKey, 128, decryptedKeys.node1.iv,JSON.stringify(decryptedKeys.node1.key));
            var options;
            if(decryptedKeys.hasOwnProperty('node2')){
                var keyToSendToNode2 = decryptedKeys.node2;
                keyPairMap.set(decryptedKeys.node2.id, decryptedKey);
                if(typeof(routeMap.get(keyToSendToNode2.id)) !== 'undefined'){
                    var child = routeMap.get(keyToSendToNode2.id);
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
            options = optionsGenerator(nodeToForwardTo.ip,
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
        keyPairMap.set(body.toNode,decryptedKey);
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
                ip: ip,
                iv: iv
            },
            message: encryptedBody
        };
        var options = optionsGenerator(ip,
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


app.put('/sensors/disconnect/:id',function (req,res){
    if(req.params.id === id){
        keyPairMap.delete(req.body.id);
        console.log(`deleted key for ${req.body.id}`);
    } else if (req.body.id != id){
        console.log('forwarding request');
        if(typeof(routeMap.get(req.params.id)) !== 'undefined'){
            console.log(`child getting request ${req.params.id}`);
            var node = routeMap.get(req.params.id);
            var options = optionsGenerator(node.ip,
                                           node.port,
                                           `/sensors/disconnect/${req.params.id}`,
                                           'put',
                                           req.body);
            httpRequest(options,(data)=>{},req.body);
        } else {
            console.log(`parent getting request ${req.params.id}`);
            var options = optionsGenerator(parent.ip,
                                           parent.port,
                                           `/sensors/disconnect/${req.params.id}`,
                                           'put',
                                           req.body);
            httpRequest(options,(data)=>{},req.body);
        }
    }
    res.sendStatus(200);
});

app.put('/sensors/parent',async function (req,res){
    var newParent = req.body.parent;
    isConnected = false;
    parent = new Node(newParent.ip,newParent.port,newParent.id);
    await sleep(1000);
    requestPairKeyToNode(parent);
    console.log(`new parent : ${parent.port},${parent.ip},${parent.id}`);
    res.sendStatus(200);
});

app.put('/sensors/routemap',function(req,res){
    console.log('getting new routemap');
    var newMap = new Map(JSON.parse(req.body.map));
    newMap.forEach((element,key)=>{
        routeMap.set(key,new Node(element.ip,element.port,element.id));
    });
    res.sendStatus(200);
});

app.get('/sensors/disconnect',function (req,res){
    if(typeof(req.query.id) === 'undefined'){
        isConnected = false;
        var options = optionsGenerator(parent.ip,
                                       parent.port,
                                       `/sensors/disconnect?id=${id}`,
                                       'get',
                                      '{}');
        httpRequest(options, ()=>{},'{}');
        keyPairMap.forEach((element,key)=>{
            //remove all the keypairs from childs and parents
            var message = {
                id : id
            };
            if(typeof(routeMap.get(key)) !== 'undefined'){
                var nodeOnPath = routeMap.get(key);
                var options = optionsGenerator(nodeOnPath.ip,
                                               nodeOnPath.port,
                                               `/sensors/disconnect/${key}`,
                                               'put',
                                               message);
                httpRequest(options, (data)=>{}, message);
            } else {
                var options = optionsGenerator(parent.ip,
                                               parent.port,
                                               `/sensors/disconnect/${key}`,
                                               'put',
                                               message);
                httpRequest(options,(data)=>{},message);
            }
        });
        routeMap.forEach((element,key)=>{
            //contact all the childs and opdate their parent.
            if(element.id === key){
                //the node is an apparent child
                var message = {
                    parent : parent
                };
                var options = optionsGenerator(element.ip,
                                               element.port,
                                               `/sensors/parent`,
                                               'put',
                                               message);
                httpRequest(options,(data)=>{},message);
            }
        });
        //forward routeMap to parent
        var JSONMap =
            {
                map : JSON.stringify([...routeMap])
            };
        var options = optionsGenerator(parent.ip,
                                       parent.port,
                                       '/sensors/routemap',
                                       'put',
                                       JSONMap);
        httpRequest(options,(data)=>{},JSONMap);

        console.log(`this node is disconnected`);
        res.send(`this node ${id} is now disconnected`);
    } else {
        setImmediate(()=>{
            var options =optionsGenerator(parent.ip,
                                          parent.port,
                                          `/sensors/disconnect?id=${req.query.id}`,
                                          'get',
                                          '{}');
            httpRequest(options, ()=>{},'{}');
        });
        routeMap.delete(req.query.id);
        keyPairMap.delete(req.query.id);
        console.log(`disconnecting node: ${req.query.id}`);
        res.send(`node: ${req.query.id} is purged from ${id}`);
    }
});

app.get('/sensors/connect',function(req,res) {
    if(req.query.hasOwnProperty('ip') && req.query.hasOwnProperty('port')){
        setImmediate(()=>{
            routeMap = new Map();
            keyPairMap = new Map();
            sinkKey = undefined;
            connectThisNode(req.query.ip,req.query.port);
        });
        res.send(`Node ${id} is connecting to the network`);
    } else {
        res.send('malformed url. missing either port or ip');
    }
});

app.get('/requestPairKey',async function (req,res){
    if(req.query.hasOwnProperty('ip')&& req.query.hasOwnProperty('port')){
        var nodeIP = req.query.ip;
        var nodePORT = req.query.port;
        var nodeID = await getID(nodeIP,nodePORT);
        var nodeToConnect = new Node(nodeIP,nodePORT,nodeID,undefined);
        requestPairKeyToNode(nodeToConnect);
        res.send(`Node ${id} is getting a key for ${nodeID}`);
    } else {
        res.send('malformed url. missing either port or ip');
    }
});

app.put('/sensors/connect/:id', function(req,res){
    //forwards a connect request and adds this node to the request
    //wrap the request body, encrypt using sink key and add id
    var body = req.body;
    setImmediate(()=>{
        var decryptedBody = body;
        var encryptedBody = aes.encrypt(sinkKey,128,iv,JSON.stringify(decryptedBody));
        var newBody = {
            node : {
                id : id, //the ID of the current node
                port: port,
                ip: ip,
                iv : iv //someIV
                //maybe a MAC at some point
            },
            message : encryptedBody
        };
        var options = optionsGenerator(parent.ip,
                                       parent.port,
                                       `/sensors/connect/${req.params.id}`,
                                       'PUT',
                                       newBody);
        httpRequest(options,(data)=>{},newBody);
        console.log(`forwarding message from ${req.params.id} to ${parent.id}`);
        routeMap.set(req.params.id, new Node(body.node.ip,body.node.port,body.node.id,undefined));
    });
    res.sendStatus(200);
});

app.put('/sink/connect/:id', function(req,res){
    //callback from sink when it is ready, with id id.
    var body = req.body;
    if(body.hasOwnProperty('key')){
        var decryptedKey = aes.decrypt(factoryKeys[0],128,req.body.iv, req.body.key);
        sinkKey = decryptedKey;
        sinkID = body.sinkID;
        parent.id = body.parentID;
        console.log(`setting key ${decryptedKey} as the sinkKey for this node`);
        //get a key to the parent
        requestPairKeyToNode(parent);
    } else {
        setImmediate(()=>{
            var forwardMessage = JSON.parse(aes.decrypt(sinkKey,128,body.iv,body.message));
            var nodeToForwardTo = routeMap.get(req.params.id);
            //forward the response
            var options = optionsGenerator(nodeToForwardTo.ip,
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

app.put('/forward',function(req,res){
    var date = new Date();
    if(filelogger) streamForward.write(`${port},${date.getTime()},1\n`);
    //forwards a message
    /**
       outer message structure
       {
           id : the id that encrypted the message,
           iv : the initialisation Vector
           message : the encrypted message
       }
       inner
       {
           id : the node that the message should be forwarded to
           cover : boolean
           coverCount : number of 
           iv : the initialisation Vector
           message : encrypted message 
       }
    */
    var body = req.body;
    if(keyPairMap.has(body.id)){
        var decryptedMessage = JSON.parse(aes.decrypt(keyPairMap.get(body.id),
                                                      128,
                                                      body.iv,
                                                      body.message));
        if(decryptedMessage.idTO === id){
            console.log('the message is for this node');
            var decryptedInner = JSON.parse(aes.decrypt(keyPairMap.get(decryptedMessage.idFROM),
                                                        128,
                                                        decryptedMessage.iv,
                                                        decryptedMessage.message));
            console.log(decryptedInner);
        }else if(decryptedMessage.cover){
            //forward cover traffic
            console.log('the message is cover traffic');
        }else if(routeMap.has(decryptedMessage.idTO)){
            //message is going to child
            var forwardNode = routeMap.get(decryptedMessage.idTO);
            var encryptedMessage = aes.encrypt(keyPairMap.get(forwardNode.id),
                                               128,
                                               iv,
                                               JSON.stringify(decryptedMessage));
            var messageToForward = {
                id : id,
                iv : iv,
                message : encryptedMessage
            };
            var options = optionsGenerator(forwardNode.ip,
                                           forwardNode.port,
                                           `/forward`,
                                           'put',
                                           messageToForward);
            httpRequest(options,(data)=>{},messageToForward);
            console.log(`forwarding message for ${decryptedMessage.idTO} to ${forwardNode.id}`);
        }else{
            //message is going to parent
            var encryptedMessage = aes.encrypt(keyPairMap.get(parent.id),
                                               128,
                                               iv,
                                               JSON.stringify(decryptedMessage));
            console.log(`forwarding message for ${decryptedMessage.idTO} from ${decryptedMessage.idFROM} to ${parent.id} (parent)`);
            var messageToForward = {
                id : id,
                iv : iv,
                message : encryptedMessage
            };
            var options = optionsGenerator(parent.ip,
                                           parent.port,
                                           `/forward`,
                                           'put',
                                           messageToForward);
            httpRequest(options,(data)=>{},messageToForward);
        }
    }
    res.sendStatus(200);
});

app.get('/keys/number/nopre', function(req,res){
    //get the number of non pre keys shared by this node
});

app.get('/keys/number/pre', function(req,res){
    //get current number of pre keys used by this node
});
app.get('/sendDataToSink', function(req,res){
    if(req.query.hasOwnProperty('data')){
        console.log(req.query.data);
        sendDataToSink(req.query.data);
    } else {
        res.send('missing data in url');
    }
    res.sendStatus(200);
});

app.get('/sendDataToNode',async function(req,res){
    var query = req.query;
    if(query.hasOwnProperty('data')&&
       query.hasOwnProperty('ip')&&
       query.hasOwnProperty('port')){
        var nodeid = await getID(query.ip,query.port);
        console.log(`sending ${data} to ${nodeid}`);
        var newNode = new Node(query.ip,
                               query.port,
                               nodeid,
                               undefined);
        if(keyPairMap.has(nodeid)){
            sendDataToNode(query.data,newNode);
        } else {
            requestPairKeyToNode(newNode);
            await sleep (1000);//wait for the keypair
            sendDataToNode(query.data,newNode);
        }

    }
    res.sendStatus(200);
});

function connectThisNode(ip,paranPort){
    //initialising the connection protocol with node ip
    parent = new Node(ip,paranPort,undefined,undefined);
    console.log(`connecting to ${parent.port}`);
    var msg = aes.randomString(16);
    var encryptedmsg = aes.encrypt(factoryKeys[0],128, iv,msg);
    var message = {
        node : {
            id : id,
            port: port,
            iv : iv, //change this to a more appropriate iv
            ip: ip
        },
        msg : {
            plaintext : msg,
            ciphertext : encryptedmsg,
        }
    };
    var options = optionsGenerator(parent.ip,
                                   parent.port,
                                   `/sensors/connect/${id}`,
                                   'PUT',
                                   message);
    httpRequest(options, (data)=>{},message);
}

function requestPairKeyToNode(node){
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

function timer (t1){
    var timer1 = (t2)=>{data.log(`${t2-t1}`);};
    return timer1;
}

function httpRequest(options, callback, data){
    // var d = new Date();
    // var time = timer(d.getTime());
    var req = http.request(options, (res) =>{
        res.setEncoding('utf8');
        var output = '';
        res.on('data', (chunk) => {
            output += chunk;
        });
        res.on('end', () => {
            callback(output);
            // var d = new Date();
            // time(d.getTime());
        });
    });
    req.on('error', (e) =>{
        console.log(options);
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

function getIP(req){
    return (req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress).split(",")[0].substring(7);
}

function Node(ip, port, id, key){
    this.ip = ip;
    this.port = port;
    this.id = id;
    this.key = (key === 'undefined') ? undefined : key;
}

function sendDataToNode (data,node){
    if(node.id === sinkID){
        sendDataToSink(data);
    } else {
        var encryptedData = aes.encrypt(keyPairMap.get(node.id),
                                        128,
                                        iv,
                                        JSON.stringify(data));
        var innerMessage = {
            idFROM : id,
            idTO : node.id,
            cover : false,
            coverCount : 0,
            iv : iv,
            message : encryptedData
        };
        var outerMessage;
        var options;
        if(routeMap.has(node.id)){
            //send to child
            var child = routeMap.get(node.id);
            outerMessage = {
                id : id,
                iv : iv,
                message : aes.encrypt(keyPairMap.get(child.id),
                                      128,
                                      iv,
                                      JSON.stringify(innerMessage))
            };
            options = optionsGenerator(child.ip,
                                       child.port,
                                       '/forward',
                                       'put',
                                       outerMessage);
            httpRequest(options,(data)=>{},outerMessage);
        } else {
            outerMessage = {
                id : id,
                iv : iv,
                message : aes.encrypt(keyPairMap.get(parent.id),
                                      128,
                                      iv,
                                      JSON.stringify(innerMessage))
            };
            options = optionsGenerator(parent.ip,
                                       parent.port,
                                       '/forward',
                                       'put',
                                       outerMessage);
            httpRequest(options,(data)=>{},outerMessage);
        }
    }
}

function sendDataToSink (data){
    //consider data format? JSON or just int/string
    var date = new Date();
    if(filelogger)streamOriginal.write(`${port},${date.getTime()},1\n`);
    var encryptedData = aes.encrypt(sinkKey,128,iv,JSON.stringify(data));
    var innerMessage ={
        idFROM : id,
        idTO : sinkID,
        cover : false,
        coverCount : 0,
        iv : iv,
        message : encryptedData
    };
    var outerMessage = {
        id : id,
        iv : iv,
        message : aes.encrypt(keyPairMap.get(parent.id),128,iv,JSON.stringify(innerMessage))
    };
    var options = optionsGenerator(parent.ip,
                                   parent.port,
                                   '/forward',
                                   'put',
                                   outerMessage);
    httpRequest(options,(data)=>{},outerMessage);
}
function sendCover (data){
    var date = new Date();
    if(filelogger)streamCover.write(`${port},${date.getTime()},1\n`);
    var encryptedData = aes.encrypt(sinkKey,128,iv,data);
    
}

app.get('/toggle/data',function (req,res){
    toggleData = (toggleData) ? false : true;
    res.sendStatus(200);
});
app.get('/toggle/cover', function (req,res) {
    toggleCover = (toggleCover) ? false : true;
    res.sendStatus(200);
})

function mainAppLoop(){
    //this is where data should be collected and send to the
    if(isConnected){
        if(toggleData){
            if(toggleCover){
                //do cover stuff & data
            } else {
                //do data stuff
                sendDataToSink('hello world');
            }
        } else if (toggleCover){
            //only do cover stuff
        }
        //do stuff
        //console.log('this node is connected');
    }
    //sink
}
function startServer(port){
    app.listen(port, ()=>console.log(`Sensor is started on port ${port}`));
}

async function getID(ip,port,callback){
    if(typeof(callback) === 'undefined'){callback = (data)=>{};};
    var nodeID;
    var options = optionsGenerator(ip,port,'/id','get','{}');
    var res = await httpRequest(options, (data)=>{nodeID = data;callback(data);},'{}');
    await sleep(1000);
    return nodeID;
}

async function main(){
    var cmdArgs = args.args();
    if(args.length < 3){
        console.log(`usage: [listning port] [this nodes ip] [JSON array of keys]`);
        console.log(`what you typed ${cmdArgs}`);
        process.exit(1);
    }
    port = cmdArgs[0];
    var interfaces = os.networkInterfaces();
    if(interfaces.hasOwnProperty('enp2s0')){
        if(interfaces.enp2s0[0].family === 'IPv4'){
            ip = interfaces.enp2s0[0].address;
        } else {
            ip = interfaces.enp2s0[1].address;
        }
    } else if (interfaces.hasOwnProperty('en0')){
        if(interfaces.en0[1].family === 'IPv4'){
            ip = interfaces.en0[1].address;
        } else {
            ip = interfaces.en0[1].address;
        }
    }
    id = aes.generateKey(4);
    if(filelogger)streamForward = fs.createWriteStream(`../data/${id}_forward.txt`);
    if(filelogger)streamOriginal = fs.createWriteStream(`../data/${id}_original.txt`);
    if(filelogger)streamCover = fs.createWriteStream(`../data/${id}_cover.txt`);
    console.log(`ID: ${id}`);
    cmdArgs.slice(1).forEach((element) =>{
        factoryKeys.push(element);
    });
    setInterval(mainAppLoop,1000);
    startServer(port);
}


main();

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}


module.exports.startServer = startServer;
