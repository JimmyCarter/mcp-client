import { ref, type Ref } from 'vue';
import axios, { AxiosError } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

/** JSON Schema property descriptor for a single tool input field */
export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
}

/** JSON Schema subset used by MCP tool inputSchema */
export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, ToolProperty>;
  required?: string[];
}

/** A single MCP tool descriptor */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: ToolInputSchema;
}

/** A single content block returned by an MCP tool */
export interface McpContentItem {
  type: string;
  text?: string;
}

/** The result of a callTool request */
export interface McpToolResult {
  content: McpContentItem[];
  isError?: boolean;
}

/** Parameters for callTool */
export interface McpCallToolParams {
  name: string;
  arguments: Record<string, unknown>;
}

// ─── HTTP Client ──────────────────────────────────────────────────────────────

/**
 * When Vite's dev proxy is active (`/api` → bridge), VITE_BRIDGE_URL can be
 * left empty (defaults to same-origin). In production set it to the bridge URL.
 */
const BASE_URL =
  import.meta.env.VITE_BRIDGE_URL?.replace(/\/$/, '') ?? '';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const serverMsg = (err.response?.data as Record<string, unknown> | undefined)?.error;
    if (typeof serverMsg === 'string') return serverMsg;
    return err.message;
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

// ─── useMcpTools ─────────────────────────────────────────────────────────────

/**
 * Fetches the list of tools exposed by the MCP server via the bridge.
 */
export function useMcpTools() {
  const tools = ref<McpTool[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTools(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const { data } = await http.get<{ tools: McpTool[] }>('/api/tools');
      tools.value = data.tools;
    } catch (err) {
      error.value = extractErrorMessage(err);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    tools: tools as Readonly<Ref<McpTool[]>>,
    isLoading: isLoading as Readonly<Ref<boolean>>,
    error: error as Readonly<Ref<string | null>>,
    fetchTools,
  };
}

// ─── useMcpToolCall ───────────────────────────────────────────────────────────

/**
 * Calls a single MCP tool by name with the given arguments.
 * Provides reactive `result`, `isLoading`, and `error` state.
 */
export function useMcpToolCall() {
  const result = ref<McpToolResult | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function callTool(params: McpCallToolParams): Promise<void> {
    isLoading.value = true;
    error.value = null;
    result.value = null;
    try {
      const { data } = await http.post<McpToolResult>('/api/call-tool', params);
      result.value = data;
      if (data.isError) {
        error.value = data.content
          .filter(c => c.type === 'text')
          .map(c => c.text ?? '')
          .join('\n');
      }
    } catch (err) {
      error.value = extractErrorMessage(err);
    } finally {
      isLoading.value = false;
    }
  }

  function reset(): void {
    result.value = null;
    error.value = null;
  }

  return {
    result: result as Readonly<Ref<McpToolResult | null>>,
    isLoading: isLoading as Readonly<Ref<boolean>>,
    error: error as Readonly<Ref<string | null>>,
    callTool,
    reset,
  };
}
