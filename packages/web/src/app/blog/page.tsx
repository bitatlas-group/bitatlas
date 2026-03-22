import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog — BitAtlas',
  description:
    'Technical articles on zero-knowledge encryption, AI agent storage, and secure infrastructure from the BitAtlas engineering team.',
  alternates: {
    canonical: 'https://bitatlas.io/blog',
  },
  openGraph: {
    title: 'Blog — BitAtlas',
    description:
      'Technical articles on zero-knowledge encryption, AI agent storage, and secure infrastructure from the BitAtlas engineering team.',
    type: 'website',
    siteName: 'BitAtlas',
    url: 'https://bitatlas.io/blog',
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-full.jpg"
              alt="BitAtlas — Secure Cloud for Humans & Agents"
              width={240}
              height={66}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>

          <div className="hidden md:flex gap-8 items-center">
            {(['Product', 'Pricing', 'Developers'] as const).map((label) => (
              <a
                key={label}
                href="#"
                className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors"
              >
                {label}
              </a>
            ))}
            <Link
              href="/blog"
              className="font-headline font-medium text-sm tracking-tight text-primary transition-colors"
            >
              Blog
            </Link>
          </div>

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
        <div className="bg-slate-100/50 h-[1px] w-full absolute bottom-0" />
      </nav>

      <main className="pt-24">
        {/* ── Hero ── */}
        <section className="bg-surface-container-low py-20 md:py-28">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-5">
            <div className="inline-flex items-center gap-2 bg-surface-container-highest px-3 py-1 rounded-full">
              <span className="text-[0.6875rem] font-headline font-bold uppercase tracking-widest text-on-tertiary-container">
                Engineering Blog
              </span>
            </div>
            <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-primary tracking-tight">
              From the BitAtlas Team
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Technical deep-dives on zero-knowledge encryption, AI agent
              storage architecture, and the security infrastructure powering the
              agentic web.
            </p>
          </div>
        </section>

        {/* ── Posts Grid ── */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          {posts.length === 0 ? (
            <p className="text-center text-on-surface-variant text-lg py-16">
              No articles yet — check back soon.
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
                >
                  <div className="p-8 flex flex-col gap-4 h-full">
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant/60">
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                      <span>·</span>
                      <span>{post.readingTime}</span>
                    </div>

                    <h2 className="font-headline font-bold text-xl text-primary group-hover:text-secondary transition-colors leading-snug">
                      {post.title}
                    </h2>

                    <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3 flex-1">
                      {post.description}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {post.keywords.slice(0, 3).map((kw) => (
                        <span
                          key={kw}
                          className="inline-block text-xs bg-surface-container-high text-on-surface-variant rounded-full px-2.5 py-0.5 font-medium border border-outline-variant/20"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-1.5 text-sm font-headline font-semibold text-secondary group-hover:gap-2.5 transition-all">
                      Read article
                      <span className="material-symbols-outlined text-base leading-none">
                        arrow_forward
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── CTA ── */}
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="bg-primary p-12 md:p-16 rounded-[3rem] text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-50" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 opacity-20" />
            <h2 className="relative z-10 font-headline font-extrabold text-3xl md:text-4xl text-on-primary tracking-tight">
              Ready to encrypt your agent's world?
            </h2>
            <p className="relative z-10 text-on-primary-container max-w-xl mx-auto">
              Get started with BitAtlas today. Free tier included — no credit
              card required.
            </p>
            <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link
                href="/register"
                className="bg-on-primary text-primary px-8 py-4 rounded-xl font-headline font-bold text-lg hover:bg-primary-fixed transition-all"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-50 w-full">
        <div className="h-[1px] w-full bg-slate-200" />
        <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link href="/">
              <Image
                src="/logo-full.jpg"
                alt="BitAtlas"
                width={200}
                height={55}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs tracking-wide uppercase font-semibold text-slate-500">
              © 2026 BitAtlas Inc. Secure Intelligence Layer.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {['Privacy Policy', 'Terms of Service', 'Security Whitepaper', 'Status', 'Contact'].map(
              (link) => (
                <a
                  key={link}
                  href="#"
                  className="text-xs tracking-wide uppercase font-semibold text-slate-500 hover:text-primary transition-colors underline decoration-blue-500/30 underline-offset-4"
                >
                  {link}
                </a>
              )
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
