# BitAtlas MCP Server 🤖

Zero-Knowledge Cloud Drive persistence for AI agents.

This Model Context Protocol (MCP) server allows AI agents to securely interact with the BitAtlas vault. All files are encrypted client-side, meaning the server never sees the plaintext data.

## Features

- **Search & List Vault**: Agents can browse encrypted file metadata.
- **Secure Retrieval**: Agents can fetch encrypted blobs and decryption metadata.
- **Zero-Knowledge**: The agent performs decryption locally using the user's provided master key.

## Installation

### For AI Agents (Claude Desktop, OpenClaw, etc.)

Add this to your MCP settings:

```json
{
  "mcpServers": {
    "bitatlas": {
      "command": "npx",
      "args": ["-y", "@bitatlas/mcp-server"],
      "env": {
        "BITATLAS_API_KEY": "your-api-key",
        "BITATLAS_MASTER_KEY": "your-derived-master-key"
      }
    }
  }
}
```

## Environment Variables

- `BITATLAS_API_KEY`: Your BitAtlas personal access token.
- `BITATLAS_API_URL`: (Optional) Defaults to `https://api.bitatlas.io/api/v1`.
- `BITATLAS_MASTER_KEY`: Your client-side derived master key (required for agents to decrypt data).

## Development

```bash
npm install
npm run start
```

## License

MIT
