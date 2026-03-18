# @legacy-shield/mcp-server

Zero-knowledge document vault persistence for AI agents.

## Description
This MCP server allows autonomous agents (like Claude) to securely interact with a user's LegacyShield vault. LegacyShield uses client-side AES-256-GCM encryption, ensuring that only the user (or their authorized agents) can access the data.

## Features
- **list_vault_files**: Discover encrypted documents in the vault.
- **get_file_metadata**: Retrieve encryption headers and storage location for secure processing.

## Setup

### Environment Variables
- `LEGACY_SHIELD_API_KEY`: Generate this in your LegacyShield account settings under "Agents".
- `LEGACY_SHIELD_API_URL`: (Optional) Defaults to `https://api.legacyshield.eu/api/v1`.

### Command
```bash
npx -y @legacy-shield/mcp-server
```

## Contact
Email: support@legacyshield.eu
Website: https://legacyshield.eu
