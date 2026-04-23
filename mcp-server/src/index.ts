import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// ─── Zod Tool Input Schemas ─────────────────────────────────────────────────

const EchoSchema = z.object({
  message: z.string().min(1).describe('Message to echo back'),
});

const AddSchema = z.object({
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
});

const GetWeatherSchema = z.object({
  city: z.string().min(1).describe('City name'),
});

const ConvertCurrencySchema = z.object({
  amount: z.number().describe('金额'),
  from: z.enum(['USD', 'CNY']).describe('源货币'),
  to: z.enum(['USD', 'CNY']).describe('目标货币'),
});

// ─── MCP Server Factory ──────────────────────────────────────────────────────

function createMcpServer(): Server {
  const server = new Server(
    { name: 'mcp-demo-server', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'echo',
        description: 'Echoes back the input message',
        inputSchema: {
          type: 'object' as const,
          properties: {
            message: { type: 'string', description: 'Message to echo back' },
          },
          required: ['message'],
        },
      },
      {
        name: 'add',
        description: 'Adds two numbers and returns the sum',
        inputSchema: {
          type: 'object' as const,
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' },
          },
          required: ['a', 'b'],
        },
      },
      {
        name: 'get_weather',
        description: 'Returns mock weather information for a city',
        inputSchema: {
          type: 'object' as const,
          properties: {
            city: { type: 'string', description: 'City name' },
          },
          required: ['city'],
        },
      },
      {
        name: 'convert_currency',
        description: '汇率转换（USD ↔ CNY）',
        inputSchema: {
          type: 'object' as const,
          properties: {
            amount: { type: 'number', description: '金额' },
            from: { type: 'string', enum: ['USD', 'CNY'], description: '源货币' },
            to: { type: 'string', enum: ['USD', 'CNY'], description: '目标货币' },
          },
          required: ['amount', 'from', 'to'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'echo': {
          const { message } = EchoSchema.parse(args);
          return {
            content: [{ type: 'text', text: `Echo: ${message}` }],
          };
        }

        case 'add': {
          const { a, b } = AddSchema.parse(args);
          return {
            content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }],
          };
        }

        case 'get_weather': {
          const { city } = GetWeatherSchema.parse(args);
          const conditions = ['sunny ☀️', 'cloudy ☁️', 'rainy 🌧️', 'snowy ❄️'];
          const condition = conditions[Math.floor(Math.random() * conditions.length)];
          const temperature = Math.floor(Math.random() * 35) + 5;
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ city, condition, temperature, unit: 'celsius' }, null, 2),
              },
            ],
          };
        }

        case 'convert_currency': {
          const { amount, from, to } = ConvertCurrencySchema.parse(args);
          const rate = from === 'USD' && to === 'CNY' ? 7.2 : 0.139;
          return {
            content: [{ type: 'text', text: `${amount} ${from} = ${(amount * rate).toFixed(2)} ${to}` }],
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof z.ZodError
        ? `Validation error: ${err.errors.map(e => e.message).join(', ')}`
        : err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  });

  return server;
}

// ─── Session Management (Stateful StreamableHTTP) ────────────────────────────

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, SessionEntry>();

function isInitializeRequest(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'method' in body &&
    (body as Record<string, unknown>).method === 'initialize'
  );
}

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

/** POST /mcp — MCP JSON-RPC over StreamableHTTP */
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const existing = sessionId ? sessions.get(sessionId) : undefined;

    if (existing) {
      await existing.transport.handleRequest(req, res, req.body);
      return;
    }

    // New session — must start with initialize
    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Expected initialize request for a new session' },
        id: null,
      });
      return;
    }

    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        sessions.set(sid, { transport });
        console.log(`[MCP] Session created: ${sid} (total: ${sessions.size})`);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        sessions.delete(sid);
        console.log(`[MCP] Session closed: ${sid} (remaining: ${sessions.size})`);
      }
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[MCP] POST /mcp error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/** GET /mcp — SSE stream for server-to-client messages */
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const entry = sessionId ? sessions.get(sessionId) : undefined;

  if (!entry) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await entry.transport.handleRequest(req, res);
});

/** DELETE /mcp — graceful session termination */
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const entry = sessionId ? sessions.get(sessionId) : undefined;

  if (!entry) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await entry.transport.handleRequest(req, res);
  sessions.delete(sessionId!);
});

/** GET /health */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`[MCP Server] Listening on http://localhost:${PORT}`);
  console.log(`[MCP Server] Endpoint: http://localhost:${PORT}/mcp`);
});
