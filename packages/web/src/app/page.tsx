import Link from "next/link";
import { BitatlasLogo } from "@/design-system/logo/BitatlasLogo";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { FeatureCard } from "@/design-system/components/Card";
import { DottedGlobe } from "@/design-system/patterns/DottedGlobe";
import { IconShield, IconGlobe, IconChart, IconArrow, IconCheck } from "@/design-system/icons";

const NAV = [
  { href: "/#features", label: "Product" },
  { href: "/#why",      label: "Why BitAtlas" },
  { href: "/blog",      label: "Blog" },
];

const PILLARS = [
  {
    icon: <IconShield size={24} />,
    label: "ZERO KNOWLEDGE",
    title: "Your keys, your data.",
    body: "Files are encrypted in your browser before upload. The server stores ciphertext only. We cannot read, sell, or disclose your data — mathematically.",
  },
  {
    icon: <IconGlobe size={24} />,
    label: "AGENT-READY",
    title: "MCP server, first-class.",
    body: "AI agents connect via the Model Context Protocol. Scoped API keys, pre-derived keys, 7 vault tools. No password, no exposure.",
  },
  {
    icon: <IconChart size={24} />,
    label: "SOVEREIGN",
    title: "EU infrastructure, no CLOUD Act.",
    body: "Hosted on Hetzner (Germany). Zero US jurisdiction. GDPR-compliant by architecture, not policy.",
  },
];

const PRICING_OPS = [
  { op: "Upload",     price: "$0.01" },
  { op: "Download",   price: "$0.005" },
  { op: "List files", price: "$0.001" },
  { op: "Renew 30d",  price: "$0.005" },
];

const PRICING_FEATURES = [
  "30 days storage included per upload",
  "E2E encrypted — we never see your data",
  "USDC on Base (Coinbase L2)",
  "Works with any x402-compatible agent",
];

const FOOTER_LINKS = [
  { label: "Security",  href: "/security" },
  { label: "Blog",      href: "/blog" },
  { label: "GitHub",    href: "https://github.com/bitatlas-group/bitatlas" },
  { label: "npm",       href: "https://www.npmjs.com/package/@bitatlas/mcp-server" },
  { label: "Contact",   href: "mailto:support@bitatlas.com" },
];

export default function Home() {
  return (
    <div className="bg-ink-25 text-ink-900 min-h-screen">

      {/* ── Navigation ── */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-ink-100">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" aria-label="BitAtlas home">
            <BitatlasLogo size={28} color="#2563EB" wordColor="#081220" />
          </Link>
          <nav className="hidden md:flex gap-8 text-[14px] font-medium text-ink-500">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-ink-900 transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-[72px]">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-ink-900 text-white px-6 pt-24 pb-20 md:px-16">
          <div className="absolute -right-20 -top-10 opacity-40 pointer-events-none">
            <DottedGlobe size={700} color="#3B82F6" dim="#1D4ED8" />
          </div>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(8,18,32,0) 0%, rgba(8,18,32,0.8) 65%)" }}
          />
          <div className="relative max-w-[760px]">
            <Badge tone="dark">● New — MCP Server v2</Badge>
            <h1 className="mt-7 text-[56px] md:text-[80px] font-semibold leading-[1.05] tracking-[-0.03em]">
              Encrypted cloud<br />for agents &amp; humans.
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-relaxed text-ink-300">
              AES-256-GCM client-side encryption. Zero-knowledge by design.
              Built for autonomous AI workflows and high-trust storage.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link href="/register">
                <Button variant="primary" size="lg" iconRight={<IconArrow size={16} />}>
                  Start for free
                </Button>
              </Link>
              <a href="https://github.com/bitatlas-group/bitatlas" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="lg" className="bg-transparent text-white border-ink-600 hover:bg-ink-800">
                  View on GitHub
                </Button>
              </a>
            </div>
            <div className="mt-14 flex gap-9 font-mono text-[13px] text-ink-400">
              <span>AES-256-GCM</span><span>·</span><span>Zero-knowledge</span><span>·</span><span>MCP-native</span>
            </div>
          </div>
        </section>

        {/* ── Features / Pillars ── */}
        <section id="features" className="px-6 md:px-16 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12 gap-10 flex-wrap">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">Platform</div>
                <h2 className="mt-3 max-w-[640px] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900">
                  Built for the agentic frontier.
                </h2>
              </div>
              <p className="max-w-[360px] text-[15px] leading-relaxed text-ink-500">
                Hardware-level security meets cloud-scale flexibility. Give your agents the memory they need without compromising privacy.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PILLARS.map((p) => (
                <FeatureCard key={p.label} icon={p.icon} label={p.label} title={p.title} body={p.body} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Why BitAtlas ── */}
        <section id="why" className="bg-ink-50 px-6 md:px-16 py-24">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
            {/* Left: copy */}
            <div className="lg:w-1/2 space-y-10">
              <div className="space-y-5">
                <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900">
                  Why BitAtlas?
                </h2>
                <p className="text-[16px] text-ink-500 leading-relaxed">
                  Traditional cloud storage wasn&apos;t built for the scale or security needs of autonomous agents.
                  BitAtlas provides the missing infrastructure for persistent agentic intelligence.
                </p>
              </div>
              <div className="space-y-7">
                {[
                  { icon: <IconCheck size={18} />, title: "Verifiable Integrity", body: "Every byte stored is cryptographically signed, ensuring agents never execute corrupted or tampered code." },
                  { icon: <IconGlobe size={18} />, title: "EU Infrastructure",   body: "Hosted on Hetzner in Germany. Your data stays in the EU, governed by EU law. No US CLOUD Act exposure." },
                  { icon: <IconShield size={18} />,title: "Privacy Governance",  body: "Granular access controls define exactly which agent can see which data, and for how long." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-50 border border-brand-100 text-brand-500 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-[17px] font-semibold text-ink-900">{item.title}</h4>
                      <p className="text-[15px] text-ink-500 leading-relaxed mt-1">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: vault mockup */}
            <div className="lg:w-1/2">
              <div className="bg-ink-900 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                      <IconShield size={16} className="text-brand-400" />
                    </div>
                    <span className="text-[13px] font-semibold text-ink-200">Vault: Agent_734</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-brand-500/15 px-2.5 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-tighter">Encrypted</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: "agent-context.json", size: "12 KB" },
                    { name: "memory-store/",      size: "Folder" },
                    { name: "model-weights.bin",  size: "4.2 MB" },
                  ].map((f, i) => (
                    <div key={i} className="h-11 bg-white/6 rounded-xl flex items-center px-3.5 gap-3">
                      <div className="flex-1 h-1.5 bg-ink-300/20 rounded" />
                      <span className="text-[11px] text-ink-400">{f.size}</span>
                    </div>
                  ))}
                  <div className="h-20 bg-white/4 rounded-xl border border-dashed border-ink-600 flex flex-col items-center justify-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">Awaiting Agent Input</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 bg-brand-500/10 rounded-xl px-3 py-2">
                  <IconShield size={14} className="text-brand-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">AES-256-GCM Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="px-6 md:px-16 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">Pricing</div>
              <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900">
                Pay-per-request pricing.
              </h2>
              <p className="text-ink-500 max-w-xl mx-auto">
                No subscriptions. No accounts. No hidden fees. Just USDC on Base.
              </p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="bg-white border border-ink-100 rounded-2xl p-10 shadow-md relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge tone="brand">No Account Required</Badge>
                </div>
                <div className="space-y-2 text-center">
                  <h3 className="text-[24px] font-semibold text-ink-900">Pay with USDC</h3>
                  <p className="text-[14px] text-ink-500">Your agent pays per request. No signup, no API key, no KYC.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {PRICING_OPS.map((item) => (
                    <div key={item.op} className="bg-ink-50 rounded-xl p-4 text-center border border-ink-100">
                      <div className="text-[28px] font-semibold text-ink-900 tracking-tight">{item.price}</div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 mt-1">{item.op}</div>
                    </div>
                  ))}
                </div>
                <ul className="space-y-3 text-[14px] text-ink-500 mt-6">
                  {PRICING_FEATURES.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <IconCheck size={16} className="text-brand-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link href="/blog/anonymous-agent-storage-x402-payments" className="block">
                    <Button variant="primary" size="lg" className="w-full justify-center">
                      See How It Works →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex justify-center items-center gap-6 mt-10">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Powered by</span>
              <div className="flex gap-3">
                {["x402 Protocol", "USDC on Base", "Coinbase L2"].map((badge) => (
                  <span key={badge} className="px-3 py-1 bg-ink-100 rounded text-[11px] font-semibold text-ink-500 uppercase tracking-[0.08em] border border-ink-200">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 md:px-16 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="bg-ink-900 rounded-2xl px-12 py-20 text-center relative overflow-hidden">
              <div className="absolute -right-20 -top-10 opacity-20 pointer-events-none">
                <DottedGlobe size={500} color="#3B82F6" dim="#1D4ED8" />
              </div>
              <h2 className="relative z-10 text-[40px] font-semibold tracking-[-0.02em] text-white leading-tight">
                Your agents deserve a vault,<br />not a folder.
              </h2>
              <p className="relative z-10 mt-4 text-ink-300 text-[18px] max-w-xl mx-auto">
                Pay with USDC. Store encrypted. No account needed.
              </p>
              <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <Link href="/register">
                  <Button variant="primary" size="lg">Get Started Free</Button>
                </Link>
                <a href="https://github.com/bitatlas-group/bitatlas" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="lg" className="text-white border-ink-600 hover:bg-ink-800">
                    View on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trusted by ── */}
        <section className="px-6 md:px-16 pb-24">
          <div className="max-w-7xl mx-auto text-center space-y-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-400">
              Trusted by the next generation of apps
            </div>
            <div className="flex justify-center items-center gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <a href="https://legacyshield.eu" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group">
                <span className="font-semibold text-[22px] tracking-tight text-ink-700 group-hover:text-brand-500 transition-colors">
                  LegacyShield
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  First Production Customer
                </span>
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-ink-900 text-white px-6 md:px-16 pt-16 pb-10 border-t border-ink-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10">
          <div>
            <BitatlasLogo size={26} color="#3B82F6" wordColor="#FFFFFF" />
            <p className="mt-4 max-w-[280px] text-[14px] leading-relaxed text-ink-400">
              Zero-knowledge AES-256-GCM encrypted storage for humans and AI agents.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 items-start">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") || link.href.startsWith("mailto") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-[13px] font-medium text-ink-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 flex justify-between border-t border-ink-800 pt-6 font-mono text-[12px] text-ink-500">
          <span>© {new Date().getFullYear()} BitAtlas. Zero-Knowledge Cloud Storage.</span>
          <span>bitatlas.com</span>
        </div>
      </footer>

    </div>
  );
}
