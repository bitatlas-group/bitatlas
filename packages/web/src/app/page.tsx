import Image from "next/image";
import Link from "next/link";


export default function Home() {
  return (
    <div className="bg-surface font-body text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/logo-full.jpg"
              alt="BitAtlas — Secure Cloud for Humans & Agents"
              width={240}
              height={66}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          {/* Nav links */}
          <div className="hidden md:flex gap-8 items-center">
            <a href="#features" className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors">Product</a>
            <a href="#pricing" className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors">Pricing</a>
            <a href="#why" className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors">Why BitAtlas</a>
            <Link href="/blog" className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors">Blog</Link>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary px-4 py-2"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl font-headline font-semibold text-sm tracking-tight hover:brightness-110 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
        {/* Bottom rule — tonal, not a hard border */}
        <div className="bg-slate-100/50 h-[1px] w-full absolute bottom-0" />
      </nav>

      <main className="pt-24">
        {/* ── Hero ── */}
        <section className="relative px-6 py-24 md:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Copy */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              {/* Beta badge */}
              <div className="inline-flex items-center gap-2 bg-surface-container-highest px-3 py-1 rounded-full self-start">
                <span
                  className="material-symbols-outlined text-sm text-on-tertiary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  security
                </span>
                <span className="text-[0.6875rem] font-headline font-bold uppercase tracking-widest text-on-tertiary-container">
                  Now in Private Beta
                </span>
              </div>

              <h1 className="font-headline font-extrabold text-5xl md:text-7xl leading-[1.1] tracking-tight text-primary">
                The Secure Storage Layer <br />
                <span className="text-secondary">for your AI Agents</span>
              </h1>

              <p className="text-xl text-on-surface-variant max-w-xl leading-relaxed">
                The Dropbox for the agentic world. End-to-end zero-knowledge
                encryption designed for autonomous workflows and high-trust
                human-AI collaboration.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link
                  href="/register"
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-headline font-bold text-lg hover:brightness-110 transition-all shadow-xl shadow-primary/10 text-center"
                >
                  Get Started for Free
                </Link>
                <a
                  href="https://github.com/bitatlas-group/bitatlas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-effect bg-surface-container-highest/50 text-on-surface px-8 py-4 rounded-xl font-headline font-bold text-lg border border-outline-variant/15 hover:bg-surface-container-highest transition-all text-center"
                >
                  View on GitHub
                </a>
              </div>

              {/* Compliance badges */}
              <div className="flex flex-wrap items-center gap-4 pt-8 opacity-70">
                <span className="text-xs font-bold uppercase tracking-widest text-outline">
                  Built with
                </span>
                <div className="flex flex-wrap gap-3">
                  {["EU-Hosted", "AES-256-GCM", "Zero-Knowledge", "USDC Payments", "Open Source"].map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 bg-surface-container-high rounded text-xs font-bold text-on-surface-variant uppercase tracking-wide border border-outline-variant/20"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Hero visual: mock vault UI */}
            <div className="lg:col-span-5 relative">
              <div className="relative z-10 aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-gradient-to-br from-primary via-primary-container to-tertiary p-8 flex flex-col gap-5">
                  {/* Vault header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-on-primary-container"
                          style={{
                            fontSize: "18px",
                            fontVariationSettings: "'FILL' 1",
                          }}
                        >
                          lock
                        </span>
                      </div>
                      <span className="text-xs font-headline font-bold text-on-primary-container">
                        Vault: Agent_734
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-tertiary-container px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-pulse" />
                      <span className="text-[9px] font-bold text-on-tertiary-container uppercase tracking-tighter">
                        Encrypted
                      </span>
                    </div>
                  </div>

                  {/* File rows */}
                  <div className="space-y-2 flex-1">
                    {[
                      { icon: "description", w: "w-28" },
                      { icon: "folder", w: "w-20" },
                      { icon: "smart_toy", w: "w-32" },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="h-10 bg-white/10 rounded-xl flex items-center px-3 gap-2"
                      >
                        <span
                          className="material-symbols-outlined text-on-primary-container"
                          style={{ fontSize: "18px" }}
                        >
                          {row.icon}
                        </span>
                        <div
                          className={`h-1.5 ${row.w} bg-on-primary-container/30 rounded`}
                        />
                        <div className="ml-auto h-1.5 w-10 bg-on-primary-container/20 rounded" />
                      </div>
                    ))}

                    {/* Drop zone */}
                    <div className="h-20 bg-white/5 rounded-xl border border-dashed border-on-primary-container/20 flex flex-col items-center justify-center gap-2 mt-2">
                      <span
                        className="material-symbols-outlined text-on-primary-container/40"
                        style={{ fontSize: "28px" }}
                      >
                        upload_file
                      </span>
                      <span className="text-[9px] font-bold text-on-primary-container/40 uppercase tracking-widest">
                        Awaiting Agent Input
                      </span>
                    </div>
                  </div>

                  {/* Status bar */}
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                    <span
                      className="material-symbols-outlined text-on-tertiary-container"
                      style={{ fontSize: "16px" }}
                    >
                      security
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
                      AES-256-GCM Active
                    </span>
                  </div>
                </div>

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent pointer-events-none" />
              </div>

              {/* Decorative blobs */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-tertiary-fixed-dim/20 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-primary-fixed/30 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* ── Features Bento Grid ── */}
        <section id="features" className="bg-surface-container-low py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-headline font-extrabold text-4xl text-primary tracking-tight">
                Built for the Agentic Frontier
              </h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">
                Hardware-level security meets cloud-scale flexibility. Give your
                agents the memory they need without compromising your privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: "shield_lock",
                  iconBg: "bg-primary-container",
                  iconColor: "text-on-primary",
                  title: "Zero-Knowledge Encryption",
                  desc: "Your data is encrypted locally before it ever leaves your agent's environment. We never hold the keys, meaning we can't see your data even if we wanted to.",
                },
                {
                  icon: "smart_toy",
                  iconBg: "bg-secondary",
                  iconColor: "text-on-secondary",
                  title: "Agent-First Storage",
                  desc: "MCP server with 7 tools for upload, download, search, and file management. Your AI agents get encrypted persistent storage via a single npm package.",
                },
                {
                  icon: "payments",
                  iconBg: "bg-tertiary-container",
                  iconColor: "text-on-tertiary-container",
                  title: "Pay-per-Request with USDC",
                  desc: "No account needed. Agents pay with USDC stablecoins on Base via the x402 standard. Upload for $0.01, download for $0.005. No signup, no API key, no KYC.",
                },
                {
                  icon: "cloud_sync",
                  iconBg: "bg-tertiary",
                  iconColor: "text-on-tertiary",
                  title: "Simple Integration",
                  desc: "Install with npx @bitatlas/mcp-server and connect to Claude, Cursor, or any MCP-compatible client. Open source on GitHub — MIT licensed.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col gap-6 shadow-sm border border-outline-variant/10"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${card.iconBg} flex items-center justify-center`}
                  >
                    <span
                      className={`material-symbols-outlined ${card.iconColor} text-3xl`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {card.icon}
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-2xl text-primary">
                    {card.title}
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why BitAtlas ── */}
        <section id="why" className="py-32 bg-surface">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              {/* Left: copy + bullet list */}
              <div className="lg:w-1/2 space-y-12">
                <div className="space-y-6">
                  <h2 className="font-headline font-extrabold text-4xl md:text-5xl text-primary tracking-tight">
                    Why BitAtlas?
                  </h2>
                  <p className="text-lg text-on-surface-variant leading-relaxed">
                    Traditional cloud storage wasn&apos;t built for the scale or
                    the security needs of autonomous agents. BitAtlas provides
                    the missing infrastructure for persistent agentic
                    intelligence.
                  </p>
                </div>

                <div className="space-y-8">
                  {[
                    {
                      bg: "bg-tertiary-container",
                      icon: "verified",
                      iconColor: "text-on-tertiary-container",
                      title: "Verifiable Integrity",
                      desc: "Every byte stored is cryptographically signed, ensuring agents never execute corrupted or tampered code.",
                    },
                    {
                      bg: "bg-secondary-container",
                      icon: "bolt",
                      iconColor: "text-on-secondary-container",
                      title: "EU Infrastructure",
                      desc: "Hosted on Hetzner in Germany. Your data stays in the EU, governed by EU law. No US CLOUD Act exposure.",
                    },
                    {
                      bg: "bg-primary-fixed",
                      icon: "policy",
                      iconColor: "text-on-primary-fixed-variant",
                      title: "Privacy Governance",
                      desc: "Granular access controls allow you to define exactly which agent can see which data, and for how long.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-6">
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-full ${item.bg} flex items-center justify-center`}
                      >
                        <span
                          className={`material-symbols-outlined ${item.iconColor} text-2xl`}
                        >
                          {item.icon}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-headline font-bold text-xl text-primary">
                          {item.title}
                        </h4>
                        <p className="text-on-surface-variant">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: vault card illustration */}
              <div className="lg:w-1/2 bg-surface-container-high p-8 rounded-[3rem] relative">
                <div className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-xl border border-outline-variant/20">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-white text-sm"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          lock
                        </span>
                      </div>
                      <span className="font-headline font-bold text-primary">
                        Secure Vault: Agent_734
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-tertiary-container px-3 py-1 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse" />
                      <span className="text-[10px] font-bold text-on-tertiary-container uppercase tracking-tighter">
                        Encrypted Session
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="h-12 bg-surface-container rounded-xl w-full flex items-center px-4 justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant">
                          description
                        </span>
                        <div className="h-2 w-32 bg-outline-variant/30 rounded" />
                      </div>
                      <div className="h-2 w-12 bg-outline-variant/30 rounded" />
                    </div>

                    <div className="h-12 bg-surface-container rounded-xl w-full flex items-center px-4 justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant">
                          folder
                        </span>
                        <div className="h-2 w-24 bg-outline-variant/30 rounded" />
                      </div>
                      <div className="h-2 w-12 bg-outline-variant/30 rounded" />
                    </div>

                    <div className="h-32 bg-primary-container/5 rounded-xl border border-dashed border-primary/20 flex flex-col items-center justify-center gap-3">
                      <span className="material-symbols-outlined text-primary/40 text-3xl">
                        upload_file
                      </span>
                      <span className="text-xs font-bold text-primary/40 uppercase tracking-widest">
                        Awaiting Agent Input
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rotated glow behind card */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[90%] bg-gradient-to-br from-secondary/5 to-primary/5 rounded-[4rem] rotate-2" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Section ── */}
        <section id="pricing" className="py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-headline font-extrabold text-4xl text-primary tracking-tight">
                Pay-per-Request Pricing
              </h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">
                One price model. No subscriptions, no accounts, no hidden fees. Just USDC on Base.
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              {/* Single USDC pricing card */}
              <div className="bg-surface-container-lowest p-10 rounded-[2rem] flex flex-col gap-6 shadow-lg border-2 border-tertiary/30 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tertiary text-on-tertiary text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                  No Account Required
                </div>
                <div className="space-y-2 text-center">
                  <h3 className="font-headline font-bold text-3xl text-primary">Pay with USDC</h3>
                  <p className="text-on-surface-variant">Your agent pays per request. No signup, no API key, no KYC.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  {[
                    { op: "Upload", price: "$0.01" },
                    { op: "Download", price: "$0.005" },
                    { op: "List files", price: "$0.001" },
                    { op: "Renew 30d", price: "$0.005" },
                  ].map((item) => (
                    <div key={item.op} className="bg-surface-container rounded-xl p-4 text-center">
                      <div className="text-2xl font-headline font-extrabold text-primary">{item.price}</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-1">{item.op}</div>
                    </div>
                  ))}
                </div>

                <ul className="space-y-3 text-on-surface-variant mt-2">
                  {[
                    "30 days storage included per upload",
                    "E2E encrypted — we never see your data",
                    "USDC on Base (Coinbase L2)",
                    "Works with any x402-compatible agent",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/blog/anonymous-agent-storage-x402-payments" className="mt-auto bg-tertiary text-on-tertiary px-6 py-4 rounded-xl font-headline font-bold text-center text-lg hover:brightness-110 transition-all">
                  See How It Works →
                </Link>
              </div>
            </div>

            {/* Payment badges */}
            <div className="flex justify-center items-center gap-6 mt-12">
              <span className="text-xs font-bold uppercase tracking-widest text-outline">Powered by</span>
              <div className="flex gap-3">
                {["x402 Protocol", "USDC on Base", "Coinbase L2"].map((badge) => (
                  <span key={badge} className="px-3 py-1 bg-surface-container-high rounded text-xs font-bold text-on-surface-variant uppercase tracking-wide border border-outline-variant/20">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="bg-primary p-12 md:p-20 rounded-[3rem] text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-50" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 opacity-20" />

            <h2 className="relative z-10 font-headline font-extrabold text-4xl md:text-5xl text-on-primary tracking-tight">
              Your agents deserve a vault,<br />not a folder.
            </h2>
            <p className="relative z-10 text-on-primary-container text-xl max-w-2xl mx-auto">
              Pay with USDC. Store encrypted. No account needed.
            </p>

            <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a
                href="#pricing"
                className="bg-on-primary text-primary px-10 py-5 rounded-2xl font-headline font-bold text-xl hover:bg-primary-fixed transition-all"
              >
                View Pricing
              </a>
              <a
                href="https://github.com/bitatlas-group/bitatlas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-primary px-10 py-5 font-headline font-bold text-xl hover:underline underline-offset-8 transition-all"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ── Trusted By Section ── */}
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="text-center space-y-8">
            <h3 className="font-headline font-bold text-sm uppercase tracking-[0.2em] text-on-surface-variant/60">
              Trusted by the next generation of apps
            </h3>
            <div className="flex justify-center items-center gap-12 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <a 
                href="https://legacyshield.eu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 group"
              >
                <div className="relative h-12 w-48 flex items-center justify-center">
                  <span className="font-headline font-black text-2xl tracking-tighter text-primary group-hover:text-secondary transition-colors">
                    LegacyShield
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 group-hover:text-primary transition-colors">
                  First Production Customer
                </span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-50 w-full">
        <div className="h-[1px] w-full bg-slate-200" />
        <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center">
              <Image
                src="/logo-full.jpg"
                alt="BitAtlas"
                width={200}
                height={55}
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs tracking-wide uppercase font-semibold text-slate-500">
              © 2026 BitAtlas. Zero-Knowledge Cloud Storage.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 items-center">
            {[
              { label: "Security", href: "/security" },
              { label: "Blog", href: "/blog" },
              { label: "GitHub", href: "https://github.com/bitatlas-group/bitatlas" },
              { label: "npm", href: "https://www.npmjs.com/package/@bitatlas/mcp-server" },
              { label: "Contact", href: "mailto:support@bitatlas.com" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") || link.href.startsWith("mailto") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-xs tracking-wide uppercase font-semibold text-slate-500 hover:text-primary transition-colors underline decoration-blue-500/30 underline-offset-4"
              >
                {link.label}
              </a>
            ))}
            <a 
              href="https://legacyshield.eu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs tracking-wide uppercase font-bold text-primary hover:text-secondary transition-colors"
            >
              Used by LegacyShield
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
