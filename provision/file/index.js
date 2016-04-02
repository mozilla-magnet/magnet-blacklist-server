const util = require('util');
const BaseProvider = require('../BaseProvider');

function FileBlackList() {
  this.name = 'FileBlackList';
}

util.inherits(FileBlackList, BaseProvider);

FileBlackList.prototype.getEntries = function() {
  const path = '/tmp/blacklist.txt';

  return this.fileExists(path)
    .then((exists) => {
      if (!exists) {
        return [];
      }

      return this.readFile(path);
    });
};

module.exports = new FileBlackList();
