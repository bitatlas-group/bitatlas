import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getPostBySlug, getAllSlugs } from '@/lib/blog';

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
    mainEntityOfPage: `https://bitatlas.io/blog/${slug}`,
    keywords: post.keywords.join(', '),
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            <Link href="/#features" className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors">Product</Link>
            <Link href="/#why" className="font-headline font-medium text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors">Why BitAtlas</Link>
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
        <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-headline font-medium text-secondary hover:text-primary transition-colors mb-10"
          >
            <span className="material-symbols-outlined text-base leading-none">
              arrow_back
            </span>
            Back to blog
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant/60 mb-5">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>·</span>
            <span>{post.readingTime}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>

          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-primary tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant leading-relaxed">
            {post.description}
          </p>

          {/* Keywords */}
          <div className="mt-6 flex flex-wrap gap-2">
            {post.keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs bg-surface-container-high text-on-surface-variant rounded-full px-3 py-1 font-medium border border-outline-variant/20"
              >
                {kw}
              </span>
            ))}
          </div>

          <div className="my-10 h-[1px] w-full bg-outline-variant/30" />

          {/* MDX Content */}
          <div className="blog-prose">
            <MDXRemote source={post.content} />
          </div>

          {/* CTA */}
          <div className="mt-16 bg-primary rounded-[2rem] p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-50" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 opacity-20" />
            <h2 className="relative z-10 font-headline font-extrabold text-2xl text-on-primary tracking-tight">
              Encrypt your agent&apos;s data today
            </h2>
            <p className="relative z-10 mt-3 text-on-primary-container max-w-md mx-auto">
              BitAtlas gives your AI agents AES-256-GCM encrypted storage with
              zero-knowledge guarantees. Free tier, no credit card required.
            </p>
            <Link
              href="/register"
              className="relative z-10 mt-6 inline-flex items-center justify-center px-8 py-4 rounded-xl bg-on-primary text-primary font-headline font-bold text-lg hover:bg-primary-fixed transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </article>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
