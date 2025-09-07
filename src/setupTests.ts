import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Expo StatusBar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => 'StatusBar'
}));
