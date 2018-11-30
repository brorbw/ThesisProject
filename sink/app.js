const args = require('./shared/processargs.js');
const aes = require('./shared/AES-crypto.js');
const express = require('express');
const http = require('http');
const app = express();

var port = 3000;

var id;

var nodes = [];

var iv = 'JpC10OoCLYs5u+lS7APMaA==';
var factoryKeys = [];

app.use(express.json());

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


//TODO add a node
app.put('/sensors/connect/:id', function(req,res){
    //connect the node with id 'id'
    setImmediate(()=>{
        var allIds = getIds(req.body);
        //console.log(nodes);
        //port might note be neccessary
        var key = aes.generateKey(16);
        console.log(`adding key${key} to node ${allIds[allIds.length-1]}`);
        nodes.push(new Node(getIP(req),req.port,allIds[allIds.length-1],key));
        //var encryptionKeyNode = checkWhichKeyEncryption(req.body.challenge);
        //console.log(`the correct key was ${encryptionKeyNode}`);
        //send response to the node on /sink/connect
        //generate keys for the pair of nodes if present
        //encrypt in layers
        //send request
        });
    var responseJSON = JSON.stringify("{}");
    res.sendStatus(202);
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

function getIds(body,acc){
    if(typeof acc === 'undefined'){
        acc = [];
    }

    if(body.hasOwnProperty('msg')){
        acc.push(body.node.id);
        return acc;
    } else {
        var node = nodes.find(function(element){
            return element.id === body.node.id;
        });
        var decryptedMessage = body.message//aes.decrypt(node.key, 128, body.node.iv,body.message);
        if(typeof node === 'undefined'){
            return tmp.push(getIds(decryptedMessage));
        }
        acc.push(node.id);
        return getIds(decryptedMessage,acc);
    }
}


function checkWhichKeyEncryption(msg){
    var challenge = msg.challenge;
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
        console.log(`status: ${res.statusCode}`);
        console.log(`headers: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        var output = '';
        res.on('data', (chunk) => {
            //chunk the data
            output += chunk;
            console.log(`body: ${chunk}`);
        });
        res.on('end', () => {
            //do something with the data
            //us the callback
            var obj = JSON.parse(output);
            console.log('no more data');
        });
    });
    req.on('error', (e) =>{
        console.error(`a problem with request: ${e.message}`);
    });
    if(typeof data === 'undefined') {data = '';};
    req.write(data);
    req.end();
}

function optionsGenerator(ip,port,path,method,data){
    var datalength;
    datalength =(typeof data === 'undefined') ? 0 : Buffer.bytelength(data);
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
    lineReader.on('line',function(line){
        factoryKeys.push(line);
    });
    //setInterval(mainAppLoop, 1000);
    app.listen(port, ()=>console.log(`Sink is started on port ${port}`));
}


main();
