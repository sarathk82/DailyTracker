import React from 'react';
import { render } from '@testing-library/react-native';
import { JournalScreen } from '../JournalScreen';

// Mock dependencies
jest.mock('../../services/P2PSyncService');
jest.mock('../../utils/storage', () => ({
  StorageService: {
    getEntries: jest.fn(() => Promise.resolve([])),
    saveEntries: jest.fn(() => Promise.resolve()),
    getExpenses: jest.fn(() => Promise.resolve([])),
    saveExpenses: jest.fn(() => Promise.resolve()),
    getActionItems: jest.fn(() => Promise.resolve([])),
    saveActionItems: jest.fn(() => Promise.resolve()),
    getSettings: jest.fn(() => Promise.resolve({ theme: 'light' })),
  },
}));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ 
    theme: { 
      background: '#FFF', 
      text: '#000', 
      card: '#FFF',
      placeholder: '#999',
      input: '#EEE',
      border: '#DDD'
    } 
  }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user' } }),
}));

describe('JournalScreen', () => {
  it('should render without crashing', () => {
    const { getByPlaceholderText } = render(<JournalScreen />);
    expect(getByPlaceholderText(/Type a message/i)).toBeTruthy();
  });
});
