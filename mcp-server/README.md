# BitAtlas MCP Server 🤖

Zero-Knowledge Cloud Drive persistence for AI agents.

This Model Context Protocol (MCP) server allows AI agents to securely interact with the BitAtlas vault. All files are encrypted client-side, meaning the server never sees the plaintext data.

## Features

- **Search & List Vault**: Agents can browse encrypted file metadata.
- **Secure Retrieval**: Agents can fetch encrypted blobs and decryption metadata.
- **Zero-Knowledge**: The agent performs decryption locally using the user's provided master key.
- **Hand a file to a human**: `bitatlas_share_file` mints a public link the host *cannot read* — the decryption key rides in the URL fragment, never reaching BitAtlas. The canonical "agent produces an artifact → human opens a link" handoff, without giving up zero knowledge.

## Tools

| Tool | Purpose |
|---|---|
| `bitatlas_vault_status` | Vault health, file count, storage usage |
| `bitatlas_list_files` | List file metadata (filter by folder/category/search) |
| `bitatlas_search` | Search files by name |
| `bitatlas_get_file` | Download + decrypt a file's content |
| `bitatlas_upload_file` | Encrypt a local file client-side and upload it |
| `bitatlas_delete_file` | Delete a file |
| `bitatlas_create_folder` | Create a folder |
| `bitatlas_share_file` | Create a public, zero-knowledge share link (`/s/<id>#k=…`) to hand a file to a human. ⚠️ Anyone with the link can read the file. |
| `bitatlas_list_shares` | List your share links with expiry, download count, and status |
| `bitatlas_revoke_share` | Revoke a share link (stops future downloads) |

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

### x402 Wallet Mode (No Account Required)

Instead of an API key, agents can pay per request using a crypto wallet with USDC on Base:

```json
{
  "mcpServers": {
    "bitatlas": {
      "command": "npx",
      "args": ["-y", "@bitatlas/mcp-server"],
      "env": {
        "BITATLAS_WALLET_PRIVATE_KEY": "0xabc...",
        "BITATLAS_MASTER_KEY": "your-64-hex-char-master-key"
      }
    }
  }
}
```

No signup. No API key. The agent pays per request in USDC and gets full vault access. Files include 30 days of storage and can be renewed.

**Priority:** If both `BITATLAS_API_KEY` and `BITATLAS_WALLET_PRIVATE_KEY` are set, the API key is preferred (free within quota).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BITATLAS_API_KEY` | One of API key or wallet | Personal access token from bitatlas.com |
| `BITATLAS_WALLET_PRIVATE_KEY` | One of API key or wallet | EVM private key for x402 payments |
| `BITATLAS_MASTER_KEY` | For encrypt/decrypt | 64-char hex string (256-bit master key) |
| `BITATLAS_API_URL` | No | Defaults to `https://api.bitatlas.com` |
| `BITATLAS_WEB_URL` | No | Web origin used to build share links. Defaults to `https://www.bitatlas.com` |

## Development

```bash
npm install
npm run start
```

## License

MIT
