import { Vibration, Alert } from 'react-native';

// Cargador dinámico defensivo para expo-audio
let expoAudioModule: any = null;
try {
  expoAudioModule = require('expo-audio');
} catch (err) {
  console.warn('[ALERA SOUND] expo-audio no disponible:', err);
}

let activePlayer: any = null;
let isSirenActive = false;
let autoCutoffTimer: ReturnType<typeof setTimeout> | null = null;

export type SirenAlertType = 'community' | 'seismic' | 'test';

/**
 * Activa la sirena sismica oficial en bucle con vibracion haptica continua.
 * Controla con precision la duracion segun el protocolo oficial de ALERA:
 * - Alerta Comunitaria: maximo 3 segundos.
 * - Alerta Sismica: maximo 5 segundos.
 * - Modo Prueba: bucle continuo con boton de apagado manual y seguro a 10s.
 */
export async function playEmergencySiren(type: SirenAlertType = 'community'): Promise<void> {
  // Limpiar cualquier reproduccion o temporizador previo
  await stopEmergencySiren();
  isSirenActive = true;

  try {
    // 1. Patron de vibracion haptica controlada (sin bucle infinito para no trabar el hardware)
    if (type === 'community') {
      // 3 segundos de pulsos controlados sin repeticion infinita
      Vibration.vibrate([0, 500, 200, 500, 200, 500], false);
    } else if (type === 'seismic') {
      // 5 segundos de pulsos intensos controlados sin repeticion infinita
      Vibration.vibrate([0, 800, 200, 800, 200, 800, 200, 800], false);
    } else {
      // Modo prueba: pulso inicial controlado
      Vibration.vibrate([0, 600, 200, 600, 200, 600], false);
    }

    // 2. Reproduccion acustica con expo-audio
    if (expoAudioModule) {
      if (typeof expoAudioModule.setAudioModeAsync === 'function') {
        await expoAudioModule.setAudioModeAsync({
          playsInSilentMode: true,
        });
      }

      if (typeof expoAudioModule.createAudioPlayer === 'function') {
        let soundSource: any;
        try {
          soundSource = require('../../assets/sounds/emergency_siren.mp3');
        } catch {
          soundSource = null;
        }

        if (soundSource) {
          const player = expoAudioModule.createAudioPlayer(soundSource);
          player.loop = true;
          if (typeof player.setVolume === 'function') {
            player.setVolume(1.0);
          } else {
            player.volume = 1.0;
          }
          player.play();
          activePlayer = player;
        }
      }
    }

    // 3. Temporizador estricto de auto-apagado segun el tipo de evento
    if (type === 'community') {
      // Protocolo comunitario: maximo 3 segundos
      autoCutoffTimer = setTimeout(() => {
        stopEmergencySiren();
      }, 3000);
    } else if (type === 'seismic') {
      // Protocolo sismico: maximo 5 segundos
      autoCutoffTimer = setTimeout(() => {
        stopEmergencySiren();
      }, 5000);
    } else if (type === 'test') {
      // En modo prueba se muestra la alerta modal de corte manual y seguro a 10s
      autoCutoffTimer = setTimeout(() => {
        stopEmergencySiren();
      }, 10000);

      Alert.alert(
        'PRUEBA DE SIRENA ALERA',
        'Sirena acustica oficial y vibracion en ejecucion a volumen maximo.',
        [
          {
            text: 'DETENER ALARMA',
            style: 'destructive',
            onPress: () => {
              stopEmergencySiren();
            },
          },
        ],
        { cancelable: false }
      );
    }
  } catch (error) {
    console.warn('[ALERA SOUND] Error al emitir sirena:', error);
    await stopEmergencySiren();
  }
}

/**
 * Detiene inmediatamente la sirena sonora, cancela la vibracion y limpia timers.
 */
export async function stopEmergencySiren(): Promise<void> {
  isSirenActive = false;

  if (autoCutoffTimer) {
    clearTimeout(autoCutoffTimer);
    autoCutoffTimer = null;
  }

  try {
    Vibration.cancel();
    if (activePlayer) {
      if (typeof activePlayer.pause === 'function') {
        activePlayer.pause();
      }
      if (typeof activePlayer.release === 'function') {
        activePlayer.release();
      }
      activePlayer = null;
    }
  } catch (error) {
    console.warn('[ALERA SOUND] Error al detener sirena:', error);
  }
}

export function isEmergencySirenPlaying(): boolean {
  return isSirenActive;
}
