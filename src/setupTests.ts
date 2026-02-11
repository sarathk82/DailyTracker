import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Expo StatusBar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => 'StatusBar'
}));

// Mock react-native-markdown-display
jest.mock('react-native-markdown-display', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement('Text', {}, children)
  };
});

// Mock Firebase
jest.mock('./config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn();
    }),
    signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid', email: 'test@test.com' } })),
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid', email: 'test@test.com' } })),
    signOut: jest.fn(() => Promise.resolve()),
    sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(() => Promise.resolve()),
        get: jest.fn(() => Promise.resolve({ exists: false })),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Paths: {
    cache: '/cache',
    document: '/document',
  },
  documentDirectory: '/document',
  cacheDirectory: '/cache',
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  },
  CameraView: 'CameraView',
}));

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(),
  }),
  useFocusEffect: (callback: () => void) => callback(),
  NavigationContainer: ({ children }: any) => children,
}));

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

// Global test utilities
global.alert = jest.fn();
global.confirm = jest.fn(() => true);
