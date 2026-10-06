import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Check, Crown, X } from 'lucide-react-native';
import { AppText } from '../../components/common/AppText';
import { Banner } from '../../components/common/Banner';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { useTheme } from '../../hooks/useTheme';
import { showToast } from '../../store/toastStore';
import { buy, loadPlans, manageSubscription, refreshEntitlement, useBillingStore } from '../../services/billing/billing';
import type { Plan, PlanKey } from '../../services/billing/plans';
import { useEntitlement } from './useEntitlement';
import { radius } from '../../theme/tokens';

const BENEFITS = ['premium.benefitAdFree', 'premium.benefitReports', 'premium.benefitExport', 'premium.benefitCustom'] as const;

type Notice = 'unavailable' | 'pending' | 'purchaseFailed' | 'nothingToRestore' | null;

function PlanOption({
  title,
  subtitle,
  price,
  badge,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  price: string | null;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, badge, subtitle, price].filter(Boolean).join(', ')}
      style={{
        minHeight: 76,
        borderRadius: radius.option,
        borderWidth: 1.5,
        borderColor: selected ? palette.primary : palette.border,
        backgroundColor: selected ? palette.primaryTint : palette.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: selected ? palette.primary : palette.textTertiary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: palette.primary }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText variant="section">{title}</AppText>
          {badge ? (
            <View style={{ backgroundColor: palette.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1 }}>
              <AppText variant="caption" color="onPrimary">
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="secondary" color="secondary">
          {subtitle}
        </AppText>
      </View>
      {price ? (
        <AppText variant="section">{price}</AppText>
      ) : (
        // Skeleton while Play returns localized prices.
        <View style={{ width: 72, height: 18, borderRadius: 6, backgroundColor: palette.muted }} />
      )}
    </Pressable>
  );
}

/** SCREENS.md §23. No ads, no countdowns, no pre-selected extras. */
export function PremiumScreen() {
  const { t } = useTranslation();
  const palette = useTheme();
  const navigation = useNavigation();
  const { isPremium, productId } = useEntitlement();
  const status = useBillingStore((s) => s.status);
  const setStatus = useBillingStore((s) => s.setStatus);

  const [plans, setPlans] = useState<Partial<Record<PlanKey, Plan>> | null>(null);
  const [selected, setSelected] = useState<PlanKey>('yearly');
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const fetchPlans = useCallback(async () => {
    setPlans(null);
    const loaded = await loadPlans();
    setPlans(loaded);
    if (!loaded.yearly && !loaded.monthly) setNotice('unavailable');
    else if (!loaded.yearly) setSelected('monthly');
  }, []);

  useEffect(() => {
    setStatus('idle');
    fetchPlans();
  }, [fetchPlans, setStatus]);

  // Purchase outcomes arrive through Play's listener (services/billing) — react to them here.
  useEffect(() => {
    if (status === 'success') {
      setStatus('idle');
      showToast({ message: t('toast.premiumActive') });
      navigation.goBack();
    } else if (status === 'pending') {
      setNotice('pending');
    } else if (status === 'error') {
      setNotice('purchaseFailed');
    }
  }, [status, setStatus, t, navigation]);

  const handleRestore = async () => {
    setNotice(null);
    setRestoring(true);
    const found = await refreshEntitlement();
    setRestoring(false);
    if (found) {
      showToast({ message: t('premium.restored') });
      navigation.goBack();
    } else {
      setNotice(found === false ? 'nothingToRestore' : 'unavailable');
    }
  };

  const handleContinue = () => {
    const plan = plans?.[selected];
    if (!plan) return;
    setNotice(null);
    buy(plan);
  };

  const plan = plans?.[selected];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 }}>
        <IconButton icon={X} accessibilityLabel={t('common.close')} onPress={() => navigation.goBack()} />
        {isPremium ? null : (
          <Button label={t('premium.restore')} variant="ghost" size="sm" fullWidth={false} onPress={handleRestore} loading={restoring} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16, gap: 18 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.warningTint, alignItems: 'center', justifyContent: 'center' }}>
          <Crown size={28} color={palette.warning} strokeWidth={2} />
        </View>

        {isPremium ? (
          <>
            <AppText variant="display" accessibilityRole="header">
              {t('premium.activeTitle')}
            </AppText>
            <AppText variant="body" color="secondary" style={{ fontSize: 17, lineHeight: 24 }}>
              {t('premium.activeBody')}
            </AppText>
            <View style={{ flex: 1 }} />
            <Button label={t('premium.manage')} variant="secondary" onPress={() => manageSubscription(productId)} />
          </>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <AppText variant="display" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
                {t('premium.title')}
              </AppText>
              <AppText variant="body" color="secondary" style={{ fontSize: 17, lineHeight: 24 }}>
                {t('premium.sub')}
              </AppText>
            </View>

            <View style={{ gap: 14 }}>
              {BENEFITS.map((key) => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Check size={22} color={palette.income} strokeWidth={2.5} />
                  <AppText variant="rowTitle" style={{ fontWeight: '500', flex: 1 }}>
                    {t(key)}
                  </AppText>
                </View>
              ))}
            </View>

            <View style={{ gap: 12 }} accessibilityRole="radiogroup">
              {plans === null || plans.yearly ? (
                <PlanOption
                  title={t('premium.yearly')}
                  subtitle={t('premium.yearlySub')}
                  badge={t('premium.bestValue')}
                  price={plans?.yearly ? t('premium.perYear', { price: plans.yearly.displayPrice }) : null}
                  selected={selected === 'yearly'}
                  onPress={() => setSelected('yearly')}
                />
              ) : null}
              {plans === null || plans.monthly ? (
                <PlanOption
                  title={t('premium.monthly')}
                  subtitle={t('premium.monthlySub')}
                  price={plans?.monthly ? t('premium.perMonth', { price: plans.monthly.displayPrice }) : null}
                  selected={selected === 'monthly'}
                  onPress={() => setSelected('monthly')}
                />
              ) : null}
            </View>

            {notice ? (
              <Banner variant={notice === 'nothingToRestore' || notice === 'pending' ? 'neutral' : 'warning'} title={t(`premium.${notice}`)} onDismiss={() => setNotice(null)} />
            ) : null}
            {notice === 'unavailable' ? <Button label={t('common.retry')} variant="secondary" onPress={fetchPlans} /> : null}

            <View style={{ flex: 1 }} />
            <Button
              label={selected === 'yearly' ? t('premium.continueYearly') : t('premium.continueMonthly')}
              onPress={handleContinue}
              disabled={!plan}
              loading={status === 'purchasing'}
            />
            <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              {t('premium.fine')}
            </AppText>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
