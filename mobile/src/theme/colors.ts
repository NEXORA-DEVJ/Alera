// Paleta de Colores en Modo Oscuro (Predeterminado)
export const darkColors = {
  // Fondos y Superficies
  backgroundPrimary: '#0D0F12',
  surfaceCard: '#181B20',
  surfaceCardBorder: '#2A2E37',
  surfaceInput: '#1E2229',
  surfaceInputBorder: '#2E333D',

  // Botón Principal CTA (Crema / Hueso)
  ctaPrimary: '#EDEDEA',
  ctaPrimaryText: '#111315',

  // Colores de Acento Sísmico
  seismicAccent: '#F06A35',
  seismicRed: '#D93829',

  // Estados y Confirmación
  successGreen: '#34C759',

  // Alerta Ámbar
  amberAlertBg: '#2C2212',
  amberAlertBorder: '#5E471F',
  amberAlertText: '#F5A623',

  // GPS y Radio de Cobertura
  gpsBlue: '#3B82F6',
  gpsBlueFill: 'rgba(59, 130, 246, 0.22)',

  // Tipografía
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
};

// Paleta de Colores en Modo Claro / Blanco
export const lightColors = {
  // Fondos y Superficies (Blanco puro y gris claro elegante)
  backgroundPrimary: '#F8F9FA',
  surfaceCard: '#FFFFFF',
  surfaceCardBorder: '#E5E7EB',
  surfaceInput: '#F3F4F6',
  surfaceInputBorder: '#D1D5DB',

  // Botón Principal CTA
  ctaPrimary: '#111827',
  ctaPrimaryText: '#FFFFFF',

  // Colores de Acento Sísmico
  seismicAccent: '#EA580C',
  seismicRed: '#DC2626',

  // Estados y Confirmación
  successGreen: '#16A34A',

  // Alerta Ámbar
  amberAlertBg: '#FEF3C7',
  amberAlertBorder: '#FCD34D',
  amberAlertText: '#D97706',

  // GPS y Radio de Cobertura
  gpsBlue: '#2563EB',
  gpsBlueFill: 'rgba(37, 99, 235, 0.15)',

  // Tipografía
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
};

export const colors = darkColors;
export type ThemeColors = typeof darkColors;