//============================================================================================================================================================================
//=========================================================================Local Server Variables=============================================================================
//============================================================================================================================================================================
var localname='server2';
var localportSocketio=8001;
var localportExpress=3001;
var localaddress='http://localhost:'+localportSocketio;
var localwealth=5;
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


//============================================================================================================================================================================
//=========================================================================Initialization=====================================================================================
//============================================================================================================================================================================
var localserverobject={name:localname,portSocketio:localportSocketio,portExpress:localportExpress,address:localaddress,wealth:localwealth,socket:localsocket};
var initialNode={name:'server1',portSocketio:8000,portExpress:3000,address:'http://localhost:8000',wealth:3,socket:0};
var servers=[localserverobject,initialNode];
var serverNames=[localname,initialNode.name];

//============================================================================================================================================================================
//=========================================================================Client implementation==============================================================================
//============================================================================================================================================================================
var tempsocket = io_client.connect(servers[1].address);

tempsocket.on('connect', function () {
    tempsocket.emit('join', localserverobject);
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
            console.log(blockChain.chain[blockChain.chain.length-1].data);
            //Broadcast to add new block to blockchain
            socket.broadcast.emit('addBlock',data);
            socket.emit('addBlock',data);
            //Broadcast to update wealth
            socket.broadcast.emit('updateWealth',localname);
            socket.emit('updateWealth',localname);
            //Send to server that transaction is a success
            socket.emit('transactionSuccess');
        }
        else{
            socket.emit('transactionFail');
        }
    });
    
    socket.on('updateWealth',function(newWealthServerName){
        servers[servers.indexOf(newWealthServerName)].wealth+=3;
    });
    
    socket.on('addBlock',function(data){
        console.log('Adding block: ' + data);
        addNewTransaction(data.client_from, data.client_to, data.amount, data.description);
    });
    
    socket.on('join',function(data){
        var isNew=1;
        var newServerInfo=data;
        //Find if new node is already in server list
        if (serverNames.indexOf(newServerInfo.name)!=-1){
            isNew=0;
        }
        if (isNew){
            
            //Establish client connection to new server
            newServerInfo.socket=io_client.connect(newServerInfo.address);
            newServerInfo.socket.on('connect',function(){
                newServerInfo.socket.emit('join',localserverobject);
            });
            
            //Send list of servers and blockchain
            console.log(servers);
            
            var serversCopy=servers.slice();
            for (var k=0;k<servers.length;k++){
                serversCopy[k].socket=null;
            }
            
            newServerInfo.socket.emit('servers',JSON.stringify(serversCopy));
            newServerInfo.socket.emit('blockchain',JSON.stringify(blockChain));
            
            //Save to server list
            serverNames.push(newServerInfo.name);
            servers.push(newServerInfo);
            console.log('Server added to serverlist');
            console.log(servers);
            
        }
    });
    
    socket.on('servers',function(data){
        console.log('Recieved Servers')
        var newServers=JSON.parse(data);
        for (var k=0;k<newServers.length;k++){
            if (serverNames.indexOf(newServers[k].name)==-1){
                servers.push(newServers[k]);
                serverNames.push(newServers[k].names)
                servers[servers.length-1].socket = io_client.connect(servers[servers.length-1].address);
                servers[servers.length-1].socket.on('connect', function () {
                    servers[servers.length-1].socket.emit('join', localserverobject);
                }); 
            }
        }
        console.log('Updated server list: ' + servers);
    });
    
    socket.on('blockchain',function(newBlockchain){
        var RecivedBlockChain=JSON.parse(newBlockchain);
        if (RecivedBlockChain.isChainValid){
            if (RecivedBlockChain.getLatestBlock.index>blockChain.getLatestBlock.index){
                blockChain=JSON.parse(newBlockchain);
            }
        }
    });
    
    socket.on('Ping',function(){
        socket.emit('Handshake',localname);
    })
    
    socket.on('disconnect',function(){
        console.log('Server disconnected');
        serverping=[];
        socket.broadcast.emit('Ping');
        socket.emit('Ping');
    });
    
    socket.on('Handshake',function(servername){
        serverping.push(servername);
        
        //Remove disconnected server
        if (serverping.length==servers.length-1){
            for (var i=0;i<servers.length;i++){
                if (serverping.indexOf(servers[i].name)==-1){
                    servers=servers.splice(i,1);
                }
            }
            console.log('Deleted server. New list: ' + servers);
        }
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
    if (!blockChain.isChainValid)
    {
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