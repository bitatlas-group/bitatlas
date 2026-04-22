import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { BitatlasLogo } from '@/design-system/logo/BitatlasLogo';
import { Button } from '@/design-system/components/Button';
import { Badge } from '@/design-system/components/Badge';
import { IconArrow } from '@/design-system/icons';

export const metadata: Metadata = {
  title: 'Blog — BitAtlas',
  description:
    'Technical articles on zero-knowledge encryption, AI agent storage, and secure infrastructure from the BitAtlas engineering team.',
  alternates: {
    canonical: 'https://bitatlas.com/blog',
  },
  openGraph: {
    title: 'Blog — BitAtlas',
    description:
      'Technical articles on zero-knowledge encryption, AI agent storage, and secure infrastructure from the BitAtlas engineering team.',
    type: 'website',
    siteName: 'BitAtlas',
    url: 'https://bitatlas.com/blog',
  },
};

const NAV = [
  { href: '/#features', label: 'Product' },
  { href: '/#why',      label: 'Why BitAtlas' },
  { href: '/blog',      label: 'Blog' },
];

const FOOTER_LINKS = [
  { label: 'Security', href: '/security' },
  { label: 'Blog',     href: '/blog' },
  { label: 'GitHub',   href: 'https://github.com/bitatlas-group/bitatlas' },
  { label: 'npm',      href: 'https://www.npmjs.com/package/@bitatlas/mcp-server' },
  { label: 'Contact',  href: 'mailto:support@bitatlas.com' },
];

export default function BlogIndexPage() {
  const posts = getAllPosts();

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
              <Link key={n.href} href={n.href}
                className={`hover:text-ink-900 transition-colors${n.href === '/blog' ? ' text-brand-500' : ''}`}>
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
        <section className="bg-ink-900 text-white py-20 px-6 md:px-16">
          <div className="max-w-4xl mx-auto text-center space-y-5">
            <Badge tone="dark">Engineering Blog</Badge>
            <h1 className="text-[40px] md:text-[52px] font-semibold tracking-[-0.025em] leading-[1.1]">
              From the BitAtlas Team
            </h1>
            <p className="text-[17px] text-ink-300 max-w-2xl mx-auto leading-relaxed">
              Technical deep-dives on zero-knowledge encryption, AI agent storage architecture,
              and the security infrastructure powering the agentic web.
            </p>
          </div>
        </section>

        {/* ── Posts Grid ── */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          {posts.length === 0 ? (
            <p className="text-center text-ink-500 text-[17px] py-16">
              No articles yet — check back soon.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-white rounded-xl border border-ink-100 hover:border-brand-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="p-7 flex flex-col gap-4 h-full">
                    <div className="flex items-center gap-2.5 text-[12px] text-ink-400 font-mono">
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </time>
                      <span>·</span>
                      <span>{post.readingTime}</span>
                    </div>

                    <h2 className="text-[18px] font-semibold text-ink-900 group-hover:text-brand-500 transition-colors leading-snug">
                      {post.title}
                    </h2>

                    <p className="text-[14px] text-ink-500 leading-relaxed line-clamp-3 flex-1">
                      {post.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.keywords.slice(0, 3).map((kw) => (
                        <Badge key={kw} tone="neutral" className="text-[11px]">{kw}</Badge>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-1.5 text-[13px] font-medium text-brand-500 group-hover:gap-2.5 transition-all">
                      Read article
                      <IconArrow size={14} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── CTA ── */}
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="bg-ink-900 rounded-2xl px-12 py-16 text-center space-y-5">
            <h2 className="text-[32px] font-semibold tracking-[-0.02em] text-white">
              Ready to encrypt your agent&apos;s world?
            </h2>
            <p className="text-ink-400 max-w-md mx-auto text-[15px]">
              Get started with BitAtlas today. Free tier included — no credit card required.
            </p>
            <div className="pt-2">
              <Link href="/register">
                <Button variant="primary" size="lg">Get Started Free</Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-ink-900 text-white px-6 md:px-16 pt-12 pb-8 border-t border-ink-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/">
            <BitatlasLogo size={24} color="#3B82F6" wordColor="#FFFFFF" />
          </Link>
          <div className="flex flex-wrap justify-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') || link.href.startsWith('mailto') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-[13px] font-medium text-ink-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-ink-800 text-center font-mono text-[12px] text-ink-600">
          © {new Date().getFullYear()} BitAtlas. Zero-Knowledge Cloud Storage.
        </div>
      </footer>

    </div>
  );
}
