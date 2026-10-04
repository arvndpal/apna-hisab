import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { AddTransactionScreen } from '../../features/transactions/AddTransactionScreen';
import { TransactionDetailScreen } from '../../features/transactions/TransactionDetailScreen';
import { DayTransactionsScreen } from '../../features/transactions/DayTransactionsScreen';
import { UdhaarListScreen } from '../../features/ledger/UdhaarListScreen';
import { UdhaarPersonScreen } from '../../features/ledger/UdhaarPersonScreen';
import { ReportDetailScreen } from '../../features/reports/ReportDetailScreen';
import { CustomRangeScreen } from '../../features/reports/CustomRangeScreen';
import { FinancialCalendarScreen } from '../../features/reports/FinancialCalendarScreen';
import { CategoriesScreen } from '../../features/categories/CategoriesScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { SyncBackupScreen } from '../../features/settings/SyncBackupScreen';
import { ExportScreen } from '../../features/settings/ExportScreen';
import { DeleteAccountScreen } from '../../features/settings/DeleteAccountScreen';
import { PremiumScreen } from '../../features/subscription/PremiumScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="DayTransactions" component={DayTransactionsScreen} />
      <Stack.Screen name="UdhaarList" component={UdhaarListScreen} />
      <Stack.Screen name="UdhaarPerson" component={UdhaarPersonScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="CustomRange" component={CustomRangeScreen} />
      <Stack.Screen name="FinancialCalendar" component={FinancialCalendarScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SyncBackup" component={SyncBackupScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
