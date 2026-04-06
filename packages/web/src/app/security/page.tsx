import Link from "next/link";

export const metadata = {
  title: "Security Whitepaper — BitAtlas",
  description:
    "How BitAtlas delivers zero-knowledge encryption for autonomous AI agents. A deep dive into our cryptographic architecture, threat model, and agent UX design.",
};

/* ── helper: section wrapper ── */
function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={"max-w-4xl mx-auto px-6 py-16 " + className}
    >
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight mb-6">
      {children}
    </h2>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-headline font-bold text-xl text-primary mb-3">
      {children}
    </h3>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-on-surface-variant leading-relaxed mb-4">{children}</p>;
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-surface-container-high text-sm p-6 rounded-2xl overflow-x-auto mb-6 font-mono leading-relaxed border border-outline-variant/10">
      {children}
    </pre>
  );
}

export default function SecurityWhitepaper() {
  return (
    <div className="bg-surface font-body text-on-surface">
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[17px] font-bold tracking-tight" style={{ color: "#1b365d" }}>
              BITATLAS
            </span>
          </Link>
          <Link
            href="/"
            className="font-headline font-medium text-sm text-on-surface-variant hover:text-primary"
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="pt-32 pb-16 px-6 bg-primary text-on-primary text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-40" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-on-primary/10 text-on-primary mb-6">
            Security Whitepaper
          </span>
          <h1 className="font-headline font-extrabold text-4xl md:text-5xl leading-tight tracking-tight mb-6">
            Zero-Knowledge Encryption for Autonomous AI Agents
          </h1>
          <p className="text-on-primary-container text-lg max-w-2xl mx-auto">
            How BitAtlas protects agentic data with client-side cryptography, European-only infrastructure, and a threat model designed for a world where AI agents outnumber humans.
          </p>
          <p className="text-on-primary/50 text-sm mt-8">
            Version 1.0 · March 2026 · BitAtlas Security Team
          </p>
        </div>
      </header>

      {/* ── Table of Contents ── */}
      <Section className="border-b border-outline-variant/20">
        <H2>Contents</H2>
        <ol className="space-y-2 text-on-surface-variant">
          {[
            ["problem", "The Problem: Agents Need Memory, Memory Needs Walls"],
            ["architecture", "Cryptographic Architecture"],
            ["key-derivation", "Key Derivation & Management"],
            ["file-lifecycle", "File Encryption Lifecycle"],
            ["agent-ux", "Agent UX: Security Without Friction"],
            ["threat-model", "Threat Model"],
            ["infra", "Infrastructure & Compliance"],
            ["comparison", "How We Compare"],
            ["conclusion", "Conclusion"],
          ].map(([id, title], i) => (
            <li key={id}>
              <a
                href={"#" + id}
                className="hover:text-primary transition-colors"
              >
                <span className="font-bold text-primary mr-2">{i + 1}.</span>
                {title}
              </a>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── 1. Problem ── */}
      <Section id="problem" className="border-b border-outline-variant/20">
        <H2>1. The Problem: Agents Need Memory, Memory Needs Walls</H2>
        <P>
          Autonomous AI agents are the fastest-growing class of cloud consumers. They generate, store, and retrieve sensitive data at a pace that dwarfs human users. Yet the storage layer they depend on — S3 buckets, managed databases, cloud drives — was designed with a fundamental assumption: the service provider is trusted.
        </P>
        <P>
          In the agentic era, that assumption breaks down. An agent orchestrating financial workflows stores API keys, transaction logs, and user data. A medical research agent holds patient records. A legal agent manages contracts. If the storage provider can read this data, every breach, subpoena, or insider threat becomes an existential risk.
        </P>
        <P>
          BitAtlas exists to solve this. We provide persistent, globally available storage where <strong>the server is cryptographically blind</strong>. Even with full database access, root SSH, and physical possession of the drives, an attacker learns nothing about the contents. This is zero-knowledge encryption — not as a marketing term, but as a mathematical guarantee.
        </P>
      </Section>

      {/* ── 2. Architecture ── */}
      <Section id="architecture" className="border-b border-outline-variant/20">
        <H2>2. Cryptographic Architecture</H2>
        <H3>Design Principles</H3>
        <ul className="list-disc pl-6 space-y-2 text-on-surface-variant mb-6">
          <li><strong>Zero-knowledge:</strong> The server never has access to plaintext documents or encryption keys.</li>
          <li><strong>Client-side cryptography:</strong> All encryption and decryption occurs locally — in the browser (Web Crypto API) or in the agent runtime (Node.js crypto).</li>
          <li><strong>Defense in depth:</strong> TLS 1.3 in transit, AES-256-GCM at rest, bcrypt for auth, separate key derivation paths for authentication and encryption.</li>
          <li><strong>Minimal trust:</strong> Even a fully compromised server yields only encrypted blobs and encrypted key material.</li>
          <li><strong>Agent-native:</strong> Designed from day one for MCP (Model Context Protocol) integration while maintaining full security boundaries.</li>
        </ul>

        <H3>Cryptographic Primitives</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="text-left py-3 pr-4 font-bold text-primary">Purpose</th>
                <th className="text-left py-3 pr-4 font-bold text-primary">Algorithm</th>
                <th className="text-left py-3 font-bold text-primary">Parameters</th>
              </tr>
            </thead>
            <tbody className="text-on-surface-variant">
              <tr className="border-b border-outline-variant/10">
                <td className="py-3 pr-4">File encryption</td>
                <td className="py-3 pr-4">AES-256-GCM</td>
                <td className="py-3">256-bit key, 96-bit IV, 128-bit auth tag</td>
              </tr>
              <tr className="border-b border-outline-variant/10">
                <td className="py-3 pr-4">Key derivation</td>
                <td className="py-3 pr-4">PBKDF2-SHA256</td>
                <td className="py-3">100,000 iterations, user-specific salt</td>
              </tr>
              <tr className="border-b border-outline-variant/10">
                <td className="py-3 pr-4">Password hashing</td>
                <td className="py-3 pr-4">bcrypt</td>
                <td className="py-3">10 rounds (auth only, never touches encryption)</td>
              </tr>
              <tr className="border-b border-outline-variant/10">
                <td className="py-3 pr-4">File key wrapping</td>
                <td className="py-3 pr-4">AES-256-GCM</td>
                <td className="py-3">Master key encrypts per-file keys</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Transport</td>
                <td className="py-3 pr-4">TLS 1.3</td>
                <td className="py-3">ECDHE key exchange, AES-GCM cipher suites</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 3. Key Derivation ── */}
      <Section id="key-derivation" className="border-b border-outline-variant/20">
        <H2>3. Key Derivation & Management</H2>
        <P>
          A critical design decision in BitAtlas is the <strong>complete separation</strong> of authentication and encryption key paths. Your login credentials and your encryption key are derived from the same password but through entirely different, non-reversible processes.
        </P>

        <H3>Authentication Path (server-side)</H3>
        <Code>{"User password + salt → bcrypt (10 rounds) → Password hash\n  → Stored in PostgreSQL for login verification\n  → Cannot be used to derive the encryption key"}</Code>

        <H3>Encryption Path (client-side only)</H3>
        <Code>{"User password + user-specific salt → PBKDF2-SHA256 (100k iterations)\n  → 256-bit Master Key\n  → Lives only in browser/agent memory\n  → Never transmitted, never stored server-side"}</Code>

        <P>
          This means that even if our database is fully exfiltrated, an attacker has bcrypt hashes (useless for decryption) and encrypted key material (useless without the master key). The master key exists only in volatile memory on the client.
        </P>

        <H3>Per-File Key Architecture</H3>
        <P>
          Each file gets its own randomly generated 256-bit AES-GCM key. This per-file key is then encrypted (&ldquo;wrapped&rdquo;) with the owner&apos;s master key. The wrapped key is stored server-side alongside the encrypted blob. This design means:
        </P>
        <ul className="list-disc pl-6 space-y-2 text-on-surface-variant mb-4">
          <li>Compromising one file key does not compromise any other file.</li>
          <li>Password changes only require re-wrapping the file keys, not re-encrypting every file.</li>
          <li>Emergency access can be granted by wrapping the file key with an additional key, without exposing the owner&apos;s master key.</li>
        </ul>
      </Section>

      {/* ── 4. File Lifecycle ── */}
      <Section id="file-lifecycle" className="border-b border-outline-variant/20">
        <H2>4. File Encryption Lifecycle</H2>

        <H3>Upload (Encryption)</H3>
        <Code>{"1. User or Agent selects a file\n2. Client generates a random 256-bit file key\n3. File is encrypted with AES-256-GCM using the file key\n   → Produces: encrypted blob + IV + authentication tag\n4. File key is wrapped with the owner's master key (AES-256-GCM)\n   → Produces: ownerEncryptedKey + ownerIV\n5. Upload to server:\n   • Encrypted blob → S3-compatible object storage (EU-only)\n   • ownerEncryptedKey, IV, authTag → PostgreSQL (EU-only)\n6. Server never sees: plaintext file, file key, or master key"}</Code>

        <H3>Download (Decryption)</H3>
        <Code>{"1. Client requests file metadata from API\n2. Server returns:\n   • Presigned URL to the encrypted blob\n   • ownerEncryptedKey, IV, authTag\n3. Client decrypts:\n   a. Unwrap ownerEncryptedKey using master key → file key\n   b. Download encrypted blob via presigned URL\n   c. Decrypt blob using file key + IV + authTag → plaintext\n4. Server never sees the plaintext at any point"}</Code>

        <P>
          The presigned URL mechanism ensures that even the download path is time-limited and authenticated, without requiring the server to proxy (and potentially inspect) the data.
        </P>
      </Section>

      {/* ── 5. Agent UX ── */}
      <Section id="agent-ux" className="border-b border-outline-variant/20">
        <H2>5. Agent UX: Security Without Friction</H2>
        <P>
          The biggest challenge in zero-knowledge systems is usability. For human users, this means password prompts and key management. For AI agents, the challenge is different: how do you give an autonomous process access to encrypted data without creating a permanent security hole?
        </P>

        <H3>MCP Integration (Model Context Protocol)</H3>
        <P>
          BitAtlas is natively compatible with MCP, the emerging standard for AI agent tool use. An MCP-compatible agent (Claude, Cursor, Windsurf, or any custom agent) can:
        </P>
        <ul className="list-disc pl-6 space-y-2 text-on-surface-variant mb-6">
          <li><strong>List vault contents</strong> — see file names and metadata (never plaintext).</li>
          <li><strong>Upload encrypted files</strong> — encrypt locally in the agent&apos;s runtime before upload.</li>
          <li><strong>Download and decrypt</strong> — retrieve encrypted blobs and decrypt in-memory.</li>
          <li><strong>Search</strong> — query metadata without exposing contents.</li>
        </ul>

        <H3>API Key Scoping</H3>
        <P>
          Each API key can be scoped with fine-grained permissions:
        </P>
        <Code>{"{\n  \"permissions\": [\"vault:read\", \"vault:write\"],\n  \"maxFiles\": 100,\n  \"expiresAt\": \"2026-04-25T00:00:00Z\",\n  \"allowedCategories\": [\"legal\", \"financial\"]\n}"}</Code>
        <P>
          This means you can give an agent write access to one category of your vault, with an automatic expiry, without exposing your master key or granting access to unrelated files.
        </P>

        <H3>The Agent Trust Boundary</H3>
        <P>
          The master key must be provided to the agent&apos;s runtime for decryption. This is the fundamental trust boundary: you trust the agent&apos;s execution environment (its sandbox, its memory) the same way you trust your own browser. BitAtlas does not attempt to solve the &ldquo;malicious agent&rdquo; problem — that&apos;s the agent framework&apos;s responsibility. What we guarantee is that <strong>the storage layer itself is zero-knowledge</strong>, and that key material never leaves the client-side boundary.
        </P>

        <div className="bg-primary-container/10 border border-primary/10 rounded-2xl p-6 mt-6">
          <p className="font-headline font-bold text-primary mb-2">Key Insight</p>
          <p className="text-on-surface-variant text-sm">
            In the agentic world, the storage provider should be the <em>least trusted</em> component. BitAtlas is designed so that even if we are fully compromised — servers, database, backups, employees — your data remains encrypted and useless without the keys that only exist in your agent&apos;s memory.
          </p>
        </div>
      </Section>

      {/* ── 6. Threat Model ── */}
      <Section id="threat-model" className="border-b border-outline-variant/20">
        <H2>6. Threat Model</H2>
        <div className="space-y-6">
          {[
            {
              threat: "Server breach (database exfiltration)",
              impact: "None",
              reason: "Attacker gets encrypted blobs + encrypted file keys. Without master keys (never stored server-side), decryption is computationally infeasible.",
            },
            {
              threat: "Insider threat (rogue employee)",
              impact: "None",
              reason: "No BitAtlas employee has access to master keys. Server-side code never handles plaintext. Even with root access to all infrastructure, data remains encrypted.",
            },
            {
              threat: "Government subpoena / court order",
              impact: "Encrypted data only",
              reason: "We can comply by handing over encrypted blobs. Without the user's password-derived master key, the data is meaningless. We cannot decrypt it even if compelled.",
            },
            {
              threat: "Man-in-the-middle attack",
              impact: "Mitigated",
              reason: "TLS 1.3 for all connections. Even if TLS is compromised, intercepted payloads are already encrypted with AES-256-GCM before transmission.",
            },
            {
              threat: "Compromised agent runtime",
              impact: "Scoped exposure",
              reason: "If an agent's environment is compromised, the attacker gains access to the master key in memory and can decrypt files the agent has access to. This is bounded by API key scoping and session expiry.",
            },
            {
              threat: "Weak password",
              impact: "User responsibility",
              reason: "PBKDF2 with 100k iterations provides brute-force resistance, but a trivially weak password remains a vulnerability. We enforce minimum complexity at registration.",
            },
          ].map((item) => (
            <div
              key={item.threat}
              className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h4 className="font-headline font-bold text-primary">{item.threat}</h4>
                <span
                  className={
                    "flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider " +
                    (item.impact === "None"
                      ? "bg-green-100 text-green-800"
                      : item.impact === "Mitigated"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800")
                  }
                >
                  {item.impact}
                </span>
              </div>
              <p className="text-on-surface-variant text-sm">{item.reason}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 7. Infrastructure ── */}
      <Section id="infra" className="border-b border-outline-variant/20">
        <H2>7. Infrastructure & Compliance</H2>

        <H3>European Data Sovereignty</H3>
        <P>
          All BitAtlas infrastructure is hosted on European-owned providers. We do not use any US-owned cloud services (AWS, GCP, Azure) for data storage or processing. This means:
        </P>
        <ul className="list-disc pl-6 space-y-2 text-on-surface-variant mb-6">
          <li><strong>No CLOUD Act exposure:</strong> US law enforcement cannot compel a European provider to hand over data stored on European soil.</li>
          <li><strong>GDPR-native:</strong> Data residency is in Germany and Finland, fully within EU jurisdiction.</li>
          <li><strong>SOC 2 Type II:</strong> Our infrastructure providers maintain SOC 2 certification.</li>
        </ul>

        <H3>The Privacy Stack</H3>
        <div className="space-y-3 mb-6">
          {[
            ["Encryption", "AES-256-GCM — client-side, before upload"],
            ["Key Derivation", "PBKDF2-SHA256 — 100k iterations, user-specific salt"],
            ["Authentication", "bcrypt — 10 rounds, separate from encryption path"],
            ["Storage", "Hetzner Cloud — Germany & Finland"],
            ["Transport", "TLS 1.3 — ECDHE + AES-GCM"],
            ["Data at Rest", "Double encrypted — AES-GCM blob + provider-level encryption"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4 text-sm">
              <span className="font-bold text-primary w-36 flex-shrink-0">{label}</span>
              <span className="text-on-surface-variant">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 8. Comparison ── */}
      <Section id="comparison" className="border-b border-outline-variant/20">
        <H2>8. How We Compare</H2>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="text-left py-3 pr-4 font-bold text-primary">Feature</th>
                <th className="text-left py-3 pr-4 font-bold text-primary">BitAtlas</th>
                <th className="text-left py-3 pr-4 font-bold text-primary">AWS S3</th>
                <th className="text-left py-3 font-bold text-primary">Google Drive</th>
              </tr>
            </thead>
            <tbody className="text-on-surface-variant">
              {[
                ["Zero-knowledge encryption", "✅ Client-side", "❌ Server-side keys", "❌ Google holds keys"],
                ["Agent-native API (MCP)", "✅ Built-in", "❌ Not supported", "❌ Not supported"],
                ["EU-only infrastructure", "✅ Hetzner DE/FI", "⚠️ EU region option", "⚠️ EU region option"],
                ["No CLOUD Act exposure", "✅", "❌ US company", "❌ US company"],
                ["Per-file key isolation", "✅", "❌ Bucket-level", "❌ Account-level"],
                ["Scoped API keys", "✅ Per-agent", "⚠️ IAM policies", "⚠️ OAuth scopes"],
                ["Password = key (no recovery)", "✅", "N/A", "❌ Google can recover"],
              ].map(([feature, ba, s3, gd]) => (
                <tr key={feature} className="border-b border-outline-variant/10">
                  <td className="py-3 pr-4 font-medium">{feature}</td>
                  <td className="py-3 pr-4">{ba}</td>
                  <td className="py-3 pr-4">{s3}</td>
                  <td className="py-3">{gd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 9. Conclusion ── */}
      <Section id="conclusion">
        <H2>9. Conclusion</H2>
        <P>
          The agentic era demands a new category of storage infrastructure — one where the provider is cryptographically excluded from accessing the data it stores. BitAtlas delivers this through client-side AES-256-GCM encryption, separated authentication and encryption key paths, per-file key isolation, and European-only infrastructure.
        </P>
        <P>
          For AI agents, we provide MCP-native integration with scoped API keys and clear trust boundaries. For humans, we provide the peace of mind that comes from knowing that even we cannot read your files.
        </P>
        <P>
          Zero-knowledge is not a feature toggle. It is the architecture.
        </P>

        <div className="mt-12 bg-primary p-8 md:p-12 rounded-3xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-40" />
          <h3 className="relative z-10 font-headline font-extrabold text-2xl text-on-primary mb-4">
            Ready to give your agents a vault?
          </h3>
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-on-primary text-primary px-8 py-4 rounded-xl font-headline font-bold hover:bg-primary-fixed transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/"
              className="text-on-primary px-8 py-4 font-headline font-bold hover:underline underline-offset-8"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="bg-slate-50 w-full">
        <div className="h-[1px] w-full bg-slate-200" />
        <div className="max-w-7xl mx-auto px-8 py-8 text-center">
          <p className="text-xs tracking-wide uppercase font-semibold text-slate-500">
            © 2026 BitAtlas Inc. · Secure Intelligence Layer · Version 1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
