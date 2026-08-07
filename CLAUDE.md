# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Onus Fitness marketing site + member portal. Static HTML/CSS/JS — no build step, no bundler, no package.json. Open the HTML files directly or serve the directory with any static file server.

## Architecture

Two independent surfaces sharing one design system:

- **Marketing landing page** — [index.html](index.html) + [src/styles/main.css](src/styles/main.css) + [src/scripts/main.js](src/scripts/main.js). A single long page built section-by-section (Header, Hero, How We Train, How It Works, Pricing/Tiers, About, Footer), each alternating dark/light background for visual rhythm. Sections are self-contained blocks in both the HTML and the CSS — `main.css` is organized with one clearly labeled `/* ── SECTION NAME ── */` comment block per section, in the same order as the markup, and ends with an `ADD NEW SECTIONS BELOW THIS LINE` marker.
- **Member portal** — [login.html](login.html), [signup.html](signup.html), [dashboard.html](dashboard.html) + [portal.css](portal.css) + [portal.js](portal.js). Auth and account management backed by Supabase (`@supabase/supabase-js@2` via CDN script tag, no npm install). `portal.css` loads alongside `src/styles/main.css` and reuses its design tokens rather than redefining them.

Portal pages currently reference `../src/styles/main.css` and `../index.html` as relative paths, implying they were authored to live in a subdirectory — but they sit at the repo root alongside `index.html`. Verify these paths resolve correctly before treating portal pages as working; this is a likely path bug in the current untracked work, not settled architecture.

### Design system

All shared visual language (color tokens, type scale, spacing scale) is defined once as CSS custom properties at the top of `src/styles/main.css` under `:root` (`--charcoal`, `--bronze`, `--ivory`, `--serif`/`--sans` font stacks, `--space-*` scale, etc.). Every other stylesheet in the project builds on these tokens — never hardcode a color or spacing value that already has a token.

Fonts are Google Fonts loaded via `<link>` tags in each page's `<head>` (Cormorant Garamond for serif/display, DM Sans for body/UI) — not self-hosted, not npm packages.

### JS conventions

No framework, no modules/bundler — plain scripts loaded via `<script src="...">` tags at the end of `<body>`.

- `main.js` is landing-page-only: header scroll state, mobile drawer toggle, and a single shared `IntersectionObserver` driving scroll-reveal animation for every `[data-reveal]` element (stagger timing lives in CSS transition-delay, not JS). Ends with an `ADD NEW SECTION SCRIPTS BELOW THIS LINE` marker.
- `portal.js` is shared across all three portal pages (`login.html`, `signup.html`, `dashboard.html`) in one file. It initializes a single Supabase client at the top, then defines one `init*Form`/`initDashboard` function per page; each function no-ops via an early `return` if that page's root element isn't present in the DOM. `DOMContentLoaded` calls all initializers unconditionally — the guard clauses make that safe.
- Supabase config (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) is hardcoded at the top of `portal.js`. The anon key is safe to expose client-side (Supabase's model relies on Row Level Security policies, not key secrecy) — do not treat it as a secret to remove, but do not swap in a service-role key here.

### Assets

Images/SVGs live in `public/images/`. `Onus Logo.pdf` at the repo root is a source asset, not something referenced by any page.

## Project context (business + product)

Onus Fitness sells personalized fitness programming across three tiers — **Base**, **Advanced**, **VIP** — delivered via automated email/SMS post-purchase. Brand voice is calm and authoritative, built around "your why" and self-determined outcomes; explicitly avoid hype/aggressive fitness-marketing language in any copy.

**Pricing is not yet locked.** All tier prices shown anywhere in the codebase (signup wizard, pricing section, etc.) are placeholders (`$XX`). This is the single highest-leverage open blocker — it gates Stripe product setup, final site copy, and Zapier automation simultaneously. Do not treat any dollar figure in the code as real without confirming first.

## Standing workflow rules

- **Discuss and approve direction before writing code.** This applies especially to copy — never write new customer-facing text into a file without explicit sign-off first.
- **Build and commit one section/page at a time.** Preview locally via Live Server before treating anything as done.
- **Fetch/read the actual current file before editing it — never assume a prior session's output was committed.** (This project has a history of drift between what was generated and what actually made it into the repo — e.g., the portal pages currently on disk aren't yet pushed to GitHub.)
- After any multi-step HTML edit that touches a `<script>` block, extract just the script and run `node --check` on it before considering the edit done.

## Supabase schema gotchas (learned the hard way)

- `orders.status` has a CHECK constraint — valid values include `'pending_fulfillment'` and `'fulfilled'`. **`'pending'` is NOT valid** and will fail silently-looking until you read the constraint error closely.
- `orders.tier` has a CHECK constraint requiring **capitalized** values: `'Base'`, `'Advanced'`, `'VIP'` — lowercase will fail.
- `orders.user_id` is nullable by design — an order can exist before the matching account does (or vice versa now, see onboarding flow below).
- The `on_auth_user_created` trigger's function (`handle_new_user`) must run as `SECURITY DEFINER` (`prosecdef = true`) to bypass RLS and write into `profiles`/`orders` on the new user's behalf. RLS policies on `orders`/`profiles` intentionally have no `INSERT` policy for authenticated users — inserts happen via this trigger (signup path) or the `service_role` key (Zapier/Stripe webhook path), both of which bypass RLS.
- Testing philosophy for this backend: verify schema → RLS enabled → policies → trigger, in that order, in isolation, before testing any frontend flow. Isolating layers makes failures attributable to one specific layer instead of guessing across the whole stack.

## Onboarding / signup flow — architecture in progress

The customer journey is being redesigned from **purchase-first** (old: buy → order row created with just an email → account created after, linked via email-matching trigger) to **account-first**:

1. Landing page → "Start Here" / "Get Started" CTA (real page navigation to a dedicated page, not a modal/popup)
2. Interstitial framing screen ("Create Your Profile") — sets expectation, no data collected yet
3. Goals: one main goal (single-select) → exactly 2 supporting goals (multi-select, hard-capped, "Other" reveals a required free-text explain box)
4. Access & Time: equipment described as **tiers** (Full commercial gym / Fully equipped home gym / Basic home gym / Minimal equipment / None-bodyweight only), not an equipment checklist — single-select. Then days/week paired with a session-length range (3 days 60–70min / 4 days 50–60min / 5 days 45–60min).
5. About You: first/last name, phone, gender (Male/Female only — no third option, by explicit decision)
6. Account creation: email + password + **required consent checkbox** (Privacy Policy/ToS) — this is the first point in the flow where anything is actually written to Supabase; steps 3–5 only live in browser session state until this point
7. Pricing (tier select) → payment

This reversal means: the account/`user_id` exists **before** payment, so Stripe checkout can attach `user_id` directly instead of relying solely on post-purchase email-matching. Needs a new order status distinct from `pending_fulfillment` — something like `pending_payment` — for accounts that exist but haven't completed checkout yet. The Stripe webhook logic needs updating to match this (currently assumes purchase-first).

A working front-end prototype of this flow exists (light ivory/bronze themed, matches the site's own "scrolled header" color state rather than the dark marketing-page default) — reference it for exact field names, validation rules, and copy before rebuilding this as real `start.html`/`start.css`/`start.js` pages. Ask Julian where the latest version of that prototype lives if it's not obviously in the repo yet.

## Legal/compliance — open items tied to the onboarding flow

- Accounts stuck in `pending_payment` status need a **30-day retention rule** (auto-delete or archive after inactivity) — not yet built.
- The consent checkbox at account creation is required precisely because that's the first moment data persists server-side — don't move data-collection earlier in the flow without re-checking this reasoning.
- Planned (not yet built): an automated agent that detects abandoned signups (`pending_payment`, inactive) and sends recovery emails.
- **SMS follow-up is explicitly out of scope** — decided against it because it requires separate TCPA opt-in consent beyond what email needs. Don't add SMS-based follow-up without revisiting this decision with Julian first.

## Style notes specific to signup/portal pages

- Marketing site (`index.html`) uses the dark charcoal-based palette as its default state.
- Signup/portal-style pages should use the palette in its **light mode** — the same one the marketing header already flips to on scroll (bronze wordmark, frosted ivory background, `--ivory`/`--cream` backgrounds, `--charcoal-dark` text). This isn't a new palette — it's the existing scrolled-header state used as the base instead of the exception, chosen so signup reads as "a distinct, focused part of the same site" rather than a popup or a different product.