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

var server3001 = express();

var server = server3001.listen(3001, function(){
  console.log("Server started on port 3001");
})

//set up socket
var io = socket(server);

//Server wealth
var serverWealth = [1, 3, 5];
var servers = ['', 'self', ''];

//Check for other servers
server1.on('connect', function(){
  console.log("Connected to 3000");
  server1.emit('identifyServer', 1);
})

server3.on('connect', function(){
  console.log("Connected to 3002");
  server3.emit('identifyServer', 1);
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
