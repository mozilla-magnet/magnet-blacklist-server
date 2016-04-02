const util = require('util');
const BaseProvider = require('../BaseProvider');
const tmp = require('tmp');
const Download = require('download');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const DOWNLOAD_URL = 'http://urlblacklist.com/cgi-bin/commercialdownload.pl?type=download&file=bigblacklist';

function UrlBlackList() {
  this.name = 'UrlBlackList';
}

util.inherits(UrlBlackList, BaseProvider);

UrlBlackList.prototype.checkCached = function() {
  const cachedDir = '/tmp/blacklists';

  return fileExists(cachedDir)
    .then((result) => {
      return result ? cachedDir : null;
    });
};

UrlBlackList.prototype.getEntries = function() {
  return this.checkCached()
    .then((cachedDir) => {
      if (cachedDir) {
        return cachedDir;
      } else {
        return this.downloadNewList();
      }
    })
    .then((directory) => {
      return this.processDirectory(directory);
    });
};

UrlBlackList.prototype.downloadNewList = function() {
  return new Promise((resolve, reject) => {
    tmp.dir((err, dest, fd, cleanup) => {
      if (err) {
        return reject(err);
      }

      console.log('Downloading in ', dest);
      new Download({mode: '755', extract: true})
        .get(DOWNLOAD_URL)
        .dest(dest)
        .run((err, files) => {
          if (err) {
            return reject(err);
          }
          resolve(path.join(dest, 'blacklists'));
        });
    });
  });
}

UrlBlackList.prototype.processDirectory = function(location) {
  var candidates = this.generateCandidates(location);
  var datas = [];
  candidates.forEach((candidate) => {
    datas.push(this.readCandidate(candidate));
  });

  return Promise.all(datas).then((results) => {
    return results.join().split(',');
  });
}

UrlBlackList.prototype.readCandidate = function(candidate) {
  const paths = [];
  paths.push(path.join(candidate, 'domains'));
  paths.push(path.join(candidate, 'urls'));

  const domainsExist = fileExists(paths[0]);
  const urlsExist = fileExists(paths[1]);

  return Promise.all([domainsExist, urlsExist])
    .then((candidates) => {
      const filesContent = [];
      candidates.forEach((exists, index) => {
        if (!exists) {
          return;
        }

        filesContent.push(readFile(paths[index]));
      });

      return Promise.all(filesContent);
    })
    .then((contents) => {
      return [contents.join()];
    });
}

UrlBlackList.prototype.generateCandidates = function(directory) {
  return this.getForbiddenTypes().map((entry) => {
    return path.join(directory, entry);
  });
};

UrlBlackList.prototype.getForbiddenTypes = function() {
  return [
    'ads',
    'adult',
    'aggressive',
    'dialers',
    'mixed_adult',
    'phising',
    'porn',
    'sexuality',
    'spyware',
    'virusinfected'
  ];
}

function readFile(path) {
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

function fileExists(path) {
  return new Promise((resolve) => {
    fs.stat(path, (err) => {
      resolve(err == null);
    });
  });
}

module.exports = new UrlBlackList();
