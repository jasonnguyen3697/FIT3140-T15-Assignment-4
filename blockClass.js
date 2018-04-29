const SHA256 = require('crypto-js/sha256');

module.exports = class Block
{
  constructor(index, timeStamp, data, prevHash = "")
  {
    this.index = index;
    this.timeStamp = timeStamp;
    this.data = data;
    this.prevHash = prevHash;
    this.hash = this.calculateHash();
  }
  calculateHash()
  {
    return SHA256(this.index + this.prevHash + this.timeStamp + JSON.stringify(this.data)).toString();
  }
}
