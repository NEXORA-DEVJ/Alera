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
import {
  startContinuousLocationTracking,
  stopContinuousLocationTracking,
  getRealDeviceLocation,
} from './src/services/location';
import { registerBackgroundSeismicTask } from './src/services/backgroundTask';
import { emitCommunityAlert } from './src/services/communityAlertEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, generateUUID } from './src/services/api';
import * as Notifications from 'expo-notifications';

function MainApp() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // 1. Inicialización secuencial y consistente de dispositivo y GPS:
    // Garantiza que el backend conozca el deviceId exacto y su ubicación GPS desde el primer segundo
    const initDeviceAndTracking = async () => {
      try {
        await registerForPushNotificationsAsync();

        let devId = await AsyncStorage.getItem('@alera_device_id');
        if (!devId || devId.length !== 36) {
          devId = generateUUID();
          await AsyncStorage.setItem('@alera_device_id', devId);
        }

        const loc = await getRealDeviceLocation(devId);
        if (loc) {
          await api.updateLocation(devId, loc.latitude, loc.longitude).catch(() => {});
        }

        await startContinuousLocationTracking(devId);
      } catch (err) {
        console.warn('[ALERA] Error en inicialización de dispositivo y GPS:', err);
      }
    };

    initDeviceAndTracking();

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

          // Desduplicación estricta: registrar de inmediato el incidente para que
          // ninguna otra vista vuelva a disparar una segunda alerta para el mismo evento
          if (data.incidentId) {
            markIncidentAsAlerted(data.incidentId);
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

    // 6. Puente de pruebas para Expo Go (iOS y Android):
    // Garantiza que en entornos de pruebas con Expo Go (donde las notificaciones push de Apple/Google
    // pueden requerir login o tener cola/latencia en servidores de Expo), cualquier dispositivo
    // (iPhone adicional, Android, simulador) reciba la alerta comunitaria de inmediato
    // sin importar si está en la pestaña de Sismos, Perfil o Alertas Comunitarias.
    let expoGoBridgeTimer: ReturnType<typeof setInterval> | null = null;
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo';

    if (isExpoGo) {
      const checkNearbyIncidentsExpoGo = async () => {
        try {
          let [latStr, lonStr, devId] = await Promise.all([
            AsyncStorage.getItem('@alera_last_lat'),
            AsyncStorage.getItem('@alera_last_lon'),
            AsyncStorage.getItem('@alera_device_id'),
          ]);

          let lat = latStr ? parseFloat(latStr) : NaN;
          let lon = lonStr ? parseFloat(lonStr) : NaN;

          if (isNaN(lat) || isNaN(lon)) {
            const loc = await getRealDeviceLocation();
            if (loc) {
              lat = loc.latitude;
              lon = loc.longitude;
            }
          }

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

      expoGoBridgeTimer = setInterval(checkNearbyIncidentsExpoGo, 10000);
      checkNearbyIncidentsExpoGo();
    }

    return () => {
      subscription?.remove();
      tapSubscription?.remove();
      if (expoGoBridgeTimer) clearInterval(expoGoBridgeTimer);
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
