const fs = require('fs');
const path = require('path');

const inputPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/220f219c-06ba-4c1b-a86b-c1262c8379bc/.user_uploaded/uploaded_media_1792086552938.mp3';
const outputDir = path.resolve(__dirname, '../assets/sounds');
const outputPath = path.join(outputDir, 'emergency_siren.mp3');

if (!fs.existsSync(inputPath)) {
  console.error('[TRIM AUDIO] Archivo fuente no encontrado:', inputPath);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const buffer = fs.readFileSync(inputPath);
console.log(`[TRIM AUDIO] Tamaño total del audio fuente: ${buffer.length} bytes`);

// Respaldar archivo completo
fs.writeFileSync(path.join(outputDir, 'emergency_siren_full.mp3'), buffer);

// Bitrate lookup table para MPEG-1 Layer 3 (en kbps)
const bitratesMpeg1Layer3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const sampleRatesMpeg1 = [44100, 48000, 32000, 0];

let offset = 0;

// Omitir cabecera ID3v2 si está presente
if (buffer.length > 10 && buffer.toString('ascii', 0, 3) === 'ID3') {
  const id3Size = (buffer[6] << 21) | (buffer[7] << 14) | (buffer[8] << 7) | buffer[9];
  offset = 10 + id3Size;
  console.log(`[TRIM AUDIO] Cabecera ID3v2 detectada. Omitiendo ${offset} bytes.`);
}

let startOffset = offset;
let frames = [];
let accumulatedDuration = 0;
const TARGET_DURATION = 4.0; // Exactamente 4 segundos (1 ciclo completo de sirena en bucle)

while (offset < buffer.length - 4) {
  // Buscar sync word 0xFFE0
  if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
    const b1 = buffer[offset + 1];
    const b2 = buffer[offset + 2];

    const mpegVersion = (b1 >> 3) & 3; // 3 = MPEG 1
    const layer = (b1 >> 1) & 3; // 1 = Layer III

    if (mpegVersion === 3 && layer === 1) {
      const bitrateIdx = (b2 >> 4) & 15;
      const sampleRateIdx = (b2 >> 2) & 3;
      const padding = (b2 >> 1) & 1;

      const bitrateKbps = bitratesMpeg1Layer3[bitrateIdx];
      const sampleRate = sampleRatesMpeg1[sampleRateIdx];

      if (bitrateKbps > 0 && sampleRate > 0) {
        const frameSize = Math.floor((144 * bitrateKbps * 1000) / sampleRate) + padding;
        const frameDuration = 1152 / sampleRate;

        if (offset + frameSize <= buffer.length) {
          frames.push({
            start: offset,
            size: frameSize,
            duration: frameDuration,
          });

          accumulatedDuration += frameDuration;
          offset += frameSize;

          if (accumulatedDuration >= TARGET_DURATION) {
            break;
          }
          continue;
        }
      }
    }
  }
  offset++;
}

console.log(`[TRIM AUDIO] Frames encontrados: ${frames.length}, Duración calculada: ${accumulatedDuration.toFixed(2)}s`);

if (frames.length > 0) {
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  const trimmedBuffer = buffer.slice(firstFrame.start, lastFrame.start + lastFrame.size);

  fs.writeFileSync(outputPath, trimmedBuffer);
  console.log(`[TRIM AUDIO] Archivo recortado exitosamente a 4 segundos en: ${outputPath} (${trimmedBuffer.length} bytes)`);
} else {
  // Fallback seguro: tomar los primeros 4 segundos estimados por bitrate promedio (~64KB para 128kbps)
  const estimatedSize = Math.min(buffer.length, 128 * 1024 * (4 / 8));
  const trimmed = buffer.slice(0, estimatedSize);
  fs.writeFileSync(outputPath, trimmed);
  console.log(`[TRIM AUDIO] Fallback: archivo guardado con ${trimmed.length} bytes`);
}
