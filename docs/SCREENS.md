# Apna Hisab — Screen Specifications

Visual truth: `design-reference/screenshots/NN-Name.png` (2× PNG per screen) and `design-reference/screens/Name.html` (open in a browser; real HTML/CSS you can inspect for exact spacing). Screenshot numbers follow the order below.

Conventions used below:
- **Route** = React Navigation route name. **File** = path under `src/features/`.
- Layout is listed top → bottom. Numbers are dp. "Screen padding" = 20 horizontal.
- `t('key')` = i18n key in `src/i18n/*.json`. Sample values shown are illustrative; real data comes from repositories.
- Every list/summary reads from SQLite via hooks that re-render when the underlying tables change (see ARCHITECTURE.md §5).

Screen index:

| # | Screen | Route | Where it's reached from |
|---|---|---|---|
| 1 | Splash | `Splash` | App launch |
| 2 | Welcome | `Welcome` | Splash (no session) |
| 3 | Google login | `Login` | Welcome |
| 4 | Language | `LanguageSelect` | Login (new user), Settings |
| 5 | App lock setup | `AppLockSetup` | Language (first run), Settings |
| 5b | Lock screen | `LockScreen` | Cold start / resume when lock is on |
| 6 | Home | `Home` (tab) | Main |
| 6b | Add sheet | `AddTypeSheet` (sheet) | FAB on any tab |
| 7–8 | Add / edit transaction | `AddTransaction` (modal) | Home buttons, Add sheet, Detail › Edit |
| 9 | Transactions | `Transactions` (tab) | Tab, Home "See all" |
| 9b | Filters | `TransactionFilters` (sheet) | Transactions |
| 10 | Transaction detail | `TransactionDetail` | Any transaction row |
| 10b | Delete confirm | dialog | Detail |
| 11 | Categories | `Categories` | More, category "More" sheet |
| 12 | Udhaar | `UdhaarList` | Home strip, Add sheet, More |
| 13 | Udhaar person | `UdhaarPerson` | Udhaar list |
| 13b | Add Udhaar | `UdhaarEntrySheet` (sheet) | Add sheet, Udhaar list, person |
| 14 | Reports | `Reports` (tab) | Tab, Home "Report" |
| 15 | Report detail | `ReportDetail` | Reports |
| 16 | Custom range | `CustomRange` | Reports period "Custom" |
| 17 | Financial calendar | `FinancialCalendar` | Reports, Transactions, More |
| 17b | Day transactions | `DayTransactions` | Calendar |
| 18 | More | `More` (tab) | Tab |
| 19 | Settings | `Settings` | More profile card, Home avatar |
| 19b | Sync & Backup | `SyncBackup` | Sync chip, More, Settings |
| 19c | Export | `Export` | More, Settings |
| 19d | Delete account | `DeleteAccount` | More, Settings |
| 23 | Premium | `Premium` (modal) | More, ad "Remove", gated features |

Screens 20–22 (sync, empty, error states) are specified per screen and summarised in §20–22.

---

## 1. Splash — `Splash` · `features/auth/SplashScreen.tsx`

**Purpose:** brand moment while fonts load, SQLite opens, migrations run and the session is read. Max 1s visible after ready.
**Layout:** full-screen `gradHero` background; centred column, gap 26: logo image (`design-reference/assets/logo.png`) 184dp with shadow, tagline `t('app.tagline')` (17/600 white). Bottom (56 from bottom): 3 loader dots (first white, others white 40%).
**Logic:** `await Promise.all([fonts, db.migrate(), auth.restoreSession(), settings.load()])` then route:
- no session → `Welcome`
- session + app lock on → `LockScreen` → `Main`
- session → `Main`
Also configure Android splash (`expo-splash-screen`) with the same colour/logo so there's no flash.
**Error:** if DB fails to open → full-screen message `t('errors.dbOpen')` + "Try again" button (re-run init).
**Acceptance:** no white flash; returning user lands on Home in < 1.5s on a mid-range device.

## 2. Welcome — `Welcome` · `features/auth/WelcomeScreen.tsx`

**Purpose:** explain the app in one glance; one action.
**Layout (white bg):**
1. Top bar (padding 18/20): logo 30 + "Apna Hisab" (18/800 primary) left; language chip "EN · हिं" (height 36) right — toggles UI language immediately and pre-selects it on the Language screen.
2. Headline (40/800, lh 45, mt 24): "Apni **Kamai**," / "Apna **Kharcha**," / "Apna **Hisab**." — Kamai in income, Kharcha in expense, Hisab in primary (`t('welcome.headline*')`).
3. Preview card (background `background`, radius 16, padding 16, decorative, `importantForAccessibility="no-hide-descendants"`): caption "Today"; two white tiles "Income +₹2,850" / "Expense −₹750"; row "Net ₹2,100". Hide when screen height < 640.
4. Body (17, secondary): `t('welcome.body')`.
5. Spacer (flex 1).
6. `SecondaryButton` height 56 with Google "G" mark: `t('auth.continueWithGoogle')` → `Login`.
7. Caption centred with links "Terms" and "Privacy Policy" (open in-app browser).
**Error:** no connectivity on tap → inline caption in error colour `t('auth.needInternetFirstTime')`.

## 3. Google login — `Login` · `features/auth/LoginScreen.tsx`

**Purpose:** build trust, then start Google sign-in.
**Layout (white):** header with Back. Logo 64. Title `t('auth.welcomeTitle')` (30/800). Subtitle `t('auth.welcomeSub')` (17 secondary). Card list of 3 trust rows (icon tile primaryTint + title 15/600 + subtitle): ShieldCheck "Private to you / Only you can see your hisab"; User "Only name and email / We don't read your contacts or messages"; CloudUpload "Safe backup / Change phones without losing anything". Spacer. Google button (as Welcome). Caption `t('auth.pickAccountNext')`.
**Flow:** `GoogleSignin.signIn()` → `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })` → upsert `profiles` row → if first login on this account: `LanguageSelect`; else run initial pull (show "Restoring your hisab…" progress on button) → `Main`.
**States:** loading → button spinner + `t('auth.signingIn')`, disabled. Error → error Banner `t('auth.signInFailed')` + "Try again". User cancels picker → do nothing.

## 4. Language — `LanguageSelect` · `features/settings/LanguageScreen.tsx`

**Params:** `{ fromSettings?: boolean }`
**Layout (white, pt 64):** icon tile 56 (Globe). Title "Choose your language" (30/800) + Hindi line "अपनी भाषा चुनें" (20/600 secondary). Radiogroup of two `Option`s (min height 76): "English" + subtitle "Income · Expense · Udhaar"; "हिन्दी" + "कमाई · खर्च · उधार". Caption bilingual "You can change this anytime in Settings · …". Spacer. `PrimaryButton` "Continue".
**Default selection:** device locale `hi*` → हिन्दी, else English (or the Welcome toggle choice).
**Action:** `i18n.changeLanguage`, persist in settings → `AppLockSetup` (first run) or go back (fromSettings).

## 5. App lock setup — `AppLockSetup` · `features/settings/AppLockSetupScreen.tsx`

**Layout (white, pt 64):** icon tile (Lock). Title `t('lock.setupTitle')`, body `t('lock.setupBody')`. Radiogroup:
- PIN — "A 4-digit code you choose" (trailing Grid3x3 icon)
- Fingerprint / Biometric — badge "Recommended" — "Unlock with one touch · PIN as backup" (default selected if `hasHardwareAsync && isEnrolledAsync`; otherwise disabled with subtitle `t('lock.biometricUnavailable')`)
- Skip for now — "Turn it on later in Settings"
Spacer; `PrimaryButton` "Continue".
**Flows:** PIN → `PinCreate` step (enter 4 digits, confirm; mismatch → "PINs don't match. Try again."). Biometric → `authenticateAsync` then PIN create as backup. Store PIN hash (SHA-256 + salt) in SecureStore. Skip → set reminder flag (one gentle Banner on Home after 7 days, dismissible forever).
→ `Main` (Home).

## 5b. Lock screen — `LockScreen` · `features/settings/LockScreen.tsx`

Shown on cold start and when the app returns from background after `lockAfter` (default 1 min). Logo, "Unlock Apna Hisab", auto-trigger biometric prompt; PIN pad (same NumericKeypad, 4 dots). Errors: `t('lock.biometricFailed')` + "Use PIN instead"; 5 wrong PINs → 30s cooldown. "Forgot PIN?" → sign in with Google again to reset.

---

## 6. Home — `Home` (tab) · `features/dashboard/HomeScreen.tsx`

**Purpose:** answer "how am I doing today?" in 2 seconds and start an entry in one tap.
**Data:** `useSummary({ range: today })` → incomePaise, expensePaise, netPaise; `useUdhaarTotals()` → receivePaise, payPaise; `useRecentTransactions(4)`; `useSyncStore()`; `useProfile()`.
**Layout (`background`):** (see `screenshots/06-Home.png`)
1. **Home hero** (`HeroSummary` home layout — DESIGN_SYSTEM §7), drawn edge-to-edge under the status bar: date `t('home.date', {date})`, greeting `t('home.greeting.morning|afternoon|evening', {name: firstName})` (morning < 12:00, afternoon < 17:00, evening otherwise), glass Avatar → `Settings`; "Today's net" `Amount XXL` (tap → `Reports` period=Today) with `SyncStatus variant=glass`; stats panel Income / Expense for today.
2. Body (padding-top 16, gap 14). Two **tonal** buttons in a 2-column grid: "Add Income" (`incomeTonal`) → `AddTransaction {type:'income'}`; "Add Expense" (`expenseTonal`) → `AddTransaction {type:'expense'}`.
3. Udhaar strip (pressable Card, padding 10/14): Users icon circle (udhaar) + "Udhaar" (15/600) + "Receive **₹2,500** · Pay **₹1,200**" + chevron → `UdhaarList`. For users with no Udhaar yet show "Track money you lend or borrow".
4. Row: `t('home.recent')` (17/700) + link "See all" (primary, 14/700) → `Transactions`.
5. Card with up to 4 `TransactionItem`s (count fits remaining height; min 3).
6. BottomNav (Home active) with FAB.
**Interactions:** pull-to-refresh → triggers sync. FAB → `AddTypeSheet`.
**Empty (no transactions ever):** SummaryCard shows ₹0 values; replace sections 6–7 with `EmptyState` (`t('empty.transactions.*')`, buttons + Add Income / − Add Expense).
**Loading:** skeleton for summary and 4 rows (only if the first query takes > 150ms).
**Offline:** chip shows offline; first time connectivity drops in a session show neutral `Banner` `t('sync.offlineBanner')` (dismissible).
**Responsive:** tiles stack below 340dp width; on height < 700, recent list shows 3 rows.
**Acceptance:** after saving a transaction, Home totals update without manual refresh; Net colour/sign correct for negative days.

## 6b. Add sheet — `AddTypeSheet` · `features/transactions/AddTypeSheet.tsx`

BottomSheet titled `t('add.title')` "Add transaction" + close. Three `Option`-style rows (icon tile 48: income Plus / expense Minus / udhaar IndianRupee; title 17/700; subtitle; chevron):
- Income — `t('add.incomeSub')` "Money received — sales, salary, fares" → `AddTransaction {type:'income'}`
- Expense — "Money spent — fuel, food, rent" → `AddTransaction {type:'expense'}`
- Udhaar — "Money lent or borrowed" → `UdhaarEntrySheet`
No ads. Back closes.

## 7–8. Add / Edit transaction — `AddTransaction` (modal) · `features/transactions/AddTransactionScreen.tsx`

**Params:** `{ type: 'income'|'expense', editId?: string, date?: string }`
**Purpose:** record in ≤ 5 seconds: amount → (category) → Save.
**Form (RHF + Zod, see ARCHITECTURE §7):** `type, amountPaise, categoryId, paymentMethod, occurredAt, note`.
**Defaults:** categoryId = last used for this type (fallback first default); paymentMethod = last used (fallback cash); occurredAt = now (or `params.date` at current time); keypad focused immediately.
**Layout (white):** (see `screenshots/08-AddIncome.png`, `09-AddExpense.png`)
0. Tinted top panel (incomeTint / expenseTint, bottom radius 30) contains items 1–2.
1. Header row: close `X` (left, confirms discard if amount entered: "Discard this entry?"), centred `IncomeExpenseToggle` (max width 250) — switching keeps amount, swaps category list and resets category to that type's last used. Spacer 44 right.
2. `AmountInput`: label `t('add.amountLabelIncome|Expense')`, value, direction caption.
3. Chips row (centred, wrap): PaymentMethodSelector chip ("Cash ▾"), DateSelector chip ("Today, 03 Oct ▾"), Note chip ("+ Note"; when filled shows note text in selected style; opens a sheet with a 120-char input).
4. Label "Category"; `CategorySelector` 4×2 (top 7 + More).
5. (flex spacer)
6. `NumericKeypad` full width on white (flat keys).
7. Save bar (white bg, padding 4/16/18 + safe area): full-width button `variant=income|expense` `t('add.saveIncome|saveExpense')` (edit mode: `t('add.saveChanges')`).
**Save:** validate → `transactionsRepo.create()` (or `update()`), enqueue sync, haptic, `navigation.goBack()`, toast `t('toast.incomeAdded|expenseAdded|updated')` with Undo (5s; undo = soft delete or restore previous values).
**Edit mode:** title in toggle area still shows type; all fields prefilled; header right shows Trash icon → delete dialog.
**Errors:** amount 0 → field error under amount `t('validation.amountRequired')` + shake (no shake if reduce motion); amount > ₹1 crore → `t('validation.amountTooLarge')`; future date blocked by picker.
**Never:** ads, network calls, blocking spinners.
**Responsive:** height < 700 → category grid becomes a single horizontal scrolling row of tiles; keypad keys 44 tall.
**Acceptance:** from Home tap "− Expense" → type "300" → tap Fuel → Save = 5 taps, < 5 seconds; works in airplane mode; Home updates instantly.

## 9. Transactions — `Transactions` (tab) · `features/transactions/TransactionsScreen.tsx`

**Data:** `useTransactions({ search, type, filters })` paged by month, grouped by local day.
**Layout:**
1. Header: title "Transactions" (22/700) + outlined IconButton Calendar → `FinancialCalendar`.
2. `SearchBar` (debounce 250ms; matches note, category name (en+hi), and amount if numeric).
3. Row: `SegmentedControl` All / Income / Expense (flex 1) + outlined IconButton Filter → `TransactionFilters` (shows a dot badge when filters active).
4. Active filter chips (removable, horizontal scroll) — only when filters set.
5. `TransactionList` sections ("Today · 03 Oct" / "Yesterday · 02 Oct" / "Thu, 01 Oct") with day net.
6. AdSlot after the last loaded section (free plan only).
7. BottomNav (Transactions active).
**Row actions:** tap → `TransactionDetail {id}`; long-press → action sheet Edit / Delete.
**Empty:** no data at all → `EmptyState` transactions. No results → EmptyState "No matches" `t('empty.search.*', {query})` + "Clear filters".
**Loading:** 6 skeleton rows; footer spinner while loading next month.

## 9b. Filters — `TransactionFilters` (sheet)

Sections (each label 13.5/500 + chips): Date (Today, This week, This month, Custom → date range picker); Category (multi-select chips of used categories + "All categories" opens full list); Payment method (multi-select Cash, UPI, Card, Bank); Amount (Min ₹ / Max ₹ inputs, numeric). Header right "Reset" ghost button. CTA `PrimaryButton` `t('filters.show', {count})` with live count from a COUNT query. Filters persist while the app is open (not across restarts).

## 10. Transaction detail — `TransactionDetail` · `features/transactions/TransactionDetailScreen.tsx`

**Params:** `{ id }`
**Layout:** header Back + "Transaction". Card centred (padding 24/16): icon tile 64 (category icon, tinted), type badge pill ("Expense" with ArrowUpRight, tinted), `Amount XXL` signed, category name 18/600. Card list of rows (label 120 wide secondary + value 15/600): Payment, Date ("02 October 2026, 7:50 PM"), Note (row hidden if empty), Status (SyncStatus chip for this row: Synced / Pending). Spacer. Two buttons grid: Secondary "Edit" (Pencil) → `AddTransaction {type, editId}`; Danger outline "Delete" (Trash2) → dialog.
**Error:** row not found / deleted elsewhere → `t('errors.transactionGone')` toast and go back.

## 10b. Delete confirmation (ConfirmDialog)

Icon tile Trash2 (errorTint). Title `t('delete.title')` "Delete this transaction?". Summary box: `Amount M` expense/income colour "₹500" + "Fuel · Expense · 02 Oct 2026". Body `t('delete.body')`. Buttons: "Cancel" (secondary) / "Delete" (danger). On delete: soft delete, enqueue sync, pop to list, toast `t('toast.deleted')` + Undo (5s → restore).

## 11. Categories — `Categories` · `features/categories/CategoriesScreen.tsx`

**Layout:** header Back + "Categories" + IconButton Plus (add). `SegmentedControl` "Income (8)" / "Expense (14)". Card list rows: icon tile (tinted) + name (localized: user-renamed name, else `name_hi` in Hindi) + edit IconButton (Pencil). Drag handle on long-press to reorder (`react-native-draggable-flatlist`), persisted `sort`.
**Edit / Add sheet:** title "Edit category" / "Add category"; Name input (max 24 chars); Icon grid 6 columns × n (48 tall buttons; selected = expense/income tint border + bg) using the icon set in `categories.ts` `ICON_CHOICES`; caption `t('categories.deleteHint')` "Deleting keeps past transactions — they move to 'Other'."; buttons Delete (danger outline, hidden for "Other") / Save (primary).
**Rules:** "Other" cannot be deleted; names unique per type (case-insensitive) → error `t('categories.duplicate', {name})`; deleting reassigns transactions to that type's Other then soft-deletes.

---

## 12. Udhaar — `UdhaarList` · `features/ledger/UdhaarListScreen.tsx`

**Data:** `useUdhaarPeople()` with computed balance per person (ARCHITECTURE §4); totals.
**Layout:** header Back + "Udhaar". Two tiles (2 columns, radius 16, padding 14): "You will receive" (incomeTint, ArrowDownLeft, `Amount L` income, caption "from N person/people") and "You need to pay" (expenseTint, ArrowUpRight, `Amount L` expense, "to N …"). Caption with Info icon `t('udhaar.separateNote')` "Udhaar is not counted in your income or expense." SearchBar "Search people". Card list of people rows: Avatar, name (16/600), subtitle last activity ("Received ₹1,000 · 03 Oct"), right side caption "Receive"/"Pay"/"Settled" + amount coloured. Sort: non-zero balances by most recent activity, settled at bottom. Footer: `PrimaryButton` "+ Add Udhaar" → `UdhaarEntrySheet`.
**Empty:** EmptyState udhaar.

## 13. Udhaar person — `UdhaarPerson` · `features/ledger/UdhaarPersonScreen.tsx`

**Params:** `{ personId }`
**Layout:** header Back + person name + overflow (Edit name/phone, Mark as settled, Delete person — confirm). Card: centred label "You will receive" / "You need to pay" / "Settled" + `Amount XXL` coloured; divider; 2-column totals "Given ₹5,000" / "Received ₹2,500" (for a "took" relationship show "Took" / "Paid back"). Two secondary buttons: "+ Given" (expense-coloured text) and "+ Received" (income-coloured) → `UdhaarEntrySheet {personId, direction}`. Caption explaining Given/Received. Section "History": rows with direction icon tile, title (Given/Received/Took/Paid), subtitle "03 Oct · Cash · Balance ₹2,500" (running balance after that entry), amount coloured. Tap entry → edit sheet; long-press → delete.
**Settled:** balance 0 shows `t('udhaar.settled')` "Hisab barabar".

## 13b. Add Udhaar — `UdhaarEntrySheet` (sheet)

**Params:** `{ personId?, direction? }`
Fields: direction cards (2 columns): "I gave — You'll receive it back" (ArrowUpRight expense) / "I took — You'll need to pay" (ArrowDownLeft income). On a person with an existing balance, offer "Received"/"Paid back" as well (4 directions in data: given, received, took, paid). Person input with autocomplete (existing people; "Add 'X' as new person" row). Amount input (numeric keyboard, 24/800). Chips Today / Yesterday / Pick date / + Note. `PrimaryButton` "Save Udhaar". Toast "Udhaar saved". Validation: person and amount required.

---

## 14. Reports — `Reports` (tab) · `features/reports/ReportsScreen.tsx`

**State:** `period: 'today'|'week'|'month'|'quarter'|'6m'|'year'|'custom'` (default month), `anchorDate`.
**Data:** `useReport(period, anchor)` → totals, series for bars (last 6 periods), trend points, category breakdown, payment breakdown — computed with SQL aggregates on the device.
**Layout (scroll):**
1. Header "Reports" + IconButton Calendar → `FinancialCalendar`.
2. Period chips (horizontal scroll, height 36): Today, Week, Month, Quarter, 6 Months, Year, Custom (→ `CustomRange`).
3. Period stepper: outlined IconButtons ‹ › around the label ("September 2026", "28 Sep – 04 Oct", "Jul – Sep 2026", "2026"). Next disabled when the period is current.
4. `HeroSummary` Reports card (gradient, radius 24): "Net · {period}" + `Amount XL`; right helper `t('reports.keptPct', {pct})` (if net < 0: `t('reports.spentMore', {amount})`); stats panel Income / Expense.
5. ReportCard "Income vs Expense" — IncomeExpenseBars (6 periods).
6. ReportCard "Income trend" + caption ("Weekly income in September") — IncomeTrendLine.
7. ReportCard "Where did you spend?" — ExpenseDonut + legend; footer secondary small button "See all categories" → `ReportDetail {period, anchor, type:'expense'}`.
8. ReportCard "Payment methods" + caption "Money received in September" — PaymentBreakdown (income by method; toggle not needed in V1).
9. AdSlot (free plan).
10. BottomNav (Reports active).
**Empty:** fewer than 3 transactions in total → EmptyState reports (`t('empty.reports.*')`) with "Add a transaction" button. A period with no data → summary shows ₹0 and charts show "No data for this period".
**Loading:** skeleton cards.

## 15. Report detail — `ReportDetail` · `features/reports/ReportDetailScreen.tsx`

**Params:** `{ period, anchor, type }`
Header Back + "Spending breakdown" with period caption. SegmentedControl "Expense ₹32,400" / "Income ₹75,500". Card list: per category row (icon tile, name, "37% · 1 transaction", amount right, full-width progress bar under the row coloured from chart palette). Tap row → `Transactions` pre-filtered (category + date range). Caption "Tap a category to see its transactions." Footer secondary button "Export PDF / Excel" with "Premium" badge → Premium screen for free users, export sheet for premium.

## 16. Custom range — `CustomRange` · `features/reports/CustomRangeScreen.tsx`

Header Back + "Custom Report". Two field buttons "From 01 Sep 2026" / "To 30 Sep 2026" (active field focused style). `DateRangePicker` month card with ‹ ›. `PrimaryButton` "Generate Report". Result card: rows Income / Expense / Net (Net 22/800 signed). Secondary "View full report" → `Reports {period:'custom', from, to}`. Guards: end before start → swap; max range 3 years (`t('reports.rangeTooLong')`); max date today.

## 17. Financial calendar — `FinancialCalendar` · `features/reports/FinancialCalendarScreen.tsx`

Header Back + "Financial Calendar". Month stepper ‹ September 2026 ›. Three mini cards: Income ₹75.5K / Expense ₹32.4K / Net +₹43.1K (compact format). `FinancialCalendar` grid inside a Card. Legend (words + tinted dots). Selected-day bar (pressable card, primary border): calendar icon, "Sat, 26 Sep · Net +₹3,400", "4 transactions · tap to open" → `DayTransactions {date}` (Transactions list scoped to that date, with "+ Add for this day" passing `date` to AddTransaction). Default selected day = today (if in month) else first day with data. Swipe left/right changes month.

## 18. More — `More` (tab) · `features/settings/MoreScreen.tsx`

Scroll. Title "More". Profile card (Avatar 52, name 17/600, email + "Profile", chevron) → `Settings`. Premium card (warm `#FFF9EC` bg, `#F1DDB0` border, Crown in warningTint tile): "Go ad-free with Premium" / "Advanced reports, PDF & Excel export" → `Premium` (hidden for premium users; replaced by "Premium active").
Groups (group header + Card of MenuRows):
- Money: Categories → `Categories`; Udhaar → `UdhaarList`; Financial calendar → `FinancialCalendar`
- Preferences: App Lock (value "Fingerprint"/"PIN"/"Off") → Settings#security; Language (value) → `LanguageSelect {fromSettings}`; Notifications (value "Daily 9 PM"/"Off") → Settings#preferences
- Data: Sync & Backup (value SyncStatus text, coloured) → `SyncBackup`; Export Data → `Export`
- Account & help: Subscription (value "Free"/"Premium") → `Premium`; Privacy (in-app browser); Help & Support (mailto / WhatsApp link placeholder `[SUPPORT_CONTACT]`); About Apna Hisab (value app version)
Secondary button "Logout" (confirm only if unsynced rows exist: `t('logout.unsynced', {count})`; logout clears local DB after confirm). Ghost danger "Delete Account" → `DeleteAccount`. BottomNav (More active).

## 19. Settings — `Settings` · `features/settings/SettingsScreen.tsx`

Scroll, header Back + "Settings". Groups:
- **Account:** profile row (avatar, name, email · "Google account"); Logout; Delete account (error colour) → `DeleteAccount`.
- **Preferences:** Language (value) ; Currency "₹ Indian Rupee" (read-only V1); Notifications (Switch); Daily reminder time (value "9:00 PM", opens time picker; schedules local notification `t('notif.dailyReminder')` "Aaj ka hisab likha? Tap to add today's entries.").
- **Security:** PIN lock (Switch → PIN create flow / confirm PIN to disable); Fingerprint / Biometric (Switch → system prompt; requires PIN set); Lock after (Immediately / 1 min / 5 min).
- **Data:** Sync status row (subtitle "Last synced 2 min ago" + chip); "Sync now" (primary text button with RefreshCw; inline progress); Export data → `Export`; Backup "Automatic" (info).
- **Premium:** Subscription "Free plan"/"Premium · renews 03 Oct 2027"; Manage subscription → Premium (free) or Play subscriptions deep link (premium).
Footer caption app version.

## 19b. Sync & Backup — `SyncBackup`

Big status block (icon + title + description per state, see §20), "Last synced …", pending count, "Sync now" button, "Your data is stored on this phone and backed up to your account." If error: last error in plain words + "Try again".

## 19c. Export — `Export`

Range selector (This month / Last month / This year / Custom), format Option list: CSV (free), PDF (Premium badge), Excel (Premium badge). "Export" → generate file (`expo-file-system`, `expo-sharing`) → share sheet. Premium formats for free users → `Premium`.

## 19d. Delete account — `DeleteAccount`

White, header Back. Error icon tile (AlertTriangle). Title (24/800) `t('deleteAccount.title')`. Error Banner explaining scope. Secondary "Export my data first" → `Export`. Input labelled "Type DELETE to confirm" (case-sensitive; Hindi UI still requires "DELETE"). Checkbox "I understand my data cannot be recovered." Danger button "Delete my account" disabled (opacity 0.4) until input === "DELETE" and checkbox checked. Ghost "Keep my account".
**Flow:** require connectivity (`t('deleteAccount.needInternet')`), re-auth with Google, call Supabase Edge Function `delete-account` (deletes user rows + auth user), wipe SQLite + SecureStore, → `Welcome`.

## 23. Premium — `Premium` (modal)

White. Header: close X left, "Restore" ghost right. Crown tile 56 (warningTint). Title "Upgrade to Apna Hisab Premium" (28/800). Subtitle "The same simple app — without ads, with deeper reports." Four check rows (income Check): Ad-free experience; Advanced reports & insights; PDF & Excel export; More customisation. Plan radiogroup: Yearly (badge "Best value", "Billed once a year", price right `₹[PRICE]/yr`) default selected; Monthly ("Billed every month", `₹[PRICE]/mo`). Prices come from the billing SDK at runtime (localized). Spacer. `PrimaryButton` "Continue with Yearly/Monthly". Caption "Cancel anytime in Google Play. Recording, sync and Udhaar stay free forever."
**States:** loading prices → skeleton price text; purchase pending → button loading; success → toast "Premium active", close; error → Banner `t('premium.purchaseFailed')`. No ads, no countdowns, no pre-selected extras.

---

## 20. Sync states (global)

| State | Chip | Banner (once per change) | Where |
|---|---|---|---|
| synced | ✓ Synced | "All data synced" (success, auto-hide 3s) only after a manual Sync now or after recovering from offline/error | Home header, Settings, SyncBackup |
| pending | ↻ N transactions pending | — | same |
| syncing | ↻ Syncing… | "Syncing… Uploading N transactions" (warning) only on SyncBackup | same |
| offline | Offline — will sync automatically | "Offline · Your transactions are saved safely and will sync automatically when internet is available." (neutral, dismissible) | Home (first time per session) |
| error | Sync paused · retrying | "Sync couldn't complete · We'll automatically try again. Your local data is safe." (warning) | Home (once), SyncBackup |

Toasts after saves (3s, 5s with Undo): "Income added", "Expense added", "Transaction updated", "Transaction deleted", "Udhaar saved", "Category saved".

## 21. Empty states (copy in `empty.*`)

- Home / Transactions: "No transactions yet" · "Start tracking your daily income and expenses." · [+ Add Income] [− Add Expense]
- Udhaar: "No Udhaar yet" · "Keep track of money you need to receive or pay." · [+ Add Udhaar]
- Reports: "Not enough data yet" · "Add some transactions to see your financial report." · [Add a transaction]
- Search/filter: "No matches" · "Nothing found for “{query}”. Try another word or clear filters." · [Clear filters]

## 22. Error states (copy in `errors.*`)

Never show codes. Always: what happened + data is safe + what to do.
- Save while offline: no error (saves locally). If the user explicitly taps Sync now offline: "You're offline · Your transaction is saved on this device and will sync later."
- Sync failure: see §20.
- Sign-in failure: "Couldn't sign in · Check your internet and try again." [Try again]
- Validation: "Enter an amount to save", "That looks too large. Please check the amount.", "Choose a category", "Enter a name".
- Biometric: "Fingerprint not recognised · Try again or use your PIN." [Use PIN instead]
- DB open failure: "Couldn't open your hisab. Please restart the app."
