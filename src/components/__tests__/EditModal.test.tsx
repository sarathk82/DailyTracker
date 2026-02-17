import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditModal } from '../EditModal';
import { Entry, Expense, ActionItem } from '../../types';
import { ThemeProvider } from '../../contexts/ThemeContext';

const mockOnClose = jest.fn();
const mockOnSave = jest.fn();

const MockWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

jest.mock('../../../src/utils/storage', () => ({
  StorageService: {
    getEntries: jest.fn(() => Promise.resolve([])),
    saveEntries: jest.fn(() => Promise.resolve()),
    getExpenses: jest.fn(() => Promise.resolve([])),
    saveExpenses: jest.fn(() => Promise.resolve()),
    updateExpense: jest.fn(() => Promise.resolve()),
    getActionItems: jest.fn(() => Promise.resolve([])),
    saveActionItems: jest.fn(() => Promise.resolve()),
    updateActionItem: jest.fn(() => Promise.resolve()),
    getSettings: jest.fn(() => Promise.resolve({ theme: 'light' })),
  }
}));

describe('EditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEntry: Entry = {
    id: '1',
    text: 'Test entry',
    timestamp: new Date('2025-09-02T10:00:00Z'),
    type: 'log',
    isMarkdown: false
  };

  it('should not render when visible is false', () => {
    const { queryByText } = render(
      <MockWrapper>
        <EditModal
          visible={false}
          entry={null}
          expense={null}
          actionItem={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </MockWrapper>
    );

    expect(queryByText('Edit Entry')).toBeFalsy();
  });

  it('should render when visible is true with entry', () => {
    const { getByText } = render(
      <MockWrapper>
        <EditModal
          visible={true}
          entry={mockEntry}
          expense={null}
          actionItem={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </MockWrapper>
    );

    expect(getByText('Edit Entry')).toBeTruthy();
  });

  it('should display entry text in input', () => {
    const { getByDisplayValue } = render(
      <MockWrapper>
        <EditModal
          visible={true}
          entry={mockEntry}
          expense={null}
          actionItem={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </MockWrapper>
    );

    expect(getByDisplayValue('Test entry')).toBeTruthy();
  });

  it('should call onClose when cancel button is pressed', () => {
    const { getByText } = render(
      <MockWrapper>
        <EditModal
          visible={true}
          entry={mockEntry}
          expense={null}
          actionItem={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </MockWrapper>
    );

    fireEvent.press(getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should render expense data when provided', () => {
    const expense: Expense = {
      id: '1',
      entryId: '1',
      amount: 50,
      currency: 'USD',
      description: 'groceries',
      category: 'food',
      timestamp: new Date(),
      autoDetected: true
    };

    const expenseEntry: Entry = {
      ...mockEntry,
      type: 'expense'
    };

    const { getByText, getByDisplayValue } = render(
      <MockWrapper>
        <EditModal
          visible={true}
          entry={expenseEntry}
          expense={expense}
          actionItem={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </MockWrapper>
    );

    expect(getByDisplayValue('50')).toBeTruthy();
    expect(getByText(/USD/)).toBeTruthy();
  });

  it('should render action item data when provided', () => {
    const actionItem: ActionItem = {
      id: '1',
      entryId: '1',
      title: 'Call dentist',
      completed: false,
      createdAt: new Date(),
      autoDetected: true
    };

    const actionEntry: Entry = {
      ...mockEntry,
      type: 'action'
    };

    const { getByDisplayValue } = render(
      <MockWrapper>
        <EditModal
          visible={true}
          entry={actionEntry}
          expense={null}
          actionItem={actionItem}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </MockWrapper>
    );

    expect(getByDisplayValue('Call dentist')).toBeTruthy();
  });

  it('should handle null entry gracefully', () => {
    const { queryByText } = render(
      <MockWrapper>
        <EditModal
          visible={true}
          entry={null}
          expense={null}
          actionItem={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </MockWrapper>
    );

    // Should not crash
    expect(queryByText('Edit Entry')).toBeTruthy();
  });
});
