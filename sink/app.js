const args = require('./shared/processargs.js');
const aes = require('./shared/AES-crypto.js');
const express = require('express');
const http = require('http');
const fs = require('fs');
const app = express();
const jsonSize = require('json-size');
var stream;
var port = 3000;
var 
var ip;
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    ip = add;
});
var id;

var nodes = [];

var iv = 'JpC10OoCLYs5u+lS7APMaA==';
var factoryKeys = [];
var routeMap = new Map();
var pairKeys = new Map();
app.use(express.json());
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
//example of retriving data from the sink
//The sink should forward data either in
//batches or real time
//These are RESTFUL APIs for management
app.put('/data/:id', function (req,res){
    //insert data to database;
});
app.get('/data/:id', function (req,res){
    //retrive data;
});

app.get('/id',function(req,res){
    res.send(id);
});

app.get('/info',function (req,res) {
    var message = {
        ip: ip,
        id: id,
        listningPort: port,
        routeMap : JSON.stringify([...routeMap]),
        pairKeys : JSON.stringify([...pairKeys]),
        nodes : nodes
    };
    res.send(message);
});

app.put('/sensors/keypair',function(req,res){
    var decryptedMessages = decryptedMessage(req.body);
    setImmediate(()=>{
        //decrypting the key pair
        var decryptNodePair = JSON.parse(
            aes.decrypt(nodes.find((element)=>
                                   {return element.id === decryptedMessages.msg.node.id;}).key,
                                      128,
                                      decryptedMessages.msg.node.iv,
                                      decryptedMessages.msg.pair
                                                ));
        var nodePath = decryptedMessages.nodePath;
        var logMessage;
        //send key to nodes
        var generatedNodeKey = aes.generateKey(16);
        var node1 = nodes.find(
            (element)=>{return element.id === decryptNodePair.pair.node1.id;});
        var keyPairMessage;
        if(decryptNodePair.pair.node2.id === id){
            //node is connecting to the sink
            keyPairMessage = {
                node1 : {
                    iv : iv,
                    port : node1.port,
                    ip : node1.ip,
                    key : aes.encrypt(node1.key,128,iv,generatedNodeKey)
                },
                sink : {
                    id : id
                }
            };
            logMessage = `node ${node1.id} is sink neighbour using key ${generatedNodeKey}`;
            pairKeys .set(node1.id,generatedNodeKey);
        } else {
            var node2 = nodes.find(
                (element)=>{return element.id === decryptNodePair.pair.node2.id;});
            keyPairMessage = {
                node1 : {
                    iv : iv,
                    port : node1.port,
                    ip : node1.ip,
                    id : node1.id,
                    key : aes.encrypt(node1.key,128,iv,generatedNodeKey)
                },
                node2 : {
                    iv : iv,
                    port : node2.port,
                    ip : node2.ip,
                    id : node2.id,
                    toNode : node1.id,
                    key : aes.encrypt(node2.key,128,iv,generatedNodeKey)
                }
            };
            logMessage = `nodes ${node1.id} and ${node2.id} is assigned key ${generatedNodeKey}`;
        }
        var messageToNodes = {
            node : {
                id : id,
                port: port,
                iv : iv
            },
            encryptedKeyPair: aes.encrypt(node1.key,128,iv,JSON.stringify(keyPairMessage))
        };
        if(nodePath.length > 1){
            //if more than one node, make compound message
            //construct compound message
            var compoundMessage = messageToNodes;
            var nextNode;
            for(var i=0;i < nodePath.length-1; i++){
                nextNode = nodes.find((element)=>{return element.id === nodePath[nodePath.length-2-i];});
                var tmpmessage = aes.encrypt(nextNode.key, 128,iv, JSON.stringify(compoundMessage));
                var tmp = {
                    iv : iv,
                    message : tmpmessage
                };
                compoundMessage = tmp;
            }
            messageToNodes = compoundMessage;
            console.log(`path to node ${node1.id} is ${nodePath}`);
        }
        var options = optionsGenerator(routeMap.get(decryptNodePair.pair.node1.id).ip,
                         routeMap.get(decryptNodePair.pair.node1.id).port,
                         `/key/sink/${node1.id}`,
                         'PUT',
                         messageToNodes);
        httpRequest(options,(data)=>{},messageToNodes);
        console.log(logMessage);
        });
    res.sendStatus(200);
});

app.put('/key/sensor/:id',function(req,res){
    //forwards a key from one node to another
    var body = req.body;
    var nodeToForwardTo = routeMap.get(body.id);
    var options = optionsGenerator(nodeToForwardTo.ip,
                                   nodeToForwardTo.port,
                                   `/key/sensor/${body.id}`,
                                   'put',
                                   body);
    httpRequest(options, (data)=>{},body);
    console.log(`forwarding key to ${body.id} via ${nodeToForwardTo.id}`);
    res.sendStatus(200);
});

app.put('/sensors/connect/:id', function(req,res){
    //connect the node with id 'id'
    //console.log(`${id}:data request size = ${jsonSize(req.body)}`);
    setImmediate(()=>{
        //init the respond message
        var decryptedMessages = decryptedMessage(req.body);
        var nodePath = decryptedMessages.nodePath;
        var json_size = jsonSize(req.body);
        data.log(nodePath.length,json_size);
        var initNodemessage = decryptedMessages.msg;
        try {
            var encryptionKeyNode = checkWhichKeyEncryption(initNodemessage);
        } catch (err){
            console.err(err.message);
            console.log('could not find the node, canceling adding node');
            return;
        }
        if(encryptionKeyNode === null){
            console.log(`No key for node ${initNodemessage.node.id}`);
            return;
        }
        var sinkKey = aes.generateKey(16);
        var encryptedKey = aes.encrypt(encryptionKeyNode,128,iv,sinkKey);
        console.log(`key for ${initNodemessage.node.id} is ${sinkKey}`);
        var message = {
            iv: iv,
            key: encryptedKey,
            sinkID : id,
            parentID: (nodePath.length > 1) ? nodePath[nodePath.length-2] : id
        };
        for(var i = 0;i<nodes.length;i++){
            if(nodes[i].id === initNodemessage.node.id){
                nodes.splice(i,1);
            }
        }
        var newNode =new Node(getIP(req),
                              initNodemessage.node.port,
                              initNodemessage.node.id,
                              sinkKey);
        nodes.push(newNode);
        routeMap.set(initNodemessage.node.id,newNode);
        if(nodePath.length > 1){
            //if more than one node, make compound message
            //construct compound message
            var compoundMessage = message;
            var nextNode;
            for(var i=0;i < nodePath.length-1; i++){
                nextNode = nodes.find((element)=>
                                      {return element.id === nodePath[nodePath.length-2-i];});
                var tmpmessage = aes.encrypt(nextNode.key,
                                             128,
                                             iv,
                                             JSON.stringify(compoundMessage));
                var tmp = {
                    iv : iv,
                    message : tmpmessage
                };
                compoundMessage = tmp;
            }
            message = compoundMessage;
            routeMap.set(initNodemessage.node.id,
                         nodes.find((element)=>{return element.id === nodePath[0];}));
        }
        //send key back to the node
        var options = optionsGenerator(routeMap.get(initNodemessage.node.id).ip,
                                       routeMap.get(initNodemessage.node.id).port,
                                       //should be port that initiated//initNodemessage.node.port,
                                       `/sink/connect/${initNodemessage.node.id}`,
                                       'put',
                                       message);
        httpRequest(options,(data)=>{},message);
        //send response to the node on /sink/connect
        //generate keys for the pair of nodes if present
        //encrypt in layers
        //send request
        });
    res.sendStatus(202);
});

app.put('/sensors/disconnect/:id',function (req,res){
    if(req.params.id === id){
        pairKeys.delete(req.body.id);
        console.log(`deleted key for ${req.body.id}`);
    } else {
        if(typeof(routeMap.get(req.params.id)) !== 'undefined'){
            var node = routeMap.get(req.params.id);
            var options = optionsGenerator(node.ip,
                                           node.port,
                                           `/sensors/disconnect/${req.params.id}`,
                                           'put',
                                           req.body);
            httpRequest(options,(data)=>{},req.body);
        }
    }
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
    routeMap.delete(req.query.id);
    pairKeys.delete(req.query.id);
    for(var i = 0;i<nodes.length;i++){
        if(nodes[i].id === req.query.id){
            nodes.splice(i,1);
        }
    }
    console.log(`disconnecting node: ${req.query.id}`);
    res.send(`node: ${req.query.id} is purged from sink`);
});

app.put('/forward',function(req,res){
    stream.write(`${id},1\n`);
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
    if(pairKeys.has(body.id)){
        var decryptedOuter = JSON.parse(aes.decrypt(pairKeys.get(body.id),
                                                    128,
                                                    body.iv,
                                                    body.message));
        if(decryptedOuter.idTO === id){
            var key = nodes.find((element)=>{return element.id === decryptedOuter.idFROM;});
            var decryptInner = JSON.parse(aes.decrypt(key.key,
                                                      128,
                                                      decryptedOuter.iv,
                                                      JSON.stringify(decryptedOuter.message)));
            console.log(`got data: ${decryptInner} from ${decryptedOuter.idFROM}`);
        }else if(decryptedOuter.cover){
            //forward cover traffic
            console.log('the message is cover traffic');
        }else if(routeMap.has(decryptedOuter.idTO)){
            //message is going to child
            var forwardNode = routeMap.get(decryptedOuter.idTO);
            
            var encryptedMessage = aes.encrypt(pairKeys.get(forwardNode.id),
                                               128,
                                               iv,
                                               JSON.stringify(decryptedOuter));
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
            console.log(`forwarding message to ${decryptedOuter.idTO} from ${decryptedOuter.idFROM} via ${forwardNode.id}`);
        }else{
            //message is going to parent
            console.log(`node ${decryptedMessage.id} is unknown`);
        }
    }
    res.sendStatus(200);
});



//Utility functions for data evaluation
app.get('/sensors', function(req,res){
    res.send(JSON.stringify(nodes));
    //shows the connected sensors
});

app.get('/keys/number/nopre', function(req,res){
    //gets the total amount of non pre-shared keys used in the system
});

app.get('/keys/number/pre', function(req,res){
    //get the total amount of pre-shared keys used in the system
});

function decryptedMessage(body,acc){
    if(typeof acc === 'undefined'){
        acc = [];
    }

    if(body.hasOwnProperty('msg') || body.hasOwnProperty('pair')){
        acc.push(body.node.id);
        return {
            nodePath: acc,
            msg: body
        };
    } else {
        var node = nodes.find(function(element){
            return element.id === body.node.id;
        });
        if(typeof node === 'undefined'){
            console.log('node is not found in nodes');
            throw 'node not found';
        }
        var decMsg = aes.decrypt(node.key, 128, body.node.iv,body.message);
        var JSONmessage = JSON.parse(decMsg);
        acc.push(node.id);
        return decryptedMessage(JSONmessage,acc);
    }
}


function checkWhichKeyEncryption(msg){
    var challenge = msg.msg;
    var node = msg.node;
    var correctKey = null;
    factoryKeys.forEach((element) => {
        try {
            var decrypt = aes.decrypt(element,128, node.iv, challenge.ciphertext);
            if( challenge.plaintext === decrypt){
                correctKey = element;
            }
        }
        catch (err) {
            //decrypt throws an error when using a bad key
            //catch that error here
        }
    });
    return correctKey;
}



function httpRequest(options, callback, data){
    var req = http.request(options, (res) =>{
        // console.log(`status: ${res.statusCode}`);
        // console.log(`headers: ${JSON.stringify(res.headers)}`);
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
            //use the callback
            callback(output);
            //var obj = JSON.parse(output);
            //console.log('no more data');
        });
    });
    req.on('error', (e) =>{
        console.error(`a problem with request: ${e.message}`);
    });
    if(typeof data === 'undefined') {data = '{}';};
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

function getIP(req){
    return (req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress).split(",")[0].substr(7);
}

function Node(ip, port, id, key){
    this.ip = ip,
    this.port = port;
    this.id = id;
    this.key = (typeof key === 'undefined') ? undefined : key;
}
function mainAppLoop(){
    //This loop will run once every second.
}


function main(){
    var cmdArgs = args.args();
    if(args.length < 3){
        console.log(`usage: [port] [node id] [PATH TO KEY FILE]`);
        console.log(`what you typed ${cmdArgs}`);
        process.exit(1);
    }
    port = cmdArgs[0];
    id = cmdArgs[1];
    var lineReader = require('readline').createInterface({
        input: require('fs').createReadStream(cmdArgs[2])
    });
    stream = fs.createWriteStream(`../data/${id}.txt`);
    lineReader.on('line',function(line){
        factoryKeys.push(line);
    });
    //add this sink to the nodes
    nodes.push(new Node(ip,port,id,undefined));
    //setInterval(mainAppLoop, 1000);
    app.listen(port, ()=>console.log(`Sink is started on ip:${ip} and port:${port}`));
}


main();
