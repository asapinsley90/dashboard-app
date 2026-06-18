const http = require('http');
const { spawn, exec } = require('child_process');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;

function waitForServer(targetUrl, timeoutMs = 30000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`${targetUrl}/api/db`, res => {
        // Drain body to avoid socket hangups.
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      req.on('error', retry);
      req.setTimeout(2500, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`Timed out waiting for server at ${targetUrl}`));
        return;
      }
      setTimeout(tryOnce, 500);
    };

    tryOnce();
  });
}

function openBrowser(targetUrl) {
  const platform = process.platform;
  const escaped = targetUrl.replace(/&/g, '^&');

  if (platform === 'win32') {
    exec(`start "" "${escaped}"`);
    return;
  }
  if (platform === 'darwin') {
    exec(`open "${targetUrl}"`);
    return;
  }
  exec(`xdg-open "${targetUrl}"`);
}

const child = spawn(process.execPath, ['app.js'], {
  stdio: 'inherit',
  env: { ...process.env },
});

waitForServer(url)
  .then(() => {
    console.log(`Opening ${url}`);
    openBrowser(url);
  })
  .catch(err => {
    console.error(err.message);
  });

const shutdown = signal => {
  if (child.killed) return;
  child.kill(signal);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

child.on('exit', code => {
  process.exitCode = code || 0;
});
