/**
 * SEA (Single Executable Application) entry point.
 * This file combines launcher logic + server into a single bundled file.
 * Environment variables MUST be set before requiring the server.
 */
var path = require('path');
var childProcess = require('child_process');

// Set environment variables BEFORE requiring the server
process.env.SERVE_STATIC = 'true';
process.env.PORT = process.env.PORT || '3001';

// Detect SEA: in SEA, process.execPath is the EXE path (not node.exe)
// process.pkg is for pkg, for SEA we check if the execPath ends with our app name
var exeDir = path.dirname(process.execPath);
process.env.STATIC_PATH = path.join(exeDir, 'dist');

console.log('Starting Email Client...');
console.log('Static path:', process.env.STATIC_PATH);
console.log('Port:', process.env.PORT);

// Start the Express server (esbuild will inline all server code here)
require('../api/server.js');

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
