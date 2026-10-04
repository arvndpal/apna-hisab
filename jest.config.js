module.exports = {
  preset: '@react-native/jest-preset',
  // Most RN ecosystem packages (navigation, gesture-handler, reanimated, svg, uuid, …) ship ESM;
  // let Babel transform all of them rather than allowlisting one package at a time.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-.*|@react-native-community|@gorhom|nativewind|react-native-css-interop|uuid)/)',
  ],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest/cssMock.js',
    '^react-native-reanimated$': 'react-native-reanimated/mock',
  },
  setupFiles: ['@react-native/jest-preset/jest/setup.js', 'react-native-gesture-handler/jestSetup'],
};
