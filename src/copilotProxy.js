const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const { pathToFileURL } = require('url');

// Resolve the @github/copilot bin entry point
const COPILOT_MODULE = path.resolve(__dirname, '../node_modules/@github/copilot/index.js');
const COPILOT_MODULE_URL = pathToFileURL(COPILOT_MODULE).href;

// Check if running in Electron
const isElectron = !!(process.versions && process.versions.electron);

/**
 * Spawn the Copilot CLI process.
 * 
 * When running under Electron with ELECTRON_RUN_AS_NODE, we need to use a special
 * approach: the Copilot CLI expects process.argv to NOT include a script path
 * (it treats argv[1] as a positional argument if it doesn't start with -).
 * 
 * So instead of: electron.exe copilot.js --server --stdio
 * We use: electron.exe -e "inline code that sets argv and imports copilot"
 */
function spawnCopilotProcess() {
  if (isElectron) {
    // Create inline code that:
    // 1. Sets process.argv to what the CLI expects (no script path)
    // 2. Dynamically imports the copilot module
    const wrapperCode = `
      process.argv = [process.argv[0], '--server', '--stdio'];
      import('${COPILOT_MODULE_URL}');
    `;
    
    return spawn(process.execPath, ['--input-type=module', '-e', wrapperCode], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });
  } else {
    return spawn(process.execPath, [COPILOT_MODULE, '--server', '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }
}

function setupCopilotProxy(httpsServer) {
  const wss = new WebSocketServer({ noServer: true });

  const upgradeHandler = (request, socket, head) => {
    const url = new URL(request.url, `https://${request.headers.host}`);
    
    if (url.pathname === '/api/copilot') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Let other WebSocket connections (e.g., Vite HMR) pass through
  };

  httpsServer.on('upgrade', upgradeHandler);

  // Store cleanup function on the server
  httpsServer.closeWebSockets = () => {
    wss.clients.forEach(client => client.terminate());
    wss.close();
  };

  wss.on('connection', (ws) => {
    const child = spawnCopilotProcess();

    child.on('error', () => {
      ws.close(1011, 'Child process error');
    });

    child.on('exit', () => {
      ws.close(1000, 'Child process exited');
    });

    // Buffer for incomplete LSP messages
    let buffer = Buffer.alloc(0);

    // Proxy child stdout -> WebSocket (buffer complete LSP messages)
    child.stdout.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      // Process complete messages from buffer
      let iterations = 0;
      while (iterations++ < 100) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        
        const header = buffer.slice(0, headerEnd).toString('utf8');
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          buffer = buffer.slice(headerEnd + 4);
          continue;
        }
        
        const contentLength = parseInt(match[1], 10);
        const messageEnd = headerEnd + 4 + contentLength;
        
        if (buffer.length < messageEnd) break;
        
        const message = buffer.slice(0, messageEnd);
        buffer = buffer.slice(messageEnd);
        
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      }
    });

    // Proxy WebSocket -> child stdin
    ws.on('message', (data) => {
      if (!child.killed) {
        child.stdin.write(data);
      }
    });

    ws.on('close', () => {
      if (!child.killed) {
        child.kill();
      }
    });

    ws.on('error', () => {
      if (!child.killed) {
        child.kill();
      }
    });
  });
}

module.exports = { setupCopilotProxy };
