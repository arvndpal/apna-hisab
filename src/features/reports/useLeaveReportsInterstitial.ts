import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { useEntitlement } from '../subscription/useEntitlement';
import { adAllowed, INTERSTITIAL_AD_UNIT_ID, noteInterstitialShown } from '../../services/ads/ads';
import { currentRouteName } from '../../app/navigation/navigationRef';
import { suppressNextResumeLock } from '../../app/navigation/resumeLock';

/** Drilling into a report isn't leaving Reports. */
const REPORTS_FLOW = new Set(['Reports', 'ReportDetail', 'CustomRange', 'FinancialCalendar', 'DayTransactions']);

/**
 * The one interstitial the app has (ARCHITECTURE.md §11 `interstitial_leave_reports`): shown when the
 * user leaves Reports, at most once per session, never within 60 s of a save, never in the first
 * 3 days after install, never onto a denylisted screen (Add Transaction, Premium, Export, …).
 */
export function useLeaveReportsInterstitial(): void {
  const navigation = useNavigation();
  const { isPremium } = useEntitlement();
  // Only bother loading while an interstitial could ever be shown this session (route checked on leave).
  const mayShow = adAllowed('interstitial_leave_reports', isPremium, 'Reports');
  const ad = useInterstitialAd({ adUnitId: mayShow ? INTERSTITIAL_AD_UNIT_ID : null });
  const adRef = useRef(ad);
  adRef.current = ad;

  useEffect(
    () =>
      navigation.addListener('blur', () => {
        const current = adRef.current;
        // By blur the destination is the current route — the rules check where the ad would land.
        const destination = currentRouteName();
        if (destination && REPORTS_FLOW.has(destination)) return;
        if (current.status === 'loaded' && adAllowed('interstitial_leave_reports', isPremium, destination)) {
          noteInterstitialShown();
          suppressNextResumeLock();
          current.show();
        }
      }),
    [navigation, isPremium],
  );
}
