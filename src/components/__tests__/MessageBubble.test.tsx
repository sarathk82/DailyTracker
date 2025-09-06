import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageBubble } from '../MessageBubble';
import { Entry } from '../../types';

describe('MessageBubble', () => {
  const mockEntry: Entry = {
    id: '1',
    text: 'Test message',
    timestamp: new Date(),
    type: 'log',
    isMarkdown: false
  };

  const mockOnLongPress = jest.fn();
  const mockMarkdownStyles = {
    body: { fontSize: 16 }
  };

  it('renders correctly for a regular message', () => {
    const { getByText } = render(
      <MessageBubble
        entry={mockEntry}
        onLongPress={mockOnLongPress}
        markdownStyles={mockMarkdownStyles}
      />
    );

    expect(getByText('Test message')).toBeTruthy();
  });

  it('renders markdown content when isMarkdown is true', () => {
    const markdownEntry: Entry = {
      ...mockEntry,
      isMarkdown: true,
      text: '**Bold text**'
    };

    const { getByText } = render(
      <MessageBubble
        entry={markdownEntry}
        onLongPress={mockOnLongPress}
        markdownStyles={mockMarkdownStyles}
      />
    );

    expect(getByText('Bold text')).toBeTruthy();
  });

  it('shows expense icon for expense messages', () => {
    const expenseEntry: Entry = {
      ...mockEntry,
      type: 'expense'
    };

    const { getByTestId } = render(
      <MessageBubble
        entry={expenseEntry}
        onLongPress={mockOnLongPress}
        markdownStyles={mockMarkdownStyles}
      />
    );

    expect(getByTestId('expense-icon')).toBeTruthy();
  });

  it('shows action icon for action messages', () => {
    const actionEntry: Entry = {
      ...mockEntry,
      type: 'action'
    };

    const { getByTestId } = render(
      <MessageBubble
        entry={actionEntry}
        onLongPress={mockOnLongPress}
        markdownStyles={mockMarkdownStyles}
      />
    );

    expect(getByTestId('action-icon')).toBeTruthy();
  });

  it('aligns system messages to the right', () => {
    const systemEntry: Entry = {
      ...mockEntry,
      type: 'system'
    };

    const { getByTestId } = render(
      <MessageBubble
        entry={systemEntry}
        onLongPress={mockOnLongPress}
        markdownStyles={mockMarkdownStyles}
      />
    );

    const container = getByTestId('message-container');
    expect(container.props.style).toContainEqual(
      expect.objectContaining({
        alignSelf: 'flex-end'
      })
    );
  });

  it('calls onLongPress when long pressing a non-system message', () => {
    const { getByTestId } = render(
      <MessageBubble
        entry={mockEntry}
        onLongPress={mockOnLongPress}
        markdownStyles={mockMarkdownStyles}
      />
    );

    fireEvent(getByTestId('message-container'), 'onLongPress');
    expect(mockOnLongPress).toHaveBeenCalledWith(mockEntry);
  });

  it('does not call onLongPress when long pressing a system message', () => {
    const systemEntry: Entry = {
      ...mockEntry,
      type: 'system'
    };

    const { getByTestId } = render(
      <MessageBubble
        entry={systemEntry}
        onLongPress={mockOnLongPress}
        markdownStyles={mockMarkdownStyles}
      />
    );

    fireEvent(getByTestId('message-container'), 'onLongPress');
    expect(mockOnLongPress).not.toHaveBeenCalled();
  });
});
