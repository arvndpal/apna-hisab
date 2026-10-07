import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { GradientSurface } from '../common/GradientSurface';
import { AppText } from '../common/AppText';
import { Amount } from '../common/Amount';
import { SyncStatus } from '../common/SyncStatus';
import { Avatar } from '../common/Avatar';
import { radius } from '../../theme/tokens';
import { formatPaise } from '../../utils/money';
import type { SyncUiStatus } from '../../types/models';

export type HomeHeroPeriod = 'today' | 'week' | 'month';

const PERIOD_OPTIONS: Array<{ value: HomeHeroPeriod; labelKey: string }> = [
  { value: 'today', labelKey: 'common.today' },
  { value: 'week', labelKey: 'reports.week' },
  { value: 'month', labelKey: 'reports.month' },
];

function PeriodToggle({ value, onChange }: { value: HomeHeroPeriod; onChange: (period: HomeHeroPeriod) => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,20,16,0.24)', borderRadius: 999, padding: 3 }}>
      {PERIOD_OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={t(opt.labelKey)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: selected ? 'rgba(255,255,255,0.22)' : 'transparent',
            }}
          >
            <AppText variant="label" style={{ color: '#FFFFFF' }}>
              {t(opt.labelKey)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

interface StatProps {
  icon: typeof ArrowDownLeft;
  label: string;
  paise: number;
  kind: 'income' | 'expense';
}

function Stat({ icon: Icon, label, paise, kind }: StatProps) {
  const color = kind === 'income' ? '#B4F0CB' : '#FFBC9C';
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon size={14} color="#BFE0D9" strokeWidth={2.5} />
        <AppText variant="label" style={{ color: '#BFE0D9' }}>
          {label}
        </AppText>
      </View>
      <AppText variant="amountHeroStat" style={{ color }}>
        ₹{new Intl.NumberFormat('en-IN').format(paise / 100)}
      </AppText>
    </View>
  );
}

export interface HeroSummaryHomeProps {
  variant: 'home';
  dateLabel: string;
  greeting: string;
  initial: string;
  avatarUrl?: string | null;
  netPaise: number;
  incomePaise: number;
  expensePaise: number;
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  period: HomeHeroPeriod;
  onChangePeriod: (period: HomeHeroPeriod) => void;
  syncStatus: SyncUiStatus;
  pendingCount?: number;
  onPressAvatar: () => void;
  onPressNet: () => void;
}

/** Home hero: edge-to-edge gradient under the status bar, net + sync chip, income/expense stats. */
export function HeroSummary(props: HeroSummaryHomeProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [avatarFailed, setAvatarFailed] = useState(false);
  return (
    <GradientSurface
      variant="hero"
      style={{
        borderBottomLeftRadius: radius.heroBottom,
        borderBottomRightRadius: radius.heroBottom,
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 22,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: 120,
          borderWidth: 36,
          borderColor: 'rgba(255,255,255,0.07)',
          top: -70,
          right: -80,
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <AppText variant="label" style={{ color: '#BFE0D9' }}>
            {props.dateLabel}
          </AppText>
          <AppText variant="heroGreeting" color="onPrimary">
            {props.greeting}
          </AppText>
        </View>
        <Pressable
          onPress={props.onPressAvatar}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.profile')}
          style={{ backgroundColor: 'rgba(0,20,16,0.24)', borderRadius: 22 }}
        >
          {props.avatarUrl && !avatarFailed ? (
            <Image
              source={{ uri: props.avatarUrl }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              onError={() => setAvatarFailed(true)}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Avatar name={props.initial} size={44} />
          )}
        </Pressable>
      </View>

      <View style={{ marginTop: 14 }}>
        <PeriodToggle value={props.period} onChange={props.onChangePeriod} />
      </View>

      <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Pressable
          onPress={props.onPressNet}
          accessibilityRole="button"
          accessibilityLabel={`${props.netLabel}. ${t('a11y.amountNet', { amount: formatPaise(props.netPaise) })}`}
        >
          <AppText variant="label" style={{ color: '#BFE0D9' }}>
            {props.netLabel}
          </AppText>
          <Amount paise={props.netPaise} kind="net" size="XXL" color="onPrimary" />
        </Pressable>
        <SyncStatus status={props.syncStatus} pendingCount={props.pendingCount} variant="glass" />
      </View>

      <View
        style={{
          marginTop: 18,
          borderRadius: 18,
          backgroundColor: 'rgba(0,24,20,0.22)',
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
        }}
      >
        <Stat icon={ArrowDownLeft} label={props.incomeLabel} paise={props.incomePaise} kind="income" />
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 4 }} />
        <Stat icon={ArrowUpRight} label={props.expenseLabel} paise={props.expensePaise} kind="expense" />
      </View>
    </GradientSurface>
  );
}
