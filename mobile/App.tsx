import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AleraNotificationBanner } from './src/components/AleraNotificationBanner';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { playEmergencySiren } from './src/services/sound';
import * as Notifications from 'expo-notifications';

function MainApp() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    registerForPushNotificationsAsync();

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = (content.data || {}) as Record<string, any>;

      // Si la alerta fue emitida localmente dentro de la app, su sirena ya fue orquestada
      if (data.isLocalDispatch) {
        return;
      }

      const title = (content.title || '').toUpperCase();

      if (title.includes('SISMO') || title.includes('TERREMOTO') || data.type === 'seismic') {
        // Alerta Sismica: reproduccion oficial de 5 segundos
        playEmergencySiren('seismic');
      } else if (title.includes('ALERTA') || title.includes('COMUNITARIA') || data.type === 'community') {
        // Alerta Comunitaria: reproduccion oficial de 3 segundos
        playEmergencySiren('community');
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
      <AleraNotificationBanner />
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