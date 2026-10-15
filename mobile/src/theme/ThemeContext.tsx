import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, ThemeColors } from './colors';

interface ThemeContextType {
  isDark: boolean;
  theme: 'dark' | 'light';
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const THEME_STORAGE_KEY = '@alera_app_theme';

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light') {
        setIsDark(false);
      } else if (saved === 'dark') {
        setIsDark(true);
      }
    } catch {
      // Default to dark
    }
  };

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  };

  const setTheme = async (theme: 'dark' | 'light') => {
    const isDarkVal = theme === 'dark';
    setIsDark(isDarkVal);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore
    }
  };

  const activeColors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        theme: isDark ? 'dark' : 'light',
        colors: activeColors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
