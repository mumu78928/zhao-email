/**
 * SEA (Single Executable Application) entry point.
 * This is a small launcher that sets up env vars and loads the server
 * from a file alongside the EXE.
 *
 * Release package structure:
 *   EmailClient.exe   (this file, compiled as SEA)
 *   server.cjs        (esbuild-bundled server code)
 *   dist/             (frontend static files)
 */
var path = require('path');
var childProcess = require('child_process');

// Determine the directory containing this EXE
var exeDir = path.dirname(process.execPath);

// Set environment variables BEFORE loading the server
process.env.SERVE_STATIC = 'true';
process.env.PORT = process.env.PORT || '3001';
process.env.STATIC_PATH = path.join(exeDir, 'dist');

console.log('Starting Email Client...');
console.log('Executable directory:', exeDir);
console.log('Static path:', process.env.STATIC_PATH);
console.log('Port:', process.env.PORT);

// Load the server code from a file alongside the EXE
var serverPath = path.join(exeDir, 'server.cjs');
console.log('Loading server from:', serverPath);

try {
  require(serverPath);
  console.log('Server loaded successfully');
} catch (err) {
  console.error('Failed to load server:', err.message);
  console.error(err.stack);
  process.exit(1);
}

// Open the default browser after server starts
setTimeout(function () {
  var url = 'http://localhost:' + process.env.PORT;
  console.log('Opening browser at:', url);
  childProcess.exec('start "" "' + url + '"', function (err) {
    if (err) {
      console.error('Failed to open browser. Please open ' + url + ' manually.');
    }
  });
}, 2000);
