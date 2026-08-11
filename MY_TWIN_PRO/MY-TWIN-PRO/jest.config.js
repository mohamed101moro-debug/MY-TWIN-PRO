module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|react-native-reanimated|react-native-gesture-handler|expo-av|expo-linear-gradient|lucide-react-native)/)',
  ],
  moduleNameMapper: {
    // مكافحة جميع أنواع الملفات الصوتية والصور
    '\\.(mp3|wav|m4a|aac|ogg|flac)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(png|jpg|jpeg|gif|svg|webp|ico)$': '<rootDir>/__mocks__/fileMock.js',
    // مكافحة المكتبات
    '^expo-av$': '<rootDir>/__mocks__/expo-av.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^expo-localization$': '<rootDir>/__mocks__/expo-localization.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
    '^expo-status-bar$': '<rootDir>/__mocks__/expo-status-bar.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
