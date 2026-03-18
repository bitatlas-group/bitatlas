#!/usr/bin/env node
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const axios = require("axios");
const { z } = require("zod");
require("dotenv").config();

const API_URL = process.env.BITATLAS_API_URL || "https://api.bitatlas.io/api/v1";
const API_KEY = process.env.BITATLAS_API_KEY;

if (!API_KEY) {
  console.error("BITATLAS_API_KEY environment variable is required");
  process.exit(1);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
  },
});

const server = new Server(
  {
    name: "bitatlas-vault",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "whoami",
        description: "Discovery tool to get the agent's profile, available endpoints, and encryption guide.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_vault_files",
        description: "List all encrypted files currently stored in the BitAtlas vault.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by category (IDENTITY, TAX, LEGAL, etc.)",
            },
          },
        },
      },
      {
        name: "get_file_metadata",
        description: "Get detailed metadata and encryption info for a specific file.",
        inputSchema: {
          type: "object",
          properties: {
            fileId: {
              type: "string",
              description: "The unique ID of the file",
            },
          },
          required: ["fileId"],
        },
      },
    ],
  };
});

/**
 * Handle tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "whoami") {
      // Mock response for now or call real /agents/whoami if ready
      // Based on Claw report recommendations: include endpoint map + encryption guide
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              name: "BitAtlas Agent",
              version: "1.0.0",
              availableEndpoints: {
                list_files: "GET /files",
                get_file: "GET /files/:id",
                upload_file: "POST /files/upload",
                whoami: "GET /agents/whoami"
              },
              encryption: {
                algorithm: "AES-256-GCM",
                keySize: 32,
                ivSize: 12,
                format: "base64",
                blobStructure: "ciphertext || authTag (16 bytes)",
                guide: "To upload: 1. Generate 256-bit file key. 2. Encrypt file with AES-256-GCM. 3. Encrypt file key with BitAtlas Master Key. 4. POST blob + encrypted keys."
              },
              nextSteps: [
                "Call list_vault_files to see current storage",
                "Use get_file_metadata for specific file encryption params"
              ]
            }, null, 2),
          },
        ],
      };
    }

    if (name === "list_vault_files") {
      const response = await api.get("/files", { params: args });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data.files, null, 2),
          },
        ],
      };
    }

    if (name === "get_file_metadata") {
      const response = await api.get(`/files/${args.fileId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: error.response?.data?.error?.message || error.message,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BitAtlas MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
