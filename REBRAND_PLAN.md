# BitAtlas Rebrand Plan

**Scope:** Full visual rebrand of bitatlas.com from Material Design 3 to the Bitatlas design system.  
**Constraint:** Zero functional regression — all auth, vault, crypto, API, and blog behaviour unchanged.  
**Source of truth:** `packages/web/design-system/` (after move, see Phase 0).

---

## What changes vs. what stays

| Area | Changes | Stays the same |
|---|---|---|
| Colors | Material Design 3 tokens → ink/brand scale | All color semantics (error = red, success = green) |
| Fonts | Manrope + Inter → Poppins + JetBrains Mono | Font loading mechanism (next/font) |
| Icons | Material Symbols → Lucide React | Icon meaning/intent |
| Nav links | Product/Why BitAtlas → Platform / Data / Solutions / Resources / About | Login / Register / vault links |
| Hero copy | Current → design system defaults (overridable) | Encryption value prop |
| Patterns | None → DottedGlobe SVG | — |
| Auth pages | Visual shell only | All form logic, AuthContext, CryptoContext |
| Vault | Visual shell only | All file ops, encryption, folder logic, API calls |
| Blog | `.blog-prose` styles + nav/footer shell | MDX rendering, remark-gfm, all content |
| Tailwind config | v4 @theme block → new token set | v4 syntax preserved |

---

## Phase 0 — Copy design system into repo

**Goal:** Move the design system from `~/Documents/design-system/` into the web package so it's versioned alongside the app and importable.

**Target path:** `packages/web/src/design-system/`

**Files to copy (exact paths):**
```
Documents/design-system/
  components/Badge.tsx       → src/design-system/components/Badge.tsx
  components/Button.tsx      → src/design-system/components/Button.tsx
  components/Card.tsx        → src/design-system/components/Card.tsx
  components/Input.tsx       → src/design-system/components/Input.tsx
  components/index.ts        → src/design-system/components/index.ts
  components/Label.tsx       → src/design-system/components/Label.tsx
  sections/Hero.tsx          → src/design-system/sections/Hero.tsx
  sections/Pillars.tsx       → src/design-system/sections/Pillars.tsx
  sections/ProductShowcase.tsx → src/design-system/sections/ProductShowcase.tsx
  sections/SiteFooter.tsx    → src/design-system/sections/SiteFooter.tsx
  sections/SiteNav.tsx       → src/design-system/sections/SiteNav.tsx
  sections/index.ts          → src/design-system/sections/index.ts
  patterns/DottedGlobe.tsx   → src/design-system/patterns/DottedGlobe.tsx
  icons/index.tsx            → src/design-system/icons/index.tsx
  icons/_template.tsx        → src/design-system/icons/_template.tsx
  logo/BitatlasLogo.tsx      → src/design-system/logo/BitatlasLogo.tsx
  logo/BitatlasMark.tsx      → src/design-system/logo/BitatlasMark.tsx
  logo/index.ts              → src/design-system/logo/index.ts
  logo/svg/                  → src/design-system/logo/svg/ (all files)
  tokens.css                 → src/design-system/tokens.css
  tokens.ts                  → src/design-system/tokens.ts
  utils/cn.ts (create)       → src/design-system/utils/cn.ts
  BRAND.md                   → src/design-system/BRAND.md
```

**`utils/cn.ts`** — create this file (not in design-system source but required by components):
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

**Required npm installs:**
```bash
npm install clsx tailwind-merge lucide-react --save  # in packages/web
```
`clsx` and `tailwind-merge` back `cn()`. `lucide-react` replaces Material Symbols.

**Adapt `SiteNav.tsx` for BitAtlas app:**
The design system's `SiteNav` uses nav items `Platform / Data / Solutions / Resources / About` — these are placeholder destinations. For bitatlas.com the nav will be:
- `/#features` → "Product"
- `/#why` → "Why BitAtlas"  
- `/blog` → "Blog"
- Right side: `Log In` (ghost) + `Sign Up` (primary)

The `SiteNav` component accepts a `nav` prop override (or we patch it once it's in the repo), so this is a one-line config change.

**Adapt `SiteFooter.tsx` for BitAtlas links:**
The design system footer has placeholder `COLUMNS`. Replace with BitAtlas-appropriate links. The footer component will be edited after copy to remove the placeholder columns and add real ones.

---

## Phase 1 — Token layer: Tailwind + CSS

**Goal:** Swap the current Material Design 3 token block in `globals.css` with the design system tokens. After this phase everything will break visually but compile correctly.

### 1a. `globals.css` — Replace `@theme` block

**Remove** the entire `@theme { ... }` block (lines 3–66 approx).

**Replace with:**
```css
@import "./design-system/tokens.css";

@theme {
  /* Brand */
  --color-brand-50:  var(--bit-brand-050);
  --color-brand-100: var(--bit-brand-100);
  --color-brand-400: var(--bit-brand-400);
  --color-brand-500: var(--bit-brand-500);
  --color-brand-600: var(--bit-brand-600);

  /* Ink */
  --color-ink-25:  var(--bit-ink-025);
  --color-ink-50:  var(--bit-ink-050);
  --color-ink-100: var(--bit-ink-100);
  --color-ink-200: var(--bit-ink-200);
  --color-ink-300: var(--bit-ink-300);
  --color-ink-400: var(--bit-ink-400);
  --color-ink-500: var(--bit-ink-500);
  --color-ink-600: var(--bit-ink-600);
  --color-ink-700: var(--bit-ink-700);
  --color-ink-800: var(--bit-ink-800);
  --color-ink-900: var(--bit-ink-900);

  /* Semantic */
  --color-success: var(--bit-success);
  --color-warn:    var(--bit-warn);
  --color-danger:  var(--bit-danger);

  /* Typography */
  --font-sans: var(--font-poppins), 'Poppins', system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), 'JetBrains Mono', 'SF Mono', monospace;

  /* Radii */
  --radius-xs: var(--bit-radius-xs);
  --radius-sm: var(--bit-radius-sm);
  --radius-md: var(--bit-radius-md);
  --radius-lg: var(--bit-radius-lg);
  --radius-xl: var(--bit-radius-xl);

  /* Shadows */
  --shadow-sm: var(--bit-shadow-sm);
  --shadow-md: var(--bit-shadow-md);
  --shadow-lg: var(--bit-shadow-lg);
  --shadow-glow: var(--bit-shadow-glow);

  /* Type scale */
  --text-display: 72px;
  --text-h1: 40px;
  --text-h2: 28px;
  --text-h3: 20px;
  --text-body: 16px;
  --text-small: 14px;
  --text-label: 11px;

  /* Legacy aliases — used in vault/auth; remove after Phase 3 */
  --color-primary:                   var(--bit-brand-500);
  --color-primary-container:         var(--bit-ink-800);
  --color-on-primary:                #ffffff;
  --color-secondary:                 var(--bit-brand-400);
  --color-on-secondary:              #ffffff;
  --color-tertiary:                  var(--bit-ink-700);
  --color-on-tertiary:               #ffffff;
  --color-on-tertiary-container:     var(--bit-brand-400);
  --color-surface:                   var(--bit-ink-025);
  --color-surface-bright:            #ffffff;
  --color-on-surface:                var(--bit-ink-900);
  --color-on-surface-variant:        var(--bit-ink-500);
  --color-surface-container-lowest:  #ffffff;
  --color-surface-container-low:     var(--bit-ink-050);
  --color-surface-container:         var(--bit-ink-100);
  --color-surface-container-high:    var(--bit-ink-100);
  --color-surface-container-highest: var(--bit-ink-200);
  --color-background:                var(--bit-ink-025);
  --color-on-background:             var(--bit-ink-900);
  --color-outline:                   var(--bit-ink-400);
  --color-outline-variant:           var(--bit-ink-200);
  --color-error:                     var(--bit-danger);
  --color-error-container:           #fde8e8;
  --color-on-error:                  #ffffff;
  --color-on-error-container:        #7f0000;
  --font-headline:                   var(--font-sans);
  --font-body:                       var(--font-sans);
  --font-label:                      var(--font-sans);
}
```

**Why legacy aliases?** The vault and auth pages reference `--color-primary`, `--color-surface` etc. in inline styles and Tailwind utility classes. The aliases keep them working through Phase 3 without a big-bang rewrite. They are removed page-by-page.

### 1b. `globals.css` — Update `.blog-prose` styles

Replace all `var(--color-*)` references in `.blog-prose` with the new token names:

| Old | New |
|---|---|
| `var(--color-primary)` | `var(--bit-brand-600)` |
| `var(--color-on-surface)` | `var(--bit-ink-900)` |
| `var(--color-on-surface-variant)` | `var(--bit-ink-500)` |
| `var(--color-secondary)` | `var(--bit-brand-400)` |
| `var(--color-outline-variant)` | `var(--bit-ink-200)` |
| `var(--color-surface-container-highest)` | `var(--bit-ink-100)` |
| `var(--color-surface-container-high)` | `var(--bit-ink-100)` |
| `var(--color-surface-container-lowest)` | `#ffffff` |
| `var(--font-headline)` | `var(--font-sans)` |

Also update `.blog-prose code` to use `font-family: var(--font-mono)`.

Remove `.glass-effect` (not used in new design).
Keep `.material-symbols-outlined` variation settings until Phase 3 (vault still uses them).

---

## Phase 2 — Font swap

**File:** `packages/web/src/app/layout.tsx`

**Remove:**
```ts
import { Manrope, Inter } from "next/font/google";
const manrope = Manrope({ ... });
const inter = Inter({ ... });
```

**Add:**
```ts
import { Poppins, JetBrains_Mono } from "next/font/google";

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
```

**Update body className:**
```tsx
<body className={`${poppins.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
```

**Keep** the Material Symbols `<link>` tag in `<head>` until Phase 3 is complete (vault still uses them).

**Update `metadata`:**
```ts
export const metadata: Metadata = {
  title: "BitAtlas — Encrypted Cloud for Humans & Agents",
  description: "Zero-knowledge AES-256-GCM encrypted storage. Built for teams and AI agents that need private, sovereign file infrastructure.",
};
```

---

## Phase 3 — Marketing pages

### 3a. `page.tsx` (home page)

**Current structure (what's there):**
- Inline `<nav>` with logo, links, CTA
- Hero with gradient and feature bullets
- Feature grid (3–4 cards)
- Product showcase section
- CTA banner
- Footer

**New structure (design system):**
```tsx
import { SiteNav } from "@/design-system/sections/SiteNav";
import { Hero } from "@/design-system/sections/Hero";
import { Pillars } from "@/design-system/sections/Pillars";
import { ProductShowcase } from "@/design-system/sections/ProductShowcase";
import { SiteFooter } from "@/design-system/sections/SiteFooter";
```

**Hero props for BitAtlas:**
```tsx
<Hero
  eyebrow="● New — MCP Server v2"
  title={<>Encrypted cloud<br />for agents & humans.</>}
  body="AES-256-GCM client-side encryption. Zero-knowledge by design. Built for autonomous AI workflows and high-trust storage."
  primaryCta={{ label: "Start for free", href: "/register" }}
  secondaryCta={{ label: "Read the docs", href: "https://github.com/bitatlas-group/bitatlas" }}
  stats={["AES-256-GCM", "Zero-knowledge", "MCP-native"]}
/>
```

**Pillars props:**
```tsx
const PILLARS = [
  { icon: <IconShield size={24}/>, label: "ZERO KNOWLEDGE", title: "Your keys, your data.", body: "Files are encrypted in your browser before upload. The server stores ciphertext only. We cannot read, sell, or disclose your data — mathematically." },
  { icon: <IconGlobe size={24}/>,  label: "AGENT-READY",    title: "MCP server, first-class.", body: "AI agents connect via the Model Context Protocol. Scoped API keys, pre-derived keys, 7 vault tools. No password, no exposure." },
  { icon: <IconChart size={24}/>,  label: "SOVEREIGN",      title: "EU infrastructure, no CLOUD Act.", body: "Hosted on Hetzner (Germany). Zero US jurisdiction. GDPR-compliant by architecture, not policy." },
];
```

**ProductShowcase:** Swap mock dashboard to show vault file list mockup (same `MockDashboard` structure, updated copy and stats to reflect storage not analytics).

**SiteFooter columns for BitAtlas:**
```ts
const COLUMNS = [
  { title: "PRODUCT",   links: [["Vault", "/"], ["MCP Server", "https://github.com/bitatlas-group/bitatlas"], ["Security", "/security"], ["Pricing", "#"]] },
  { title: "DEVELOPERS", links: [["GitHub", "https://github.com/bitatlas-group/bitatlas"], ["npm", "https://npmjs.com/..."], ["API Docs", "#"], ["Changelog", "#"]] },
  { title: "COMPANY",   links: [["Blog", "/blog"], ["About", "#"], ["Contact", "mailto:support@bitatlas.com"]] },
];
```

**What to preserve from current `page.tsx`:**
- The `<Link href="/register">` and `<Link href="/login">` auth entry points
- The blog section link (`/blog`)
- The `/security` page link

**Functional risk:** None. This page has no state, no API calls, no auth logic.

---

### 3b. `blog/page.tsx` (blog listing)

**Changes:**
- Replace inline nav with `<SiteNav>` (configured for BitAtlas, see 3a)
- Replace inline footer with `<SiteFooter>`
- Post cards: replace Material Design card styles with `<Card>` from design system
- Post card heading: `text-h3 text-ink-900`, body: `text-small text-ink-500`
- Tags/keywords: `<Badge tone="neutral">` or `<Badge tone="brand">`
- Background: `bg-ink-25` (was `bg-surface`)
- "Read more" link: `text-brand-500 hover:text-brand-600` (was secondary color)

**What to preserve:** All `getAllPosts()` calls, post sorting, slug links — no logic changes.

---

### 3c. `blog/[slug]/page.tsx` (blog post)

**Changes:**
- Replace inline nav with `<SiteNav>`
- Replace inline footer with `<SiteFooter>`
- Article heading: `text-h1 text-ink-900` (was `text-primary font-headline font-extrabold`)
- Description: `text-body text-ink-500`
- Keywords: `<Badge tone="neutral" className="text-label">`
- Author/date line: `font-mono text-small text-ink-400` (JetBrains Mono — fits the technical feel)
- Divider: `border-ink-100` (was `border-outline-variant/30`)
- Back link: `text-brand-500 hover:text-brand-600`
- CTA section: `bg-ink-900 text-white rounded-xl` with brand button — replace current gradient CTA

**What to preserve:** `MDXRemote`, `remarkGfm`, `generateStaticParams`, `generateMetadata`, all SEO metadata, JSON-LD schema — zero logic changes.

---

### 3d. `security/page.tsx`

Read current content and apply same nav/footer swap + token replacement. Security page is purely static/marketing — zero functional risk.

---

## Phase 4 — Auth pages

**Files:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/layout.tsx`

**Note on shell:** The `(auth)` directory name with parentheses requires quoting in bash commands (`git add "src/app/(auth)/..."`) — already handled in previous work.

**Layout changes:**
- Background: `bg-ink-900` (dark canvas) or `bg-ink-25` (light) — dark matches brand feel
- Logo: Replace `<Image src="/logo-full.jpg">` with `<BitatlasLogo size={32} color="#3B82F6" wordColor="#FFFFFF" />`
- Remove `font-headline`, `font-body` class names → `font-sans` handles everything via CSS

**Login form changes:**
- Form container: `<Card className="w-full max-w-sm">` (`bg-white border border-ink-100 shadow-md`)
- Input fields: Replace existing inputs with `<Input>` from design system (same `focus:ring-brand` behaviour, same `border-ink-100`)
- Submit button: `<Button variant="primary" size="lg" className="w-full">`
- Error display: `text-danger text-small` (was `text-error`)
- "Log in" heading: `text-h2 text-ink-900`
- Links (`Register here`, `Forgot password`): `text-brand-500 hover:text-brand-600`

**Register form changes:** Same pattern as login. The registration flow includes a passphrase step (CryptoContext) — do not touch any of that logic. Only the surrounding visual shell changes.

**What to preserve entirely:** `useAuth()` calls, `useCrypto()` calls, form submission logic, error state, loading state, all `router.push()` navigation, passphrase encryption setup.

---

## Phase 5 — Vault app

The vault is the most complex page (~600 lines). It uses Material Symbols throughout for file type icons and UI chrome. The approach: **replace Material Symbols with Lucide React**.

### 5a. Icon mapping (Material Symbols → Lucide React)

| Material Symbol | Lucide React | Usage |
|---|---|---|
| `progress_activity` | `Loader2` (+ `animate-spin`) | Loading spinners |
| `search` | `Search` | Search input |
| `upload` | `Upload` | Upload button |
| `download` | `Download` | Download action |
| `close` / `cancel` | `X` | Modal close, cancel |
| `home` | `Home` | Breadcrumb home |
| `folder` | `Folder` | Folder items |
| `create_new_folder` | `FolderPlus` | New folder button |
| `chevron_right` | `ChevronRight` | Breadcrumb separator |
| `error` | `AlertCircle` | Error state |
| `image` | `Image` | Image file type |
| `video_file` | `Video` | Video file type |
| `audio_file` | `Music` | Audio file type |
| `picture_as_pdf` | `FileText` | PDF file type |
| `table_chart` | `Sheet` | Spreadsheet |
| `description` | `FileType2` | Word/document |
| `article` | `AlignLeft` | Text file |
| `insert_drive_file` | `File` | Generic file |
| `delete` | `Trash2` | Delete action |
| `drive_file_move` | `FolderInput` | Move file |
| `sort` | `ArrowUpDown` | Sort toggle |
| `arrow_back` | `ArrowLeft` | Back navigation |
| `lock` | `Lock` | Security/encryption indicator |
| `visibility` | `Eye` | Preview |

**Implementation:** In `vault/page.tsx`, replace every `<span className="material-symbols-outlined">icon_name</span>` with the Lucide import. All Lucide icons accept `size`, `strokeWidth`, and `color`/`className` props — the existing inline `style={{ fontSize: '20px', color: '#6B7280' }}` patterns translate directly to `size={20} className="text-ink-400"`.

**Example replacement:**
```tsx
// Before
<span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#6B7280' }}>folder</span>

// After
<Folder size={20} className="text-ink-400" />
```

### 5b. Vault color token replacement

All inline `style={{ color: '#...' }}` hardcoded colors in the vault map to design tokens:

| Hardcoded | Token class | Use |
|---|---|---|
| `#6B7280` | `text-ink-400` | Secondary icons, metadata |
| `#9CA3AF` | `text-ink-300` | Disabled, placeholder |
| `#D1D5DB` | `text-ink-200` | Dividers, subtle chrome |
| `#1A2332` | `text-ink-900` | Active/current state |
| `#1E40AF` | `text-brand-600` | Loading spinner in context |
| `#374151` | `text-ink-700` | Body text |
| `white` | `text-white` | On dark backgrounds |

All `style={{ color: '...' }}` → `className="text-ink-400"` (etc.) using Tailwind.

### 5c. Vault surface/container replacements

| Old class | New class |
|---|---|
| `bg-surface` | `bg-ink-25` |
| `bg-surface-container-low` | `bg-ink-50` |
| `bg-surface-container` | `bg-ink-100` |
| `bg-surface-container-high` | `bg-ink-100` |
| `text-on-surface` | `text-ink-900` |
| `text-on-surface-variant` | `text-ink-500` |
| `border-outline-variant` | `border-ink-200` |
| `text-primary` | `text-brand-500` |
| `bg-primary` | `bg-brand-500` |
| `text-on-primary` | `text-white` |
| `text-error` | `text-danger` |
| `bg-error` | `bg-danger` |

### 5d. Vault layout chrome

- **Sidebar** (if present): `bg-ink-900 text-white` (dark nav, brand pattern)
- **Topbar**: `bg-white border-b border-ink-100` + `<BitatlasLogo size={24} />`
- **File list rows**: `bg-white hover:bg-ink-50 border-b border-ink-100`
- **Upload drop zone**: `border-2 border-dashed border-ink-200 bg-ink-25 rounded-lg`
- **Active upload progress**: `bg-brand-500` progress bar
- **Folder pills in breadcrumb**: `text-small font-medium text-ink-500 hover:text-ink-900`

### 5e. Vault settings page (`vault/settings/page.tsx`)

Same token replacement pattern. Likely uses form inputs — swap with `<Input>` component and `<Button>` variants.

---

## Phase 6 — Remove Material Symbols

Once Phase 5 is complete and vault uses only Lucide React:

1. Remove the Google Fonts `<link>` for Material Symbols from `layout.tsx`
2. Remove `.material-symbols-outlined` rule from `globals.css`
3. Remove the legacy CSS variable aliases from `globals.css` (the `/* Legacy aliases */` block added in Phase 1)

---

## Phase 7 — Logo asset

**Current:** `/public/logo-full.jpg` (raster)  
**New:** `<BitatlasLogo>` SVG component (inline, already in design system)

All `<Image src="/logo-full.jpg" ...>` instances → `<BitatlasLogo size={32} />` (or appropriate size).

The raster logo can stay in `/public` as fallback for OG image generation.

**OG / social metadata:** Update `metadata` in `layout.tsx` to include `openGraph.images` pointing to a static `/public/og.png` (create from existing logo, no code change needed beyond the metadata field).

---

## Phase 8 — Blog engine prompt update

The blog engine (remote trigger) writes raw MDX. After the rebrand, ensure future posts don't reference Material Design tokens in inline styles. Update the trigger prompt to add:

> "Do not use inline `style=` attributes. Use only Tailwind classes. Available color classes: `text-brand-500`, `text-brand-600`, `text-ink-*`. Do not use `bg-primary`, `text-on-surface`, or any `--color-*` CSS variable references."

---

## Execution order & risk profile

| Phase | Risk | Why |
|---|---|---|
| 0 — Copy design system | None | New files only |
| 1 — Tokens + legacy aliases | Low | Legacy aliases keep vault/auth working |
| 2 — Font swap | Low | Visual only, same rendering path |
| 3 — Marketing pages | Low | No state, no API, no auth |
| 4 — Auth pages | Medium | Must not touch form submit logic |
| 5 — Vault | High | 600-line stateful component, icon replacements |
| 6 — Remove Material Symbols | Low | Only after Phase 5 verified |
| 7 — Logo | Low | Swap `<Image>` → `<BitatlasLogo>` |
| 8 — Blog engine prompt | None | Config change only |

**Recommended test checkpoints:**
- After Phase 1: `npm run build` must pass. No visual QA needed.
- After Phase 2: Verify Poppins loads in browser, monospace appears in code blocks.
- After Phase 3: All marketing pages render correctly. Blog posts render.
- After Phase 4: Register flow end-to-end. Login and enter vault. Passphrase prompt works.
- After Phase 5: Upload file, download file, move to folder, delete file, preview image/PDF. Settings save.
- After Phase 6: No Material Symbols font request in Network tab.

---

## Files touched (complete list)

```
packages/web/
  src/design-system/            ← new directory (Phase 0)
  src/app/globals.css           ← Phase 1 + 6
  src/app/layout.tsx            ← Phase 2 + 6 + 7
  src/app/page.tsx              ← Phase 3a
  src/app/blog/page.tsx         ← Phase 3b
  src/app/blog/[slug]/page.tsx  ← Phase 3c
  src/app/security/page.tsx     ← Phase 3d
  src/app/(auth)/layout.tsx     ← Phase 4
  src/app/(auth)/login/page.tsx ← Phase 4
  src/app/(auth)/register/page.tsx ← Phase 4
  src/app/vault/layout.tsx      ← Phase 5
  src/app/vault/page.tsx        ← Phase 5 (largest change)
  src/app/vault/settings/page.tsx ← Phase 5
  package.json                  ← Phase 0 (add clsx, tailwind-merge, lucide-react)
  package-lock.json             ← Phase 0
```

**Files that do NOT change:**
```
src/contexts/AuthContext.tsx
src/contexts/CryptoContext.tsx
src/contexts/FolderContext.tsx
src/lib/api.ts
src/lib/blog.ts
src/lib/crypto/fileEncryption.ts
src/lib/crypto/keyDerivation.ts
src/app/sitemap.ts
src/app/providers.tsx
content/blog/**          ← existing posts stay, new style via .blog-prose
```

---

## Token quick-reference card

For use during implementation:

**Actions:** `bg-brand-500 text-white` / hover: `bg-brand-600`  
**Links:** `text-brand-500 hover:text-brand-600`  
**Page bg:** `bg-ink-25` (light) / `bg-ink-900` (dark)  
**Cards:** `bg-white border border-ink-100 shadow-sm rounded-lg`  
**Body text:** `text-ink-900`  
**Secondary text:** `text-ink-500`  
**Muted text:** `text-ink-400`  
**Dividers:** `border-ink-100` / `border-ink-200`  
**Error:** `text-danger` / `bg-danger`  
**Success:** `text-success`  
**Code:** `font-mono text-ink-900 bg-ink-100`  
**Labels (caps):** `text-label uppercase text-ink-400 tracking-widest`  
