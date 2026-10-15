const fs = require('fs');
const path = require('path');

// Generador de Sirena Sísmica de Emergencia ALERA en formato WAV (PCM 16-bit 44.1kHz)
// Produce una sirena oscilante de alta potencia (750 Hz a 1350 Hz) con armónicos de alerta sísmica

const sampleRate = 44100;
const durationSeconds = 3.6; // Duración de un ciclo continuo de sirena
const totalSamples = Math.floor(sampleRate * durationSeconds);
const numChannels = 1;
const bytesPerSample = 2; // 16-bit
const blockAlign = numChannels * bytesPerSample;
const byteRate = sampleRate * blockAlign;
const dataSize = totalSamples * blockAlign;

const buffer = Buffer.alloc(44 + dataSize);

// Header RIFF WAV
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // SubChunk1Size (PCM = 16)
buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM = 1)
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // BitsPerSample
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Generación de onda de sirena de emergencia
let phase = 0;
for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  
  // Modulación de frecuencia tipo sirena sísmica (oscila entre 700 Hz y 1350 Hz cada 1.2 segundos)
  const cycleTime = 1.2;
  const modProgress = (t % cycleTime) / cycleTime;
  // Curva triangular suave de ascenso y descenso
  const modulation = modProgress < 0.5 ? modProgress * 2 : (1 - modProgress) * 2;
  const currentFreq = 720 + modulation * 600; // 720 Hz a 1320 Hz
  
  phase += (2 * Math.PI * currentFreq) / sampleRate;
  
  // Tono principal + armónico de resonancia para máxima penetración auditiva
  const primaryTone = Math.sin(phase);
  const harmonicTone = Math.sin(phase * 1.5) * 0.35;
  const rawSample = (primaryTone + harmonicTone) / 1.35;
  
  // Escalado a 16-bit con volumen máximo (amplitud 31000 de 32767)
  const sample16 = Math.max(-32767, Math.min(32767, Math.floor(rawSample * 31500)));
  buffer.writeInt16LE(sample16, 44 + i * 2);
}

const outputDir = path.join(__dirname, '..', 'assets', 'sounds');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'emergency_siren.wav');
fs.writeFileSync(outputPath, buffer);

console.log('Sirena sísmica generada exitosamente en:', outputPath);
console.log('Tamaño del archivo:', (buffer.length / 1024).toFixed(1), 'KB');
