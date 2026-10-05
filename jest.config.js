module.exports = {
  preset: '@react-native/jest-preset',
  // backend/ is a separate NestJS project with its own Vitest setup — never run by this Jest config.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/backend/'],
  // Most RN ecosystem packages (navigation, gesture-handler, reanimated, svg, uuid, …) ship ESM;
  // let Babel transform all of them rather than allowlisting one package at a time.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-.*|@react-native-community|@gorhom|nativewind|react-native-css-interop|uuid|lucide-react-native)/)',
  ],
  // lucide-react-native resolves to a .mjs build; the preset's transform only matches .js/.ts/.tsx.
  transform: {
    '^.+\\.(js|mjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': '@react-native/jest-preset/jest/assetFileTransformer.js',
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest/cssMock.js',
    '^react-native-reanimated$': 'react-native-reanimated/mock',
    '^react-native-localize$': '<rootDir>/jest/reactNativeLocalizeMock.js',
    '^lucide-react-native$': '<rootDir>/jest/lucideMock.js',
    '^@react-native-community/netinfo$': '<rootDir>/jest/netinfoMock.js',
  },
  setupFiles: ['@react-native/jest-preset/jest/setup.js', 'react-native-gesture-handler/jestSetup'],
};
