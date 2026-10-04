const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Keep Metro's watcher off native build output and any local Gradle/Xcode caches.
    blockList: [/android\/(build|\.gradle|\.cxx|\.kotlin)\/.*/, /ios\/(build|Pods)\/.*/, /\.gradle-home\/.*/],
  },
};

module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), {
  input: './global.css',
});
