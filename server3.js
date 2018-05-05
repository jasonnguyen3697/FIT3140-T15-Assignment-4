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

var server3002 = express();

var server = server3002.listen(3002, function(){
  console.log("Server started on port 3002");
})

//Server wealth
var serverWealth = [1, 3, 5];
var servers = ['', '', 'self'];

//set up socket
var io = socket(server);

//Check for other servers
server1.on('connect', function(){
  console.log("Connected to 3000");
  console.log(server1);
  server1.emit('identifyServer', 2);
  /*server1.on('identifyServer', function(data){
    servers[data] =
  })
  */
})

server2.on('connect', function(){
  console.log("Connected to 3001");
  server2.emit('identifyServer', 2);
})

//Check for connection
io.on('connection', function(socket){
  console.log("Client " + socket.id + " has connected to server");
  console.log(socket.handshake);
  socket.on('identifyServer', function(data){
    servers[data] = socket.id;
    console.log(servers);
  });
});
