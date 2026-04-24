/**
 * Cloudflare Worker — MCP Bridge Proxy
 *
 * 将来自前端的 /api/* 请求转发到本地 mcp-bridge（通过 cloudflared quick tunnel 暴露）。
 * 环境变量 BRIDGE_URL：mcp-bridge 的公网地址（cloudflared quick tunnel URL）
 * 例：https://xxx.trycloudflare.com
 */

export interface Env {
  BRIDGE_URL: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // 只代理 /api/* 路径
    if (!url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
    }

    const bridgeUrl = env.BRIDGE_URL?.replace(/\/$/, '');
    if (!bridgeUrl) {
      return new Response(
        JSON.stringify({ error: 'BRIDGE_URL not configured' }),
        { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // 转发请求
    const target = `${bridgeUrl}${url.pathname}${url.search}`;
    const proxied = new Request(target, {
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
      body: request.method !== 'GET' ? request.body : null,
    });

    try {
      const resp = await fetch(proxied);
      const body = await resp.text();
      return new Response(body, {
        status: resp.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': resp.headers.get('Content-Type') ?? 'application/json',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Bridge unreachable: ${(err as Error).message}` }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
  },
};
