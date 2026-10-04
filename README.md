# Apna Hisab — Design Handoff Kit

Everything needed to build the Apna Hisab Android app (React Native + TypeScript, offline-first).

**Giving this to Claude Code:** unzip into an empty folder (or the root of your new repo), open Claude Code in that folder, and say:

> Read CLAUDE.md and build Apna Hisab milestone by milestone. Compare each screen with its screenshot in design-reference/screenshots before moving on.

## What's inside

| Path | Contents |
|---|---|
| `CLAUDE.md` | Build instructions for Claude Code: stack, milestones, non-negotiables, definition of done |
| `design-reference/00-all-screens-overview.png` | Every phone screen on one page |
| `design-reference/screenshots/` | 32 PNGs — every screen, state board, design system, architecture and copy deck |
| `design-reference/index.html` | Browsable gallery; each screen opens as real HTML/CSS |
| `design-reference/screens/` | The 32 screens as standalone HTML (fonts bundled, works offline) |
| `design-reference/styles/` | Reference stylesheet + Mukta fonts |
| `design-reference/assets/` | App logo (cleaned 512px tile + original) |
| `docs/` | Design system, screen-by-screen spec, technical architecture |
| `src/theme/tokens.ts`, `tailwind.config.js` | Colours, logo gradients, type, spacing, radii, shadows as code |
| `src/i18n/en.json`, `hi.json` | All UI text in English and Hindi (361 matching keys) |
| `src/constants`, `src/types`, `src/utils` | Default categories, domain types, money helpers |
| `src/database/schema.sql`, `supabase/migrations/` | Local SQLite and cloud Postgres schemas (with RLS) |

## Things you still need to provide

- Google Cloud OAuth client IDs (Android + Web) and a Supabase project URL / anon key.
- Premium prices (screens show `₹[PRICE]` placeholders) and Play Console product IDs `premium_monthly`, `premium_yearly`.
- A text-free version of the logo (notebook + ₹ only) for the Android launcher icon.
- Support contact (`[SUPPORT_CONTACT]`), Terms and Privacy Policy URLs, AdMob unit IDs.
