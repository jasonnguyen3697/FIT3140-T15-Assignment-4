var BlockChainClass = require("./blockChainClass.js");
var BlockClass = require("./blockClass.js");

//initialise a block chain
var blockChain = new BlockChainClass();

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

blockChain.addBlock(new BlockClass(3, Date(), {
  target: "Alex",
  amount: 40
}));

console.log(JSON.stringify(blockChain, null, 4));
console.log("Blockchain valid: " + blockChain.isChainValid());
