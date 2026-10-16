import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AleraNotificationBanner } from './src/components/AleraNotificationBanner';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import {
  registerForPushNotificationsAsync,
  triggerLocalProximityAlert,
  isIncidentAlerted,
  markIncidentAsAlerted,
} from './src/services/notifications';
import { api } from './src/services/api';
import { playEmergencySiren } from './src/services/sound';
import { startContinuousLocationTracking, stopContinuousLocationTracking } from './src/services/location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from './src/services/api';
import * as Notifications from 'expo-notifications';

function MainApp() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Iniciar rastreo continuo de coordenadas para el backend
    AsyncStorage.getItem('@alera_device_id').then((id) => {
      const devId = id && id.length === 36 ? id : generateUUID();
      startContinuousLocationTracking(devId);
    });

    // 1. Escuchador de notificaciones push del sistema operativo
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

    // 2. Sincronizacion activa en tiempo real de emergencias y simulacros desde el backend
    let lastProcessedEmergencyTime = 0;

    const checkActiveEmergency = async () => {
      try {
        const emergency = await api.getActiveEmergencyAlert();
        if (emergency && emergency.id) {
          const isDrillOrTest =
            (emergency.title && emergency.title.toUpperCase().includes('SIMULACRO')) ||
            (emergency.title && emergency.title.toUpperCase().includes('PRUEBA')) ||
            (emergency.id && emergency.id.toLowerCase().includes('test'));

          const eventTimestamp = emergency.timestamp || Date.now();

          // Para simulacros: permitir repeticion de prueba si es una emision reciente (menos de 30 segundos)
          if (isDrillOrTest) {
            if (eventTimestamp > lastProcessedEmergencyTime && (Date.now() - eventTimestamp < 30000)) {
              lastProcessedEmergencyTime = eventTimestamp;
              const subtitle = emergency.magnitude ? `Magnitud: M ${emergency.magnitude}` : undefined;
              await triggerLocalProximityAlert(
                emergency.title,
                emergency.body,
                true,
                emergency.type || 'seismic',
                subtitle
              );
            }
          } else if (!isIncidentAlerted(emergency.id)) {
            markIncidentAsAlerted(emergency.id);
            const subtitle = emergency.magnitude ? `Magnitud: M ${emergency.magnitude}` : undefined;
            await triggerLocalProximityAlert(
              emergency.title,
              emergency.body,
              true,
              emergency.type || 'seismic',
              subtitle
            );
          }
        }
      } catch {
        // Si el backend no esta respondiendo temporalmente, omitir
      }
    };

    const emergencyInterval = setInterval(checkActiveEmergency, 2000);

    return () => {
      subscription.remove();
      clearInterval(emergencyInterval);
      stopContinuousLocationTracking();
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