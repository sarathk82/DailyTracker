import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '../ThemeContext';

const TestComponent = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  
  return (
    <>
      <Text testID="theme-mode">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="background">{theme.background}</Text>
      <Text testID="text-color">{theme.text}</Text>
    </>
  );
};

describe('ThemeContext', () => {
  it('should provide default light theme', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(getByTestId('theme-mode').props.children).toBe('light');
    expect(getByTestId('background').props.children).toBeDefined();
    expect(getByTestId('text-color').props.children).toBeDefined();
  });

  it('should provide theme values', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const background = getByTestId('background').props.children;
    const textColor = getByTestId('text-color').props.children;

    expect(typeof background).toBe('string');
    expect(typeof textColor).toBe('string');
    expect(background.startsWith('#')).toBe(true);
    expect(textColor.startsWith('#')).toBe(true);
  });

  it('should render children correctly', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Text>Child Component</Text>
      </ThemeProvider>
    );

    expect(getByText('Child Component')).toBeTruthy();
  });

  it('should provide all required theme properties', () => {
    const ThemeChecker = () => {
      const { theme } = useTheme();
      
      const requiredProperties = [
        'background',
        'surface',
        'primary',
        'secondary',
        'text',
        'textSecondary',
        'border',
        'input',
        'error',
        'success'
      ];

      return (
        <>
          {requiredProperties.map(prop => (
            <Text key={prop} testID={`theme-${prop}`}>
              {(theme as any)[prop]}
            </Text>
          ))}
        </>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeChecker />
      </ThemeProvider>
    );

    // Check all required properties are defined
    expect(getByTestId('theme-background')).toBeTruthy();
    expect(getByTestId('theme-surface')).toBeTruthy();
    expect(getByTestId('theme-primary')).toBeTruthy();
    expect(getByTestId('theme-secondary')).toBeTruthy();
    expect(getByTestId('theme-text')).toBeTruthy();
    expect(getByTestId('theme-textSecondary')).toBeTruthy();
    expect(getByTestId('theme-border')).toBeTruthy();
    expect(getByTestId('theme-input')).toBeTruthy();
    expect(getByTestId('theme-error')).toBeTruthy();
    expect(getByTestId('theme-success')).toBeTruthy();
  });
});
