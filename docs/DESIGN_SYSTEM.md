# Apna Hisab — Design System v1

Direction: **"digital bahi-khata" in the logo's emerald gradient** — a green→emerald→deep-teal brand gradient (taken from the app logo) on hero surfaces, primary buttons and the FAB; calm warm-white everywhere else; numbers are the heroes. Colour carries financial meaning only. Reference CSS that renders every screen exactly: `design-reference/styles/apna-hisab.css`; screenshots in `design-reference/screenshots/`.

---

## 1. Colour

### Light (V1 default)

| Token | Hex | NativeWind | Use |
|---|---|---|---|
| `primary` | `#0A7A5E` | `bg-primary` `text-primary` | Emerald. Links, selected states, active tab, solid fallback for gradients |
| `primaryPress` | `#065F4F` | `bg-primary-press` | Pressed primary; text on primary tint |
| `primaryTint` | `#E2F4EC` | `bg-primary-tint` | Selected chip, active-tab pill, icon tiles |
| `hero` | `#066457` | `bg-hero` | Solid fallback under the hero gradient |
| `gold` / `goldTint` | `#F29C15` / `#FFF1D6` | `text-gold` | Logo ₹ gold. Premium only (crown, badges) — never for money meaning |
| `incomeOnHero` / `expenseOnHero` | `#B4F0CB` / `#FFBC9C` | — | Income / expense numbers placed on the gradient hero |
| `income` | `#137A43` | `text-income` | Money in, positive net, "Receive" |
| `incomeTint` | `#E6F4EC` | `bg-income-tint` | Income tiles, positive calendar day |
| `expense` | `#C2410C` | `text-expense` | Money out, negative net, "Pay" |
| `expenseTint` | `#FDEEE6` | `bg-expense-tint` | Expense tiles, negative calendar day |
| `expenseChart` | `#E8875B` | — | Expense bars in charts (lighter, so the pair differs in lightness) |
| `udhaar` | `#3949A8` | `text-udhaar` | People avatars, Udhaar icons |
| `udhaarTint` | `#ECEEFA` | `bg-udhaar-tint` | Avatar backgrounds |
| `success` | `#137A43` | `text-success` | Synced, saved |
| `warning` | `#8A4B00` | `text-warning` | Pending sync, retrying |
| `warningTint` | `#FFF3DC` | `bg-warning-tint` | Pending chip, Premium badge |
| `error` | `#B42318` | `text-error` | Destructive actions, field errors |
| `errorTint` | `#FDECEA` | `bg-error-tint` | Error banners |
| `background` | `#F5F6F3` | `bg-background` | App ground |
| `surface` | `#FFFFFF` | `bg-surface` | Cards, sheets, inputs |
| `muted` | `#F0F2F0` | `bg-muted` | Segmented control track, keypad area |
| `textPrimary` | `#15201C` | `text-ink` | Titles, amounts, body |
| `textSecondary` | `#55615C` | `text-ink-2` | Labels, captions (5.9:1 on white) |
| `textTertiary` | `#8C9892` | `text-ink-3` | Chevrons, disabled icons only (not for text) |
| `border` | `#E6EAE7` | `border-line` | Dividers, input borders (cards have no border — they use shadow) |
| `mutedStrong` | `#E8ECE9` | `bg-muted-2` | Segmented-control track, chart track |
| `scrim` | `rgba(14,24,20,0.48)` | — | Behind sheets and dialogs |
| `toastBg` | `#15201C` | — | Toast background |
| `toastAccent` | `#7BD8A4` | — | Toast icon + action text |

Chart palette for categories (in order): `#0B6E63`, `#C2410C`, `#E8A04B`, `#3949A8`, `#A3ADA8`, then repeat at 60% opacity.

### Brand gradients (from the logo)

All gradients run **light at the top-right → deep at the bottom-left** (CSS `225deg`), matching the logo. In React Native use `expo-linear-gradient` with `start={{x:1,y:0}} end={{x:0,y:1}}`.

| Token | Stops (colour @ location) | Used on |
|---|---|---|
| `gradHero` | `#45BE74`@0 · `#139169`@0.28 · `#076A5A`@0.62 · `#03474A`@1 | Home hero, Reports summary card, Splash (full screen) |
| `gradButton` | `#2FAE70`@0 · `#0C8564`@0.45 · `#05604F`@1 | `PrimaryButton variant="primary"`, "Best value" badge |
| `gradFab` | `#6BD067`@0 · `#1A9C6B`@0.45 · `#055F55`@1 | FAB |
| `gradTabPill` | `#DDF5E3` → `#E2F4EC` | Active bottom-tab pill |

Rules: gradients only on those surfaces — never behind lists, forms, the keypad or body text. Text on gradients is white (or `incomeOnHero`/`expenseOnHero` for amounts) and sits on the darker half; anything placed in the bright top-right corner (avatar, sync chip) gets a dark glass backing `rgba(0,20,16,0.24)`. The hero also carries one decorative ring: a 240dp circle, 36dp stroke `rgba(255,255,255,0.07)`, offset −70/−80 from the top-right.

### Dark (architected now, ship after V1)

| Token | Dark hex |
|---|---|
| background / surface / muted | `#0F1513` / `#18201D` / `#222B28` |
| primary / primaryTint | `#3FB8A6` / `#173A35` |
| income / incomeTint | `#4CC38A` / `#16301F` |
| expense / expenseTint | `#F08A5D` / `#3A2016` |
| udhaar | `#8E9BEA` |
| textPrimary / textSecondary | `#E8EEEB` / `#9DABA4` |
| border | `#2A3531` |

Implement via `useTheme()` returning the active palette; NativeWind `dark:` variants map to the same tokens.

### Meaning rules (enforce in components, not screens)

- Income amount: `income` colour, prefix `+`, `ArrowDownLeft` icon where an icon fits.
- Expense amount: `expense` colour, prefix `−` (U+2212 minus, not hyphen), `ArrowUpRight` icon.
- Net: colour and sign by value (≥0 income, <0 expense). Zero shows `₹0` in `textPrimary`.
- Udhaar person balance: "Receive" in income colour, "Pay" in expense colour, "Settled" in `textSecondary`.
- Never rely on colour alone.

---

## 2. Typography

Font: **Mukta** (`@expo-google-fonts/mukta`) weights 400, 500, 600, 700, 800. One family for English and Hindi.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `amountXXL` | 44 / 46 | 800 | Detail screen amount, Udhaar person balance |
| `amountXL` | 34 / 38 | 800 | Net on Home and Reports |
| `amountInput` | 52 / 56 | 800 | Amount being typed |
| `amountL` | 26 / 30 | 800 | Income/expense tiles |
| `amountM` | 20 / 24 | 700 | Secondary totals |
| `display` | 30 / 36 | 800 | Onboarding headlines (Welcome uses 40/45) |
| `title` | 22 / 28 | 700 | Screen titles (pushed screens use 20/26) |
| `section` | 16 / 22 | 700 | Section headings |
| `rowTitle` | 16 / 20 | 600 | Transaction/category/person name |
| `body` | 15 / 21 | 400 | Body text |
| `label` | 13.5 / 18 | 500 | Field labels, tile labels (`textSecondary`) |
| `secondary` | 13 / 17 | 400 | Row subtitles (`textSecondary`) |
| `caption` | 12.5 / 17 | 500 | Hints, legends (`textSecondary`) |
| `tab` | 12 / 16 | 600 | Bottom-nav labels |

Rules:
- Amounts use `fontVariant: ['tabular-nums']` where supported and letterSpacing −0.3 to −1 on the large sizes.
- Hindi (`lang === 'hi'`): add +10% line-height to every token (matras need room). Implement in `AppText`.
- Support system font scale up to 1.3× (`maxFontSizeMultiplier={1.3}` on amounts, 1.5 on body). Rows wrap; amounts never truncate or shrink below `amountM`.
- Sentence case everywhere. No all-caps except the small group headers on More/Settings (12.5/700, letter-spacing 0.06em).

---

## 3. Spacing, radius, elevation

- Spacing scale (4-pt): `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32`.
- Screen horizontal padding **20**. Card padding **16**. Gap between sections **14–16**. Gap inside groups **8–12**.
- Radius: chip 20 (pill), input 14, button 16, small button 12, card/list 18, option card 18, icon button 14, dialog 26, bottom sheet 28 (top corners), hero bottom corners 30, Reports hero card 24, avatars/icon tiles full circle.
- Elevation (no borders on cards):
  - `shadowCard`: `0 1 2 rgba(16,32,28,.05)` + `0 4 14 rgba(16,32,28,.06)` → RN: `shadowColor:'#10201C', shadowOpacity:0.08, shadowRadius:10, shadowOffset:{width:0,height:3}, elevation:2`
  - `shadowLg` (sheets, dialogs, toast): `0 10 30 rgba(16,32,28,.14)` → `elevation:12`
  - Primary/income/expense solid buttons: coloured glow `0 6 16` of their colour at 22–28% → `elevation:4`
  - FAB: 5dp ring in surface colour (looks notched into the bar) + `0 10 22 rgba(6,96,79,.38)` → `elevation:8`
- Bottom nav height 74 + safe-area inset, top hairline + soft upward shadow. Header height 56–64.

## 4. Motion

- Bottom sheet open 220ms ease-out; close 180ms. Dialog fade+scale 0.96→1, 160ms.
- Toast slides up 160ms, auto-dismiss 3s (5s if it has Undo).
- Keypad press: background flash to `muted` 80ms + `Haptics.selectionAsync()`.
- Save success: light haptic (`impactAsync(Light)`).
- No decorative or looping animation. Respect "Remove animations" (`AccessibilityInfo.isReduceMotionEnabled`) → instant transitions.

## 5. Icons

`lucide-react-native`, stroke width 2, size 20 in rows, 22 in nav/header, 24–28 in feature tiles. Colour inherits text colour.

| Purpose | Icon |
|---|---|
| Home / Transactions / Reports / More tabs | `House`, `List`, `ChartColumn` (or `BarChart3`), `Ellipsis` |
| FAB / add | `Plus` |
| Income / expense direction | `ArrowDownLeft` / `ArrowUpRight` |
| Synced / pending / offline / failed | `Check`, `RefreshCw`, `CloudOff`, `RefreshCw` (error colour) |
| Back / close / chevron | `ChevronLeft`, `X`, `ChevronRight`, `ChevronDown` |
| Search / filter / calendar | `Search`, `Filter`, `Calendar` |
| Edit / delete / more | `Pencil`, `Trash2`, `EllipsisVertical` |
| Payment: cash / UPI / card / bank | `Banknote`, `QrCode`, `CreditCard`, `Landmark` |
| Udhaar / person | `Users`, `User`, `IndianRupee` |
| Lock / fingerprint / PIN | `Lock`, `Fingerprint`, `Grid3x3` |
| Settings items | `Tag`, `Globe`, `Bell`, `CloudUpload`, `Download`, `Crown`, `ShieldCheck`, `CircleHelp`, `Info`, `LogOut` |
| Category icons | see `src/constants/categories.ts` |

Never use emoji in UI.

## 6. Logo

Use the supplied artwork — never redraw it:
- `design-reference/assets/logo.png` — 512×512, rounded-square tile, transparent corners (Splash 184dp, Login 88dp, Welcome header 36dp, About screen).
- `design-reference/assets/logo-original.png` — original upload (for the Play Store listing and further exports).
- Android launcher icon: the wordmark is unreadable at launcher size. Create an adaptive icon whose foreground is the notebook + ₹ only (no text) on the `gradHero` background; keep the full logo for Splash and store graphics. Ask the designer/user for a text-free export if one isn't provided — don't crop it yourself in code.
- Splash: full-screen `gradHero`, logo 184dp with shadow `0 18 36 rgba(0,20,16,.45)`, tagline white 17/600, three white loader dots. Configure `expo-splash-screen` with background `#066457` and the logo so there is no flash.

---

## 7. Components

All live in `src/components/`. Each takes `testID` and passes through `accessibilityLabel`. Props listed are the minimum.

### AppText
`variant: keyof typography`, `color?: 'primary'|'secondary'|'income'|'expense'|'brand'|'error'|'onPrimary'`, children. Applies Mukta weight, Hindi line-height boost, font scale caps.

### Amount
`paise: number`, `kind: 'income'|'expense'|'net'|'neutral'`, `size: 'XXL'|'XL'|'L'|'M'|'row'|'input'`, `showSign?: boolean` (default true for income/expense/net). Formats with `formatRupees` from `utils/money.ts`. Accessibility label: "2,850 rupees income".

### PrimaryButton / SecondaryButton
Height 54 (`size='sm'` → 44), radius 16, label 16/700, optional `icon`.
Variants: `primary` (**gradButton** fill, white text, green glow), `income` (solid income), `expense` (solid expense), `incomeTonal` (incomeTint bg, income text + a 26dp solid income circle holding a white `Plus`), `expenseTonal` (expenseTint bg, expense text + solid circle with white `Minus`), `secondary` (white, 1.5 border), `ghost` (text primary), `danger` (red fill), `dangerOutline`.
Home uses the **tonal** pair ("Add Income" / "Add Expense"); the Add screens' save buttons use the **solid** income/expense variants.
States: pressed (darken 8% / overlay `rgba(0,0,0,.08)`), disabled (opacity 0.4, `accessibilityState.disabled`), loading (spinner replaces icon, not tappable).

### IconButton
44×44, radius 12, optional `outlined` (white bg + border). Requires `accessibilityLabel`.

### Chip
Height 40 (36 in the period bar), radius 20, padding 14, label 14/600, `muted` background with no border, optional leading icon and trailing `ChevronDown`.
`selected` styles (1.5 border appears): `brand` (primaryTint bg, primary border, primaryPress text), `income`, `expense`. Used for payment, date, note, filters, period selector.

### SegmentedControl (also IncomeExpenseToggle)
Track `muted`, radius 12, padding 4; segments height 40, radius 9; selected segment white with subtle shadow. `IncomeExpenseToggle` = 2 segments "+ Income" / "− Expense"; the selected segment's text takes income/expense colour.

### AmountInput
Centered: label ("Add Income · Amount"), `₹` (30/700, coloured) + value (52/800, coloured) + blinking caret (3×44, coloured), then a caption with direction ("Money coming in" + `ArrowDownLeft` / "Money going out" + `ArrowUpRight`).
Paired with **NumericKeypad**: flat 3-column grid on white (like a bank PIN pad) — keys 54 tall, transparent, radius 14, digits 26/600 tabular, 2dp gaps, 16 side padding; press = `muted` flash + selection haptic. Keys: 1–9, `.`, 0, backspace (long-press clears). Rules: max 2 decimals, max ₹1,00,00,000, no leading zeros, Indian grouping as you type (`1,25,000`). The keypad is in-app (not the system keyboard) so it never covers the Save button.

On Add Income / Add Expense, the header + toggle + AmountInput sit together on a **tinted top panel** (incomeTint or expenseTint, bottom radius 30, padding-bottom 18); the amount, ₹ and caret take the type colour. This panel colour is the strongest signal of which type you are entering.

### CategorySelector
4-column grid (row gap 10, column gap 6) of **round** tiles: 48dp circle (`muted` bg, 20 icon) above a label 12.5/600. Selected: circle fills with income/expense tint, gets a 2dp ring in income/expense colour, label takes that colour. Shows top 7 categories by usage + "More" tile that opens a sheet with all categories and "+ Add category".

### PaymentMethodSelector
Chip showing current method + `ChevronDown`; tapping opens a small sheet with Cash, UPI, Card, Bank (radio options). Defaults to last used.

### DateSelector
Chip "Today, 03 Oct" + `ChevronDown`; sheet with "Today", "Yesterday", "Pick a date" (native date picker, max = today).

### Input
Height 52, radius 12, 1.5 border, padding 14, text 16. States: default, focused (primary border + 3dp primaryTint ring), error (error border + message 13.5/600 error below), disabled. Optional leading icon. Always has a visible label above (13.5/500 secondary) or an `accessibilityLabel`.

### SearchBar
Input variant, height 48, leading `Search`, placeholder "Search notes, categories, amounts", clear button when non-empty.

### Card
Surface, **no border**, radius 18, padding 16, `shadowCard`. Pressable variant gets ripple (`android_ripple` with `muted`). Lists of rows live inside a Card with 16 horizontal padding and 1dp `border` dividers between rows.

### HeroSummary (replaces the old SummaryCard)
Gradient surface (`gradHero`). Two layouts:
- **Home hero** (full width, top of screen, bottom radius 30, padding 16/20/22, extends under the status bar): row 1 = date (13.5/500 `#BFE0D9`) + greeting (23/800 white) | glass Avatar 44 (initial, white) → Settings. Row 2 = label "Today's net" + `Amount XXL` white, signed | `SyncStatus variant="glass"` aligned to the amount baseline. Row 3 = stats panel (radius 18, `rgba(0,24,20,.22)` fill, padding 12/4) split in two by a 1dp `rgba(255,255,255,.14)` line: each half = direction icon + label (13.5 `#BFE0D9`) over the amount (22/700 in `incomeOnHero` / `expenseOnHero`). The net amount is pressable → Reports.
- **Reports card** (inside the scroll, radius 24, padding 18): "Net · September" + `Amount XL` white | right helper "You kept **57%** of what you earned" (13, `#BFE0D9`, bold part white); then the same stats panel.

### NetAmountCard
Card with label + `Amount kind=net size=XL` + optional helper text ("You kept 57% of what you earned").

### TransactionItem
Row min height 60, padding 11 vertical, divider between rows (not after last). Left: 40×40 icon tile (radius 12, incomeTint/expenseTint bg, category icon in income/expense colour). Middle: title = category name (16/600); subtitle = `note || type` · payment method · time (13/400 secondary). Right: signed `Amount size=row` (16/700). If `sync_status = 'pending'`, append " · ↻ pending" in warning colour to subtitle. Press → detail; long-press → action sheet (Edit, Delete). a11y label: "Fuel, expense, 300 rupees, cash, 9:05 AM".

### TransactionList
SectionList grouped by day. Section header: "Today · 03 Oct" (15/700) left, "Net +₹2,100" (caption + bold signed amount) right. Paginates by month. Supports an `adSlot` rendered once at the end (free plan).

### ReportCard
Card with title (16/700), optional caption, chart content, optional footer button.

### Charts
- **IncomeExpenseBars:** last 6 periods, paired bars (income `income`, expense `expenseChart`), bar width 14, gap 4, radius 4 top, height 190, current period highlighted with a `background` column behind it and bold label. Legend top-right with dots and words.
- **IncomeTrendLine:** weekly (for month) / daily (for week) / monthly (for year) income; 3dp `income` line, `incomeTint` area fill, 5r hollow points, last point filled, value labels above points (₹16.2K format), axis labels below.
- **ExpenseDonut:** 132 diameter (180 in detail), stroke 6/42 of radius, top 5 categories + Other, centre "Total ₹32.4K", legend with dot, name, % on the right.
- **PaymentBreakdown:** rows: method name (15/600), amount + %, 8dp progress bar (primary on muted).
- Every chart has an `accessibilityLabel` summarising its data in words.

### FinancialCalendar
7-column grid (Mon first), cell height 54, radius 10, day number 14/600 + net value 10.5/700 (`+2.1K` / `−12.7K`). Positive day: incomeTint bg, income value; negative: expenseTint, expense value; no data / future: transparent. Selected: 2dp primary outline. Below 360dp width, hide values (tint stays). Legend uses words ("Saved money", "Spent more").

### DateRangePicker
Two field buttons (From / To) + one month calendar; range ends filled primary with white text, days between in primaryTint. Tap start then end; if end < start, swap.

### SyncStatus (chip)
Pill, padding 5/11. Extra `variant="glass"` for use on the hero: background `rgba(0,20,16,.24)`, white text/icon.
Base pill, 12.5/600, icon 14.
- `synced`: incomeTint/income, `Check`, "Synced"
- `pending`: warningTint/warning, `RefreshCw`, "2 transactions pending"
- `syncing`: warningTint/warning, `RefreshCw` (rotating unless reduce-motion), "Syncing…"
- `offline`: muted/secondary, `CloudOff`, "Offline — will sync automatically" (on Home header shorten to "Offline")
- `error`: errorTint/error, "Sync paused · retrying"
Tap → Sync & Backup screen.

### Banner
Row, radius 14, padding 12/14, icon 22 + bold title + body. Variants: `neutral` (muted), `success`, `warning`, `error`. Dismissible variant has an `X` IconButton.

### BottomSheet
`@gorhom/bottom-sheet`, radius 24 top, grab handle 40×4, padding 10/20/24 + safe area, scrim. Title row: 20/700 title + close IconButton. Back button closes. Focus moves to title on open.

### ConfirmDialog
Width = screen − 48, radius 22, padding 24/20/20. Optional icon tile (52, errorTint for destructive), title 21/700 centred, optional summary box (background, radius 12), body 14 secondary centred, two equal buttons (Cancel secondary left, action right).

### Toast / Snackbar
Above bottom nav (16dp gap), toastBg, radius 12, padding 12/16, `Check` icon in toastAccent, message 15/600 white, optional action ("Undo") in toastAccent. Announced via `AccessibilityInfo.announceForAccessibility`.

### EmptyState
Centered: 96×96 rounded (28) art tile (primaryTint + 44 icon), title 20/700, body (secondary), 1–2 buttons full width.

### Skeleton
Rounded blocks in `#E7EBE8` with a slow shimmer (disabled with reduce motion). Shapes mirror the real layout.

### BottomNav + FAB
5-column bar (height 74 + inset, surface, top hairline + upward shadow `0 -4 16 rgba(16,32,28,.04)`): Home, Transactions, [FAB], Reports, More. Tab: icon 22 in a 58×32 pill (active: `gradTabPill` pill + primary icon + label 12/700; inactive: secondary 12/600). FAB: 62×62, radius 22, `gradFab`, white `Plus` 28, raised 34dp above the bar top, 5dp surface-coloured ring so it looks notched into the bar. FAB opens the Add sheet. Hide nav on pushed screens and modals.

### AdSlot
Native ad container: dashed 1dp border `#BFC8C3`, radius 12, padding 10/12, "Ad" tag (11/700 bordered), and a "Remove" link → Premium. Renders nothing for premium users or when no fill.

### Option (radio card)
Full-width pressable, min height 60, radius 14, 1.5 border, 22dp radio, title 17/700 + subtitle. Selected: primary border + primaryTint bg. `accessibilityRole="radio"`.

### Toggle
Use RN `Switch` with `trackColor={{true: primary, false: '#C9D1CD'}}`, thumb white.

### Avatar
40 circle (52 on profile), udhaarTint bg, udhaar initial 16/800. Settled person: muted bg, secondary text.

### MenuRow
Min height 54, icon 22 + label 16/500 + trailing value (14 secondary) or chevron. Grouped inside a Card with dividers; group header above.
