/**
 * Render smoke test for the Milestone 8 screens: each mounts against a real (in-memory) SQLite
 * database in English and Hindi, and no raw i18n key leaks into the rendered text.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import { __setTestDriver } from '../../database/sqlite/client';
import { createTestDriver } from '../../database/sqlite/testDriver';
import { migrate } from '../../database/migrations';
import { seedDefaultCategories } from '../../database/seed';
import * as settingsRepo from '../../database/repositories/settingsRepo';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import i18n from '../../i18n';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => {
    const nav = { navigate: mockNavigate, goBack: jest.fn(), reset: jest.fn(), getParent: () => undefined as unknown };
    nav.getParent = () => nav;
    return nav;
  },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));
jest.mock('react-native-keychain', () => ({
  getSupportedBiometryType: jest.fn().mockResolvedValue(null),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  hasGenericPassword: jest.fn().mockResolvedValue(false),
  ACCESS_CONTROL: {},
}));
jest.mock('../../services/auth/google', () => ({ getFirebaseIdToken: jest.fn(), signOutGoogle: jest.fn() }));
jest.mock('../../services/auth/session', () => ({ getTokens: jest.fn().mockResolvedValue(null), clearTokens: jest.fn(), saveTokens: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('react-native-share', () => ({ open: jest.fn() }));

import { MoreScreen } from './MoreScreen';
import { SettingsScreen } from './SettingsScreen';
import { SyncBackupScreen } from './SyncBackupScreen';
import { ExportScreen } from './ExportScreen';
import { DeleteAccountScreen } from './DeleteAccountScreen';
import { CategoriesScreen } from '../categories/CategoriesScreen';

const USER = 'user-1';

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
  seedDefaultCategories(USER);
  settingsRepo.setProfile({ id: USER, name: 'Ravi Kumar', email: 'ravi@example.com', avatarUrl: null });
  useAuthStore.getState().hydrate();
  useSettingsStore.getState().hydrate();
});

afterAll(() => __setTestDriver(null));

function renderedText(root: ReactTestInstance): string[] {
  return root.findAllByType(Text).map((n) => [n.props.children].flat(Infinity).filter((c) => typeof c === 'string').join(''));
}

const SCREENS = { MoreScreen, SettingsScreen, SyncBackupScreen, ExportScreen, DeleteAccountScreen, CategoriesScreen };

describe.each(['en', 'hi'] as const)('Milestone 8 screens (%s)', (language) => {
  beforeEach(() => {
    useSettingsStore.getState().setLanguage(language);
  });

  it.each(Object.keys(SCREENS) as Array<keyof typeof SCREENS>)('%s renders without missing strings', async (name) => {
    const Screen = SCREENS[name];
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Screen />);
    });
    const texts = renderedText(renderer.root).filter(Boolean);
    expect(texts.length).toBeGreaterThan(3);
    // A missing key renders as its own path, e.g. "settings.notifications".
    expect(texts.filter((s) => /^[a-z]+\.[a-zA-Z_.]+$/.test(s))).toEqual([]);
    act(() => renderer.unmount());
  });
});

it('More shows the Settings values from storage', async () => {
  useSettingsStore.getState().setLanguage('en');
  useSettingsStore.getState().setNotificationsEnabled(true);
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<MoreScreen />);
  });
  const texts = renderedText(renderer.root);
  expect(texts).toContain('Ravi Kumar');
  expect(texts).toContain('Daily 9:00 PM');
  expect(texts).toContain('English');
  expect(i18n.language).toBe('en');
  act(() => renderer.unmount());
});

it('Delete account stays disabled until DELETE is typed exactly and the box is ticked', async () => {
  useSettingsStore.getState().setLanguage('en');
  const { TextInput } = require('react-native');
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DeleteAccountScreen />);
  });
  const deleteButton = () =>
    renderer.root.findAll((n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Delete my account')[0];
  const checkbox = renderer.root.findAll((n) => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function')[0];

  expect(deleteButton().props.accessibilityState.disabled).toBe(true);
  act(() => renderer.root.findByType(TextInput).props.onChangeText('delete'));
  act(() => checkbox.props.onPress());
  expect(deleteButton().props.accessibilityState.disabled).toBe(true);
  act(() => renderer.root.findByType(TextInput).props.onChangeText('DELETE'));
  expect(deleteButton().props.accessibilityState.disabled).toBe(false);
  act(() => renderer.unmount());
});
