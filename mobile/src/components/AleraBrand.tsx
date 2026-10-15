import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export interface AleraIsotypeProps {
  size?: number;
  variant?: 'color' | 'monochrome' | 'white';
}

/**
 * Isotipo Oficial de ALERA: Letra 'A' estilizada atravesada por la onda del
 * sismógrafo en el travesaño central y coronada por el pin de geolocalización.
 */
export const AleraIsotype: React.FC<AleraIsotypeProps> = ({
  size = 40,
  variant = 'color',
}) => {
  const isWhite = variant === 'monochrome' || variant === 'white';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="aleraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F06A35" />
          <Stop offset="100%" stopColor="#D93829" />
        </LinearGradient>
      </Defs>

      {/* Trazo Izquierdo de la 'A' */}
      <Path
        d="M26 82 L42 28 L51 28 L37 82 Z"
        fill={isWhite ? '#FFFFFF' : 'url(#aleraGrad)'}
      />

      {/* Trazo Derecho de la 'A' */}
      <Path
        d="M50 28 L58 28 L74 82 L63 82 Z"
        fill={isWhite ? '#FFFFFF' : 'url(#aleraGrad)'}
      />

      {/* Onda del Sismógrafo que corta y cruza la 'A' */}
      <Path
        d="M10 60 L20 60 L24 50 L27 68 L32 44 L36 74 L42 56 L47 62 L55 58 L59 70 L64 48 L68 62 L78 60 L90 60"
        stroke={isWhite ? '#FFFFFF' : '#F06A35'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pin de Ubicación en el ápice superior */}
      <G transform="translate(62, 14)">
        <Path
          d="M0 8 C0 3.5 3.5 0 8 0 C12.5 0 16 3.5 16 8 C16 13 8 22 8 22 C8 22 0 13 0 8 Z"
          fill={isWhite ? '#FFFFFF' : '#D93829'}
        />
        <Circle cx="8" cy="8" r="3.2" fill={isWhite ? '#0B0D10' : '#FFFFFF'} />
      </G>
    </Svg>
  );
};

/**
 * Logotipo Principal Completo de ALERA con tipografía de marca y subtítulos oficiales.
 */
export const AleraFullLogo: React.FC<{ size?: number }> = ({ size = 36 }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.fullLogoContainer}>
      <AleraIsotype size={size} variant="color" />
      <View style={styles.logoTextWrapper}>
        <View style={styles.mainTitleRow}>
          <Text style={[styles.titleAlera, { color: isDark ? '#FFFFFF' : '#111317' }]}>
            ALERA
          </Text>
        </View>
        <Text style={[styles.subSgc, { color: colors.seismicAccent }]}>
          CONECTADO AL SGC
        </Text>
        <Text style={[styles.subDesc, { color: colors.textSecondary }]}>
          SISMOS Y ALERTAS - COLOMBIA
        </Text>
      </View>
    </View>
  );
};

/**
 * Icono de Notificación Monocromático para Barra de Estado (Status Bar)
 * y Banners de Emergencia.
 */
export const AleraNotificationBadge: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <AleraIsotype size={size} variant="white" />
);

/**
 * Iconos de Categorías de Alerta Comunitaria según la guía oficial de marca:
 * - Derrumbe (rocas cayendo en ladera)
 * - Incendio (llama triple)
 * - Falla Estructural (edificio agrietado)
 * - Vía/Accidente (barrera de desvío con franjas)
 * - GPS (mira con retícula concéntrica)
 */
export type AleraCategoryType =
  | 'LANDSLIDE'
  | 'FIRE'
  | 'STRUCTURAL_DAMAGE'
  | 'ROAD_BLOCK'
  | 'ACCIDENT'
  | 'GPS';

export const AleraCategoryIcon: React.FC<{
  type: AleraCategoryType | string;
  size?: number;
  color?: string;
}> = ({ type, size = 22, color = '#F06A35' }) => {
  switch (type) {
    case 'LANDSLIDE':
    case 'DERRUMBES':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Ladera / Pendiente de montaña */}
          <Path d="M2 20 L14 8 L22 20 Z" fill={color} opacity={0.3} />
          <Line x1="2" y1="20" x2="16" y2="6" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          {/* Rocas desprendiéndose */}
          <Circle cx="8" cy="7" r="2.2" fill={color} />
          <Circle cx="13" cy="11" r="2.8" fill={color} />
          <Circle cx="7" cy="14" r="2" fill={color} />
          <Circle cx="18" cy="16" r="2.5" fill={color} />
        </Svg>
      );

    case 'FIRE':
    case 'INCENDIOS':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2 C12 2 15 6 15 9 C15 9.5 14.8 10 14.5 10.5 C16 11.5 17 13.2 17 15.5 C17 18.5 14.8 21 12 21 C9.2 21 7 18.5 7 15.5 C7 13 8.2 11 9.8 10 C9.5 8.5 10 6 12 2 Z"
            fill={color}
          />
          {/* Llama interior de calor intenso */}
          <Path
            d="M12 11 C12 11 13.5 13 13.5 14.5 C13.5 15.5 12.8 16.5 12 16.5 C11.2 16.5 10.5 15.5 10.5 14.5 C10.5 13 12 11 12 11 Z"
            fill="#FFFFFF"
            opacity={0.85}
          />
        </Svg>
      );

    case 'STRUCTURAL_DAMAGE':
    case 'ESTRUCTURAS':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Edificio con grieta en zigzag */}
          <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" />
          <Path
            d="M12 4 L14 9 L10 13 L13 17 L12 20"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ventanas */}
          <Rect x="6.5" y="7" width="2.5" height="2.5" fill={color} opacity={0.6} />
          <Rect x="15" y="7" width="2.5" height="2.5" fill={color} opacity={0.6} />
          <Rect x="6.5" y="14" width="2.5" height="2.5" fill={color} opacity={0.6} />
          <Rect x="15" y="14" width="2.5" height="2.5" fill={color} opacity={0.6} />
        </Svg>
      );

    case 'ROAD_BLOCK':
    case 'ACCIDENT':
    case 'ACCIDENTES':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Barrera de obra / accidente */}
          <Rect x="3" y="6" width="18" height="8" rx="1.5" stroke={color} strokeWidth="2" />
          <Line x1="7" y1="6" x2="11" y2="14" stroke={color} strokeWidth="2" />
          <Line x1="13" y1="6" x2="17" y2="14" stroke={color} strokeWidth="2" />
          {/* Patas de la barrera */}
          <Line x1="6" y1="14" x2="5" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="18" y1="14" x2="19" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'GPS':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" />
          <Circle cx="12" cy="12" r="3" fill={color} />
          <Line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="2" y1="12" x2="6" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="18" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
  }
};

/**
 * Iconos de Navegación del Tab Bar de ALERA según la guía de diseño:
 * - Mapa con pliegues y onda
 * - Alerta / Campana sísmica con ondas
 * - Comunidad / Vecinos con ondas de difusión
 * - Perfil con pulso
 */
export const AleraNavIcon: React.FC<{
  tab: 'Mapa' | 'Alertas' | 'Comunidad' | 'Perfil';
  color: string;
  size?: number;
}> = ({ tab, color, size = 22 }) => {
  switch (tab) {
    case 'Mapa':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Mapa plegado en 3 partes */}
          <Path
            d="M3 6 L9 3 L15 6 L21 3 L21 18 L15 21 L9 18 L3 21 Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Line x1="9" y1="3" x2="9" y2="18" stroke={color} strokeWidth="1.6" />
          <Line x1="15" y1="6" x2="15" y2="21" stroke={color} strokeWidth="1.6" />
          {/* Pulso sísmico central sobre el mapa */}
          <Path
            d="M6 12 L8 12 L9.5 9 L11.5 15 L13 11 L14.5 13 L17 12"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'Alertas':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Campana con badajo */}
          <Path
            d="M18 8 A6 6 0 0 0 6 8 C6 15 3 17 3 17 L21 17 C21 17 18 15 18 8 Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M10.3 20 A2 2 0 0 0 13.7 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          {/* Ondas acústicas expansivas */}
          <Path d="M2 8 C1 10 1 12 2 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M22 8 C23 10 23 12 22 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );

    case 'Comunidad':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Usuario central */}
          <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="1.8" />
          <Path d="M6 19 C6 15.5 8.7 13.5 12 13.5 C15.3 13.5 18 15.5 18 19" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          {/* Ondas de difusión vecinal */}
          <Path d="M3 11 C2 12.5 2 14.5 3 16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M21 11 C22 12.5 22 14.5 21 16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M1 9 C-0.2 11 -0.2 16 1 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.6} />
          <Path d="M23 9 C24.2 11 24.2 16 23 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.6} />
        </Svg>
      );

    case 'Perfil':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
          <Path d="M4 20 C4 16 7.5 14 12 14 C16.5 14 20 16 20 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          {/* Pulso de monitoreo en el perfil */}
          <Path d="M17 19 L18.5 17 L20 20 L21.5 18 L23 19" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
  }
};

const styles = StyleSheet.create({
  fullLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoTextWrapper: {
    justifyContent: 'center',
  },
  mainTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleAlera: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 22,
  },
  subSgc: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  subDesc: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
