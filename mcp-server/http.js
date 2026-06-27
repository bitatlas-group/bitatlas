#!/usr/bin/env node
'use strict';

// Remote Streamable-HTTP entry for the BitAtlas MCP server (Smithery "External
// URL" listing). Each request builds a fresh, stateless server from the agent's
// own credentials — passed as headers by the Smithery gateway — so one public
// endpoint safely serves many agents without sharing keys.
//
// ponytail: Node stdlib http, no Express. The MCP SDK transport already does
// the protocol work; we just route POST /mcp to it.
//
// SECURITY: in a multi-tenant deployment, do NOT set BITATLAS_API_KEY /
// BITATLAS_MASTER_KEY in the process env — buildServer falls back to env, so a
// host key would be handed to any agent that sends no header. Env fallback is
// for single-tenant self-hosting only.

const http = require('http');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { buildServer } = require('./index.js');

const PORT = process.env.PORT || 8000;

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

// Smithery's gateway passes per-connection config through transparently as
// BOTH query params and headers. Read each field from either location (header
// first) so the server works regardless of how the config schema is declared
// or whether a client strips custom headers.
function credsFromRequest(req) {
  const q = new URL(req.url, 'http://localhost').searchParams;
  const pick = (header, query) => req.headers[header] || q.get(query) || undefined;
  return {
    apiKey: pick('x-bitatlas-api-key', 'bitatlasApiKey'),
    masterKey: pick('x-bitatlas-master-key', 'bitatlasMasterKey'),
    apiUrl: pick('x-bitatlas-api-url', 'bitatlasApiUrl'),
    webUrl: pick('x-bitatlas-web-url', 'bitatlasWebUrl'),
    walletKey: pick('x-bitatlas-wallet-key', 'bitatlasWalletKey'),
  };
}

const httpServer = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"status":"ok"}');
    return;
  }

  if (req.method !== 'POST' || !req.url.startsWith('/mcp')) {
    res.writeHead(404).end();
    return;
  }

  // Stateless: a fresh server + transport per request, no session reuse.
  const server = buildServer(credsFromRequest(req));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); server.close(); });

  try {
    await server.connect(transport);
    const body = await readBody(req);
    await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
  } catch (err) {
    console.error('[http] request error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.error(`BitAtlas MCP Server (Streamable HTTP) listening on :${PORT}/mcp`);
});
