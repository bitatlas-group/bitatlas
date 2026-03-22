# BitAtlas 🦞

**Zero Knowledge Cloud Drive for Humans and Agents**

BitAtlas is a next-generation cloud storage platform designed with privacy and AI agents in mind. It provides a secure, zero-knowledge environment where your most sensitive documents are encrypted client-side and accessible only to you and the agents you authorize.

## 🚀 Vision

BitAtlas aims to be the secure "atlas" for your digital life, providing a foundation for both human productivity and AI agent assistance without compromising on privacy.

## ✨ Key Features

- **🛡️ E2E Encryption (AES-256-GCM)**: All files are encrypted in the browser (or at the SDK level) before being uploaded. The server never sees your plaintext data or your encryption keys.
- **🤖 Agent-Native (MCP Server)**: Built from the ground up to support AI agents via the Model Context Protocol (MCP). Let your agents safely search, read, and manage your vault.
- **🔐 Personal Vault**: A dedicated space for your most critical documents—identity papers, property deeds, medical records, and digital assets.
- **🇪🇺 European Data Sovereignty**: All infrastructure is hosted on European soil, subject to the world's strongest privacy regulations (GDPR).

## 🏗️ Project Structure

- `mcp-server/`: The Model Context Protocol server for integrating with AI agents like Claude Desktop, OpenClaw, and more.
- `sdk/encryption/`: The core encryption logic used for client-side security.

## 🌐 Ecosystem

- **LegacyShield** ([legacyshield.eu](https://legacyshield.eu)): The first production application built on BitAtlas. A digital legacy platform and encrypted document vault for humans and their descendants.

## 🛠️ Getting Started

### MCP Server

To use BitAtlas with your AI agent, configure the MCP server:

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

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.

---

Built with ❤️ by [BitAtlas Group](https://github.com/bitatlas-group)
