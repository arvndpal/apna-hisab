import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import { LayoutGrid, type LucideIcon, type LucideProps } from 'lucide-react-native';

const ICONS = LucideIcons as unknown as Record<string, LucideIcon>;

/** Resolves a category's `icon` string (a lucide-react-native export name) to its component. */
export function resolveIcon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutGrid;
}

export function DynamicIcon({ name, ...rest }: { name: string } & LucideProps) {
  const Icon = resolveIcon(name);
  return <Icon {...rest} />;
}
