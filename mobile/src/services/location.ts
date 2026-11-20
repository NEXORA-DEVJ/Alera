import * as Location from 'expo-location';
import { api } from './api';
import { saveLastKnownLocation } from './backgroundTask';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
}

// Obtiene las coordenadas GPS reales del chip del dispositivo de forma ultra-rápida
export const getRealDeviceLocation = async (deviceId?: string): Promise<DeviceLocation | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    // 1. Obtención instantánea (< 50ms): última posición conocida del chip GPS
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
      if (lastKnown?.coords) {
        latitude = lastKnown.coords.latitude;
        longitude = lastKnown.coords.longitude;
      }
    } catch {}

    // 2. Si no había posición previa, obtener posición actual con timeout de 3.5s
    // (previene que en Android se congele 15s si el GPS está frío)
    if (latitude === null || longitude === null) {
      try {
        const posPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        const pos = await Promise.race([posPromise, timeoutPromise]);
        if (pos && (pos as any).coords) {
          latitude = (pos as any).coords.latitude;
          longitude = (pos as any).coords.longitude;
        }
      } catch {}
    }

    if (latitude === null || longitude === null) {
      return null;
    }

    // Guardar ultima ubicacion real conocida para la tarea de segundo plano
    saveLastKnownLocation(latitude, longitude).catch(() => {});

    // Sincronizar en Redis y PostGIS en segundo plano
    if (deviceId) {
      api.updateLocation(deviceId, latitude, longitude).catch(() => {});
    }

    // Geocodificación inversa no bloqueante con timeout estricto de 1.5s
    let address = 'Ubicación GPS detectada';
    let city = 'Colombia';

    try {
      const geoPromise = Location.reverseGeocodeAsync({ latitude, longitude });
      const timeoutGeo = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 1500));
      const places = await Promise.race([geoPromise, timeoutGeo]);
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
 * conozca las coordenadas del usuario ante sismos o alertas comunitarias
 * mientras la aplicacion esta activa.
 */
export const startContinuousLocationTracking = async (deviceId: string): Promise<boolean> => {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      return false;
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
        // Guardar ultima ubicacion conocida para la tarea de segundo plano
        saveLastKnownLocation(latitude, longitude).catch(() => {});
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
