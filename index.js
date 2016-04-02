const existsInPath = require('fs-exists-in-path');

existsInPath('redis-server', (err, exists) => {
  if (err || !exists) {
    console.error('Could not find redis-server.');
    return;
  }

  launchRedis();
});

function launchRedis() {
  const spawn = require('child_process').spawn;
  spawn('redis-server', [], {
    stdio: 'inherit'
  });
}