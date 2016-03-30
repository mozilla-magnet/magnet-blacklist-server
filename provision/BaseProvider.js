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
      const pipeline = this.redis.pipeline();

      entries.forEach((entry) => {
        pipeline.set(entry, 0);
      });

      return pipeline.exec();
    });
}

module.exports = BaseProvider;
