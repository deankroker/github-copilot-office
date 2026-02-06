const { getMcpManager } = require('./McpManager');

/**
 * Mount MCP API routes onto an Express router.
 */
function setupMcpRoutes(apiRouter) {
  // List all configured MCP servers with status
  apiRouter.get('/mcp/servers', (req, res) => {
    const manager = getMcpManager();
    res.json({ servers: manager.getServerList(), configPath: manager.getConfigPath() });
  });

  // Get all tools from connected MCP servers
  apiRouter.get('/mcp/tools', (req, res) => {
    const manager = getMcpManager();
    res.json({ tools: manager.getAllTools() });
  });

  // Connect (start) a server
  apiRouter.post('/mcp/servers/:id/connect', async (req, res) => {
    try {
      const manager = getMcpManager();
      await manager.connectServer(req.params.id);
      res.json({ success: true, servers: manager.getServerList() });
    } catch (e) {
      res.json({ success: false, error: e.message, servers: getMcpManager().getServerList() });
    }
  });

  // Disconnect (stop) a server
  apiRouter.post('/mcp/servers/:id/disconnect', async (req, res) => {
    try {
      const manager = getMcpManager();
      await manager.disconnectServer(req.params.id);
      res.json({ success: true, servers: manager.getServerList() });
    } catch (e) {
      res.json({ success: false, error: e.message, servers: getMcpManager().getServerList() });
    }
  });

  // Restart a server
  apiRouter.post('/mcp/servers/:id/restart', async (req, res) => {
    try {
      const manager = getMcpManager();
      await manager.restartServer(req.params.id);
      res.json({ success: true, servers: manager.getServerList() });
    } catch (e) {
      res.json({ success: false, error: e.message, servers: getMcpManager().getServerList() });
    }
  });

  // Reload config from disk
  apiRouter.post('/mcp/reload', (req, res) => {
    const manager = getMcpManager();
    manager.reloadConfig();
    res.json({ success: true, servers: manager.getServerList(), configPath: manager.getConfigPath() });
  });

  // Execute an MCP tool call
  apiRouter.post('/mcp/call', async (req, res) => {
    try {
      const manager = getMcpManager();
      const { toolName, arguments: args } = req.body;
      const result = await manager.callTool(toolName, args);
      res.json({ result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { setupMcpRoutes };
