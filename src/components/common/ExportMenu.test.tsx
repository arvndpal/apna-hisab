import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ExportMenu } from './ExportMenu';
import '../../i18n';

function render(onPdf: () => void, busy = false) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<ExportMenu busy={busy} items={[{ label: 'Export as PDF', onPress: onPdf }]} />);
  });
  // The anchor is measured on open to place the dropdown under the icon; RN's Jest View mock
  // stubs measureInWindow without ever calling back, so answer it here.
  const anchor = renderer.root.findAll((n) => n.instance && typeof n.instance.measureInWindow === 'function')[0];
  anchor.instance.measureInWindow = (cb: (x: number, y: number, w: number, h: number) => void) => cb(300, 120, 32, 32);
  return renderer;
}

const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((n) => [n.props.children].flat().join(''));
const trigger = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll((n) => n.props.accessibilityRole === 'button' && 'hitSlop' in n.props && n.props.accessibilityState?.expanded !== undefined)[0];

describe('ExportMenu', () => {
  it('opens a dropdown from the icon and runs the chosen export', () => {
    const onPdf = jest.fn();
    const r = render(onPdf);
    expect(texts(r)).not.toContain('Export as PDF');

    act(() => trigger(r).props.onPress());
    expect(texts(r)).toContain('Export as PDF');

    const item = r.root.findAll((n) => n.props.accessibilityRole === 'menuitem' && typeof n.props.onPress === 'function')[0];
    act(() => item.props.onPress());
    expect(onPdf).toHaveBeenCalledTimes(1);
    expect(texts(r)).not.toContain('Export as PDF'); // closed after choosing
  });

  it('does not open while an export is running', () => {
    const r = render(jest.fn(), true);
    expect(trigger(r).props.onPress).toBeUndefined();
  });
});
