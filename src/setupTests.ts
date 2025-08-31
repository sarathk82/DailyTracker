import "@testing-library/react-native/extend-expect";

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

// Mock expo vector icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock react-native-uuid
jest.mock("react-native-uuid", () => ({
  v4: jest.fn(() => "mocked-uuid-1234"),
}));

// Mock react-native-markdown-display
jest.mock("react-native-markdown-display", () => "Markdown");

// Mock date-fns format function
jest.mock("date-fns", () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === "HH:mm") {
      return "10:30";
    }
    return "2023-08-31";
  }),
}));

// Mock react-navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: jest.fn(),
}));

// Mock ToastAndroid for testing
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return {
    ...RN,
    ToastAndroid: {
      show: jest.fn(),
      SHORT: "SHORT",
      LONG: "LONG",
    },
    Alert: {
      alert: jest.fn(),
    },
    Platform: {
      OS: "ios",
    },
  };
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
});

export { mockAsyncStorage };
