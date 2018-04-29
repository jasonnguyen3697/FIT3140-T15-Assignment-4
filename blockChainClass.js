var BlockClass = require('./blockClass.js');

module.exports = class BlockChain
{
  constructor()
  {
    //chain is an array with initial genesis block
    this.chain = [this.createGenesisBlock()];
  }

  //create genesis block (first block)
  createGenesisBlock()
  {
    return new BlockClass(0, Date(), "Genesis Block", "0");
  }

  //return latest block
  getLatestBlock()
  {
    return this.chain[this.chain.length - 1];
  }

  //add new block to chain
  addBlock(newBlock)
  {
    //assign prehash
    newBlock.prevHash = this.getLatestBlock().hash;
    //calculate hash of new block
    newBlock.hash = newBlock.calculateHash();
    //push to chain
    this.chain.push(newBlock);
  }

  //check if chain is valid or not
  isChainValid()
  {
    for (let i = 1; i < this.chain.length; i++)
    {
      const currentBlock = this.chain[i];
      const prevBlock = this.chain[i-1];
      if (currentBlock.hash != currentBlock.calculateHash())
      {
        return false;
      }
      if (currentBlock.prevHash != prevBlock.hash)
      {
        return false;
      }
    }
    return true;
  }
}
