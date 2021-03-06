var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var expressValidator = require('express-validator');
var socket = require('socket.io');
var server1 = require('socket.io-client')('http://localhost:3000');
var server3 = require('socket.io-client')('http://localhost:3002');
var BlockChainClass = require("./blockChainClass.js");
var BlockClass = require("./blockClass.js");
var randomNumber = require('random-number');

//initialise a block chain
var blockChain = new BlockChainClass();

//Initialise server data
function serverInitialise()
{
  //add block to chain
  blockChain.addBlock(new BlockClass(1, Date(), {
    from: "-1",
    to: "Sam",
    amount: 100,
    description: "Open balance"
  }));
  //Hash values caluclated within addBlock function

  blockChain.addBlock(new BlockClass(2, Date(), {
    from: "-1",
    to: "Adam",
    amount: 150,
    description: "Open balance"
  }));
}

//Add new transaction block
function addNewTransaction(from, to, amount, description)
{
  blockChain.addBlock(new BlockClass(blockChain.chain.length, Date(), {
    from: from,
    to: to,
    amount: amount,
    description: description
  }));
}

//extra function to sum numbers
function sum(list)
{
  var total = 0;
  for (var i = 0; i < list.length; i++)
  {
    total = total + list[i];
  }
  return total;
}

//Get random server to validate data
function getRandomServer(serverList)
{
  var totalWealth = sum(serverList);
  var i = -1;
  //generate random number
  var rn = randomNumber({min: 1, max: totalWealth, integer: true});
  //Choose server
  while (rn > 0)
  {
    i = i + 1;
    rn = rn - serverList[i];
  }
  return i; //server index
}

//Obtain balance
function checkBalance(name)
{
  var balance = 0;
  for (let i = 1; i < blockChain.chain.length; i++)
  {
    if (blockChain.chain[i].data.from==name)
    {
      balance = balance - parseInt(blockChain.chain[i].data.amount, 10);
    }
    if (blockChain.chain[i].data.to==name)
    {
      balance = balance + parseInt(blockChain.chain[i].data.amount, 10);
    }
  }
  return balance;
}

//Validate request
function validateRequest(transaction)
{
  if (!blockChain.isChainValid())
  {
    console.log("Block chain is not valid. Transaction failed.");
    return 0;
  }
  var balance = checkBalance(transaction.client_from);
  if (balance >= parseInt(transaction.amount, 10))
  {
    console.log("Transaction is valid");
    //add new block
    addNewTransaction(transaction.client_from, transaction.client_to, transaction.amount, transaction.description);
    //send both transaction information and server number
    server1.emit('addblock', {
      transaction: transaction,
      server: 1
    });
    server3.emit('addblock', {
      transaction: transaction,
      server: 1
    });
    return 1;
  }
  else
  {
    console.log("Transaction failed. Insufficient funds.");
    return 2;
  }
}

//Server wealth
var serverWealth = [1, 3, 5];
var servers = ['', 'self', ''];

var server3001 = express();

//Set static path
server3001.use(express.static('public'));

var server = server3001.listen(3001, function(){
  serverInitialise();
  console.log('Server started on port 3001');
  console.log(blockChain);
  console.log(randomNumber({min: 1, max: 9, integer: true}));
})

//set up socket
var io = socket(server);

//Check for other servers
server1.on('connect', function(){
  console.log("Connected to 3000");
  //server1.emit('identifyServer', 1);
})

server3.on('connect', function(){
  console.log("Connected to 3002");
  //server3.emit('identifyServer', 1);
})

//Check for connection
io.on('connection', function(socket){
  console.log("Client " + socket.id + " has connected to server");
  socket.on('validate', function(data){
    console.log('Validating data');
    console.log("communicating with " + socket.id);
    io.to(socket.id).emit('status', validateRequest(data.transaction));
    //update wealth for itself
    serverWealth[1] += 3;
    console.log(blockChain.chain[blockChain.chain.length-1].data);
  });
  socket.on('addblock', function(data){
    addNewTransaction(data.transaction.client_from, data.transaction.client_to, data.transaction.amount, data.transaction.description);
    console.log(blockChain.chain[blockChain.chain.length-1].data);
  });
  socket.on('increaseWealth', function(data){
    serverWealth[data] += 3;
    console.log(serverWealth);
  });
});

//Body parser middleware
server3001.use(bodyParser.json());
server3001.use(bodyParser.urlencoded({extended: false}));

/*server3001.get('/', function(request, response){
  response.sendFile(__dirname + '/public/index.html');
})*/

server3001.post('/', function(request, response){
  console.log(request.body);
  console.log("Request received");
  var chooseServer = getRandomServer(serverWealth);
  //var chooseServer = 1;
  if (!chooseServer)
  {
    server1.emit('validate', {
      transaction: request.body,
      server: 1
    });
    server3.emit('increaseWealth', 0);
    server1.on('status', function(data){
      if (!data) //invalid blockchain
      {
        response.sendFile(__dirname + '/public/invalidChain.html');
      }
      else if (data==1) //success
      {
        response.sendFile(__dirname + '/public/success.html');
      }
      else if (data==2) //insufficient funds
      {
        response.sendFile(__dirname + '/public/insufficientFunds.html')
      }
      else
      {
        console.log("Invalid return of validation request");
      }
      //response.end();
    })
  }
  else if (chooseServer==1)
  {
    //Need to validate request
    console.log("Validating data");
    var valid = validateRequest(request.body);
    if (!valid) //invalid blockchain
    {
      response.sendFile(__dirname + '/public/invalidChain.html');
    }
    else if (valid==1) //success
    {
      response.sendFile(__dirname + '/public/success.html');
    }
    else if (valid==2) //insufficient funds
    {
      response.sendFile(__dirname + '/public/insufficientFunds.html')
    }
    else
    {
      console.log("Invalid return of validation request");
    }
    //response.end();
    console.log(blockChain.chain[blockChain.chain.length-1].data);
  }
  else if (chooseServer==2)
  {
    server3.emit('validate', {
      transaction: request.body,
      server: 1
    });
    server1.emit('increaseWealth', 2);
    server3.on('status', function(data){
      if (!data) //invalid blockchain
      {
        response.sendFile(__dirname + '/public/invalidChain.html');
      }
      else if (data==1) //success
      {
        response.sendFile(__dirname + '/public/success.html');
      }
      else if (data==2) //insufficient funds
      {
        response.sendFile(__dirname + '/public/insufficientFunds.html')
      }
      else
      {
        console.log("Invalid return of validation request");
      }
      //response.end();
    })
  }
  else
  {
    console.log("Error with getRandomServer: Server chosen not on list");
  }
  serverWealth[chooseServer] += 3;
  console.log(serverWealth);
  //response.sendFile(__dirname + '/public/index2.html');
});
