module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  testEnvironment: "node",
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|@react-navigation|react-native-vector-icons|react-native-uuid|react-native-markdown-display|react-native-safe-area-context|react-native-screens|expo|@expo)/)"
  ],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.expo/"],
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|@react-navigation|react-native-vector-icons|react-native-uuid|react-native-markdown-display|react-native-safe-area-context|react-native-screens|expo|@expo)/)",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/setupTests.ts",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "babel-jest",
      { presets: ["@babel/preset-typescript"] },
    ],
  },
};
