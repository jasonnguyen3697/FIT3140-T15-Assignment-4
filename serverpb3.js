var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var expressValidator = require('express-validator');
var socket = require('socket.io');
var server1 = require('socket.io-client')('http://localhost:3000');
var server2 = require('socket.io-client')('http://localhost:3001');
var BlockChainClass = require("./blockChainClass.js");
var BlockClass = require("./blockClass.js");
var randomNumber = require('random-number');
var protobuf = require('protocol-buffers');
var fs = require('fs'); // file system
var messages = protobuf(fs.readFileSync('transac.proto'));

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
function addNewTransaction(transaction)
{
  var obj = messages.Transac.decode(transaction);
  blockChain.addBlock(new BlockClass(blockChain.chain.length, Date(), {
    from: obj.from,
    to: obj.to,
    amount: obj.amount,
    description: obj.description
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
  var obj = messages.Transac.decode(transaction);
  if (!blockChain.isChainValid())
  {
    console.log("Block chain is not valid. Transaction failed.");
    return 0;
  }
  var balance = checkBalance(obj.from);
  if (balance >= parseInt(obj.amount, 10))
  {
    console.log("Transaction is valid");
    //add new block
    addNewTransaction(transaction);
    //send both transaction information and server number
    server1.emit('addblock', {
      transaction: transaction,
      server: 2
    });
    server2.emit('addblock', {
      transaction: transaction,
      server: 2
    });
  }
  else
  {
    console.log("Transaction failed. Insufficient funds.");
  }
}

//Server wealth
var serverWealth = [1, 3, 5];

var server3002 = express();

//Set static path
server3002.use(express.static('public'));

var server = server3002.listen(3002, function(){
  serverInitialise();
  console.log('Server started on port 3002');
  console.log(blockChain);
  console.log(randomNumber({min: 1, max: 9, integer: true}));
})

//set up socket
var io = socket(server);

//Check for other servers
server1.on('connect', function(){
  console.log("Connected to 3000");
})

server2.on('connect', function(){
  console.log("Connected to 3001");
})

//Check for connection
io.on('connection', function(socket){
  console.log("Client " + socket.id + " has connected to server");
  socket.on('validate', function(data){
    validateRequest(data);
    //update wealth for itself
    serverWealth[2] += 3;
    console.log(blockChain.chain[blockChain.chain.length-1].data);
  });
  socket.on('addblock', function(data){
    addNewTransaction(data);
    //update wealth of other server
    serverWealth[data.server] += 3;
  });
});

//Body parser middleware
server3002.use(bodyParser.json());
server3002.use(bodyParser.urlencoded({extended: false}));

server3002.post('/', function(request, response){
  console.log(request.body);
  //var chooseServer = getRandomServer(serverWealth);
  var chooseServer = 2;
  var buf = messages.Transac.encode({
    from: request.body.client_from,
    to: request.body.client_to,
    amount: request.body.amount,
    description: request.body.description
  });
  if (!chooseServer)
  {
    server1.emit('validate', buf);
  }
  else if (chooseServer==1)
  {
    server2.emit('validate', buf);
  }
  else if (chooseServer==2)
  {
    //Need to validate request
    validateRequest(buf);
    console.log(blockChain.chain[blockChain.chain.length-1].data);
  }
  else
  {
    console.log("Error with getRandomServer: Server chosen not on list");
  }
  serverWealth[chooseServer] += 3;
  response.sendFile(__dirname + '/public/index.html');
});
