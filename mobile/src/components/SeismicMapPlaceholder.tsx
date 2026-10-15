import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

interface SeismicPin {
  id: string;
  magnitude: number;
  label: string;
  topPercent: number;
  leftPercent: number;
  isFocused?: boolean;
}

interface IncidentPin {
  id: string;
  type: 'LANDSLIDE' | 'FIRE' | 'ACCIDENT';
  topPercent: number;
  leftPercent: number;
  label?: string;
}

interface SeismicMapProps {
  height?: number;
  showConcentricWaves?: boolean;
  seismicPins?: SeismicPin[];
  incidentPins?: IncidentPin[];
  tooltipText?: string;
  radiusCircle?: {
    topPercent: number;
    leftPercent: number;
    radiusPx: number;
  };
  centerCityLabel?: string;
}

export const SeismicMapPlaceholder: React.FC<SeismicMapProps> = ({
  height = 300,
  showConcentricWaves = true,
  seismicPins,
  incidentPins,
  tooltipText,
  radiusCircle,
  centerCityLabel,
}) => {
  // Pines predeterminados si no se pasan explícitos (Santander y Antioquia de la imagen)
  const defaultSeismic: SeismicPin[] = [
    { id: '1', magnitude: 5.0, label: '5.0 M', topPercent: 32, leftPercent: 44, isFocused: true },
    { id: '2', magnitude: 4.1, label: '4.1 M', topPercent: 40, leftPercent: 35 },
  ];

  const pinsToRender = seismicPins || defaultSeismic;

  return (
    <View style={[styles.container, { height }]}>
      {/* Contorno Cartográfico Sutil de Colombia en SVG */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 400">
        {/* Fronteras esquemáticas de Colombia */}
        <Path
          d="M120 60 Q180 30 220 50 Q260 80 270 140 Q310 180 300 240 Q250 290 220 360 Q170 340 140 310 Q110 270 90 220 Q70 160 90 120 Z"
          fill="#11151C"
          stroke="#1E2430"
          strokeWidth="1.5"
        />
        {/* Líneas de relieve y cordilleras */}
        <Path
          d="M140 130 Q170 180 160 250 M170 110 Q200 170 200 240 M210 90 Q240 150 250 220"
          stroke="#161C26"
          strokeWidth="1.2"
          strokeDasharray="4,4"
          fill="none"
        />
      </Svg>

      {/* Ondas Concéntricas Sísmicas (Santander / Bucaramanga) */}
      {showConcentricWaves && (
        <View style={[styles.waveContainer, { top: '32%', left: '44%' }]}>
          <View style={[styles.concentricCircle, { width: 140, height: 140, borderColor: 'rgba(240, 106, 53, 0.18)' }]} />
          <View style={[styles.concentricCircle, { width: 95, height: 95, borderColor: 'rgba(240, 106, 53, 0.32)' }]} />
          <View style={[styles.concentricCircle, { width: 55, height: 55, borderColor: 'rgba(240, 106, 53, 0.65)' }]} />
          <View style={[styles.concentricCircle, { width: 22, height: 22, backgroundColor: colors.seismicRed, borderColor: colors.seismicAccent }]} />
        </View>
      )}

      {/* Círculo de Radio de Cobertura PostGIS (Pantalla de Ajustes) */}
      {radiusCircle && (
        <View
          style={[
            styles.radiusCircle,
            {
              top: `${radiusCircle.topPercent}%`,
              left: `${radiusCircle.leftPercent}%`,
              width: radiusCircle.radiusPx * 2,
              height: radiusCircle.radiusPx * 2,
              marginLeft: -radiusCircle.radiusPx,
              marginTop: -radiusCircle.radiusPx,
            },
          ]}
        >
          {/* Nodo central */}
          <View style={styles.centerGpsDot} />
          {/* Nodo blanco de ajuste en el borde */}
          <View style={styles.radiusHandleDot} />
        </View>
      )}

      {/* Renderizado de Pines Sísmicos */}
      {pinsToRender.map((pin) => (
        <View
          key={pin.id}
          style={[
            styles.pinWrapper,
            { top: `${pin.topPercent}%`, left: `${pin.leftPercent}%` },
          ]}
        >
          <View style={[styles.badgeMagnitude, pin.isFocused && styles.badgeMagnitudeFocused]}>
            <Text style={styles.badgeMagnitudeText}>{pin.label}</Text>
          </View>
          <View style={[styles.pinDot, pin.isFocused && styles.pinDotFocused]} />
        </View>
      ))}

      {/* Renderizado de Pines Comunitarios */}
      {incidentPins &&
        incidentPins.map((inc) => {
          let dotColor = '#EAB308'; // Amarillo derrumbe
          if (inc.type === 'FIRE') dotColor = colors.seismicRed;
          if (inc.type === 'ACCIDENT') dotColor = '#FFFFFF';

          return (
            <View
              key={inc.id}
              style={[
                styles.incidentPin,
                { top: `${inc.topPercent}%`, left: `${inc.leftPercent}%` },
              ]}
            >
              <View style={[styles.incidentCircle, { backgroundColor: dotColor }]}>
                <View style={styles.incidentInnerDot} />
              </View>
            </View>
          );
        })}

      {/* Tooltip Blanco Centrado (Pantalla de Alertas Comunitarias) */}
      {tooltipText && (
        <View style={styles.tooltipBox}>
          <Text style={styles.tooltipText}>{tooltipText}</Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}

      {/* Etiqueta de Ciudad Central (e.g. Bucaramanga, Bogotá) */}
      {centerCityLabel && (
        <View style={styles.cityLabelBadge}>
          <Text style={styles.cityLabelText}>{centerCityLabel}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.backgroundPrimary,
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceCardBorder,
  },
  waveContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -70 }, { translateY: -70 }],
  },
  concentricCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  radiusCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.gpsBlueFill,
    borderWidth: 1.5,
    borderColor: colors.gpsBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gpsBlue,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  radiusHandleDot: {
    position: 'absolute',
    right: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.gpsBlue,
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  badgeMagnitude: {
    backgroundColor: colors.seismicAccent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  badgeMagnitudeFocused: {
    backgroundColor: colors.seismicRed,
  },
  badgeMagnitudeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.seismicAccent,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pinDotFocused: {
    backgroundColor: colors.seismicRed,
  },
  incidentPin: {
    position: 'absolute',
  },
  incidentCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#181B20',
  },
  incidentInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#111315',
  },
  tooltipBox: {
    position: 'absolute',
    top: '38%',
    left: '20%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  tooltipText: {
    color: '#111315',
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 5,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  cityLabelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(24, 27, 32, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.surfaceCardBorder,
  },
  cityLabelText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});