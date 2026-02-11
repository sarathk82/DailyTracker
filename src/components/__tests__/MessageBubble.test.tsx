import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageBubble } from '../MessageBubble';
import { Entry, Expense, ActionItem } from '../../types';
import { ThemeProvider } from '../../contexts/ThemeContext';

const mockOnLongPress = jest.fn();
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

const mockMarkdownStyles = {};

const MockWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('MessageBubble', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseEntry: Entry = {
    id: '1',
    text: 'Test message',
    timestamp: new Date('2025-09-02T10:00:00Z'),
    type: 'log',
    isMarkdown: false
  };

  it('should render a log entry', () => {
    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={baseEntry}
          onLongPress={mockOnLongPress}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    expect(getByText('Test message')).toBeTruthy();
  });

  it('should render system message', () => {
    const systemEntry: Entry = {
      ...baseEntry,
      type: 'system',
      text: '✓ Got it!'
    };

    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={systemEntry}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    expect(getByText('✓ Got it!')).toBeTruthy();
  });

  it('should render expense entry with expense data', () => {
    const expenseEntry: Entry = {
      ...baseEntry,
      type: 'expense',
      text: 'Spent $50 on groceries'
    };

    const expense: Expense = {
      id: '1',
      entryId: '1',
      amount: 50,
      currency: 'USD',
      description: 'groceries',
      category: 'food',
      timestamp: new Date('2025-09-02T10:00:00Z'),
      autoDetected: true
    };

    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={expenseEntry}
          expense={expense}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    expect(getByText('Spent $50 on groceries')).toBeTruthy();
    expect(getByText(/50/)).toBeTruthy();
  });

  it('should render action item entry with action data', () => {
    const actionEntry: Entry = {
      ...baseEntry,
      type: 'action',
      text: '✅ Call dentist tomorrow'
    };

    const actionItem: ActionItem = {
      id: '1',
      entryId: '1',
      title: 'Call dentist tomorrow',
      completed: false,
      createdAt: new Date('2025-09-02T10:00:00Z'),
      autoDetected: true
    };

    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={actionEntry}
          actionItem={actionItem}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    expect(getByText('✅ Call dentist tomorrow')).toBeTruthy();
  });

  it('should call onLongPress when long pressed', () => {
    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={baseEntry}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    fireEvent(getByText('Test message'), 'longPress');
    expect(mockOnLongPress).toHaveBeenCalledWith(baseEntry);
  });

  it('should render timestamp', () => {
    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={baseEntry}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    // Check for time display (format may vary)
    expect(getByText(/10:00/)).toBeTruthy();
  });

  it('should render markdown when isMarkdown is true', () => {
    const markdownEntry: Entry = {
      ...baseEntry,
      text: '**Bold** and *italic*',
      isMarkdown: true
    };

    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={markdownEntry}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    expect(getByText('**Bold** and *italic*')).toBeTruthy();
  });

  it('should display expense category when available', () => {
    const expenseEntry: Entry = {
      ...baseEntry,
      type: 'expense'
    };

    const expense: Expense = {
      id: '1',
      entryId: '1',
      amount: 25,
      currency: 'USD',
      description: 'lunch',
      category: 'food',
      timestamp: new Date(),
      autoDetected: false
    };

    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={expenseEntry}
          expense={expense}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    expect(getByText(/food/i)).toBeTruthy();
  });

  it('should show completed status for action items', () => {
    const actionEntry: Entry = {
      ...baseEntry,
      type: 'action'
    };

    const completedAction: ActionItem = {
      id: '1',
      entryId: '1',
      title: 'Task completed',
      completed: true,
      createdAt: new Date(),
      autoDetected: false
    };

    const { getByText } = render(
      <MockWrapper>
        <MessageBubble
          entry={actionEntry}
          actionItem={completedAction}
          onLongPress={mockOnLongPress}
          markdownStyles={mockMarkdownStyles}
        />
      </MockWrapper>
    );

    expect(getByText(/Task completed/)).toBeTruthy();
  });
});
