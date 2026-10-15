import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { playEmergencySiren } from './src/services/sound';
import * as Notifications from 'expo-notifications';

function MainApp() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    registerForPushNotificationsAsync();

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title || '';
      if (title.toUpperCase().includes('ALERTA')) {
        playEmergencySiren();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.backgroundPrimary,
      card: colors.surfaceCard,
      border: colors.surfaceCardBorder,
      text: colors.textPrimary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}