import * as Location from 'expo-location';
import { api } from './api';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
}

// Obtiene las coordenadas GPS reales del chip del dispositivo
export const getRealDeviceLocation = async (deviceId?: string): Promise<DeviceLocation | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;

    // Si tenemos un deviceId, sincronizamos la ubicación efímera en Redis y PostGIS en el backend
    if (deviceId) {
      api.updateLocation(deviceId, latitude, longitude).catch(() => {
        // La actualización de Redis ocurre en background
      });
    }

    // Geocodificación inversa real para detectar dirección y municipio
    let address = 'Ubicación GPS detectada';
    let city = 'Colombia';

    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places && places.length > 0) {
        const p = places[0];
        const street = p.street || p.name || '';
        city = p.city || p.subregion || p.region || 'Colombia';
        address = street ? `${street}, ${city}` : city;
      }
    } catch {
      address = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
    }

    return {
      latitude,
      longitude,
      address,
      city,
    };
  } catch {
    return null;
  }
};

let locationSubscription: Location.LocationSubscription | null = null;

/**
 * Inicia el rastreo continuo de ubicacion para que el backend siempre
 * conozca las coordenadas del usuario ante sismos o alertas comunitarias,
 * incluso al navegar en otras pantallas o con la app en segundo plano.
 */
export const startContinuousLocationTracking = async (deviceId: string): Promise<boolean> => {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      return false;
    }

    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      // Ignorar si no esta soportado en el entorno
    }

    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 20000, // Cada 20 segundos
        distanceInterval: 30, // O cada 30 metros de desplazamiento
      },
      (position) => {
        const { latitude, longitude } = position.coords;
        api.updateLocation(deviceId, latitude, longitude).catch(() => {});
      }
    );

    return true;
  } catch (err) {
    console.warn('[ALERA GPS] No se pudo activar el rastreo continuo:', err);
    return false;
  }
};

export const stopContinuousLocationTracking = (): void => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
};