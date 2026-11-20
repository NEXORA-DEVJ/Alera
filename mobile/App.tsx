import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AleraNotificationBanner } from './src/components/AleraNotificationBanner';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootErrorBoundary } from './src/components/RootErrorBoundary';
import {
  registerForPushNotificationsAsync,
  triggerLocalProximityAlert,
  isIncidentAlerted,
  markIncidentAsAlerted,
} from './src/services/notifications';
import { SirenAlertType } from './src/services/sound';
import { startContinuousLocationTracking, stopContinuousLocationTracking } from './src/services/location';
import { registerBackgroundSeismicTask } from './src/services/backgroundTask';
import { emitCommunityAlert } from './src/services/communityAlertEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, generateUUID } from './src/services/api';
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

    // 4. Escuchador reactivo de notificaciones push (Event-Driven / Cero Polling)
    // Despacho instantaneo por push de Expo / FCM: funciona en cualquier pantalla o en segundo plano
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

          const rawTitle = content.title || 'ALERTA ALERA';
          const body = content.body || '';
          const titleUpper = rawTitle.toUpperCase();

          const isCommunity = data.type === 'community' || titleUpper.includes('COMUNITARIA');
          const type: SirenAlertType = isCommunity ? 'community' : 'seismic';

          const subtitle = data.distanceKm
            ? `A ${data.distanceKm} km del incidente`
            : data.magnitude
            ? `Magnitud: M ${data.magnitude}`
            : undefined;

          // Despachar banner visual + sirena (app abierta: primer plano)
          triggerLocalProximityAlert(rawTitle, body, true, type, subtitle, false);

          // Si es alerta comunitaria, propagar el evento reactivamente al Observer bus
          if (isCommunity) {
            emitCommunityAlert(data);
          }
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

    // 6. Puente de pruebas EXCLUSIVO para Android en Expo Go (SDK 53):
    // Como Expo Go en Android eliminó el soporte de push remoto en SDK 53,
    // este puente permite recibir las alertas comunitarias en Android durante pruebas en Expo Go
    // aunque el usuario esté en la pestaña de Sismos o Perfil.
    // En iPhone y en el APK de producción este bloque NO corre (usan Push 100% nativo).
    let expoGoAndroidTimer: ReturnType<typeof setInterval> | null = null;
    const isExpoGoAndroid =
      Platform.OS === 'android' &&
      (Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
       (Constants as any).appOwnership === 'expo');

    if (isExpoGoAndroid) {
      const checkNearbyIncidentsExpoGo = async () => {
        try {
          const [latStr, lonStr, devId] = await Promise.all([
            AsyncStorage.getItem('@alera_last_lat'),
            AsyncStorage.getItem('@alera_last_lon'),
            AsyncStorage.getItem('@alera_device_id'),
          ]);
          if (!latStr || !lonStr) return;
          const lat = parseFloat(latStr);
          const lon = parseFloat(lonStr);
          if (isNaN(lat) || isNaN(lon)) return;

          const incidents = await api.getNearbyCommunityIncidents(lat, lon, 50000);
          if (incidents && incidents.length > 0) {
            const hazard = incidents.find(
              (item) =>
                item.distanceMeters <= 1500 &&
                item.incident.status !== 'RESOLVED' &&
                item.incident.status !== 'EXPIRED' &&
                item.incident.reporterDeviceId !== (devId || '') &&
                !isIncidentAlerted(item.incident.id)
            );

            if (hazard) {
              markIncidentAsAlerted(hazard.incident.id);
              const dist =
                hazard.distanceMeters < 1000
                  ? `${Math.round(hazard.distanceMeters)} m`
                  : `${(hazard.distanceMeters / 1000).toFixed(1)} km`;

              triggerLocalProximityAlert(
                `ALERTA COMUNITARIA: Incidente Vecinal`,
                `Estás a ${dist} del incidente. ${hazard.incident.description || ''}`.trim(),
                true,
                'community',
                `A ${dist} del origen`,
                true
              );
              emitCommunityAlert(hazard.incident);
            }
          }
        } catch {}
      };

      expoGoAndroidTimer = setInterval(checkNearbyIncidentsExpoGo, 20000);
      checkNearbyIncidentsExpoGo();
    }

    return () => {
      subscription?.remove();
      tapSubscription?.remove();
      if (expoGoAndroidTimer) clearInterval(expoGoAndroidTimer);
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
