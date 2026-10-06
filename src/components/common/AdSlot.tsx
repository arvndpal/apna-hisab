import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeAdView, NativeAsset, NativeAssetType, useNativeAd } from 'react-native-google-mobile-ads';
import { AppText } from './AppText';
import { useTheme } from '../../hooks/useTheme';
import { useEntitlement } from '../../features/subscription/useEntitlement';
import { adAllowed, NATIVE_AD_UNIT_ID } from '../../services/ads/ads';
import type { AdPlacement } from '../../services/ads/adRules';
import { radius } from '../../theme/tokens';

/** Dashed ad-container border, specified literally in DESIGN_SYSTEM.md (AdSlot). */
const AD_BORDER = '#BFC8C3';

/**
 * Native ad container (DESIGN_SYSTEM.md › AdSlot): dashed border, "Ad" tag, "Remove" → Premium.
 * Renders nothing for Premium users, on a placement the rules forbid, or when there's no fill.
 */
export function AdSlot({ placement }: { placement: Exclude<AdPlacement, 'interstitial_leave_reports'> }) {
  const { isPremium } = useEntitlement();
  // Inline slots live inside a tab screen whose route is already allowed; only Premium can turn them off.
  const allowed = adAllowed(placement, isPremium, undefined);
  const { status, nativeAd } = useNativeAd({ adUnitId: allowed ? NATIVE_AD_UNIT_ID : null });

  if (!allowed || status !== 'loaded' || !nativeAd) return null;
  return <LoadedAd nativeAd={nativeAd} />;
}

function LoadedAd({ nativeAd }: { nativeAd: NonNullable<ReturnType<typeof useNativeAd>['nativeAd']> }) {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation();

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: AD_BORDER, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 8 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ borderWidth: 1, borderColor: palette.textSecondary, borderRadius: 4, paddingHorizontal: 5 }}>
          <AppText variant="caption" color="secondary" style={{ fontSize: 11, fontWeight: '700' }}>
            {t('ads.tag')}
          </AppText>
        </View>
        <Pressable onPress={() => navigation.navigate('App', { screen: 'Premium' })} accessibilityRole="link" hitSlop={10}>
          <AppText variant="caption" color="brand">
            {t('ads.remove')}
          </AppText>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {nativeAd.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={{ width: 44, height: 44, borderRadius: 10 }} accessibilityIgnoresInvertColors />
          </NativeAsset>
        ) : null}
        <View style={{ flex: 1 }}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <AppText variant="rowTitle" numberOfLines={2}>
              {nativeAd.headline}
            </AppText>
          </NativeAsset>
          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <AppText variant="secondary" color="secondary" numberOfLines={2}>
                {nativeAd.body}
              </AppText>
            </NativeAsset>
          ) : null}
        </View>
      </View>

      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <AppText
            variant="button"
            color="brand"
            style={{ textAlign: 'center', paddingVertical: 10, borderRadius: radius.buttonSm, backgroundColor: palette.primaryTint }}
          >
            {nativeAd.callToAction}
          </AppText>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}
