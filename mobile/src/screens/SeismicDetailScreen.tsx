import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import {
  ArrowLeft,
  Share2,
  AlertTriangle,
  MapPin,
  Clock,
  Layers,
  Activity,
  Compass,
  Radio,
  CheckCircle2,
  Calendar,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { SeismicEvent } from '../types';

interface Props {
  navigation: any;
  route: {
    params?: {
      event?: SeismicEvent;
    };
  };
}

export const SeismicDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const event = route.params?.event;
  const [reportedPerception, setReportedPerception] = useState<boolean>(false);

  if (!event) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.backgroundPrimary} />
        <Text style={styles.emptyTitle}>Sismo no seleccionado</Text>
        <Text style={styles.emptySubtitle}>
          Selecciona un sismo real desde el mapa para consultar su ficha técnica.
        </Text>
        <View style={styles.emptyCta}>
          <PrimaryButton title="Volver al Mapa" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const getMagnitudeColor = (mag: number): string => {
    if (mag >= 5.0) return colors.seismicRed;
    if (mag >= 4.0) return colors.seismicAccent;
    return colors.amberAlertText;
  };

  const handleReportPerception = () => {
    setReportedPerception(true);
    Alert.alert(
      'Percepción Registrada',
      'Gracias por colaborar con la Red Comunitaria Alera y el Servicio Geológico Colombiano.',
      [{ text: 'Aceptar' }]
    );
  };

  const magColor = getMagnitudeColor(event.magnitude);
  const pWaveTime = Math.max(5, Math.round(event.depthKm / 6.5));
  const sWaveTime = Math.max(10, Math.round(event.depthKm / 3.8));

  // Formato completo de fecha (ej: "14 de octubre de 2026")
  const formatFullDate = (isoString?: string): string => {
    if (!isoString) return 'Fecha no disponible';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Fecha no disponible';
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formato de hora legal colombiana (ej: "15:34:46 COT")
  const formatLegalTime = (isoString?: string): string => {
    if (!isoString) return 'Hora no disponible';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Hora no disponible';
    return (
      date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' COT'
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.backgroundPrimary} />

      {/* TOP APP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Detalle Sísmico SGC</Text>

        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert('Compartir', `Sismo Magnitud ${event.magnitude.toFixed(1)} en ${event.epicenterDescription}`)
          }
        >
          <Share2 size={18} color={colors.textSecondary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
      >
        {/* MAPA NATIVO CON EPICENTRO REAL */}
        <View style={styles.mapCard}>
          <MapErrorBoundary fallbackMessage="Epicentro registrado en la Red Sismológica Nacional.">
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: event.latitude,
                longitude: event.longitude,
                latitudeDelta: 1.5,
                longitudeDelta: 1.5,
              }}
              userInterfaceStyle={isDark ? 'dark' : 'light'}
            >
              <Circle
                center={{ latitude: event.latitude, longitude: event.longitude }}
                radius={event.magnitude * 18000}
                fillColor="rgba(240, 106, 53, 0.18)"
                strokeColor={colors.seismicAccent}
                strokeWidth={1.5}
              />
              <Marker coordinate={{ latitude: event.latitude, longitude: event.longitude }}>
                <View style={[styles.markerBadge, { backgroundColor: magColor }]}>
                  <Text style={styles.markerText}>{event.magnitude.toFixed(1)} M</Text>
                </View>
              </Marker>
            </MapView>
          </MapErrorBoundary>
          <View style={styles.epicenterPill}>
            <MapPin size={12} color={colors.seismicAccent} strokeWidth={2} />
            <Text style={styles.epicenterPillText}>Epicentro Registrado</Text>
          </View>
        </View>

        {/* MAIN MAGNITUDE HERO BANNER */}
        <View style={styles.heroBanner}>
          <View style={[styles.heroMagnitudeTag, { backgroundColor: magColor }]}>
            <Text style={styles.heroMagnitudeVal}>{event.magnitude.toFixed(1)}</Text>
            <Text style={styles.heroMagnitudeUnit}>M</Text>
          </View>
          <View style={styles.heroDetails}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {event.epicenterDescription}
            </Text>
            <Text style={styles.heroSubtitle}>
              {formatFullDate(event.originTime)} • {formatLegalTime(event.originTime)}
            </Text>
          </View>
        </View>

        {/* 2x2 METRIC SPEC GRID CON FECHA Y HORA COMPLETAS */}
        <View style={styles.metricGrid}>
          {/* Card 1: Magnitud */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <Activity size={16} color={magColor} strokeWidth={2} />
              <Text style={styles.metricLabel}>MAGNITUD</Text>
            </View>
            <Text style={styles.metricValue}>{event.magnitude.toFixed(1)} M</Text>
            <Text style={styles.metricSub}>Escala de Magnitud</Text>
          </View>

          {/* Card 2: Profundidad */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <Layers size={16} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.metricLabel}>PROFUNDIDAD</Text>
            </View>
            <Text style={styles.metricValue}>{event.depthKm.toFixed(0)} km</Text>
            <Text style={styles.metricSub}>
              {event.depthKm > 70 ? 'Sismo Intermedio' : 'Sismo Superficial'}
            </Text>
          </View>

          {/* Card 3: Hora Legal de Origen + Fecha */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <Clock size={16} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.metricLabel}>HORA ORIGEN</Text>
            </View>
            <Text style={styles.metricValue}>{formatLegalTime(event.originTime)}</Text>
            <Text style={[styles.metricSub, { color: colors.seismicAccent, fontWeight: '600' }]}>
              {formatFullDate(event.originTime)}
            </Text>
          </View>

          {/* Card 4: Coordenadas GPS */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <Compass size={16} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.metricLabel}>COORDENADAS</Text>
            </View>
            <Text style={styles.metricValue}>
              {event.latitude.toFixed(2)}°N, {Math.abs(event.longitude).toFixed(2)}°W
            </Text>
            <Text style={styles.metricSub}>Red Sismológica SGC</Text>
          </View>
        </View>

        {/* FECHA Y ESTADO OFICIAL CARD */}
        <View style={styles.dateInfoCard}>
          <View style={styles.dateIconWrapper}>
            <Calendar size={18} color={colors.seismicAccent} strokeWidth={2} />
          </View>
          <View style={styles.dateInfoTextCol}>
            <Text style={styles.dateInfoTitle}>Fecha del Acontecimiento</Text>
            <Text style={styles.dateInfoBody}>
              {formatFullDate(event.originTime)} a las {formatLegalTime(event.originTime)}
            </Text>
            <Text style={styles.dateInfoSub}>
              Fuente: {event.source} • Estado de revisión: {event.reviewStatus}
            </Text>
          </View>
        </View>

        {/* AMBER ALERT BOX */}
        <View style={styles.amberAlertBox}>
          <View style={styles.amberHeaderRow}>
            <AlertTriangle size={18} color={colors.amberAlertText} strokeWidth={2} />
            <Text style={styles.amberTitle}>
              {event.magnitude >= 4.5 ? 'ALERTA DE SACUDIDA REGIONAL' : 'REPORTE DE PERCEPCIÓN'}
            </Text>
          </View>
          <Text style={styles.amberBody}>
            {event.magnitude >= 4.5
              ? `Sismo de magnitud moderada/alta en ${event.epicenterDescription}. Si percibiste el movimiento sísmico, conserva la calma y reporta tu condición a la red de Alera.`
              : `Sismo instrumental registrado en ${event.epicenterDescription}. La red comunitaria continúa monitoreando réplicas asociadas.`}
          </Text>
        </View>

        {/* PROPAGATION CARD */}
        <View style={styles.propagationCard}>
          <View style={styles.propHeader}>
            <Radio size={16} color={colors.gpsBlue} strokeWidth={1.8} />
            <Text style={styles.propTitle}>Propagación Sísmica Calculada</Text>
          </View>
          <Text style={styles.propText}>
            • <Text style={styles.boldWhite}>Onda P (Primaria/Compresión):</Text> Arribo aproximado a superficie en {pWaveTime}s (~6.5 km/s).
          </Text>
          <Text style={styles.propText}>
            • <Text style={styles.boldWhite}>Onda S (Secundaria/Cizalla):</Text> Sacudida oscilatoria principal en {sWaveTime}s (~3.8 km/s).
          </Text>
        </View>

        {/* PERCEPTION BUTTON */}
        <View style={styles.ctaWrapper}>
          {reportedPerception ? (
            <View style={styles.confirmedPill}>
              <CheckCircle2 size={18} color={colors.successGreen} strokeWidth={2} />
              <Text style={styles.confirmedText}>Tu percepción ha sido registrada</Text>
            </View>
          ) : (
            <PrimaryButton
              title="¿Lo sentiste? Reportar percepción"
              onPress={handleReportPerception}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
    },
    emptyContainer: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    emptyCta: {
      width: '100%',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    mapCard: {
      height: 200,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: 16,
      backgroundColor: isDark ? '#11151C' : '#E2E8F0',
    },
    markerBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      elevation: 5,
    },
    markerText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 11,
    },
    epicenterPill: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(24, 27, 32, 0.9)' : 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    epicenterPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    heroBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      gap: 14,
    },
    heroMagnitudeTag: {
      width: 60,
      height: 60,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroMagnitudeVal: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 22,
      lineHeight: 26,
    },
    heroMagnitudeUnit: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 11,
    },
    heroDetails: {
      flex: 1,
    },
    heroTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    metricCard: {
      width: '48%',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 14,
    },
    metricIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.6,
    },
    metricValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    metricSub: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    dateInfoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 12,
      marginBottom: 16,
    },
    dateIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? '#261710' : '#FFEDD5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateInfoTextCol: {
      flex: 1,
    },
    dateInfoTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    dateInfoBody: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.seismicAccent,
      marginBottom: 2,
    },
    dateInfoSub: {
      fontSize: 11,
      color: colors.textMuted,
    },
    amberAlertBox: {
      backgroundColor: colors.amberAlertBg,
      borderWidth: 1,
      borderColor: colors.amberAlertBorder,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },
    amberHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    amberTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.amberAlertText,
      letterSpacing: 0.6,
    },
    amberBody: {
      fontSize: 13,
      lineHeight: 19,
      color: isDark ? '#F0D4A8' : '#78350F',
      fontWeight: '500',
    },
    propagationCard: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
    },
    propHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    propTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    propText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    boldWhite: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    ctaWrapper: {
      marginTop: 4,
    },
    confirmedPill: {
      height: 48,
      borderRadius: 999,
      backgroundColor: 'rgba(52, 199, 89, 0.15)',
      borderWidth: 1,
      borderColor: colors.successGreen,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    confirmedText: {
      color: colors.successGreen,
      fontWeight: '700',
      fontSize: 14,
    },
  });