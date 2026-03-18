import Image from "next/image";
import { Shield, Brain, Globe, Lock, Cpu, Github, ExternalLink, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="BitAtlas Logo"
            width={32}
            height={32}
            className="rounded-lg shadow-sm"
          />
          <span className="font-bold text-xl tracking-tight">BitAtlas</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-blue-600 transition-colors">Security</a>
          <a href="#mcp" className="hover:text-blue-600 transition-colors">MCP</a>
        </div>
        <a 
          href="https://bitatlas.io" 
          className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
        >
          Get early access
        </a>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              NOW IN PRIVATE BETA
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
              Zero Knowledge Cloud Drive <br className="hidden md:block" />
              <span className="text-blue-600">for Humans and Agents</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed">
              The first privacy-first storage platform designed for the AI era. 
              End-to-end encrypted, agent-native, and built for EU data sovereignty.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-200/50 flex items-center justify-center gap-2">
                Get Early Access <ArrowRight size={20} />
              </button>
              <a 
                href="https://github.com/bitatlas-group/bitatlas" 
                className="w-full sm:w-auto px-8 py-4 bg-slate-50 text-slate-700 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all border border-slate-200 flex items-center justify-center gap-2"
              >
                <Github size={20} /> View Source
              </a>
            </div>
          </div>
          
          {/* Subtle background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-50 rounded-full blur-3xl -z-10 opacity-50"></div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Built for the future of work</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Secure by default, intelligent by design.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-6">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Secure Vault</h3>
                <p className="text-slate-600 leading-relaxed">
                  Your files are encrypted before they even leave your device. Only you hold the keys. No one else, not even us, can access your data.
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-6">
                  <Brain size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Agent-Native</h3>
                <p className="text-slate-600 leading-relaxed">
                  First-class support for AI agents through our MCP Server. Grant granular, secure access to your agents to interact with your data.
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mb-6">
                  <Globe size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">EU Sovereignty</h3>
                <p className="text-slate-600 leading-relaxed">
                  Hosted and operated within the EU. Fully GDPR compliant, ensuring your data remains under the protection of EU privacy laws.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section id="architecture" className="py-24 px-6 border-t border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">
                  Encryption Standard
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Military-Grade Zero Knowledge Architecture</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  BitAtlas uses <strong>AES-256-GCM</strong> encryption for data at rest and in transit. Our zero-knowledge protocol ensures that encryption keys never leave your machine.
                </p>
                <ul className="space-y-4">
                  {[
                    "E2E Encryption (AES-256-GCM)",
                    "Client-side key generation",
                    "No plaintext data ever hits our servers",
                    "Open-source encryption SDK"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                      <div className="text-blue-500"><Lock size={18} /></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 bg-slate-900 rounded-3xl p-8 md:p-12 text-blue-400 font-mono text-sm overflow-hidden shadow-2xl">
                <div className="flex gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="space-y-2 opacity-80">
                  <p>{"// BitAtlas Secure Key Derivation"}</p>
                  <p className="text-blue-300">const salt = crypto.getRandomValues(new Uint8Array(16));</p>
                  <p className="text-blue-300">const key = await deriveKey(password, salt);</p>
                  <p><span className="text-purple-400">const</span> encrypted = <span className="text-purple-400">await</span> encrypt(data, key, <span className="text-yellow-400">'AES-256-GCM'</span>);</p>
                  <p className="text-slate-500">{"// Uploading only the encrypted blob"}</p>
                  <p className="text-blue-300">await upload(encrypted);</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MCP Section */}
        <section id="mcp" className="py-24 px-6 bg-blue-600 text-white overflow-hidden relative">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 order-2 md:order-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                    <Cpu className="mb-4" />
                    <h4 className="font-bold mb-2">Claude / ChatGPT</h4>
                    <p className="text-sm opacity-80">Direct integration via MCP Server.</p>
                  </div>
                  <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mt-8">
                    <Shield className="mb-4" />
                    <h4 className="font-bold mb-2">Scoped Access</h4>
                    <p className="text-sm opacity-80">Permission-based file sharing for agents.</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 order-1 md:order-2">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">The first drive with an MCP heartbeat</h2>
                <p className="text-xl opacity-90 mb-8 leading-relaxed">
                  We believe agents should have their own secure workspace. With the <strong>Model Context Protocol (MCP)</strong>, BitAtlas allows you to give your AI assistants a persistent, encrypted "vault" they can read from and write to.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <ExternalLink size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold">Model Context Protocol</h4>
                      <p className="opacity-80">Industry-standard protocol for agentic data interaction.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Abstract circles */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="BitAtlas Logo"
              width={24}
              height={24}
              className="rounded shadow-sm"
            />
            <span className="font-bold tracking-tight">BitAtlas</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-slate-500">
            <a href="https://bitatlas.io" className="hover:text-blue-600">bitatlas.io</a>
            <a href="https://github.com/bitatlas-group/bitatlas" className="flex items-center gap-1 hover:text-blue-600">
              <Github size={16} /> GitHub
            </a>
          </div>
          
          <div className="text-sm text-slate-400">
            © 2024 BitAtlas. Built for the privacy era.
          </div>
        </div>
      </footer>
    </div>
  );
}
