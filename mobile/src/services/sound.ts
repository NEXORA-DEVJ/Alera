import { Vibration } from 'react-native';
import { Asset } from 'expo-asset';

// Cargador defensivo para expo-audio
let expoAudioModule: any = null;
try {
  expoAudioModule = require('expo-audio');
} catch (err) {
  console.warn('[ALERA SOUND] expo-audio no disponible:', err);
}

// Conjunto de todos los reproductores creados para garantizar que NINGUNO quede huérfano
const activePlayers = new Set<any>();
let isSirenActive = false;
let autoCutoffTimer: ReturnType<typeof setTimeout> | null = null;
let preloadedSoundUri: string | null = null;
let lastSirenStartTime = 0;

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
 * Activa la sirena sísmica oficial con vibración háptica controlada.
 * Protocolo de duración estricta ALERA:
 * - Alerta Comunitaria: máximo 3 segundos.
 * - Alerta Sísmica: máximo 5 segundos.
 * - Modo Prueba: máximo 10 segundos.
 */
export async function playEmergencySiren(type: SirenAlertType = 'community'): Promise<void> {
  const now = Date.now();
  // Anti-rebote: si ya está sonando una sirena hace menos de 2.5 segundos,
  // no reiniciar ni sobreponer otro reproductor para evitar choques acústicos
  if (isSirenActive && now - lastSirenStartTime < 2500) {
    return;
  }
  lastSirenStartTime = now;

  // Detener y liberar absolutamente todos los reproductores previos
  await stopEmergencySiren();
  isSirenActive = true;

  try {
    // 1. Patrón de vibración háptica controlada
    if (type === 'community') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], false);
    } else if (type === 'seismic') {
      Vibration.vibrate([0, 800, 200, 800, 200, 800, 200, 800], false);
    } else {
      Vibration.vibrate([0, 600, 200, 600, 200, 600], true);
    }

    // 2. Reproducción acústica con expo-audio
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
        console.warn('[ALERA SOUND] Ajuste de modo de audio:', modeErr);
      }

      if (typeof expoAudioModule.createAudioPlayer === 'function') {
        const soundUri = await getPreloadedSirenUri();

        // Verificar que la sirena no haya sido cancelada mientras resolvía el archivo
        if (soundUri && isSirenActive) {
          const player = expoAudioModule.createAudioPlayer({ uri: soundUri });
          player.loop = true;

          if (typeof player.setVolume === 'function') {
            player.setVolume(1.0);
          } else {
            player.volume = 1.0;
          }

          activePlayers.add(player);
          player.play();
        }
      }
    }

    // 3. Temporizador estricto de auto-apagado con corte garantizado
    const durationMs = type === 'community' ? 3000 : type === 'seismic' ? 5000 : 10000;
    autoCutoffTimer = setTimeout(() => {
      stopEmergencySiren();
    }, durationMs);
  } catch (error) {
    console.warn('[ALERA SOUND] Error al emitir sirena:', error);
    await stopEmergencySiren();
  }
}

/**
 * Detiene inmediatamente la sirena sonora, cancela la vibración y libera todos los reproductores.
 */
export async function stopEmergencySiren(): Promise<void> {
  isSirenActive = false;

  if (autoCutoffTimer) {
    clearTimeout(autoCutoffTimer);
    autoCutoffTimer = null;
  }

  try {
    Vibration.cancel();

    // Detener y liberar TODOS los reproductores registrados
    for (const player of activePlayers) {
      try {
        if (typeof player.pause === 'function') {
          player.pause();
        }
        if (typeof player.remove === 'function') {
          player.remove();
        }
      } catch {}
    }
    activePlayers.clear();
  } catch (error) {
    console.warn('[ALERA SOUND] Error al detener sirena:', error);
  }
}

export function isEmergencySirenPlaying(): boolean {
  return isSirenActive;
}
