import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  MapPin,
  Activity,
  Layers,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Crosshair,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../services/api';
import { getRealDeviceLocation } from '../services/location';
import { SeismicEvent } from '../types';

interface Props {
  navigation: any;
}

type DateFilter = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'ALL';
type MagFilter = 'ALL' | 'MAG_3' | 'MAG_4' | 'MAG_5';

// Calculo esferico Haversine de distancia en km
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Formato de tiempo relativo conciso
const getRelativeTime = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'Ahora';

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} d`;

  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

// Formato de fecha y hora local COT
const formatLocalTime = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const SeismicListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [magFilter, setMagFilter] = useState<MagFilter>('ALL');
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loc, seismicList] = await Promise.all([
        getRealDeviceLocation(),
        api.getRecentSeismicEvents(500),
      ]);
      if (loc) {
        setUserCoord({ latitude: loc.latitude, longitude: loc.longitude });
      }
      setEvents(seismicList || []);
    } catch (err) {
      console.warn('[ALERA SEISMIC LIST] Error cargando sismos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getRecentSeismicEvents(500);
      setEvents(data || []);
    } catch (err) {
      console.warn('[ALERA SEISMIC LIST] Error refrescando sismos:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Color de magnitud segun la escala sismica de ALERA
  const getMagnitudeColor = useCallback(
    (mag: number) => {
      if (mag >= 5.0) return colors.seismicRed;
      if (mag >= 4.0) return colors.seismicAccent;
      if (mag >= 3.0) return colors.amberAlertText;
      return colors.successGreen;
    },
    [colors]
  );

  // Clasificacion de profundidad
  const getDepthLabel = (depthKm: number): string => {
    if (depthKm < 30) return 'Superficial (< 30 km)';
    if (depthKm <= 70) return 'Intermedio (30 - 70 km)';
    return `Profundo (${Math.round(depthKm)} km)`;
  };

  // Filtrado reactivo de sismos
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    return events.filter((e) => {
      // 1. Filtro por magnitud
      if (magFilter === 'MAG_3' && e.magnitude < 3.0) return false;
      if (magFilter === 'MAG_4' && e.magnitude < 4.0) return false;
      if (magFilter === 'MAG_5' && e.magnitude < 5.0) return false;

      // 2. Filtro por fecha
      const eventTime = new Date(e.originTime).getTime();
      if (dateFilter === 'TODAY' && eventTime < startOfToday) return false;
      if (dateFilter === 'YESTERDAY' && (eventTime < startOfYesterday || eventTime >= startOfToday)) {
        return false;
      }
      if (dateFilter === 'WEEK' && eventTime < sevenDaysAgo) return false;

      // 3. Filtro por texto de busqueda con normalizacion de tildes
      if (searchQuery.trim()) {
        const query = (searchQuery || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const place = (e.epicenterDescription || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (!place.includes(query)) return false;
      }

      return true;
    });
  }, [events, dateFilter, magFilter, searchQuery]);

  // Metricas para el banner superior
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEvents = events.filter(
      (e) => new Date(e.originTime).getTime() >= startOfToday
    );
    const maxMag = events.length > 0
      ? Math.max(...events.map((e) => e.magnitude)).toFixed(1)
      : '0.0';
    const avgDepth = events.length > 0
      ? Math.round(events.reduce((acc, e) => acc + e.depthKm, 0) / events.length)
      : 0;

    return {
      todayCount: todayEvents.length,
      maxMagnitude: maxMag,
      avgDepthKm: avgDepth,
    };
  }, [events]);

  const renderEventItem = ({ item }: { item: SeismicEvent }) => {
    const magColor = getMagnitudeColor(item.magnitude);
    const relativeTime = getRelativeTime(item.originTime);
    const localTime = formatLocalTime(item.originTime);
    const distanceKm = userCoord
      ? calculateDistanceKm(userCoord.latitude, userCoord.longitude, item.latitude, item.longitude)
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('SeismicDetail', { event: item })}
      >
        <View style={styles.cardHeader}>
          {/* Badge de magnitud */}
          <View style={[styles.magBadge, { backgroundColor: magColor }]}>
            <Text style={styles.magNumber}>{item.magnitude.toFixed(1)}</Text>
            <Text style={styles.magUnit}>M</Text>
          </View>

          {/* Epicentro y detalles */}
          <View style={styles.cardMain}>
            <Text style={styles.epicenterText} numberOfLines={1}>
              {item.epicenterDescription || 'Epicentro en Colombia'}
            </Text>
            <View style={styles.cardMetaRow}>
              <View style={styles.metaItem}>
                <Clock size={11} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.metaText}>{relativeTime} ({localTime} COT)</Text>
              </View>
              <View style={styles.metaItem}>
                <Layers size={11} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.metaText}>{Math.round(item.depthKm)} km prof.</Text>
              </View>
            </View>
          </View>

          <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
        </View>

        {/* Barra inferior de la tarjeta: Distancia y Fuente */}
        <View style={styles.cardFooter}>
          {distanceKm !== null ? (
            <View style={styles.distanceBadge}>
              <MapPin size={11} color={colors.gpsBlue} strokeWidth={2} />
              <Text style={styles.distanceText}>A {distanceKm} km de tu ubicacion</Text>
            </View>
          ) : (
            <Text style={styles.sourceText}>Red Sismologica Nacional</Text>
          )}

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {item.reviewStatus === 'REVIEWED' ? 'Revisado' : 'Preliminar'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundPrimary}
      />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>SISMOS EN COLOMBIA</Text>
          <Text style={styles.headerSubtitle}>Registro Oficial en Tiempo Real</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.seismicAccent} />
          ) : (
            <RefreshCw size={18} color={colors.textSecondary} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      {/* BANNER DE METRICAS DEL DIA */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{metrics.todayCount}</Text>
          <Text style={styles.metricLabel}>Sismos Hoy</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: colors.seismicAccent }]}>
            {metrics.maxMagnitude} M
          </Text>
          <Text style={styles.metricLabel}>Mayor Magnitud</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{metrics.avgDepthKm} km</Text>
          <Text style={styles.metricLabel}>Prof. Promedio</Text>
        </View>
      </View>

      {/* BUSCADOR ACTIVO */}
      <View style={styles.searchContainer}>
        <Search size={16} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filtrar por municipio (e.g. Los Santos, Chocó)..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* CHIPS DE FILTRO POR FECHA */}
      <View style={styles.filtersScroll}>
        <TouchableOpacity
          style={[styles.filterChip, dateFilter === 'ALL' && styles.filterChipActive]}
          onPress={() => setDateFilter('ALL')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, dateFilter === 'ALL' && styles.filterChipTextActive]}>
            Todos ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, dateFilter === 'TODAY' && styles.filterChipActive]}
          onPress={() => setDateFilter('TODAY')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, dateFilter === 'TODAY' && styles.filterChipTextActive]}>
            Hoy ({metrics.todayCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, dateFilter === 'YESTERDAY' && styles.filterChipActive]}
          onPress={() => setDateFilter('YESTERDAY')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, dateFilter === 'YESTERDAY' && styles.filterChipTextActive]}>
            Ayer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, dateFilter === 'WEEK' && styles.filterChipActive]}
          onPress={() => setDateFilter('WEEK')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, dateFilter === 'WEEK' && styles.filterChipTextActive]}>
            Ultimos 7 dias
          </Text>
        </TouchableOpacity>
      </View>

      {/* CHIPS DE FILTRO POR MAGNITUD */}
      <View style={styles.magFilterRow}>
        <TouchableOpacity
          style={[styles.magPill, magFilter === 'ALL' && styles.magPillActive]}
          onPress={() => setMagFilter('ALL')}
          activeOpacity={0.7}
        >
          <Text style={[styles.magPillText, magFilter === 'ALL' && styles.magPillTextActive]}>
            Toda magnitud
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.magPill, magFilter === 'MAG_3' && styles.magPillActive]}
          onPress={() => setMagFilter('MAG_3')}
          activeOpacity={0.7}
        >
          <Text style={[styles.magPillText, magFilter === 'MAG_3' && styles.magPillTextActive]}>
            ≥ 3.0 M
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.magPill, magFilter === 'MAG_4' && styles.magPillActive]}
          onPress={() => setMagFilter('MAG_4')}
          activeOpacity={0.7}
        >
          <Text style={[styles.magPillText, magFilter === 'MAG_4' && styles.magPillTextActive]}>
            ≥ 4.0 M
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.magPill, magFilter === 'MAG_5' && styles.magPillActive]}
          onPress={() => setMagFilter('MAG_5')}
          activeOpacity={0.7}
        >
          <Text style={[styles.magPillText, magFilter === 'MAG_5' && styles.magPillTextActive]}>
            ≥ 5.0 M
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTADO PRINCIPAL */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.seismicAccent} />
          <Text style={styles.loadingText}>Cargando eventos sismicos de Colombia...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.centerBox}>
          <ShieldAlert size={36} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No hay sismos para este filtro</Text>
          <Text style={styles.emptySubtitle}>
            Prueba seleccionando otro rango de fecha o ajustando la magnitud minima.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.seismicAccent}
            />
          }
        />
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
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
    headerTitleBox: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.6,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: colors.surfaceCard,
      marginHorizontal: 16,
      borderRadius: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      marginBottom: 10,
    },
    metricCard: {
      alignItems: 'center',
      flex: 1,
    },
    metricNumber: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    metricLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '600',
      marginTop: 2,
    },
    metricDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.surfaceCardBorder,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceInput,
      marginHorizontal: 16,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      borderWidth: 1,
      borderColor: colors.surfaceInputBorder,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
      color: colors.textPrimary,
    },
    filtersScroll: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 8,
      gap: 6,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    filterChipActive: {
      backgroundColor: colors.seismicAccent,
      borderColor: colors.seismicAccent,
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    magFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 6,
    },
    magPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    magPillActive: {
      backgroundColor: colors.surfaceInput,
      borderColor: colors.seismicAccent,
    },
    magPillText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
    },
    magPillTextActive: {
      color: colors.seismicAccent,
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 10,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    magBadge: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    magNumber: {
      fontSize: 15,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 18,
    },
    magUnit: {
      fontSize: 9,
      fontWeight: '700',
      color: '#FFFFFF',
      opacity: 0.9,
    },
    cardMain: {
      flex: 1,
      marginRight: 8,
    },
    epicenterText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceCardBorder,
    },
    distanceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    distanceText: {
      fontSize: 11,
      color: colors.gpsBlue,
      fontWeight: '600',
    },
    sourceText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    statusPill: {
      backgroundColor: colors.surfaceInput,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusPillText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 12,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
