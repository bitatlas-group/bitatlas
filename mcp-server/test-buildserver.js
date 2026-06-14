'use strict';

// Smoke test for the buildServer() factory extraction (the risky part of the
// stdio -> remote-HTTP refactor): does a server built from per-request creds
// still wire all 10 tools? Uses the SDK's in-memory transport — no network.
//
// Run: node test-buildserver.js   (requires `npm install` in mcp-server/)

const assert = require('assert');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
const { buildServer } = require('./index.js');

(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const server = buildServer({ apiKey: 'test-key', masterKey: '00'.repeat(32) });
  await server.connect(serverTransport);

  const client = new Client({ name: 'smoke', version: '0' }, { capabilities: {} });
  await client.connect(clientTransport);

  const { tools } = await client.listTools();
  assert.strictEqual(tools.length, 10, `expected 10 tools, got ${tools.length}`);
  assert.ok(tools.some((t) => t.name === 'bitatlas_share_file'), 'share_file tool missing');

  // Two builds must be independent instances (per-request isolation).
  assert.notStrictEqual(buildServer({ apiKey: 'a' }), buildServer({ apiKey: 'b' }));

  console.log(`OK — buildServer wired ${tools.length} tools, instances isolated`);
  process.exit(0);
})().catch((err) => {
  console.error('SMOKE FAILED:', err.message);
  process.exit(1);
});
