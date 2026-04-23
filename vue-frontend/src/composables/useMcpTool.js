import { ref } from 'vue';
import axios, { AxiosError } from 'axios';
// ─── HTTP Client ──────────────────────────────────────────────────────────────
/**
 * When Vite's dev proxy is active (`/api` → bridge), VITE_BRIDGE_URL can be
 * left empty (defaults to same-origin). In production set it to the bridge URL.
 */
const BASE_URL = import.meta.env.VITE_BRIDGE_URL?.replace(/\/$/, '') ?? '';
const http = axios.create({
    baseURL: BASE_URL,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
});
function extractErrorMessage(err) {
    if (err instanceof AxiosError) {
        const serverMsg = err.response?.data?.error;
        if (typeof serverMsg === 'string')
            return serverMsg;
        return err.message;
    }
    return err instanceof Error ? err.message : 'Unknown error';
}
// ─── useMcpTools ─────────────────────────────────────────────────────────────
/**
 * Fetches the list of tools exposed by the MCP server via the bridge.
 */
export function useMcpTools() {
    const tools = ref([]);
    const isLoading = ref(false);
    const error = ref(null);
    async function fetchTools() {
        isLoading.value = true;
        error.value = null;
        try {
            const { data } = await http.get('/api/tools');
            tools.value = data.tools;
        }
        catch (err) {
            error.value = extractErrorMessage(err);
        }
        finally {
            isLoading.value = false;
        }
    }
    return {
        tools: tools,
        isLoading: isLoading,
        error: error,
        fetchTools,
    };
}
// ─── useMcpToolCall ───────────────────────────────────────────────────────────
/**
 * Calls a single MCP tool by name with the given arguments.
 * Provides reactive `result`, `isLoading`, and `error` state.
 */
export function useMcpToolCall() {
    const result = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    async function callTool(params) {
        isLoading.value = true;
        error.value = null;
        result.value = null;
        try {
            const { data } = await http.post('/api/call-tool', params);
            result.value = data;
            if (data.isError) {
                error.value = data.content
                    .filter(c => c.type === 'text')
                    .map(c => c.text ?? '')
                    .join('\n');
            }
        }
        catch (err) {
            error.value = extractErrorMessage(err);
        }
        finally {
            isLoading.value = false;
        }
    }
    function reset() {
        result.value = null;
        error.value = null;
    }
    return {
        result: result,
        isLoading: isLoading,
        error: error,
        callTool,
        reset,
    };
}
