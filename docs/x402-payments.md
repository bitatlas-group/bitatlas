# Pay with x402 — Anonymous Agent Storage

BitAtlas supports the [x402 open payment standard](https://x402.org) for anonymous, account-free access to zero-knowledge encrypted storage. Agents can store and retrieve encrypted files by paying with USDC stablecoins on Base — no signup, no API key, no KYC.

## How It Works

```
Agent → GET /vault/files (no auth header)
     ← 402 Payment Required + PAYMENT-REQUIRED header
Agent → GET /vault/files + PAYMENT-SIGNATURE header (signed USDC tx)
     ← 200 OK + response data
```

1. Send an HTTP request to any vault endpoint **without** an `Authorization` header
2. BitAtlas responds with `402 Payment Required` and a `PAYMENT-REQUIRED` header containing payment instructions (base64-encoded JSON)
3. Your agent signs a USDC payment on Base and resends the request with a `PAYMENT-SIGNATURE` header
4. BitAtlas verifies the payment via the x402 facilitator, processes the request, and settles the payment on-chain
5. You receive the response along with a `PAYMENT-RESPONSE` header (settlement receipt)

## Pricing

| Endpoint | Operation | Price (USDC) |
|---|---|---|
| `POST /vault/files/upload-url` | Generate upload URL | $0.01 |
| `POST /vault/files` | Register file | $0.01 |
| `GET /vault/files` | List files | $0.001 |
| `GET /vault/files/:id/download-url` | Get download URL | $0.005 |
| `DELETE /vault/files/:id` | Delete file | Free |

Prices are flat per request. No hidden fees, no minimum spend.

## Quick Start (TypeScript)

### Install

```bash
npm install @x402/fetch @x402/evm
```

### Use

```typescript
import { wrapFetch } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

// Your agent's wallet (private key — keep secure!)
const evmScheme = new ExactEvmScheme(process.env.AGENT_WALLET_PRIVATE_KEY);

// Wrap the global fetch with x402 payment support
const x402Fetch = wrapFetch(fetch, [evmScheme]);

// List files — if 402, payment is handled automatically
const response = await x402Fetch("https://api.bitatlas.com/vault/files");
const data = await response.json();
console.log(data);
```

That's it. The `wrapFetch` wrapper intercepts 402 responses, signs the required USDC payment, and retries the request automatically.

### Upload a File

```typescript
// Step 1: Get a presigned upload URL (costs $0.01)
const uploadRes = await x402Fetch("https://api.bitatlas.com/vault/files/upload-url", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fileName: "secret-document.enc",
    contentType: "application/octet-stream",
  }),
});
const { uploadUrl, storageKey } = await uploadRes.json();

// Step 2: Upload the encrypted file to the presigned URL
await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "application/octet-stream" },
  body: encryptedFileBuffer,
});

// Step 3: Register the file (costs $0.01)
const registerRes = await x402Fetch("https://api.bitatlas.com/vault/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "secret-document.enc",
    storageKey,
    sizeBytes: encryptedFileBuffer.byteLength,
    ownerEncryptedKey: "...",  // Your encryption metadata
    ownerIv: "...",
    fileIv: "...",
    authTag: "...",
  }),
});
```

## Payment Details

### Network & Currency

- **Network**: Base (Coinbase L2) — low gas fees (~$0.001 per tx)
- **Currency**: USDC (USD Coin) — 1:1 USD peg, no price volatility
- **Testnet**: Base Sepolia (for development/testing)

### What You Need

- A crypto wallet with USDC on Base (e.g., Coinbase Wallet, MetaMask)
- A small amount of ETH on Base for gas (~$0.01 covers hundreds of transactions)

### Facilitator

The x402 facilitator verifies and settles payments on-chain. BitAtlas uses the public facilitator at `https://x402.org/facilitator`. The facilitator cannot move your funds beyond the payment you signed.

## Two Access Paths

BitAtlas supports two ways to access the vault:

| | API Key (registered) | x402 (anonymous) |
|---|---|---|
| **Auth** | `Authorization: Bearer ba_...` | USDC payment |
| **Account** | Required | Not needed |
| **Cost** | Free (within quota) | Pay per request |
| **Identity** | Email + API key | Wallet address only |
| **Best for** | Regular users, dashboards | Agents, automation, privacy |

Both paths access the same vault infrastructure with the same encryption guarantees.

## FAQ

**Is my data encrypted?**
Yes. BitAtlas is zero-knowledge — files are encrypted client-side before upload. We never see your plaintext data, keys, or content.

**Can you see who's paying?**
We can see the wallet address that paid, but wallet addresses are pseudonymous. We have no way to connect a wallet to an identity.

**What if the facilitator is down?**
Requests fall back to requiring API key authentication. No data loss occurs.

**Is there a free tier?**
Not for x402 payments. If you want free access, create an account and use an API key.

**What chains are supported?**
Base (Coinbase L2) only for now. Solana support is planned.
