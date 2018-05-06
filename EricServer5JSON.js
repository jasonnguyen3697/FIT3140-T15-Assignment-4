//============================================================================================================================================================================
//=========================================================================Local Server Variables=============================================================================
//============================================================================================================================================================================
var localname='server5';
var localportSocketio=8004;
var localportExpress=3004;
var localaddress='http://localhost:'+localportSocketio;
var localwealth=6;
var localsocket=0;

//============================================================================================================================================================================
//===============================================================================Dependencies=================================================================================
//============================================================================================================================================================================
var app = require('express');
var http = require('http');
var io_client = require('socket.io-client');
var io = require("socket.io");
var BlockChainClass = require("./blockChainClass.js");
var BlockClass = require("./blockClass.js");
var randomNumber = require('random-number');
var fs =require('fs');
var JSONdecycle=require('./cycle.js'); //Best way to deep clone a circular object From:https://github.com/douglascrockford/JSON-js/blob/master/cycle.js and https://stackoverflow.com/questions/24075308/avoiding-typeerror-converting-circular-structure-to-json


//============================================================================================================================================================================
//=========================================================================Initialization=====================================================================================
//============================================================================================================================================================================
var localserverobject={name:localname,portSocketio:localportSocketio,portExpress:localportExpress,address:localaddress,wealth:localwealth,socket:localsocket};
var initialNode={name:'server2',portSocketio:8001,portExpress:3001,address:'http://localhost:8000',wealth:3,socket:0};
var servers=[localserverobject,initialNode];
var serverNames=[localname,initialNode.name];

//============================================================================================================================================================================
//=========================================================================Client implementation==============================================================================
//============================================================================================================================================================================
servers[1].socket = io_client.connect(servers[1].address);

servers[1].socket.on('connect', function () {
    servers[1].socket.emit('join', localserverobject);
});

//============================================================================================================================================================================
//=========================================================================Server implementation==============================================================================
//============================================================================================================================================================================
var serverping=[];
var blockChain = new BlockChainClass();

//Create HTMl Server
var HTMLserver=http.createServer(function(req, res) {
            res.writeHead(200, { 'Content-type': 'text/html'});
            res.end(fs.readFileSync(__dirname+'/index.html'));
            }).listen(localportExpress, function() {
            console.log('Listening at: http://localhost:'+localportExpress);
 });

io.listen(HTMLserver).on("connection",function(socketHTML){
    console.log('Client connected');
    
    socketHTML.on('clientTransaction',function(data){
        console.log(data);
        var index=getRandomServer(servers);
        console.log('Random Server: ' + index);
        servers[index].socket.emit('Validate',data);
    });
    
    socketHTML.on('transactionSuccess',function(){
        console.log('transaction good');
    });
    
    socketHTML.on('transactionFail',function(){
        console.log('transaction fail');
    });
});


io.listen(localportSocketio).on("connection", function (socket){
    console.log('Server connected');
    //Validate transation
    socket.on('Validate',function(data){
        console.log('Transaction Data: ' + data);
        if (validateRequest(data)){
            addNewTransaction(data.client_from, data.client_to, data.amount, data.description);
            servers[0].wealth+=3;
            console.log('New blockchain: ' + JSON.stringify(blockChain));
            //Broadcast to add new block to blockchain
            for (var i=1; i<servers.length;i++){
                servers[i].socket.emit('addBlock',data);
                servers[i].socket.emit('updateWealth',localname);
            }
            //Send to server that transaction is a success            
            socket.emit('transactionSuccess');
        }
        else{
            socket.emit('transactionFail');
        }
    });
    
    socket.on('updateWealth',function(newWealthServerName){
        servers[serverNames.indexOf(newWealthServerName)].wealth+=3;
    });
    
    socket.on('addBlock',function(data){
        console.log('Adding block: ' + JSON.stringify(data));
        addNewTransaction(data.client_from, data.client_to, data.amount, data.description);
        console.log('New blockchain: ' + JSON.stringify(blockChain));
    });
    
        socket.on('join',function(data){
        var isNew=1;
        var newServerInfo=data;
        //Find if new node is already in server list
        if (serverNames.indexOf(newServerInfo.name)!=-1){
            isNew=0;
        }
        if (isNew){
            console.log('Discovered new server: ' + JSON.stringify(data));
            serverNames.push(newServerInfo.name);
            //Establish client connection to new server
            newServerInfo.socket=io_client.connect(newServerInfo.address);
            newServerInfo.socket.on('connect',function(){
                newServerInfo.socket.emit('join',localserverobject);
            });
            
            //Deep clone server list to make socket of copy null so we can send over JSON
            var serversCopy=JSON.retrocycle(JSON.decycle(servers));
            for (var k=0;k<serversCopy.length;k++){
                serversCopy[k].socket=null;
            }
            //Send blockchain and serverlist
            newServerInfo.socket.emit('blockchain',JSON.stringify(blockChain));
            newServerInfo.socket.emit('servers',JSON.stringify(serversCopy));
            
            //Save new node to server list
            servers.push(newServerInfo);
            console.log('Server added to serverlist');
            console.log('New server list: ' + servers);
            
        }
    });
    
    socket.on('servers',function(data){
        console.log('Recieved Servers')
        var newServers=JSON.parse(data);
        for (var k=1;k<newServers.length;k++){
            if (serverNames.indexOf(newServers[k].name)==-1){
                servers.push(newServers[k]);
                serverNames.push(newServers[k].name)
                servers[servers.length-1].socket = io_client.connect(servers[servers.length-1].address);
                servers[servers.length-1].socket.on('connect', function () {
                    servers[servers.length-1].socket.emit('join', localserverobject);
                }); 
            }
        }
        console.log('Updated server list: ' + servers);
    });
    
    socket.on('blockchain',function(newBlockchain){
        var blockChaintemp= new BlockChainClass;
        blockChaintemp.chain=JSON.parse(newBlockchain).chain;
        if (blockChaintemp.getLatestIndex>blockChain.getLatestIndex){
            blockChain=blockChaintemp;
            console.log('Replacing old blockchain with' + newBlockchain);
        } 
    });
    
    socket.on('Ping',function(){
        for (var i=1;i<servers.length;i++){
            servers[i].socket.emit('Handshake',localname);
        }
    })
    
    socket.on('disconnect',function(){
        console.log('Server disconnected');
        socket.disconnect();
        
        if (serverNames.length==2){
            serverNames=[localname];
            servers=[localserverobject];
        }
        else{
            serverping=[];
            for (var i=1;i<servers.length;i++){
                servers[i].socket.emit('Ping');
            }
        }
        
    });
    
    socket.on('Handshake',function(servername){
        console.log('Received handshake');
        serverping.push(servername);
        console.log(serverping);
        //Remove disconnected server
        if (serverping.length==servers.length-2){
            for (var i=1;i<servers.length;i++){
                if (serverping.indexOf(servers[i].name)==-1){
                    servers.splice(i,1);
                    serverNames.splice(i,1);
                }
            }
            console.log('Deleted server. New list: ' + serverNames);
        }
    });
    
    socket.on('transactionSuccess',function(){
        console.log('Transaction Valid. Updating status of client');    
    });
});//End socketioserver curly brackets

//============================================================================================================================================================================
//=========================================================================Blockchain Functions===============================================================================
//============================================================================================================================================================================
function addNewTransaction(from, to, amount, description){
  blockChain.addBlock(new BlockClass(blockChain.chain.length, Date(), {
    from: from,
    to: to,
    amount: amount,
    description: description
  }));
}

function getRandomServer(serverList){
    var totalWealth = 0;
    
    for (var n=0;n<serverList.length;n++){
        totalWealth+=serverList[n].wealth;
    }
    
    var m = -1;
    //generate random number
    var rn = randomNumber({min: 1, max: totalWealth, integer: true});
    //Choose server
    while (rn > 0){
        m = m + 1;
        rn = rn - serverList[m].wealth;
    }
    
    if (m==0){
        m+=1;
    }
    
    return m; //server index
}

//Obtain balance
function checkBalance(transactionName){
    var balance = 0;
    for (var i = 1; i < blockChain.chain.length; i++){
        if (blockChain.chain[i].data.from==transactionName){
            balance = balance - parseInt(blockChain.chain[i].data.amount, 10);
        }
        if (blockChain.chain[i].data.to==transactionName)
        {
            balance = balance + parseInt(blockChain.chain[i].data.amount, 10);
        }
    }
    return balance;
}

function validateRequest(transaction){
    console.log(blockChain.isChainValid);
    if (!blockChain.isChainValid){
        console.log("Block chain is not valid. Transaction failed.");
        return 0;
    }
    var balance = checkBalance(transaction.client_from);
    if (balance >= parseInt(transaction.amount, 10)){
        console.log("Transaction is valid");
        return 1;
    }
    else{
        console.log("Transaction failed. Insufficient funds.");
        return 0;
    }
}