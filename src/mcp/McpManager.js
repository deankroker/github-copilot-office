const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.copilot-office');
const CONFIG_PATH = path.join(CONFIG_DIR, 'mcp-servers.json');

const DEFAULT_SERVERS = {
  "Azure": {
    "name": "Azure",
    "description": "Azure resource management and CLI tools",
    "command": "npx",
    "args": ["-y", "@azure/mcp@latest", "server", "start"],
    "type": "stdio"
  },
  "workiq": {
    "name": "WorkIQ",
    "description": "Microsoft WorkIQ tools",
    "command": "npx",
    "args": ["-y", "@microsoft/workiq", "mcp"],
    "type": "stdio"
  },
  "portaltelemetry": {
    "name": "Portal Telemetry",
    "description": "Azure Portal telemetry and analytics",
    "url": "https://eacopilotsvcs-test-westus-g9ezc2hva3g0are8.westus-01.azurewebsites.net/portaltelemetry/mcp",
    "type": "http"
  }
};

// Dynamic imports for the ESM-only @modelcontextprotocol/sdk
async function createStdioTransport(config) {
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  return new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env: config.env ? { ...process.env, ...config.env } : undefined,
  });
}

async function createHttpTransport(config) {
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  return new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: {
      headers: config.headers || {},
    },
  });
}

async function createClient() {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  return new Client({ name: "copilot-office", version: "1.0.0" });
}

// ============================================================
// MCP Manager - manages all MCP server connections
// ============================================================

class McpManager {
  constructor() {
    this.servers = new Map(); // id -> { config, client, transport, tools, status, error }
    this.config = null;
  }

  loadConfig() {
    // Ensure config dir exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Create default config if it doesn't exist
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({ servers: DEFAULT_SERVERS }, null, 2));
    }

    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      this.config = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse MCP config:', e);
      this.config = { servers: DEFAULT_SERVERS };
    }

    return this.config;
  }

  reloadConfig() {
    this.loadConfig();
    return this.config;
  }

  getServerList() {
    if (!this.config) this.loadConfig();

    const result = [];
    for (const [id, serverConfig] of Object.entries(this.config.servers)) {
      const state = this.servers.get(id);
      result.push({
        id,
        name: serverConfig.name || id,
        description: serverConfig.description || '',
        type: serverConfig.type || 'stdio',
        status: state?.status || 'disconnected',
        error: state?.error || null,
        toolCount: state?.tools?.length || 0,
      });
    }
    return result;
  }

  async connectServer(id) {
    if (!this.config) this.loadConfig();

    const serverConfig = this.config.servers[id];
    if (!serverConfig) throw new Error(`Unknown MCP server: ${id}`);

    // Disconnect if already connected
    if (this.servers.has(id)) {
      await this.disconnectServer(id);
    }

    const type = serverConfig.type || (serverConfig.command ? 'stdio' : 'http');
    let transport;
    if (type === 'stdio') {
      transport = await createStdioTransport(serverConfig);
    } else if (type === 'http') {
      transport = await createHttpTransport(serverConfig);
    } else {
      throw new Error(`Unknown transport type: ${type}`);
    }

    const client = await createClient();
    const state = { config: serverConfig, client, transport, tools: [], status: 'connecting', error: null };
    this.servers.set(id, state);

    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      state.tools = (tools || []).map(t => ({
        ...t,
        serverId: id,
        // Prefix to avoid collisions with Office tools
        prefixedName: `mcp_${id}_${t.name}`,
      }));
      state.status = 'connected';
      console.log(`[MCP] Connected to ${id}: ${state.tools.length} tools`);
    } catch (e) {
      state.status = 'error';
      state.error = e.message;
      console.error(`[MCP] Failed to connect to ${id}:`, e.message);
      throw e;
    }

    return state;
  }

  async disconnectServer(id) {
    const state = this.servers.get(id);
    if (state?.client) {
      try {
        await state.client.close();
      } catch (e) {
        // Ignore errors during disconnect
      }
    }
    this.servers.delete(id);
  }

  async restartServer(id) {
    await this.disconnectServer(id);
    return await this.connectServer(id);
  }

  getAllTools() {
    const tools = [];
    for (const [, state] of this.servers) {
      if (state.status === 'connected') {
        tools.push(...state.tools);
      }
    }
    return tools;
  }

  async callTool(prefixedName, args) {
    for (const [, state] of this.servers) {
      const tool = state.tools.find(t => t.prefixedName === prefixedName);
      if (tool) {
        const result = await state.client.callTool({ name: tool.name, arguments: args });
        return result;
      }
    }
    throw new Error(`MCP tool not found: ${prefixedName}`);
  }

  getConfigPath() {
    return CONFIG_PATH;
  }
}

// Singleton
let instance = null;
function getMcpManager() {
  if (!instance) {
    instance = new McpManager();
    instance.loadConfig();
  }
  return instance;
}

module.exports = { McpManager, getMcpManager };
