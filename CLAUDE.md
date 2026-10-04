# Apna Hisab — Build Instructions for Claude Code

> "Apni Kamai, Apna Kharcha, Apna Hisab." — Bas transaction likho, baaki hisab Apna Hisab karega.

You are building **Apna Hisab**, an offline-first Android app (React Native + TypeScript) for recording daily income, expenses and Udhaar (money lent/borrowed). Users include auto/cab drivers, delivery workers, vendors, shopkeepers, freelancers and salaried people. Many are first-time finance-app users and may prefer Hindi.

**The one rule that beats every other:** a user must be able to record a transaction in 5–10 seconds, online or offline. If a feature slows that down, don't build it.

## Read these first (in order)

| File | What it gives you |
|---|---|
| `design-reference/screenshots/` | **The visual truth.** A 2× PNG of every screen and state (`06-Home.png`, `09-AddExpense.png`, …). Look at the matching screenshot before building any screen. |
| `design-reference/screens/*.html` | The same screens as real HTML/CSS (open `design-reference/index.html` in a browser). Inspect them for exact spacing, sizes and colours; every class maps to a component in the design system. |
| `design-reference/styles/apna-hisab.css` | The stylesheet those screens use — a precise reference for tokens, shadows, radii and gradients. Translate to RN; don't ship it. |
| `design-reference/assets/logo.png` | The app logo (use as-is; see design system §6 for launcher icon notes). |
| `docs/DESIGN_SYSTEM.md` | Colours, **logo gradients**, type, spacing, every reusable component with props, variants, states and a11y rules |
| `docs/SCREENS.md` | Every screen: route, params, exact layout top-to-bottom, data, actions, navigation, empty/loading/error states, acceptance criteria |
| `docs/ARCHITECTURE.md` | Navigation tree, folder structure, SQLite + Supabase schema, repositories, sync engine, stores, validation, ads/premium rules |
| `src/theme/tokens.ts` | Design tokens + gradients as code — the single source of truth for styling |
| `tailwind.config.js` | NativeWind config matching the tokens |
| `src/i18n/en.json`, `src/i18n/hi.json` | Every UI string, English + Hindi, identical keys (361) |
| `src/constants/categories.ts` | Default income/expense categories with lucide icons and Hindi names |
| `src/types/models.ts` | Domain types |
| `src/utils/money.ts` | Paise helpers, Indian number formatting, keypad input rules |
| `src/database/schema.sql` | Local SQLite schema (migration 001) incl. Udhaar balance view |
| `supabase/migrations/0001_init.sql` | Cloud schema with Row Level Security + profile trigger |

When the screenshots and the docs disagree on looks, **the screenshots win**; on behaviour, **the docs win**. Sample names and amounts in the screenshots are illustrative data.

## Stack (use exactly this unless blocked)

- Expo SDK (latest stable) with a **development build** (not Expo Go — native modules are required), TypeScript strict
- React Navigation v7: native-stack + bottom-tabs
- Zustand (app/session state), React Hook Form + Zod (forms)
- NativeWind v4 (Tailwind classes) — use tokens, never raw hex in components
- `expo-sqlite` (local DB, source of truth for the UI)
- `@supabase/supabase-js` (Auth + Postgres), `@react-native-google-signin/google-signin` → `supabase.auth.signInWithIdToken`
- `@react-native-community/netinfo` (connectivity)
- `expo-local-authentication` + `expo-secure-store` (biometric / PIN)
- `@gorhom/bottom-sheet`, `react-native-reanimated`, `react-native-gesture-handler`
- `react-native-svg` + `victory-native` (or `react-native-gifted-charts`) for bar/line/donut
- `lucide-react-native` icons (names listed in the design system)
- `@expo-google-fonts/mukta` — Mukta covers Latin **and** Devanagari
- `expo-linear-gradient` — brand gradients (hero, primary button, FAB, splash); values in `tokens.ts → gradients`
- `i18next` + `react-i18next` + `expo-localization`
- `react-native-google-mobile-ads` (free plan), Google Play Billing via `react-native-iap` or RevenueCat (premium)
- `uuid` (v4, generated on device)

## Build order (milestones — finish and verify each before the next)

1. **Foundation:** Expo app, TS strict, NativeWind wired to `tokens.ts`, Mukta loaded, i18n with en/hi, navigation skeleton with all routes as placeholders, primitives `AppText`, `Amount`, `GradientSurface` (wraps `expo-linear-gradient` with the token gradients), `Card` (shadow), `Button` variants. Build the Splash with the logo first to verify fonts, gradient and asset loading.
2. **Local data:** SQLite schema + migrations runner, seed default categories, repositories (`transactionsRepo`, `categoriesRepo`, `udhaarRepo`, `syncQueueRepo`), money utils with unit tests.
3. **Core loop (the product):** Home dashboard, FAB sheet, Add/Edit Transaction (keypad, category tiles, payment/date chips), Transactions list + search + filters, Transaction detail + delete with undo. Works fully offline. No auth needed yet (use a local user id).
4. **Auth & onboarding:** Splash, Welcome, Google login, Language, App lock setup, Lock screen. Attach local data to the signed-in user.
5. **Sync engine:** queue, push/pull, conflict rule, SyncStatus chip + banners, retries.
6. **Udhaar:** list, person detail, add entry sheet.
7. **Reports:** period selector, summary, charts, report detail, custom range, financial calendar.
8. **More / Settings / Categories management / Export (CSV)**.
9. **Monetisation:** ad slots (respecting placement rules), Premium screen, entitlements, PDF/Excel export gated.
10. **Polish:** empty/loading/error states everywhere, accessibility pass (TalkBack, font scale 1.3×), small-screen pass (360×640), dark-mode tokens wired (light ships first).

## Non-negotiables

- **Offline-first:** every write goes to SQLite first and returns instantly. Network is never awaited on a user action. Never block entry because of connectivity.
- **Money is integer paise** (`amount_paise INTEGER`). Never store or add floats. Format with `Intl.NumberFormat('en-IN')` (₹2,50,000 grouping).
- **Net = total income − total expense.** Udhaar is never included in income/expense/net.
- **Colour is never the only signal:** income always shows `+` and an in-arrow; expense always `−` and an out-arrow.
- **No ads** on: onboarding, lock, Add/Edit Transaction, Add Udhaar, any sheet or dialog, Premium, Delete account. Never show an interstitial right after a save.
- **Every string comes from i18n.** No hard-coded copy in components. Hindi must never truncate amounts — wrap text instead.
- Touch targets ≥ 44dp; buttons 54dp; FAB 62dp.
- **Gradients only** on: Home hero, Reports summary card, Splash, primary buttons, FAB, active tab pill. Never behind lists, forms, the keypad or body text. Cards have no borders — they use `shadows.card`.
- Use soft deletes (`deleted_at`) so deletions sync.
- Do not add features not in `docs/SCREENS.md` (no budgets, no bank linking, no SMS reading, no multi-currency in V1).

## Definition of done (per screen)

- Side-by-side with its screenshot in `design-reference/screenshots/`, it looks the same (layout, spacing, colours, type).
- Matches layout and copy in `docs/SCREENS.md`, using design-system components only.
- All listed states implemented: empty, loading, error, offline.
- Works in English and Hindi; works at 360×640 and 412×915; works with system font scale 1.3×.
- TalkBack reads every control with a meaningful label (amounts read as "500 rupees expense").
- No TypeScript errors, no ESLint errors; repositories and money utils have unit tests.
