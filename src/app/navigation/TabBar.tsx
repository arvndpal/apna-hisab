import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { House, List, ChartColumn, Ellipsis, Plus, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/common/AppText';
import { GradientSurface } from '../../components/common/GradientSurface';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../theme/tokens';
import { openAddSheet } from '../../store/addSheetStore';

const ICONS: Record<string, LucideIcon> = { Home: House, Transactions: List, Reports: ChartColumn, More: Ellipsis };
const LABELS: Record<string, string> = { Home: 'nav.home', Transactions: 'nav.transactions', Reports: 'nav.reports', More: 'nav.more' };

const LEFT_ROUTES = ['Home', 'Transactions'];
const RIGHT_ROUTES = ['Reports', 'More'];

function TabItem({ routeName, focused, onPress }: { routeName: string; focused: boolean; onPress: () => void }) {
  const palette = useTheme();
  const { t } = useTranslation();
  const Icon = ICONS[routeName];
  const iconColor = focused ? palette.primary : palette.textSecondary;

  const inner = (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 58, height: 32, borderRadius: 16, overflow: 'hidden' }}>
      <Icon size={22} color={iconColor} strokeWidth={2} />
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={t(LABELS[routeName])}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
    >
      {focused ? (
        <GradientSurface variant="tabPill" style={{ borderRadius: 16 }}>
          {inner}
        </GradientSurface>
      ) : (
        inner
      )}
      <AppText variant="tab" color={focused ? 'brand' : 'secondary'}>
        {t(LABELS[routeName])}
      </AppText>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const palette = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const goTo = (routeName: string) => {
    const event = navigation.emit({ type: 'tabPress', target: state.routes.find((r) => r.name === routeName)!.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(routeName);
  };

  return (
    <View
      style={{
        height: layout.bottomNavHeight + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderTopColor: palette.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {LEFT_ROUTES.map((name) => (
        <TabItem key={name} routeName={name} focused={state.routes[state.index].name === name} onPress={() => goTo(name)} />
      ))}

      <View style={{ width: layout.fab, alignItems: 'center' }}>
        <Pressable
          onPress={openAddSheet}
          accessibilityRole="button"
          accessibilityLabel={t('nav.add')}
          style={{
            position: 'absolute',
            top: -layout.fabLift,
            width: layout.fab,
            height: layout.fab,
            borderRadius: 22,
            borderWidth: layout.fabRing,
            borderColor: palette.surface,
          }}
        >
          <GradientSurface
            variant="fab"
            style={{
              flex: 1,
              borderRadius: 22 - layout.fabRing,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#06604F',
              shadowOpacity: 0.38,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
          </GradientSurface>
        </Pressable>
      </View>

      {RIGHT_ROUTES.map((name) => (
        <TabItem key={name} routeName={name} focused={state.routes[state.index].name === name} onPress={() => goTo(name)} />
      ))}
    </View>
  );
}
