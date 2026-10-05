import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../../features/dashboard/HomeScreen';
import { TransactionsScreen } from '../../features/transactions/TransactionsScreen';
import { ReportsScreen } from '../../features/reports/ReportsScreen';
import { MoreScreen } from '../../features/settings/MoreScreen';
import { AddTypeSheet } from '../../features/transactions/AddTypeSheet';
import { UdhaarEntrySheet } from '../../features/ledger/UdhaarEntrySheet';
import { TabBar } from './TabBar';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Reports" component={ReportsScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
      <AddTypeSheet />
      <UdhaarEntrySheet />
    </>
  );
}
