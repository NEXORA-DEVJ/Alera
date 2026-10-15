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

/**
 * Activa la sirena de emergencia sonora a volumen máximo y vibración extrema en bucle.
 * Configura playsInSilentMode para sonar incluso si el switch físico del iPhone está en silencio.
 */
export async function playEmergencySiren(): Promise<void> {
  if (isSirenActive) return;
  isSirenActive = true;

  try {
    // 1. Vibración háptica de emergencia en bucle
    Vibration.vibrate([0, 800, 200, 800, 200, 1400], true);

    // 2. Sirena acústica potente
    if (expoAudioModule) {
      if (typeof expoAudioModule.setAudioModeAsync === 'function') {
        await expoAudioModule.setAudioModeAsync({
          playsInSilentMode: true,
        });
      }

      if (typeof expoAudioModule.createAudioPlayer === 'function') {
        const player = expoAudioModule.createAudioPlayer(
          require('../../assets/sounds/emergency_siren.wav')
        );
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

    // 3. Dialogo emergente para silenciar alarma
    Alert.alert(
      'ALERTA DE EMERGENCIA ACTIVA',
      'Sirena acústica de emergencia en curso a máximo volumen.',
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
  } catch (error) {
    console.warn('[ALERA SOUND] Error al emitir sirena:', error);
  }
}

/**
 * Detiene inmediatamente la sirena y cancela la vibración.
 */
export async function stopEmergencySiren(): Promise<void> {
  isSirenActive = false;
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
