import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3001/mcp';
const BRIDGE_PORT = Number(process.env.PORT) || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY_MS = 2000;

// ─── MCP Client Singleton ────────────────────────────────────────────────────

interface ClientState {
  client: Client | null;
  isConnecting: boolean;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  /** Resolves all pending getMcpClient() calls once connected */
  pendingResolvers: Array<() => void>;
}

const state: ClientState = {
  client: null,
  isConnecting: false,
  reconnectAttempts: 0,
  reconnectTimer: null,
  pendingResolvers: [],
};

async function createAndConnect(): Promise<Client> {
  const client = new Client(
    { name: 'mcp-bridge-client', version: '1.0.0' },
    { capabilities: {} },
  );

  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
  await client.connect(transport);

  client.onclose = () => {
    console.warn('[Bridge] MCP connection closed — scheduling reconnect');
    state.client = null;
    scheduleReconnect();
  };

  client.onerror = (err) => {
    console.error('[Bridge] MCP client error:', err.message);
  };

  state.reconnectAttempts = 0;
  console.log(`[Bridge] MCP Client connected → ${MCP_SERVER_URL}`);
  return client;
}

function scheduleReconnect(): void {
  if (state.reconnectTimer !== null) return;
  if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[Bridge] Max reconnect attempts reached. Give up.');
    return;
  }

  // Exponential back-off capped at 30 s
  const delay = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** state.reconnectAttempts,
    30_000,
  );
  state.reconnectAttempts++;
  console.log(`[Bridge] Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  state.reconnectTimer = setTimeout(async () => {
    state.reconnectTimer = null;
    try {
      state.client = await createAndConnect();
      // Wake up any callers waiting for the client
      const resolvers = state.pendingResolvers.splice(0);
      resolvers.forEach(r => r());
    } catch (err) {
      console.error('[Bridge] Reconnect failed:', (err as Error).message);
      scheduleReconnect();
    }
  }, delay);
}

/**
 * Returns the shared MCP Client, connecting lazily on first call.
 * Concurrent callers are queued and wake up together once connected.
 */
async function getMcpClient(): Promise<Client> {
  if (state.client) return state.client;

  if (state.isConnecting) {
    // Wait for the in-flight connection attempt
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = state.pendingResolvers.indexOf(resolve);
        if (idx !== -1) state.pendingResolvers.splice(idx, 1);
        reject(new Error('MCP client connection timeout (10 s)'));
      }, 10_000);

      state.pendingResolvers.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    if (!state.client) throw new Error('MCP client unavailable after wait');
    return state.client;
  }

  state.isConnecting = true;
  try {
    state.client = await createAndConnect();
    // Wake queued callers (edge case if multiple entered before isConnecting=true)
    const resolvers = state.pendingResolvers.splice(0);
    resolvers.forEach(r => r());
    return state.client;
  } catch (err) {
    state.pendingResolvers.forEach(r => r()); // unblock waiters so they surface error
    state.pendingResolvers.length = 0;
    throw err;
  } finally {
    state.isConnecting = false;
  }
}

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }),
);

app.use(express.json());

/** GET /api/tools — list available MCP tools */
app.get('/api/tools', async (_req: Request, res: Response) => {
  try {
    const client = await getMcpClient();
    const result = await client.listTools();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'MCP service unavailable';
    console.error('[Bridge] listTools error:', message);
    res.status(503).json({ error: message });
  }
});

/** POST /api/call-tool — invoke an MCP tool */
app.post('/api/call-tool', async (req: Request, res: Response) => {
  const { name, arguments: toolArgs } = req.body as {
    name?: unknown;
    arguments?: unknown;
  };

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Field "name" (non-empty string) is required' });
    return;
  }

  if (toolArgs !== undefined && (typeof toolArgs !== 'object' || Array.isArray(toolArgs) || toolArgs === null)) {
    res.status(400).json({ error: 'Field "arguments" must be a plain object' });
    return;
  }

  try {
    const client = await getMcpClient();
    const result = await client.callTool({
      name,
      arguments: (toolArgs as Record<string, unknown>) ?? {},
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool call failed';
    console.error(`[Bridge] callTool(${name}) error:`, message);

    // Force reconnect on transport-level errors
    if (err instanceof Error && /transport|connect|ECONNREFUSED|socket/i.test(err.message)) {
      state.client = null;
      scheduleReconnect();
    }

    res.status(500).json({ error: message });
  }
});

/** GET /health */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mcpConnected: state.client !== null,
    reconnectAttempts: state.reconnectAttempts,
    serverUrl: MCP_SERVER_URL,
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(BRIDGE_PORT, async () => {
  console.log(`[Bridge] Listening on http://localhost:${BRIDGE_PORT}`);
  console.log(`[Bridge] CORS origin: ${CORS_ORIGIN}`);

  // Eagerly connect so first API call has no latency
  try {
    await getMcpClient();
  } catch (err) {
    console.warn('[Bridge] Initial connection failed — will retry automatically:', (err as Error).message);
    scheduleReconnect();
  }
});
