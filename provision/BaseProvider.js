const fs = require('fs');
const readline = require('readline');

function BaseProvider() {
  this.name = 'BaseProvider';
}

BaseProvider.prototype.init = function(client) {
  this.redis = client;
  return this;
};

// Each provider must overwrite this method
BaseProvider.prototype.getEntries = function() {
  return Promise.reject('Not implemented for ' + this.name);
};

BaseProvider.prototype.execute = function() {
  return this.getEntries()
    .then((entries) => {
      const stream = new ReadableArrayStream(entries, 5000);
      const executePromise = new Promise((resolve, reject) => {
        var chunk = stream.read();

        const self = this;
        function loop() {
          if (!chunk) {
            return resolve();
          }

          return new Promise((resolve, reject) => {
            return self.saveToRedis(chunk).then(() => {
              chunk = stream.read();
              return loop();
            });
          });
        }

        return loop();
      });

      return executePromise;
    });
}

BaseProvider.prototype.saveToRedis = function(entries) {
  const pipeline = this.redis.pipeline();
  entries.forEach((entry) => {
    pipeline.set(entry, 0);
  });

  return pipeline.exec();
};

BaseProvider.prototype.readFile = function(path) {
  return new Promise((resolve) => {
    var lines = [];
    readline.createInterface({
      input: fs.createReadStream(path),
      terminal: false
    }).on('line', (line) => {
      lines.push(line);
    }).on('close', () => {
      resolve(lines);
    });
  });
}
BaseProvider.prototype.fileExists = function(path) {
  return new Promise((resolve) => {
    fs.stat(path, (err) => {
      resolve(err == null);
    });
  });
}

// Stream for processing big arrays
var Readable = require("stream").Readable;
var inherits = require("util").inherits;

function ReadableArrayStream(list, chunk) {
  Readable.call(this, {objectMode: true});
  this.list = list;
  this.chunk = chunk;
}
inherits(ReadableArrayStream, Readable)

ReadableArrayStream.prototype._read = function(size) {
  if (!this.list || this.list.length === 0) {
    this.push(null);
    return;
  }

  this.push(this.list.slice(0, this.chunk));
  this.list = this.list.slice(this.chunk);  
}

module.exports = BaseProvider;
