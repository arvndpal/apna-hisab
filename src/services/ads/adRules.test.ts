import { canShowAd, type AdContext } from './adRules';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const base: AdContext = { isPremium: false, now: NOW, installedAt: NOW - 10 * DAY, lastSaveAt: null, interstitialsShown: 0 };

describe('canShowAd', () => {
  it('shows inline slots to free users on allowed screens', () => {
    expect(canShowAd('transactions_list_end', base)).toBe(true);
    expect(canShowAd('reports_below_charts', { ...base, route: 'MainTabs' })).toBe(true);
  });

  it('never shows anything to Premium users', () => {
    expect(canShowAd('transactions_list_end', { ...base, isPremium: true })).toBe(false);
    expect(canShowAd('interstitial_leave_reports', { ...base, isPremium: true })).toBe(false);
  });

  it.each(['Splash', 'Welcome', 'LockScreen', 'AddTransaction', 'Premium', 'Export', 'DeleteAccount'])('never shows on %s', (route) => {
    expect(canShowAd('reports_below_charts', { ...base, route })).toBe(false);
    expect(canShowAd('interstitial_leave_reports', { ...base, route })).toBe(false);
  });

  it('never shows while a sheet or dialog is open', () => {
    expect(canShowAd('interstitial_leave_reports', { ...base, overlayOpen: true })).toBe(false);
  });

  describe('interstitial on leaving Reports', () => {
    it('is allowed once the basics hold', () => {
      expect(canShowAd('interstitial_leave_reports', base)).toBe(true);
    });

    it('shows at most once per session', () => {
      expect(canShowAd('interstitial_leave_reports', { ...base, interstitialsShown: 1 })).toBe(false);
    });

    it('waits 3 days after install', () => {
      expect(canShowAd('interstitial_leave_reports', { ...base, installedAt: NOW - 3 * DAY + 1 })).toBe(false);
      expect(canShowAd('interstitial_leave_reports', { ...base, installedAt: NOW - 3 * DAY })).toBe(true);
    });

    it('never follows a save within 60 seconds', () => {
      expect(canShowAd('interstitial_leave_reports', { ...base, lastSaveAt: NOW - 59_999 })).toBe(false);
      expect(canShowAd('interstitial_leave_reports', { ...base, lastSaveAt: NOW - 60_000 })).toBe(true);
    });
  });
});
