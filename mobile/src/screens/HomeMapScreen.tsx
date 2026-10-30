import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import {
  Activity,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Crosshair,
  Radio,
  MapPin,
  Clock,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Navigation,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { AleraFullLogo } from '../components/AleraBrand';
import { api, generateUUID } from '../services/api';
import { getRealDeviceLocation } from '../services/location';
import { SeismicEvent } from '../types';

interface Props {
  navigation: any;
}

// Cálculo esférico Haversine de distancia en km entre el GPS del usuario y el epicentro
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radio de la Tierra en km
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

// Formato de tiempo relativo elegante ("Hace 12 min", "Hace 2 h", "Ayer")
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

// Formato conciso de fecha y hora que no satura el ancho de la tarjeta
const formatConciseDateTime = (isoString?: string): string => {
  if (!isoString) return 'Fecha n/d';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Fecha n/d';

  const dayMonth = date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });
  const time = date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${dayMonth} • ${time} COT`;
};

export const HomeMapScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchingCity, setSearchingCity] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Control para mostrar u ocultar el radio de afectación
  const [showRadius, setShowRadius] = useState<boolean>(true);

  // Ubicación GPS real del celular
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  // Actualización automática al enfocar pantalla
  useFocusEffect(
    useCallback(() => {
      loadRecentEvents();
    }, [])
  );

  useEffect(() => {
    initScreen();
  }, []);

  const initScreen = async () => {
    const loc = await getRealDeviceLocation();
    if (loc) {
      setUserCoord({ latitude: loc.latitude, longitude: loc.longitude });
      mapRef.current?.animateToRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 3.5,
        longitudeDelta: 3.5,
      });

      // Reportar ubicación a Redis para el cálculo de alertas
      try {
        let devId = await AsyncStorage.getItem('@alera_device_id');
        if (!devId) {
          devId = generateUUID();
          await AsyncStorage.setItem('@alera_device_id', devId);
        }
        api.updateLocation(devId, loc.latitude, loc.longitude).catch(() => {});
      } catch {}
    }
    await loadRecentEvents();
  };

  const loadRecentEvents = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await api.getRecentSeismicEvents(500);
      setEvents(data || []);
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch {
      setErrorMessage('No fue posible conectar con el servidor de Alera (Spring Boot).');
    } finally {
      setLoading(false);
    }
  };

  // Buscador activo de municipios en Colombia
  const handleSearchCity = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchingCity(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=co&limit=1&q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'AleraApp/1.0' } });
      const places = await res.json();

      if (places && places.length > 0) {
        const lat = parseFloat(places[0].lat);
        const lon = parseFloat(places[0].lon);
        mapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.6,
          longitudeDelta: 0.6,
        });
      }
    } catch {
      // Ignorar
    } finally {
      setSearchingCity(false);
    }
  };

  const getMagnitudeColor = (mag: number): string => {
    if (mag >= 5.0) return colors.seismicRed;
    if (mag >= 4.0) return colors.seismicAccent;
    if (mag >= 3.0) return colors.amberAlertText;
    return colors.successGreen;
  };

  // Filtro de temporalidad: 'TODAY' (ultimas 24 horas) o 'ALL' (todos los recientes)
  const [timeFilter, setTimeFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const todayEventsCount = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      const eventTime = new Date(e.originTime).getTime();
      return now - eventTime <= ONE_DAY_MS;
    }).length;
  }, [events]);

  const normalizeSearchText = (text: string): string =>
    (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const query = normalizeSearchText(searchQuery);

    return events.filter((e) => {
      // Normalización fonética y de tildes para búsqueda de municipios colombianos
      if (query.length > 0) {
        const desc = normalizeSearchText(e.epicenterDescription);
        if (!desc.includes(query)) {
          return false;
        }
        // Al buscar una ciudad específica, mostrar todas las coincidencias disponibles
        return true;
      }

      if (timeFilter === 'TODAY') {
        const eventTime = new Date(e.originTime).getTime();
        return now - eventTime <= ONE_DAY_MS;
      }
      return true;
    });
  }, [events, searchQuery, timeFilter]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.backgroundPrimary} />

      {/* 1. TOP HEADER BRAND CON TOGGLE DE TEMA */}
      <View style={styles.header}>
        <AleraFullLogo size={36} />

        <View style={styles.headerActionsRow}>
          {/* Botón de Cambio de Tema (Oscuro / Blanco) */}
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityLabel="Cambiar tema"
          >
            {isDark ? (
              <Sun size={19} color={colors.textPrimary} strokeWidth={1.8} />
            ) : (
              <Moon size={19} color={colors.textPrimary} strokeWidth={1.8} />
            )}
          </TouchableOpacity>

          {/* Botón de Ajustes Rápidos */}
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('AlertSettings')}
            activeOpacity={0.8}
            accessibilityLabel="Configuración de alertas"
          >
            <Radio size={19} color={colors.textSecondary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SEARCH / FILTER BAR ACTIVO */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color={colors.textMuted} strokeWidth={1.8} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar municipio o ciudad de Colombia..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchCity}
            returnKeyType="search"
          />
          {searchingCity ? (
            <ActivityIndicator size="small" color={colors.seismicAccent} />
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={handleSearchCity}>
              <SlidersHorizontal size={18} color={colors.textSecondary} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2.1 SELECTOR DE TEMPORALIDAD DEL MAPA (SISMOS DE HOY VS HISTORIAL) */}
      <View style={styles.timeFilterRow}>
        <TouchableOpacity
          style={[
            styles.timeFilterChip,
            timeFilter === 'TODAY' && styles.timeFilterChipActive,
          ]}
          onPress={() => setTimeFilter('TODAY')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.timeFilterDot,
              { backgroundColor: timeFilter === 'TODAY' ? colors.seismicAccent : colors.textMuted },
            ]}
          />
          <Text
            style={[
              styles.timeFilterText,
              timeFilter === 'TODAY' && styles.timeFilterTextActive,
            ]}
          >
            Hoy (24h): {todayEventsCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.timeFilterChip,
            timeFilter === 'ALL' && styles.timeFilterChipActive,
          ]}
          onPress={() => setTimeFilter('ALL')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.timeFilterText,
              timeFilter === 'ALL' && styles.timeFilterTextActive,
            ]}
          >
            Todos ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyLinkButton}
          onPress={() => navigation.navigate('SeismicList')}
          activeOpacity={0.7}
        >
          <Text style={styles.historyLinkText}>Ver Lista</Text>
          <ChevronRight size={14} color={colors.seismicAccent} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* 3. NATIVE MAP CONTAINER */}
      <View style={styles.mapContainer}>
        <MapErrorBoundary fallbackMessage="El mapa interactivo requiere soporte de servicios de localización. Los sismos recientes se listan abajo.">
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: userCoord ? userCoord.latitude : 4.5709,
              longitude: userCoord ? userCoord.longitude : -74.2973,
              latitudeDelta: 6.0,
              longitudeDelta: 6.0,
            }}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            {userCoord && (
              <Marker coordinate={userCoord} title="Tu Ubicación Real">
                <View style={styles.userLocationGpsDot} />
              </Marker>
            )}

            {filteredEvents.map((e) => {
              const magColor = getMagnitudeColor(e.magnitude);

              return (
                <React.Fragment key={e.id}>
                  {/* Radio de Afectación Condicional */}
                  {showRadius && e.magnitude >= 4.0 && (
                    <Circle
                      center={{ latitude: e.latitude, longitude: e.longitude }}
                      radius={e.magnitude * 16000}
                      fillColor="rgba(240, 106, 53, 0.15)"
                      strokeColor={colors.seismicAccent}
                      strokeWidth={1.5}
                    />
                  )}
                  <Marker
                    coordinate={{ latitude: e.latitude, longitude: e.longitude }}
                    onPress={() => {
                      setSelectedEventId(e.id);
                      navigation.navigate('SeismicDetail', { event: e });
                    }}
                  >
                    <View style={[styles.markerBadge, { backgroundColor: magColor }]}>
                      <Text style={styles.markerText}>{e.magnitude.toFixed(1)} M</Text>
                    </View>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapView>
        </MapErrorBoundary>

        {/* Botón flotante: Mostrar / Ocultar Radio de Afectación */}
        <TouchableOpacity
          style={styles.radiusToggleButton}
          onPress={() => setShowRadius(!showRadius)}
          activeOpacity={0.8}
        >
          {showRadius ? (
            <Eye size={16} color={colors.seismicAccent} strokeWidth={2} />
          ) : (
            <EyeOff size={16} color={colors.textMuted} strokeWidth={2} />
          )}
          <Text style={[styles.radiusToggleText, showRadius && { color: colors.seismicAccent }]}>
            {showRadius ? 'Radio Visible' : 'Radio Oculto'}
          </Text>
        </TouchableOpacity>

        {/* Botón GPS */}
        <TouchableOpacity
          style={styles.gpsRecenterButton}
          activeOpacity={0.8}
          onPress={async () => {
            const loc = await getRealDeviceLocation();
            if (loc) {
              setUserCoord({ latitude: loc.latitude, longitude: loc.longitude });
              mapRef.current?.animateToRegion({
                latitude: loc.latitude,
                longitude: loc.longitude,
                latitudeDelta: 2.0,
                longitudeDelta: 2.0,
              });
            }
            loadRecentEvents();
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Crosshair size={20} color={colors.textPrimary} strokeWidth={1.8} />
          )}
        </TouchableOpacity>
      </View>

      {/* 4. RECENT EVENTS CARDS CON ESTILO MINIMALISTA "MI TERREMOTO" */}
      <View style={styles.eventsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>SISMOS RECIENTES</Text>
            <Text style={styles.sectionBadge}>SGC REAL ({events.length})</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllRow}
            onPress={() => navigation.navigate('SeismicList')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>Ver lista completa</Text>
            <ChevronRight size={14} color={colors.textSecondary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerFeedbackBox}>
            <ActivityIndicator size="small" color={colors.seismicAccent} />
            <Text style={styles.feedbackText}>Consultando sismos en tiempo real del SGC...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorFeedbackBox}>
            <AlertTriangle size={18} color={colors.amberAlertText} strokeWidth={1.8} />
            <Text style={styles.errorFeedbackText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadRecentEvents}>
              <RefreshCw size={14} color={colors.textPrimary} strokeWidth={2} />
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.centerFeedbackBox}>
            <Text style={styles.feedbackText}>
              {timeFilter === 'TODAY'
                ? 'No se registran sismos en las últimas 24 horas en el catálogo.'
                : 'No se registran sismos en este momento en la base de datos.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {filteredEvents.map((item) => {
              const magColor = getMagnitudeColor(item.magnitude);
              const isSelected = selectedEventId === item.id;
              const relativeTime = getRelativeTime(item.originTime);
              const conciseTime = formatConciseDateTime(item.originTime);

              // Distancia dinámica en km desde el GPS del usuario hasta el epicentro
              const distanceKm = userCoord
                ? calculateDistanceKm(userCoord.latitude, userCoord.longitude, item.latitude, item.longitude)
                : null;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.eventCard,
                    isSelected && { borderColor: magColor, borderWidth: 1.5 },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedEventId(item.id);
                    mapRef.current?.animateToRegion({
                      latitude: item.latitude,
                      longitude: item.longitude,
                      latitudeDelta: 2.0,
                      longitudeDelta: 2.0,
                    });
                    navigation.navigate('SeismicDetail', { event: item });
                  }}
                >
                  {/* Fila Superior: Badge Magnitud + Tiempo Relativo ("Hace 15 min") */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.magnitudeBadge, { backgroundColor: magColor }]}>
                      <Text style={styles.magnitudeNumber}>{item.magnitude.toFixed(1)}</Text>
                      <Text style={styles.magnitudeUnit}>M</Text>
                    </View>
                    <View style={styles.timeTag}>
                      <Clock size={11} color={colors.textMuted} strokeWidth={1.8} />
                      <Text style={styles.timeText}>{relativeTime}</Text>
                    </View>
                  </View>

                  {/* Epicentro Geográfico */}
                  <Text style={styles.cardEpicenter} numberOfLines={1}>
                    {item.epicenterDescription}
                  </Text>

                  {/* Fecha exacta y Hora Legal Colombia (COT) */}
                  <Text style={styles.dateTimeSubline}>
                    {conciseTime}
                  </Text>

                  {/* Fila Inferior: Profundidad y Distancia al Usuario */}
                  <View style={styles.cardDetailsRow}>
                    <View style={styles.detailItem}>
                      <MapPin size={11} color={colors.textSecondary} strokeWidth={1.8} />
                      <Text style={styles.detailText}>Prof: {item.depthKm.toFixed(0)} km</Text>
                    </View>

                    {distanceKm !== null ? (
                      <View style={styles.detailItem}>
                        <Navigation size={11} color={colors.gpsBlue} strokeWidth={1.8} />
                        <Text style={[styles.detailText, { color: colors.gpsBlue, fontWeight: '700' }]}>
                          A {distanceKm} km
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.detailItem}>
                        <ShieldAlert size={11} color={colors.textSecondary} strokeWidth={1.8} />
                        <Text style={styles.detailText}>
                          {item.magnitude >= 4.5 ? 'Moderado' : 'Leve'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 5. BOTTOM CTA ACTION */}
      <View style={[styles.bottomCtaContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <PrimaryButton
          title="+ Reportar Alerta Comunitaria"
          onPress={() => navigation.navigate('NewReport')}
        />
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E1714' : '#FFEDD5',
      borderWidth: 1,
      borderColor: isDark ? '#3D251C' : '#FDBA74',
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    brandTitleLight: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    brandTitleAccent: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.seismicAccent,
      marginLeft: 2,
    },
    sgcStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    statusDotLive: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.successGreen,
    },
    sgcStatusText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.6,
    },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActionButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchSection: {
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: colors.surfaceInputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      height: 44,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
    },
    timeFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
      gap: 8,
    },
    timeFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      gap: 6,
    },
    timeFilterChipActive: {
      backgroundColor: isDark ? 'rgba(240, 106, 53, 0.15)' : 'rgba(240, 106, 53, 0.1)',
      borderColor: colors.seismicAccent,
    },
    timeFilterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    timeFilterText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeFilterTextActive: {
      color: colors.seismicAccent,
      fontWeight: '700',
    },
    historyLinkButton: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    historyLinkText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.seismicAccent,
    },
    mapContainer: {
      flex: 1,
      marginHorizontal: 20,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      position: 'relative',
      backgroundColor: isDark ? '#11151C' : '#E2E8F0',
    },
    userLocationGpsDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.gpsBlue,
      borderWidth: 3,
      borderColor: '#FFFFFF',
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
    radiusToggleButton: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(24, 27, 32, 0.92)' : 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    radiusToggleText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    gpsRecenterButton: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 3,
    },
    eventsSection: {
      marginTop: 10,
      paddingBottom: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
    sectionBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.seismicAccent,
      backgroundColor: isDark ? '#261710' : '#FFEDD5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    viewAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    horizontalScrollContent: {
      paddingHorizontal: 20,
      gap: 12,
    },
    eventCard: {
      width: 260,
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      padding: 14,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    magnitudeBadge: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      gap: 2,
    },
    magnitudeNumber: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 15,
    },
    magnitudeUnit: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 10,
    },
    timeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    timeText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    cardEpicenter: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    dateTimeSubline: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
      marginBottom: 8,
    },
    cardDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      paddingTop: 8,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    centerFeedbackBox: {
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 20,
    },
    feedbackText: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
    errorFeedbackBox: {
      backgroundColor: colors.amberAlertBg,
      borderColor: colors.amberAlertBorder,
      borderWidth: 1,
      borderRadius: 12,
      marginHorizontal: 20,
      padding: 12,
      alignItems: 'center',
      gap: 8,
    },
    errorFeedbackText: {
      color: colors.amberAlertText,
      fontSize: 12,
      textAlign: 'center',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceCard,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    retryText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    bottomCtaContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
  });