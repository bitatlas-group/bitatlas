import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { getPostBySlug, getAllSlugs } from '@/lib/blog';
import { BitatlasLogo } from '@/design-system/logo/BitatlasLogo';
import { Button } from '@/design-system/components/Button';
import { Badge } from '@/design-system/components/Badge';
import { IconArrow } from '@/design-system/icons';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — BitAtlas Blog`,
    description: post.description,
    keywords: post.keywords.join(', '),
    authors: [{ name: post.author }],
    alternates: {
      canonical: `https://bitatlas.com/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      siteName: 'BitAtlas',
      url: `https://bitatlas.com/blog/${slug}`,
    },
  };
}

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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'BitAtlas',
      url: 'https://bitatlas.com',
    },
    mainEntityOfPage: `https://bitatlas.com/blog/${slug}`,
    keywords: post.keywords.join(', '),
  };

  return (
    <div className="bg-ink-25 text-ink-900 min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
        <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">

          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-500 hover:text-brand-600 transition-colors mb-10"
          >
            <IconArrow size={14} className="rotate-180" />
            Back to blog
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[12px] text-ink-400 mb-5">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </time>
            <span>·</span>
            <span>{post.readingTime}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>

          <h1 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-ink-900 leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-[17px] text-ink-500 leading-relaxed">
            {post.description}
          </p>

          {/* Keywords */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {post.keywords.map((kw) => (
              <Badge key={kw} tone="neutral">{kw}</Badge>
            ))}
          </div>

          <div className="my-10 h-px w-full bg-ink-100" />

          {/* MDX Content */}
          <div className="blog-prose">
            <MDXRemote source={post.content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
          </div>

          {/* CTA */}
          <div className="mt-16 bg-ink-900 rounded-2xl p-8 md:p-10 text-center">
            <h2 className="text-[24px] font-semibold text-white tracking-tight">
              Encrypt your agent&apos;s data today
            </h2>
            <p className="mt-3 text-ink-400 max-w-md mx-auto text-[15px]">
              BitAtlas gives your AI agents AES-256-GCM encrypted storage with
              zero-knowledge guarantees. Free tier, no credit card required.
            </p>
            <div className="mt-6">
              <Link href="/register">
                <Button variant="primary" size="lg">Get Started Free</Button>
              </Link>
            </div>
          </div>

        </article>
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
