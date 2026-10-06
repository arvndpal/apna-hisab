# Apna Hisab — Technical Architecture

## 0. Backend (`/backend`, NestJS)

The mobile app never talks to the database directly. A separate NestJS backend (sibling folder
`/backend`, own `package.json`, deployed independently) is the **only** thing that connects to
Postgres — it owns identity and is the single integration point the app calls.

The database is Supabase-hosted Postgres, but the backend connects with a plain `pg` pool over
Supabase's **transaction-mode connection pooler** (`DATABASE_URL`), not the Supabase SDK — no
Supabase Auth, no PostgREST, no RLS session. All queries are hand-written parameterized SQL (same
"no ORM" style as the app's own SQLite repositories).

```text
backend/src/
  config/      env.validation.ts        — Zod-validated env (fails fast on boot if misconfigured)
  database/    database.service.ts      — pg Pool wrapper (DATABASE_URL); see §10 for why every
                                           query must filter by user_id in application code
  auth/        auth.controller.ts       — POST /auth/google, POST /auth/refresh, GET /auth/me, DELETE /auth/me
               auth.service.ts          — verifies a Firebase ID token (firebase-admin), upserts
                                           profile by firebase_uid, issues this backend's own JWTs
               firebase-admin.provider.ts — Auth instance from FIREBASE_SERVICE_ACCOUNT
               jwt.strategy.ts, jwt-auth.guard.ts
  sync/        sync.controller.ts       — POST /sync/push, GET /sync/pull  (guarded by JwtAuthGuard)
               sync.service.ts          — per-table upsert/select, forces user_id server-side;
                                           sync.constants.ts whitelists exactly which columns a
                                           pushed row may ever write (column names are never built
                                           from client input without this whitelist check)
  health/      health.controller.ts     — GET /health
```

**Auth flow:** app does native Google Sign-In (`@react-native-google-signin/google-signin`) → gets
a Google ID token → exchanges it for a **Firebase** credential and signs into Firebase Auth
(`@react-native-firebase/auth`, modular API) → gets a Firebase ID token → `POST /auth/google
{ idToken: <firebase ID token> }` → backend verifies it with `firebase-admin` (`FIREBASE_SERVICE_ACCOUNT`),
upserts `profiles` by `firebase_uid`, returns `{ accessToken, refreshToken, profile }`. The app
stores both tokens in `react-native-keychain` and sends `accessToken` as `Authorization: Bearer …`
on every backend call. `POST /auth/refresh { refreshToken }` → new access token. These are **this
backend's own JWTs** — neither Supabase Auth nor a raw Firebase/Google token is ever used as the
session; Firebase is only the Google-sign-in verifier.
`DELETE /auth/me { idToken: <fresh firebase ID token> }` deletes the account: the fresh token must
belong to the same `firebase_uid` (re-auth), then every user row and the profile go in one
transaction and the Firebase user is removed. `/auth/refresh` refuses tokens whose profile is gone.

Firebase project config: `android/app/google-services.json` (gitignored, from Firebase Console →
Project Settings → your Android app) wires the native SDK; `GOOGLE_WEB_CLIENT_ID` (app `.env`) is
the `client_type: 3` entry in that same file, needed by Google Sign-In even though auth itself
flows through Firebase; `FIREBASE_SERVICE_ACCOUNT` (`backend/.env`) is a private key from the same
Firebase project, used only server-side to verify tokens.

**Sync flow:** the RN app's sync engine (§6) calls this backend's REST endpoints instead of
Postgres directly; the backend is what actually queries the database, and since the connection has
no RLS session, every query it makes must — and does — filter by the caller's `user_id` in
application code (`sync.service.ts`). See §6 and §10.

Local dev: `cd backend && npm install && npm run start:dev` (needs `backend/.env`, copy from
`backend/.env.example` and fill in `DATABASE_URL` from the Supabase dashboard → Connect → Transaction
pooler). Tests: `npm test` (unit, mocks the database layer + Google verification) and `npm run test:e2e`.

## 1. Navigation tree

```text
RootNavigator (native-stack, headerShown: false)
├─ Splash
├─ AuthStack
│   ├─ Welcome
│   ├─ Login
│   ├─ LanguageSelect        params { fromSettings?: boolean }
│   └─ AppLockSetup  (+ PinCreate step)
├─ LockScreen               conditional gate (cold start / resume after lockAfter)
└─ AppStack
    ├─ MainTabs (bottom-tabs, custom tabBar with centre FAB)
    │   ├─ Home
    │   ├─ Transactions
    │   ├─ Reports           params { period?, from?, to? }
    │   └─ More
    ├─ AddTransaction        presentation: 'modal'  params { type, editId?, date? }
    ├─ TransactionDetail     params { id }
    ├─ DayTransactions       params { date }
    ├─ UdhaarList
    ├─ UdhaarPerson          params { personId }
    ├─ ReportDetail          params { period, anchor, type }
    ├─ CustomRange
    ├─ FinancialCalendar
    ├─ Categories
    ├─ Settings · SyncBackup · Export · DeleteAccount
    └─ Premium               presentation: 'modal'

Bottom sheets (rendered via a BottomSheetModalProvider, opened imperatively):
  AddTypeSheet · TransactionFilters · UdhaarEntrySheet · CategoryEditorSheet
  PaymentMethodSheet · DateSheet · NoteSheet · CategoryPickerSheet
```

Type all routes in `src/app/navigation/types.ts` (`RootStackParamList`, `MainTabParamList`) and use typed `useNavigation`/`useRoute`.

## 2. Folder structure

```text
src/
  app/
    navigation/        RootNavigator.tsx, MainTabs.tsx, TabBar.tsx, types.ts, linking.ts
    providers/         AppProviders.tsx (Theme, i18n, BottomSheet, SafeArea, Gesture)
  features/
    auth/              SplashScreen, WelcomeScreen, LoginScreen, useGoogleSignIn.ts
    dashboard/         HomeScreen, useTodaySummary.ts
    transactions/      AddTransactionScreen, AddTypeSheet, TransactionsScreen,
                       TransactionFilters, TransactionDetailScreen, DayTransactionsScreen,
                       schema.ts (zod), useTransactionForm.ts
    categories/        CategoriesScreen, CategoryEditorSheet
    reports/           ReportsScreen, ReportDetailScreen, CustomRangeScreen,
                       FinancialCalendarScreen, useReport.ts, periods.ts
    ledger/            UdhaarListScreen, UdhaarPersonScreen, UdhaarEntrySheet, useUdhaar.ts
    settings/          MoreScreen, SettingsScreen, LanguageScreen, AppLockSetupScreen,
                       LockScreen, PinCreateScreen, SyncBackupScreen, ExportScreen,
                       DeleteAccountScreen
    subscription/      PremiumScreen, useEntitlement.ts, billing.ts
  database/
    sqlite/            client.ts (open, exec, transaction helper, change emitter)
    migrations/        index.ts (ordered list), 001_init.ts (wraps schema.sql)
    repositories/      transactionsRepo.ts, categoriesRepo.ts, udhaarRepo.ts,
                       syncQueueRepo.ts, settingsRepo.ts, reportsRepo.ts
    seed.ts            default categories
  sync/
    syncEngine/        engine.ts (push, pull, schedule), mappers.ts
    syncQueue/         queue.ts
    conflict/          resolve.ts
  services/
    api/               client.ts (fetch wrapper for the NestJS backend — base URL, bearer token, 401→refresh-and-retry once)
    auth/              google.ts (native Google Sign-In), session.ts (backend token pair, Keychain-backed)
    connectivity/      netinfo.ts
    notifications/     reminders.ts
    ads/               ads.ts (placement guard)
    export/            csv.ts, pdf.ts, xlsx.ts
  components/
    common/            AppText, Amount, Button, IconButton, Chip, SegmentedControl, Input,
                       SearchBar, Card, Option, MenuRow, Avatar, Banner, Toast, EmptyState,
                       Skeleton, ConfirmDialog, BottomSheet, SyncStatus, AdSlot, Logo, TabBar
    forms/             AmountInput, NumericKeypad, CategorySelector, PaymentMethodSelector,
                       DateSelector, DateRangePicker
    charts/            IncomeExpenseBars, IncomeTrendLine, ExpenseDonut, PaymentBreakdown,
                       FinancialCalendar
    transactions/      TransactionItem, TransactionList, SummaryCard, NetAmountCard, ReportCard
  hooks/               useTheme, useLiveQuery, useDebounce, useReduceMotion
  store/               authStore, settingsStore, syncStore, entitlementStore, filterStore
  i18n/                index.ts, en.json, hi.json
  theme/               tokens.ts
  utils/               money.ts, dates.ts, ids.ts, format.ts
  constants/           categories.ts, config.ts
  types/               models.ts
```

## 3. Local database (SQLite, source of truth)

Schema: `src/database/schema.sql`. Key decisions:
- **IDs:** UUID v4 generated on device. Rows created offline never collide.
- **Money:** `amount_paise INTEGER NOT NULL CHECK (amount_paise > 0)`.
- **Time:** `occurred_at` stored as ISO-8601 string with offset (`2026-10-03T09:05:00+05:30`); also `occurred_on` (local `YYYY-MM-DD`) for fast day grouping and calendar queries. `created_at`, `updated_at` in UTC ISO.
- **Soft delete:** `deleted_at` nullable. All read queries filter `deleted_at IS NULL`.
- **Sync columns:** `sync_status` (`pending` | `synced`) and `user_id` on every synced table.
- Indexes on `(user_id, occurred_on)`, `(user_id, type, occurred_on)`, `(category_id)`, `sync_status`.

Tables: `transactions`, `categories`, `udhaar_people`, `udhaar_entries`, `sync_queue`, `kv_settings`, `sync_meta` (last_pulled_at per table).

Migrations run in order on launch inside a transaction; current version in `PRAGMA user_version`.

## 4. Business logic

```text
totalIncome  = SUM(amount_paise) WHERE type='income'  AND range AND deleted_at IS NULL
totalExpense = SUM(amount_paise) WHERE type='expense' AND range AND deleted_at IS NULL
net          = totalIncome − totalExpense
```

Udhaar balance per person (positive = you will receive, negative = you need to pay):

```text
balance = SUM(given) − SUM(received) − SUM(took) + SUM(paid)
```
(`given`: you lent; `received`: they returned; `took`: you borrowed; `paid`: you returned.)
Totals: receive = Σ positive balances; pay = Σ |negative balances|. **Udhaar never enters income/expense/net.**

Periods (`features/reports/periods.ts`), week starts Monday, all in device local time:
- today, week (Mon–Sun), month, quarter (calendar Q), 6m (current month + previous 5), year (calendar), custom.
- Bars and trend share the same buckets: today → hourly totals; every other period → daily (never folded into weeks/months, however long the range — both charts scroll horizontally instead), each shown as income and expense together. Tapping a bar or a trend point shows a tooltip with that point's date, income and expense.

## 5. Repositories & live queries

Each repository exposes plain async functions (`create`, `update`, `softDelete`, `restore`, `getById`, `list(params)`, aggregates). Every write:
1. runs in one SQLite transaction: write row (`sync_status='pending'`, `updated_at=now`) + insert `sync_queue` row;
2. emits a change event on `database/sqlite/client.ts` emitter (`'transactions'`, `'udhaar'`, …);
3. calls `syncEngine.schedule()` (debounced 2s).

`useLiveQuery(tables, queryFn, deps)` subscribes to the emitter and re-runs `queryFn` when any listed table changes. UI never awaits the network.

## 6. Sync engine (`src/sync`)

Talks to **this app's own NestJS backend** (`/backend`, §0) over REST — never to Supabase
directly. The backend is what forwards to Supabase, scoped to the caller's `user_id`.

**Triggers:** app start (after auth), app foreground, NetInfo reconnect, 2s after any write, pull-to-refresh, "Sync now".
**Guard:** one run at a time (mutex); skip if offline or no session (no backend access/refresh token stored).
**Push:** read `sync_queue` oldest first in batches of 100 → for each row, read its current state from SQLite and map to the cloud column shape → `POST /sync/push { changes: [{ tableName, row }] }` → backend upserts per table (`onConflict: 'id'`, forcing `user_id` server-side) and returns per-row `ok`/`error` → on `ok` mark the local row `synced` (only if `updated_at` unchanged since read) and delete the queue entry; on `error` leave it queued for retry.
**Pull:** for each table, `GET /sync/pull?table=…&since=<last_pulled_at>` (backend pages by up to 500, filtered to `user_id = me AND updated_at > since`) → apply locally via conflict rule → set `last_pulled_at` = max `updated_at` seen.
**Conflict rule:** last-write-wins on `updated_at`. If local row is `pending` and newer, keep local (it will push). Deletes are just rows with `deleted_at` set, so they follow the same rule.
**Retry:** on failure (network, or a `401` — access token expired, try `POST /auth/refresh` once before giving up) keep queue, set `syncStore.status='error'`, backoff 30s → 2m → 10m → 10m…; reset on success or reconnect.
**Status for UI (`syncStore`):** `status: 'synced'|'pending'|'syncing'|'offline'|'error'`, `pendingCount`, `lastSyncedAt`, `lastError` (plain-language string key).
**First login on a new phone:** full pull (`since` omitted) before showing Home ("Restoring your hisab…").
**Logout:** if `pendingCount > 0` warn; then sign out, wipe SQLite, Keychain and stores.

## 7. Validation (Zod — `features/transactions/schema.ts`)

```ts
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amountPaise: z.number().int()
    .min(1, 'validation.amountRequired')
    .max(10_000_000_00, 'validation.amountTooLarge'), // ₹1,00,00,000
  categoryId: z.string().uuid({ message: 'validation.categoryRequired' }),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank']),
  occurredAt: z.date().max(endOfToday(), 'validation.futureDate'),
  note: z.string().trim().max(120).optional(),
});
```
Udhaar entry: `personId` or `newPersonName` (1–40 chars) required, `direction` enum, `amountPaise` same rules, `occurredAt`, `note`.
Error messages are i18n keys; render with `t(error.message)`.

## 8. Stores (Zustand)

- `authStore`: `tokens {accessToken, refreshToken}` (mirrored in Keychain), `profile {id, name, email, avatarUrl}`, `signIn()`, `signOut()`.
- `settingsStore` (persisted to `kv_settings`): `language`, `lockMethod: 'none'|'pin'|'biometric'`, `lockAfterMs`, `reminderEnabled`, `reminderTime`, `lastPaymentMethod`, `lastCategoryByType`, `onboardingDone`, `lockReminderDismissed`.
- `syncStore`: see §6.
- `entitlementStore`: `isPremium`, `plan`, `renewsAt`, refreshed from billing on launch.
- `filterStore`: Transactions search/type/filters (in-memory).

## 9. Auth

Google Sign-In → Firebase Auth → Firebase `idToken` → `POST {BACKEND_URL}/auth/google { idToken }`
(§0) → backend verifies it with `firebase-admin` and returns `{ accessToken, refreshToken, profile
}`, both **issued by our own backend**, not Firebase and not Supabase. Store both in
`react-native-keychain`. On first login the backend creates the `profiles` row (no SQL trigger —
done in `auth.service.ts`, keyed by `firebase_uid`). Local rows created before login (if any) get
`user_id` set to the returned `profile.id` and are queued.

## 10. Security

- The mobile app holds no database credentials at all — not `DATABASE_URL`, nothing Supabase. It
  only knows this backend's base URL. `DATABASE_URL` lives solely in the backend's environment.
- Supabase RLS is enabled with no policies, as a secure-by-default fallback — not the actual
  authorization boundary. The real boundary is the backend: every query in `sync.service.ts` and
  `auth.service.ts` explicitly scopes to the authenticated caller's `user_id`/`id`, since the raw
  `pg` connection has no RLS session (no `auth.uid()`) to rely on.
- `sync.service.ts`'s push path builds its upsert SQL dynamically (one table, many possible
  columns) from the client's row — column **names** are never interpolated unless they pass
  `TABLE_COLUMNS` whitelist check in `sync.constants.ts`; unrecognized keys are silently dropped.
  Column **values** are always sent as parameterized query params, never concatenated into SQL.
- PIN stored as salted SHA-256 in Keychain; never in SQLite.
- `FLAG_SECURE` is **not** set (users screenshot to share hisab), but app switcher preview is blurred when lock is on.
- No analytics on amounts, notes or names. Crash reporting must scrub them.

## 11. Ads (`services/ads/ads.ts`)

`canShowAd(placement)` returns false when: premium; placement not in allowlist; current route is in the denylist. Allowlist: `transactions_list_end` (native), `reports_below_charts` (native), `interstitial_leave_reports` (max 1 per session, never within 60s of a save, never on first 3 days after install). Denylist routes: Splash, AuthStack, LockScreen, AddTransaction, any sheet/dialog, Premium, DeleteAccount, Export.

## 12. Premium

Products: `premium_monthly`, `premium_yearly` (Play Billing). Entitlement unlocks: no ads, PDF/Excel export, advanced report extras (6 periods comparison is free; premium adds category trend over time and month-over-month insights), custom category colours. Recording, sync, Udhaar, CSV export are always free. "Restore" re-queries purchases.

## 13. Localisation

`i18next` with `en` and `hi` resources; language from `settingsStore` (fallback device locale). Dates via `Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN')` — but keep **Western digits** in Hindi (`numberingSystem: 'latn'`). Money always `en-IN` grouping with `₹`. Category names: `name_hi` when language is Hindi and the user hasn't renamed the category.

## 14. Accessibility

- `accessibilityRole` on every pressable (button, radio, tab, switch, link).
- Amount labels spoken in words: "500 rupees, expense".
- Sheets and dialogs trap focus and move it to their title; Back closes them.
- Contrast ≥ 4.5:1 for text (tokens already comply); touch targets ≥ 44.
- Test with TalkBack and font scale 1.3×.

## 15. Testing

- Unit (Jest): `utils/money`, `periods`, repositories (with an in-memory SQLite), conflict resolver, udhaar balance.
- Component (RNTL): AmountInput/keypad rules, TransactionItem labels, SummaryCard sign/colour.
- E2E (Maestro): offline add expense → appears on Home → go online → chip becomes Synced.
