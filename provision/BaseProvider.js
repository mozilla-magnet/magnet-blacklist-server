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
        var count = 0;

        const self = this;
        function loop() {
          if (!chunk) {
            return resolve();
          }

          return new Promise((resolve, reject) => {
            console.log('About to parse chunk ', count);
            return self.saveToRedis(chunk).then(() => {
              count++;
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

BaseProvider.prototype.saveToRedis = function(entries) {
  const pipeline = this.redis.pipeline();
  entries.forEach((entry) => {
    pipeline.set(entry, 0);
  });

  return pipeline.exec();
};

module.exports = BaseProvider;
