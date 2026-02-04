import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { StorageService } from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
  overlay: string;
  input: string;
  inputBorder: string;
  placeholder: string;
  divider: string;
  highlight: string;
}

const lightTheme: Theme = {
  background: '#f5f5f5',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  border: '#dddddd',
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  input: '#f8f8f8',
  inputBorder: '#dddddd',
  placeholder: '#999999',
  divider: '#e0e0e0',
  highlight: '#e8f4ff',
};

const darkTheme: Theme = {
  background: '#000000',
  surface: '#1c1c1e',
  card: '#2c2c2e',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  border: '#3a3a3c',
  primary: '#0A84FF',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  input: '#2c2c2e',
  inputBorder: '#3a3a3c',
  placeholder: '#6c6c70',
  divider: '#38383a',
  highlight: '#1a2a3a',
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await StorageService.getSettings();
      if (settings?.theme) {
        setThemeModeState(settings.theme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({
        isMarkdownEnabled: settings?.isMarkdownEnabled ?? false,
        enterToSend: settings?.enterToSend ?? true,
        systemCurrency: settings?.systemCurrency ?? 'USD',
        layoutStyle: settings?.layoutStyle ?? 'default',
        theme: mode,
      });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  };

  const effectiveTheme = getEffectiveTheme();
  const isDark = effectiveTheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
