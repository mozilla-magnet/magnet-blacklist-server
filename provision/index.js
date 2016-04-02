const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const config = require('yajsonfig')(__dirname + '/config.json');
const redis = new Redis(config);

function getProviders() {
  var providers = [];
  return new Promise((resolve, reject) => {
    fs.readdir(__dirname, (err, listing) => {
      if (err) {
        return reject(err);
      }
      listing.forEach((entry) => {
        const candidate = path.join(__dirname, entry);
        if (fs.statSync(candidate).isDirectory()) {
          providers.push(require(candidate));
        }
      });
      resolve(providers);
    });
  });
}

getProviders()
  .then((providers) => {
    return providers.map((provider) => {
      return provider.init(redis);
    });
  })
  .then((providers) => {
    var ops = [];
    providers.forEach((provider) => {
      ops.push(provider.execute());
    });

    return Promise.all(ops);
  })
  .then((results) => {
    process.exit(0);
  }, (err) => {
    console.error(err);
    process.exit(1);
  });
