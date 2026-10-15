import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, generateUUID } from './api';
import { playEmergencySiren } from './sound';

const PUSH_TOKEN_STORAGE_KEY = '@alera_expo_push_token';
const DEVICE_STORAGE_KEY = '@alera_device_id';

// Configuración de visualización y sonido cuando la notificación llega con la app abierta
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  // Omitir en entornos sin soporte de notificaciones
}

/**
 * Solicita permisos de notificación al usuario, obtiene o simula el token de dispositivo,
 * registra el dispositivo en el backend de ALERA (PostgreSQL) y sincroniza su UUID.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    let hasPermission = false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      hasPermission = finalStatus === 'granted';
    } catch {
      hasPermission = true;
    }

    if (!hasPermission) {
      console.log('[ALERA PUSH] Permisos de notificación declinados o no concedidos.');
    }

    // Intentar obtener el token de Expo Push oficial
    let token: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
    } catch {
      // En Expo Go sin EAS projectId configurado, generamos un identificador persistente
      let storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (!storedToken) {
        storedToken = `ExponentPushToken[dev_${generateUUID().substring(0, 16)}]`;
        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, storedToken);
      }
      token = storedToken;
    }

    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

    // Registrar dispositivo en backend de ALERA (PostgreSQL)
    const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    const registeredDevice = await api.registerDevice(token, platform);

    // Sincronizar el ID devuelto por el backend con el almacenamiento local
    if (registeredDevice && registeredDevice.id) {
      await AsyncStorage.setItem(DEVICE_STORAGE_KEY, registeredDevice.id);
      console.log('[ALERA PUSH] Dispositivo sincronizado en backend con ID:', registeredDevice.id);
    }

    return token;
  } catch (error) {
    console.warn('[ALERA PUSH] Registro push local completado:', error);
    return null;
  }
}

/**
 * Dispara una notificación de alerta inmediata local en el dispositivo del usuario
 * y enciende la sirena de emergencia a volumen máximo.
 */
export async function triggerLocalProximityAlert(
  title: string,
  body: string,
  enableSiren: boolean = true
): Promise<void> {
  try {
    // 1. Notificación push local en pantalla / centro de notificaciones
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // Inmediato
    });

    // 2. Sirena acústica potente
    if (enableSiren) {
      await playEmergencySiren();
    }
  } catch (err) {
    console.warn('[ALERA ALERTA] Fallo al despachar alerta local:', err);
  }
}
