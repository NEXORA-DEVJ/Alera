import { Vibration } from 'react-native';
import { Asset } from 'expo-asset';

// Cargador defensivo para expo-audio
let expoAudioModule: any = null;
try {
  expoAudioModule = require('expo-audio');
} catch (err) {
  console.warn('[ALERA SOUND] expo-audio no disponible:', err);
}

let activePlayer: any = null;
let isSirenActive = false;
let autoCutoffTimer: ReturnType<typeof setTimeout> | null = null;
let preloadedSoundUri: string | null = null;

export type SirenAlertType = 'community' | 'seismic' | 'test';

/**
 * Precarga y descarga en almacenamiento local el audio de la sirena oficial de ALERA.
 * Garantiza que el reproductor nativo (ExoPlayer en Android / AVPlayer en iOS)
 * acceda de inmediato a un archivo local file:/// sin depender de descargas HTTP remotas ni túneles.
 */
async function getPreloadedSirenUri(): Promise<string | null> {
  if (preloadedSoundUri) {
    return preloadedSoundUri;
  }

  try {
    const sirenAsset = Asset.fromModule(require('../../assets/sounds/emergency_siren.mp3'));
    if (!sirenAsset.localUri) {
      await sirenAsset.downloadAsync();
    }
    const resolvedUri = sirenAsset.localUri || sirenAsset.uri;
    if (resolvedUri) {
      preloadedSoundUri = resolvedUri;
      return resolvedUri;
    }
  } catch (assetErr) {
    console.warn('[ALERA SOUND] Error al precargar audio:', assetErr);
  }

  return null;
}

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
    // 1. Patron de vibracion haptica controlada
    if (type === 'community') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], false);
    } else if (type === 'seismic') {
      Vibration.vibrate([0, 800, 200, 800, 200, 800, 200, 800], false);
    } else {
      Vibration.vibrate([0, 600, 200, 600, 200, 600], true);
    }

    // 2. Reproduccion acustica con expo-audio
    if (expoAudioModule) {
      try {
        if (typeof expoAudioModule.setIsAudioActiveAsync === 'function') {
          await expoAudioModule.setIsAudioActiveAsync(true);
        }
        if (typeof expoAudioModule.setAudioModeAsync === 'function') {
          await expoAudioModule.setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'duckOthers',
          });
        }
      } catch (modeErr) {
        console.warn('[ALERA SOUND] Ajuste de modo de audio diferido:', modeErr);
      }

      if (typeof expoAudioModule.createAudioPlayer === 'function') {
        const soundUri = await getPreloadedSirenUri();

        if (soundUri && isSirenActive) {
          const player = expoAudioModule.createAudioPlayer({ uri: soundUri });
          player.loop = true;

          if (typeof player.setVolume === 'function') {
            player.setVolume(1.0);
          } else {
            player.volume = 1.0;
          }

          // Iniciar reproduccion
          player.play();

          // Respaldo reactivo: si el reproductor tarda en cargarse en memoria, re-activar play al estar listo
          if (typeof player.addListener === 'function') {
            player.addListener('playbackStatusUpdate', (status: any) => {
              if (isSirenActive && status && !status.playing && status.isLoaded && !status.isBuffering) {
                try {
                  player.play();
                } catch {}
              }
            });
          }

          activePlayer = player;
        }
      }
    }

    // 3. Temporizador estricto de auto-apagado segun el tipo de evento
    if (type === 'community') {
      autoCutoffTimer = setTimeout(() => {
        stopEmergencySiren();
      }, 3000);
    } else if (type === 'seismic') {
      autoCutoffTimer = setTimeout(() => {
        stopEmergencySiren();
      }, 5000);
    } else if (type === 'test') {
      autoCutoffTimer = setTimeout(() => {
        stopEmergencySiren();
      }, 10000);
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
      if (typeof activePlayer.remove === 'function') {
        activePlayer.remove();
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
