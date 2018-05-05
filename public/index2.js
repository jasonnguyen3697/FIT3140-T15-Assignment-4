//var socket1 = io.connect('http://localhost:3000');
var socket = io.connect('http://localhost:3001');
//var socket3 = io.connect('http://localhost:3002');

var from = document.forms["transaction"]["client_from"];
var to = document.forms["transaction"]["client_to"];
var amount = document.forms["transaction"]["amount"];
var description = document.forms["transaction"]["description"];
var error_from = document.getelementbyID("error_client_from");
var error_to = document.getelementbyID("error_client_to");
var error_amount = document.getelementbyID("error_amount");
var error_description = document.getelementbyID("error_description");
var error = 0;
