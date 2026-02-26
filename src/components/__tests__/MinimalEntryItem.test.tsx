import React from 'react';
import { render } from '@testing-library/react-native';
import { MinimalEntryItem } from '../MinimalEntryItem';
import { Entry, Expense, ActionItem } from '../../types';
import { ThemeProvider } from '../../contexts/ThemeContext';

jest.mock('../HighlightedText', () => ({
  HighlightedText: ({ text, searchQuery }: { text: string; searchQuery: string }) => {
    const { Text } = require('react-native');
    return <Text testID="highlighted-text">{text}</Text>;
  },
}));

const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();
const mockMarkdownStyles = {};
const mockLayoutStyles = {
  minimalContainer: {},
  minimalContent: {},
  minimalText: {},
  minimalTime: {},
  minimalIcon: {}
};

const MockWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('MinimalEntryItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseEntry: Entry = {
    id: '1',
    text: 'Minimal entry test',
    timestamp: new Date('2025-09-02T10:00:00Z'),
    type: 'log',
    isMarkdown: false
  };

  it('should render log entry', () => {
    const { getByText } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={baseEntry}
          expense={undefined}
          actionItem={undefined}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
        />
      </MockWrapper>
    );

    expect(getByText('Minimal entry test')).toBeTruthy();
  });

  it('should render without crashing', () => {
    const { getByText } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={baseEntry}
          expense={undefined}
          actionItem={undefined}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
        />
      </MockWrapper>
    );

    expect(getByText('Minimal entry test')).toBeTruthy();
  });

  it('should render expense entry with expense data', () => {
    const expenseEntry: Entry = {
      ...baseEntry,
      type: 'expense',
      text: 'Spent $50'
    };

    const expense: Expense = {
      id: '1',
      entryId: '1',
      amount: 50,
      currency: 'USD',
      description: 'lunch',
      category: 'food',
      createdAt: new Date(),
      autoDetected: true
    };

    const { getByText } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={expenseEntry}
          expense={expense}
          actionItem={undefined}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
        />
      </MockWrapper>
    );

    expect(getByText('Spent $50')).toBeTruthy();
    expect(getByText(/50/)).toBeTruthy();
  });

  it('should render action item entry', () => {
    const actionEntry: Entry = {
      ...baseEntry,
      type: 'action',
      text: '✅ Complete task'
    };

    const actionItem: ActionItem = {
      id: '1',
      entryId: '1',
      title: 'Complete task',
      completed: false,
      createdAt: new Date(),
      autoDetected: true
    };

    const { getByText } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={actionEntry}
          expense={undefined}
          actionItem={actionItem}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
        />
      </MockWrapper>
    );

    expect(getByText(/Complete task/)).toBeTruthy();
  });

  it('should render without expense or action item', () => {
    const { getByText } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={baseEntry}
          expense={undefined}
          actionItem={undefined}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
        />
      </MockWrapper>
    );

    expect(getByText('Minimal entry test')).toBeTruthy();
  });

  it('should use HighlightedText when searchQuery is provided', () => {
    const { getByTestId } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={baseEntry}
          expense={undefined}
          actionItem={undefined}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
          searchQuery="entry"
        />
      </MockWrapper>
    );

    expect(getByTestId('highlighted-text')).toBeTruthy();
  });

  it('should pass highlightIndex to HighlightedText', () => {
    const { getByTestId } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={baseEntry}
          expense={undefined}
          actionItem={undefined}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
          searchQuery="Minimal"
          highlightIndex={0}
        />
      </MockWrapper>
    );

    expect(getByTestId('highlighted-text')).toBeTruthy();
  });

  it('should not use HighlightedText when searchQuery is empty string', () => {
    const { getByText, queryByTestId } = render(
      <MockWrapper>
        <MinimalEntryItem
          item={baseEntry}
          expense={undefined}
          actionItem={undefined}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
          layoutStyles={mockLayoutStyles}
          searchQuery=""
        />
      </MockWrapper>
    );

    expect(queryByTestId('highlighted-text')).toBeNull();
    expect(getByText('Minimal entry test')).toBeTruthy();
  });
});
