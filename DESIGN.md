# Design System Strategy: The Secure Intelligence Layer

## 1. Overview & Creative North Star
The North Star for this design system is **"The Secure Intelligence Layer."** 

In a world where agents and humans collaborate, the interface shouldn't feel like a standard file browser; it should feel like an authoritative, high-security vault that is simultaneously breathable and ethereal. We are moving away from the "boxy" SaaS aesthetic toward an editorial, high-trust experience. We achieve this by breaking the rigid grid with intentional asymmetry—large, confident headlines offset by vast amounts of whitespace—and replacing harsh borders with tonal shifts and glassmorphism. The result is a UI that feels "calculated" yet "weightless," echoing the zero-knowledge encryption that sits beneath the surface.

## 2. Colors & Surface Philosophy
The color palette is rooted in deep obsidian blues and technical teals, designed to evoke reliability and the futuristic "network" environment requested.

### The "No-Line" Rule
To maintain a premium, custom feel, **1px solid borders are prohibited for sectioning.** Boundaries between different functional areas must be defined solely by background color shifts. For example, a sidebar should use `surface-container-low` against a main content area of `surface`. This creates a sophisticated, seamless transition that suggests a unified environment rather than a collection of separate boxes.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of frosted glass. 
- **Base Layer:** `surface` (#f7f9ff)
- **Primary Containers:** `surface-container-low` (#f1f4fa) or `surface-container` (#ebeef4).
- **Elevated Components:** `surface-container-lowest` (#ffffff) for cards and modals to create a "lifted" effect.
- **Deep Insets:** `surface-container-highest` (#dfe3e8) for search bars or input areas to suggest depth into the "vault."

### The Glass & Gradient Rule
For elements that exist "above" the flow (like floating navigation or hover tooltips), use **Glassmorphism**. Apply a semi-transparent `surface` color with a `backdrop-blur` of 12px–20px. 
**Signature Texture:** Main CTAs or Hero sections should use a subtle linear gradient from `primary` (#002046) to `primary-container` (#1b365d) at a 135-degree angle. This adds "soul" and visual depth that flat colors lack.

## 3. Typography
Our typography pairing is designed to balance technical sophistication with human accessibility.

*   **Display & Headlines (Manrope):** We use Manrope for its geometric, modern feel. The wide apertures and high x-height convey transparency and technical precision.
    *   *Scale Example:* `display-lg` (3.5rem) should be used sparingly for "hero" moments, with generous letter-spacing (-0.02em).
*   **Titles & Body (Inter):** Inter is the industry standard for legibility. It handles the dense information architecture of a "Dropbox" clone with ease.
*   **Labeling:** `label-sm` (0.6875rem) in all-caps with increased letter-spacing is used for "Security Status" or "Agent Activity" to mimic a high-end dashboard or technical manual.

## 4. Elevation & Depth
In this system, depth is communicated through **Tonal Layering** and light physics, not drop shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f1f4fa) background. The contrast in light values provides all the "lift" needed.
*   **Ambient Shadows:** If a floating effect is mandatory (e.g., a dropdown), use a shadow with a blur radius of 32px and 4%–6% opacity. The shadow color must be a tinted version of `on-surface` (#181c20), never pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` (#c4c6cf) at **15% opacity**. A 100% opaque border is considered a design failure.
*   **Micro-Depth:** Use the `tertiary` (#002528) and `tertiary-container` (#003c40) for subtle accents in encryption indicators to suggest a different "tier" of the network.

## 5. Components

### Buttons
*   **Primary:** Linear gradient (`primary` to `primary-container`), white text, `xl` (0.75rem) roundedness.
*   **Secondary:** Glassmorphic background (semi-transparent `surface-container-highest`) with `on-secondary-container` text.
*   **State:** On hover, increase the gradient intensity; never use a simple color overlay.

### Input Fields
*   **Style:** No borders. Use `surface-container-highest` as the fill. On focus, transition to a `secondary` ghost border (20% opacity) and a very subtle inner glow. 
*   **Labels:** Use `label-md` floating above the field to maximize vertical breathing room.

### Cards & Lists
*   **The Divider Ban:** Vertical lines between files or list items are strictly forbidden. Use `spacing-4` (1rem) or `spacing-6` (1.5rem) to separate content. 
*   **Selection:** Instead of a checkbox, a selected card should shift its background to `primary-fixed` (#d6e3ff) with a soft glow.

### Specialized Component: "The Vault Indicator"
A custom chip component using `tertiary_fixed_dim` (#5dd8e2) text on a `tertiary_container` (#003c40) background with a subtle pulse animation. Use this to indicate active zero-knowledge encryption sessions.

## 6. Do's and Don'ts

### Do
*   **DO** use intentional asymmetry. For example, left-align a headline and right-align the supporting body copy in a hero section to create an editorial flow.
*   **DO** use the `24` (6rem) spacing token for top-level section margins to create "High-End" breathing room.
*   **DO** use `tertiary` accents for AI-agent-specific interactions to differentiate them from human-file management.

### Don't
*   **DON'T** use 1px solid dividers to separate list items. Use background color shifts (`surface-container-low` vs `surface-container-lowest`).
*   **DON'T** use harsh, high-opacity shadows. Depth should feel like ambient light in a clean room, not a heavy object on a desk.
*   **DON'T** use the `error` (#ba1a1a) color for anything other than critical security breaches or data loss warnings. High-trust systems remain calm.