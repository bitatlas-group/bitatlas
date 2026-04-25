import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function normalizeReadingTime(value: unknown): string {
  if (!value) return '5 min read';
  const s = String(value).trim();
  if (/^\d+$/.test(s)) return `${s} min read`;
  return s;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  keywords: string[];
  readingTime: string;
  content: string;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  const posts: BlogPost[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    const slug = data.slug || file.replace(/\.(mdx?|md)$/, '');
    posts.push({
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      author: data.author,
      keywords: data.keywords || [],
      readingTime: normalizeReadingTime(data.readingTime),
      content,
    });
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

export function getAllSlugs(): { slug: string }[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  const slugs: { slug: string }[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { data } = matter(raw);
    const slug = data.slug || file.replace(/\.(mdx?|md)$/, '');
    slugs.push({ slug });
  }

  return slugs;
}
