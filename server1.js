var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var expressValidator = require('express-validator');
var socket = require('socket.io');
var server2 = require('socket.io-client')('http://localhost:3001');
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

//Server wealth
var serverWealth = [1, 3, 5];

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
    server2.emit('addblock', {
      transaction: transaction,
      server: 0
    });
    server3.emit('addblock', {
      transaction: transaction,
      server: 0
    });
    return 1;
  }
  else
  {
    console.log("Transaction failed. Insufficient funds.");
    return 2;
  }
}

//Initialise server
var server3000 = express();

//Set static path
//server3000.use(express.static('public'));

//make server listen on port 3000
var server = server3000.listen(3000, function(){
  serverInitialise();
  console.log('Server started on port 3000');
  console.log(blockChain);
  console.log(randomNumber({min: 1, max: 9, integer: true}));
});

//Socket setup
var io = socket(server);

//Check for other servers connection
server2.on("connect", function(){
  console.log("Connect to 3001");
});


server3.on("connect", function(){
  console.log("Connect to 3002");
});

//Check for connection
io.on('connection', function(socket){
  console.log("Client " + socket.id + " has connected to server");
  socket.on('validate', function(data){
    console.log('Validating data');
    validateRequest(data);
    serverWealth[0] += 3;
    console.log(blockChain.chain[blockChain.chain.length-1].data);
  });
  socket.on('addblock', function(data){
    addNewTransaction(data.transaction.client_from, data.transaction.client_to, data.transaction.amount, data.transaction.description);
    console.log(blockChain.chain[blockChain.chain.length-1].data);
    serverWealth[data.server] += 3;
  });
});

//Body parser middleware
server3000.use(bodyParser.json());
server3000.use(bodyParser.urlencoded({extended: false}));

//Global variables
server3000.use(function(request, response, next){
  response.locals.errors = null;
  //can add any global variable here using response.locals syntax
  next();
})

//Express Validator Middleware
server3000.use(expressValidator({
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.'),
    root = namespace.shift();
    formParam = root;

    while (namespace.length)
    {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param: formParam,
      msg : msg,
      value: value
    };
  }
}));

server3000.get('/', function(request, response){
  response.sendFile(__dirname + '/public/index1.html');
})

server3000.post('/', function(request, response){
  console.log(request.body);
  console.log("Request received");
  var chooseServer = getRandomServer(serverWealth);
  //var chooseServer = 0;
  if (!chooseServer)
  {
    //Need to validate request
    console.log("Validating data");
    validateRequest(request.body);
    console.log(blockChain.chain[blockChain.chain.length-1].data);
  }
  else if (chooseServer==1)
  {
    server2.emit('validate', request.body);
  }
  else if (chooseServer==2)
  {
    server3.emit('validate', request.body);
  }
  else
  {
    console.log("Error with getRandomServer: Server chosen not on list");
  }
  serverWealth[chooseServer] += 3;
  response.sendFile(__dirname + '/public/index1.html');
});
