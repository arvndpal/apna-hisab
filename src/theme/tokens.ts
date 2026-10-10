/**
 * Apna Hisab design tokens — single source of truth.
 * Mirrors design-reference/styles/apna-hisab.css (which renders the screenshots).
 * Never use raw hex values in components; import from here or use the NativeWind classes.
 */

export const palette = {
  light: {
    primary: '#0A7A5E',
    primaryPress: '#065F4F',
    primaryTint: '#E2F4EC',
    hero: '#066457', // solid fallback under gradHero
    gold: '#F29C15', // logo ₹ — Premium only
    goldTint: '#FFF1D6',
    income: '#137A43',
    incomeTint: '#E6F4EC',
    incomeOnHero: '#B4F0CB',
    expense: '#C2410C',
    expenseTint: '#FDEEE6',
    expenseOnHero: '#FFBC9C',
    expenseChart: '#E8875B',
    udhaar: '#3949A8',
    udhaarTint: '#ECEEFA',
    success: '#137A43',
    warning: '#8A4B00',
    warningTint: '#FFF3DC',
    error: '#B42318',
    errorTint: '#FDECEA',
    background: '#F5F6F3',
    surface: '#FFFFFF',
    muted: '#F0F2F0',
    mutedStrong: '#E8ECE9',
    textPrimary: '#15201C',
    textSecondary: '#58645F',
    textTertiary: '#9AA5A0', // icons/chevrons only, never body text
    textOnHeroMuted: '#BFE0D9',
    border: '#E6EAE7',
    scrim: 'rgba(10,20,17,0.5)',
    glassOnHero: 'rgba(0,20,16,0.24)',
    statsOnHero: 'rgba(0,24,20,0.22)',
    dividerOnHero: 'rgba(255,255,255,0.14)',
    toastBg: '#14201C',
    toastAccent: '#7BD8A4',
  },
  dark: {
    primary: '#3FB8A6',
    primaryPress: '#62C9B9',
    primaryTint: '#173A35',
    hero: '#0B3F38',
    gold: '#F5B13D',
    goldTint: '#3A2A10',
    income: '#4CC38A',
    incomeTint: '#16301F',
    incomeOnHero: '#B4F0CB',
    expense: '#F08A5D',
    expenseTint: '#3A2016',
    expenseOnHero: '#FFBC9C',
    expenseChart: '#F08A5D',
    udhaar: '#8E9BEA',
    udhaarTint: '#1E2340',
    success: '#4CC38A',
    warning: '#F2B45A',
    warningTint: '#33270F',
    error: '#F47066',
    errorTint: '#3A1714',
    background: '#0F1513',
    surface: '#18201D',
    muted: '#222B28',
    mutedStrong: '#2A3431',
    textPrimary: '#E8EEEB',
    textSecondary: '#9DABA4',
    textTertiary: '#6E7C76',
    textOnHeroMuted: '#BFE0D9',
    border: '#2A3531',
    scrim: 'rgba(0,0,0,0.6)',
    glassOnHero: 'rgba(0,0,0,0.28)',
    statsOnHero: 'rgba(0,0,0,0.25)',
    dividerOnHero: 'rgba(255,255,255,0.12)',
    toastBg: '#E8EEEB',
    toastAccent: '#137A43',
  },
} as const;

export type Palette = typeof palette.light;

/** Logo gradients. Direction: light at top-right → deep at bottom-left (CSS 225deg).
 *  Use with expo-linear-gradient: <LinearGradient colors={g.colors} locations={g.locations} start={g.start} end={g.end} /> */
const DIR = { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } } as const;
export const gradients = {
  hero: { colors: ['#45BE74', '#139169', '#076A5A', '#03474A'], locations: [0, 0.28, 0.62, 1], ...DIR },
  button: { colors: ['#2FAE70', '#0C8564', '#05604F'], locations: [0, 0.45, 1], ...DIR },
  fab: { colors: ['#6BD067', '#1A9C6B', '#055F55'], locations: [0, 0.45, 1], ...DIR },
  tabPill: { colors: ['#DDF5E3', '#E2F4EC'], locations: [0, 1], ...DIR },
} as const;

/** Category / chart palette, in order. */
export const chartColors = ['#0A7A5E', '#C2410C', '#E8A04B', '#3949A8', '#A3ADA8'] as const;

/** Diary card background swatches a user can pick in the entry sheet. null (first) = default Card surface. */
export const noteColors = [null, '#FDE68A', '#FBCFE8', '#BFDBFE', '#BBF7D0', '#DDD6FE', '#FED7AA', '#99F6E4'] as const;

export const fontFamily = {
  400: 'Mukta_400Regular',
  500: 'Mukta_500Medium',
  600: 'Mukta_600SemiBold',
  700: 'Mukta_700Bold',
  800: 'Mukta_800ExtraBold',
} as const;

type Type = { size: number; lineHeight: number; weight: keyof typeof fontFamily; letterSpacing?: number };
export const typography: Record<string, Type> = {
  amountInput: { size: 58, lineHeight: 60, weight: 800, letterSpacing: -1.5 },
  amountXXL: { size: 46, lineHeight: 48, weight: 800, letterSpacing: -1 },
  amountXL: { size: 36, lineHeight: 39, weight: 800, letterSpacing: -0.8 },
  amountL: { size: 26, lineHeight: 29, weight: 800, letterSpacing: -0.4 },
  amountM: { size: 20, lineHeight: 23, weight: 700, letterSpacing: -0.2 },
  amountHeroStat: { size: 22, lineHeight: 26, weight: 700, letterSpacing: -0.2 },
  amountRow: { size: 16, lineHeight: 20, weight: 700 },
  display: { size: 30, lineHeight: 36, weight: 800 },
  displayWelcome: { size: 40, lineHeight: 45, weight: 800, letterSpacing: -0.5 },
  title: { size: 24, lineHeight: 29, weight: 800, letterSpacing: -0.2 },
  heroGreeting: { size: 23, lineHeight: 29, weight: 800 },
  titlePushed: { size: 20, lineHeight: 26, weight: 700 },
  section: { size: 17, lineHeight: 22, weight: 700, letterSpacing: -0.1 },
  rowTitle: { size: 16, lineHeight: 20, weight: 600 },
  button: { size: 16, lineHeight: 20, weight: 700 },
  body: { size: 15, lineHeight: 21, weight: 400 },
  label: { size: 13.5, lineHeight: 18, weight: 500 },
  secondary: { size: 13, lineHeight: 17.5, weight: 400 },
  caption: { size: 12.5, lineHeight: 17, weight: 500 },
  tab: { size: 12, lineHeight: 16, weight: 600 },
  group: { size: 13, lineHeight: 17, weight: 700 },
};
/** Devanagari needs extra room for matras: multiply lineHeight when language === 'hi'. */
export const HINDI_LINE_HEIGHT_FACTOR = 1.1;

export const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;
export const layout = {
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 16,
  touchMin: 44,
  buttonHeight: 54,
  buttonHeightSm: 44,
  inputHeight: 54,
  chipHeight: 40,
  keypadKeyHeight: 54,
  rowMinHeight: 64,
  iconCircle: 42,
  categoryCircle: 48,
  avatar: 44,
  fab: 62,
  fabLift: 34,
  fabRing: 5,
  bottomNavHeight: 74,
} as const;

export const radius = {
  chip: 20, input: 14, button: 16, buttonSm: 12, iconButton: 14, card: 18, option: 18,
  heroBottom: 30, heroCard: 24, sheet: 28, dialog: 26, toast: 14, full: 999,
} as const;

/** RN shadow presets (Android uses elevation). */
export const shadows = {
  card: { shadowColor: '#10201C', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  lg: { shadowColor: '#10201C', shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  primaryGlow: { shadowColor: '#06604F', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  fab: { shadowColor: '#06604F', shadowOpacity: 0.38, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
} as const;

export const motion = { sheetIn: 220, sheetOut: 180, dialog: 160, toast: 160, toastHold: 3000, toastHoldUndo: 5000 } as const;
