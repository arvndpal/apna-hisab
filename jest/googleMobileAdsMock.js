// Jest-only stand-in for react-native-google-mobile-ads (native SDK): no ad ever loads.
const React = require('react');

const idle = { status: 'idle', nativeAd: null, error: null, retry: () => {}, destroy: () => {}, autoLoad: true };

module.exports = {
  __esModule: true,
  default: () => ({ initialize: () => Promise.resolve([]) }),
  TestIds: { NATIVE: 'test-native', INTERSTITIAL: 'test-interstitial', BANNER: 'test-banner' },
  useNativeAd: () => idle,
  useInterstitialAd: () => ({ ...idle, show: () => {}, load: () => {} }),
  NativeAdView: ({ children }) => React.createElement('NativeAdView', null, children),
  NativeAsset: ({ children }) => children,
  NativeAssetType: { HEADLINE: 'headline', BODY: 'body', ICON: 'icon', CALL_TO_ACTION: 'callToAction' },
};
