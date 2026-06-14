import type { Metadata } from 'next';

// no-referrer guarantees the #k=<key> fragment can never leak via the Referer
// header on any outbound click from the viewer. noindex keeps share links out
// of search results.
export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
  title: 'Shared file — BitAtlas',
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
