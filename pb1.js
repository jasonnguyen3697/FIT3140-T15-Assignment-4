var protobuf = require('protocol-buffers');
var fs = require('fs'); // file system
var fromcl=1;
var tocl=3;
var cost=20;
var des="apples"
var messages = protobuf(fs.readFileSync('transac.proto'));

var buf = messages.Transac.encode({
    from: fromcl,
    to:tocl,
    amount: cost,
    desc: des
});
console.log(buf);
    var obj = messages.Transac.decode(buf);
console.log(obj)