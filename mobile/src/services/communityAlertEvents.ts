/**
 * ALERA Community Alert Events (Observer Pattern)
 *
 * Arquitectura reactiva basada en eventos (Event-Driven):
 * Permite que los componentes de la interfaz de usuario (como CommunityAlertsScreen)
 * se suscriban de forma desacoplada a las alertas comunitarias recibidas por Push,
 * actualizando la vista inmediatamente (<1 s) con CERO sondeo (0 polling),
 * protegiendo la base de datos y la batería del dispositivo.
 *
 * Principios SOLID:
 *  - SRP: Responsabilidad única de coordinar suscripciones y despachos en memoria.
 *  - DIP: Desacopla la recepción del push en App.tsx del render en las pantallas.
 */

export interface CommunityAlertEventData {
  incidentId?: string;
  incidentType?: string;
  type?: string;
  status?: string;
  distanceKm?: string;
  [key: string]: any;
}

type CommunityEventListener = (data: CommunityAlertEventData) => void;

const listeners = new Set<CommunityEventListener>();

/**
 * Suscribe un observador para reaccionar a alertas comunitarias entrantes en tiempo real.
 * @param listener Función a ejecutar cuando llega un push de alerta comunitaria
 * @returns Función de desuscripción para limpieza en useEffect
 */
export function subscribeToCommunityAlerts(listener: CommunityEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifica a todos los observadores activos cuando se recibe un evento de alerta comunitaria.
 * Llamado desde el listener global de notificaciones Push en App.tsx.
 */
export function emitCommunityAlert(data: CommunityAlertEventData): void {
  listeners.forEach((listener) => {
    try {
      listener(data);
    } catch (err) {
      console.warn('[ALERA EVENT-BUS] Error ejecutando suscriptor de alerta comunitaria:', err);
    }
  });
}
