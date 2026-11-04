import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AleraNotificationBanner } from './src/components/AleraNotificationBanner';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootErrorBoundary } from './src/components/RootErrorBoundary';
import {
  registerForPushNotificationsAsync,
  triggerLocalProximityAlert,
} from './src/services/notifications';
import { SirenAlertType } from './src/services/sound';
import { startContinuousLocationTracking, stopContinuousLocationTracking } from './src/services/location';
import { registerBackgroundSeismicTask } from './src/services/backgroundTask';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from './src/services/api';
import * as Notifications from 'expo-notifications';

function MainApp() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // 1. Registro seguro de notificaciones push
    registerForPushNotificationsAsync().catch((err) => {
      console.warn('[ALERA] Error en registro de notificaciones:', err);
    });

    // 2. Iniciar rastreo seguro de coordenadas para el backend
    AsyncStorage.getItem('@alera_device_id')
      .then((id) => {
        const devId = id && id.length === 36 ? id : generateUUID();
        return startContinuousLocationTracking(devId);
      })
      .catch((err) => {
        console.warn('[ALERA] Error en inicializacion de GPS:', err);
      });

    // 3. Registrar tarea de segundo plano para alertas sismicas (funciona aunque la app este cerrada)
    registerBackgroundSeismicTask().catch((err) => {
      console.warn('[ALERA BG] No se pudo registrar tarea de fondo:', err);
    });

    // 4. Escuchador reactivo de notificaciones push (mientras la app esta abierta)
    let subscription: Notifications.Subscription | null = null;
    try {
      subscription = Notifications.addNotificationReceivedListener((notification) => {
        try {
          const content = notification.request.content;
          const data = (content.data || {}) as Record<string, any>;

          // Ignorar despachos locales propios para evitar duplicados
          if (data.isLocalDispatch || data.isBackgroundAlert) {
            return;
          }

          const rawTitle = content.title || 'ALERTA SISMICA ALERA';
          const body = content.body || '';
          const titleUpper = rawTitle.toUpperCase();

          const type: SirenAlertType =
            (titleUpper.includes('SISMO') || titleUpper.includes('TERREMOTO') || data.type === 'seismic')
              ? 'seismic'
              : 'community';

          const subtitle = data.magnitude ? `Magnitud: M ${data.magnitude}` : undefined;

          // Despachar banner visual + sirena (app abierta: primer plano)
          triggerLocalProximityAlert(rawTitle, body, true, type, subtitle, false);
        } catch (listenerErr) {
          console.warn('[ALERA] Error procesando notificacion push entrante:', listenerErr);
        }
      });
    } catch (subErr) {
      console.warn('[ALERA] No se pudo inicializar listener de notificaciones:', subErr);
    }

    // 5. Escuchador de toque en notificacion (usuario abre la app desde la bandeja)
    let tapSubscription: Notifications.Subscription | null = null;
    try {
      tapSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data || {}) as Record<string, any>;
        if (data.isBackgroundAlert) {
          // La app ya se abre; no es necesario hacer nada adicional
        }
      });
    } catch {}

    return () => {
      subscription?.remove();
      tapSubscription?.remove();
      stopContinuousLocationTracking();
      // No se detiene la sirena ni las notificaciones al minimizar la app.
      // La tarea de segundo plano sigue corriendo por su cuenta.
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
    <RootErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}
