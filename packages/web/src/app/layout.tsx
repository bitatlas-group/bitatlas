import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const TITLE = "BitAtlas — Encrypted Cloud for Humans & Agents";
const DESCRIPTION =
  "Zero-knowledge AES-256-GCM encrypted storage. Built for teams and AI agents that need private, sovereign file infrastructure.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bitatlas.com"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "BitAtlas",
    url: "https://bitatlas.com",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "BitAtlas — Zero-Knowledge Encrypted Cloud for Humans & AI Agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    site: "@bitatlas",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    other: [{ rel: "icon", url: "/icon-192.png", sizes: "192x192" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Site-wide entity schema so AI engines know what BitAtlas *is*.
  const orgSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://bitatlas.com/#org",
        name: "BitAtlas",
        url: "https://bitatlas.com",
        logo: "https://bitatlas.com/icon-192.png",
        description:
          "Zero-knowledge, end-to-end encrypted cloud storage for humans and AI agents.",
        // sameAs confirms the brand entity to AI engines. TODO: add LinkedIn,
        // Crunchbase, and a Wikidata entity (property P856) once they exist.
        sameAs: [
          "https://github.com/bitatlas-group",
          "https://twitter.com/bitatlas",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://bitatlas.com/#website",
        name: "BitAtlas",
        url: "https://bitatlas.com",
        publisher: { "@id": "https://bitatlas.com/#org" },
      },
      {
        "@type": "SoftwareApplication",
        name: "BitAtlas",
        url: "https://bitatlas.com",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        publisher: { "@id": "https://bitatlas.com/#org" },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Zero-knowledge AES-256-GCM client-side encryption",
          "MCP server for AI agents",
          "Scoped, revocable agent API keys",
          "EU (Germany) hosting, no US CLOUD Act jurisdiction",
        ],
      },
    ],
  };

  return (
    <html lang="en">
      <body className={`${poppins.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
