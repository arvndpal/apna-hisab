import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ReportPeriod, TransactionType } from '../../types/models';

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Reports: { period?: ReportPeriod; from?: string; to?: string } | undefined;
  More: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  LanguageSelect: { fromSettings?: boolean } | undefined;
  AppLockSetup: undefined;
  PinCreate: { method: 'pin' | 'biometric' };
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AddTransaction: { type: TransactionType; editId?: string; date?: string };
  TransactionDetail: { id: string };
  DayTransactions: { date: string };
  UdhaarList: undefined;
  UdhaarPerson: { personId: string };
  ReportDetail: { period: ReportPeriod; anchor: string; type: TransactionType };
  CustomRange: undefined;
  FinancialCalendar: undefined;
  Categories: undefined;
  Settings: undefined;
  SyncBackup: undefined;
  Export: undefined;
  DeleteAccount: undefined;
  Premium: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  LockScreen: undefined;
  App: NavigatorScreenParams<AppStackParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
