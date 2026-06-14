import type { Metadata } from "next";
import Link from "next/link";
import { BitatlasLogo } from "@/design-system/logo/BitatlasLogo";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { DottedGlobe } from "@/design-system/patterns/DottedGlobe";
import { IconArrow, IconCheck, IconShield } from "@/design-system/icons";
import { Link2, Bot, User, Lock, Eye, Ban, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Share links — public link, private content | BitAtlas",
  description:
    "Hand a file to anyone — or let an agent hand one to a human — over a public link the host can't read. The decryption key travels in the URL fragment; BitAtlas only ever sees ciphertext and a random id.",
  alternates: { canonical: "/share" },
};

const NAV = [
  { href: "/#features", label: "Product" },
  { href: "/share", label: "Share" },
  { href: "/#why", label: "Why BitAtlas" },
  { href: "/blog", label: "Blog" },
];

const HOW = [
  {
    icon: <Lock size={18} />,
    title: "Encrypted before it leaves you",
    body: "Every file is sealed with its own AES-256-GCM key in your browser (or the agent's process). We only ever store ciphertext.",
  },
  {
    icon: <Link2 size={18} />,
    title: "The key rides in the link",
    body: "Sharing puts the file key in the URL fragment (after the #). Browsers never send fragments to a server — so the key never reaches BitAtlas.",
  },
  {
    icon: <Eye size={18} />,
    title: "Decrypted only on open",
    body: "The recipient's browser reads the key from the link and decrypts locally. The server hands out ciphertext and a random id — nothing else.",
  },
];

const CONTROLS = [
  { icon: <Clock size={16} />, title: "Expiry", body: "Links live for 24h, 7 days, or 30 days — then go dark automatically." },
  { icon: <Ban size={16} />, title: "Revoke anytime", body: "Kill a link in one click. The server stops handing out the file immediately." },
  { icon: <IconShield size={16} />, title: "Download caps", body: "Optionally limit a link to N downloads before it expires." },
  { icon: <Lock size={16} />, title: "No host-side reading", body: "No HTML is ever rendered and we can't open the file — so it can't become a phishing or malware host." },
];

export default function SharePage() {
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
            <Link href="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
            <Link href="/register"><Button variant="primary" size="sm">Sign Up</Button></Link>
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
            style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(8,18,32,0) 0%, rgba(8,18,32,0.8) 65%)" }} />
          <div className="relative max-w-[760px]">
            <Badge tone="dark">● Zero-knowledge share links</Badge>
            <h1 className="mt-7 text-[52px] md:text-[76px] font-semibold leading-[1.05] tracking-[-0.03em]">
              Public link,<br />private content.
            </h1>
            <p className="mt-6 max-w-[540px] text-[18px] leading-relaxed text-ink-300">
              Hand a file to anyone with a link they can open in a browser — except the host can&apos;t read it.
              The decryption key lives in the link itself, so not even BitAtlas can open what you share.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link href="/register">
                <Button variant="primary" size="lg" iconRight={<IconArrow size={16} />}>Start for free</Button>
              </Link>
              <a href="https://www.npmjs.com/package/@bitatlas/mcp-server" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="lg" className="bg-transparent text-white border-ink-600 hover:bg-ink-800">
                  For agents (MCP)
                </Button>
              </a>
            </div>
            <div className="mt-14 flex flex-wrap gap-x-9 gap-y-2 font-mono text-[13px] text-ink-400">
              <span>Key in URL fragment</span><span>·</span><span>Server sees only ciphertext</span><span>·</span><span>Expiry &amp; revocation</span>
            </div>
          </div>
        </section>

        {/* ── Two audiences ── */}
        <section className="px-6 md:px-16 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">Two ways to share</div>
            <h2 className="mt-3 max-w-[640px] text-[40px] font-semibold leading-[1.1] tracking-[-0.02em]">
              For people. And for the agents working for them.
            </h2>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Humans */}
              <div className="bg-white border border-ink-100 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 text-brand-500 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <h3 className="text-[20px] font-semibold">For people</h3>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
                  In your vault, hit <span className="font-medium text-ink-700">Share link</span> on any file. Pick an
                  expiry and an optional download limit, and copy a link you can drop into email, chat, or a ticket.
                  The recipient opens it in any browser — no account, no app, no plugin — and the file decrypts in front of them.
                </p>
                <ul className="mt-6 space-y-3">
                  {["No account needed to receive", "Inline preview for images, PDFs & text", "Revoke or expire whenever you want"].map((t) => (
                    <li key={t} className="flex items-center gap-3 text-[14px] text-ink-700">
                      <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center"><IconCheck size={13} /></span>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/vault"><Button variant="dark" size="md" iconRight={<IconArrow size={15} />}>Open your vault</Button></Link>
                </div>
              </div>

              {/* Agents */}
              <div className="bg-ink-900 text-white rounded-2xl p-8 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                  <h3 className="text-[20px] font-semibold">For agents</h3>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
                  An agent produces an artifact and needs to hand it to a human. With the BitAtlas MCP server, that&apos;s one
                  tool call — and the link it returns is one the host can&apos;t read. The decryption key never leaves the
                  agent&apos;s process except inside the link.
                </p>
                <pre className="mt-6 bg-black/40 border border-ink-700 rounded-xl p-4 text-[12.5px] leading-relaxed text-ink-200 overflow-x-auto font-mono">
{`bitatlas_share_file({
  file_id: "…",
  expires_in: "7d"
})

→ https://www.bitatlas.com/s/AbC123…#k=…
   (anyone with the link can read it —
    BitAtlas cannot)`}
                </pre>
                <div className="mt-8">
                  <a href="https://www.npmjs.com/package/@bitatlas/mcp-server" target="_blank" rel="noopener noreferrer">
                    <Button variant="primary" size="md" iconRight={<IconArrow size={15} />}>Get the MCP server</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-ink-50 px-6 md:px-16 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">How it stays private</div>
            <h2 className="mt-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em]">Zero-knowledge, by construction.</h2>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
              {HOW.map((h) => (
                <div key={h.title} className="bg-white border border-ink-100 rounded-2xl p-7">
                  <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 text-brand-500 flex items-center justify-center">{h.icon}</div>
                  <h4 className="mt-5 text-[17px] font-semibold">{h.title}</h4>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{h.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-[13px] text-ink-400 max-w-2xl">
              Honest caveat: anyone you give a link to can read the file, and anyone who already downloaded it keeps it —
              revocation stops <span className="italic">future</span> downloads. That&apos;s true of every share tool; ours at
              least guarantees the <span className="font-medium text-ink-600">server</span> never can.
            </p>
          </div>
        </section>

        {/* ── Controls ── */}
        <section className="px-6 md:px-16 py-24">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em]">You stay in control.</h2>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {CONTROLS.map((c) => (
                <div key={c.title} className="bg-white border border-ink-100 rounded-2xl p-6">
                  <div className="w-9 h-9 rounded-lg bg-ink-50 text-ink-700 flex items-center justify-center">{c.icon}</div>
                  <h4 className="mt-4 text-[16px] font-semibold">{c.title}</h4>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">{c.body}</p>
                </div>
              ))}
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
                Share a file the host can&apos;t read.
              </h2>
              <p className="relative z-10 mt-4 text-ink-300 text-[18px] max-w-xl mx-auto">
                Free to start. Receiving is always free — and always private.
              </p>
              <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <Link href="/register"><Button variant="primary" size="lg">Get Started Free</Button></Link>
                <a href="https://github.com/bitatlas-group/bitatlas" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="lg" className="text-white border-ink-600 hover:bg-ink-800">View on GitHub</Button>
                </a>
              </div>
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
              End-to-end AES-256-GCM encrypted file storage for humans and AI agents.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 items-start">
            {[
              { label: "Share", href: "/share" },
              { label: "Security", href: "/security" },
              { label: "Blog", href: "/blog" },
              { label: "GitHub", href: "https://github.com/bitatlas-group/bitatlas" },
              { label: "npm", href: "https://www.npmjs.com/package/@bitatlas/mcp-server" },
            ].map((link) => (
              <a key={link.label} href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-[13px] font-medium text-ink-400 hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
