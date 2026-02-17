import React from 'react';
import { render } from '@testing-library/react-native';
import { JournalScreen } from '../JournalScreen';

// Mock dependencies
jest.mock('../../services/P2PSyncService');
jest.mock('../../utils/storage', () => ({
  StorageService: {
    loadEntries: jest.fn(() => Promise.resolve([])),
    saveEntry: jest.fn(() => Promise.resolve()),
    getSettings: jest.fn(() => Promise.resolve({ theme: 'light' })),
  },
}));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#FFF', text: '#000', card: '#FFF' } }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user' } }),
}));

describe('JournalScreen', () => {
  it('should render without crashing', () => {
    const { getByPlaceholderText } = render(<JournalScreen />);
    expect(getByPlaceholderText(/chat with daily tracker/i)).toBeTruthy();
  });
});
