module.exports = {
  preset: "react-native",
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|@react-navigation|react-native-vector-icons|react-native-markdown-display|react-native-safe-area-context|react-native-screens|expo|@expo|@noble|aes-js|firebase)/)",
  ],
  moduleNameMapper: {
    // Stub native-only Expo modules that use ESM and can't run in Jest/Node
    "^expo-secure-store$": "<rootDir>/src/config/__mocks__/expo-secure-store.js",
    "^expo-device$": "<rootDir>/src/config/__mocks__/expo-device.js",
    "^expo-camera$": "<rootDir>/src/config/__mocks__/expo-camera.js",
    "^expo-document-picker$": "<rootDir>/src/config/__mocks__/expo-document-picker.js",
    "^expo-file-system$": "<rootDir>/src/config/__mocks__/expo-file-system.js",
    "^expo-sharing$": "<rootDir>/src/config/__mocks__/expo-sharing.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.expo/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/setupTests.ts",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
};
