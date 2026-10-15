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
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Circle } from 'react-native-maps';
import {
  triggerLocalProximityAlert,
  isIncidentAlerted,
  markIncidentAsAlerted,
} from '../services/notifications';
import {
  Search,
  Filter,
  AlertTriangle,
  Flame,
  Car,
  Building2,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { AleraCategoryIcon } from '../components/AleraBrand';
import { api, generateUUID, resolveMediaUrl } from '../services/api';
import { getRealDeviceLocation } from '../services/location';
import { NearbyCommunityIncident, IncidentType } from '../types';

interface Props {
  navigation: any;
}

const DEVICE_STORAGE_KEY = '@alera_device_id';

export const CommunityAlertsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const mapRef = useRef<MapView>(null);

  const [incidents, setIncidents] = useState<NearbyCommunityIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [votingIncidentId, setVotingIncidentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('TODOS');
  const [deviceId, setDeviceId] = useState<string>('');

  // Toggle de radio de afectación
  const [showRadius, setShowRadius] = useState<boolean>(true);

  // Ubicación GPS real
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [detectedCity, setDetectedCity] = useState<string>('Buscando GPS...');

  // Actualización automática cada vez que la pantalla toma el foco (por ejemplo, al volver de crear un reporte)
  useFocusEffect(
    useCallback(() => {
      acquireLocationAndLoad();
    }, [deviceId])
  );

  useEffect(() => {
    initDeviceId();
  }, []);

  const initDeviceId = async () => {
    try {
      let id = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
      if (!id || id.length !== 36) {
        id = generateUUID();
        await AsyncStorage.setItem(DEVICE_STORAGE_KEY, id);
      }
      setDeviceId(id);
    } catch {
      setDeviceId(generateUUID());
    }
  };

  const acquireLocationAndLoad = async () => {
    setLoading(true);
    const loc = await getRealDeviceLocation();
    if (loc) {
      setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
      setDetectedCity(loc.city);

      // Reportar ubicación a Redis para el cálculo de proximidad del backend
      const validId = deviceId && deviceId.length === 36 ? deviceId : generateUUID();
      api.updateLocation(validId, loc.latitude, loc.longitude).catch(() => {});

      mapRef.current?.animateToRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      });
      await loadNearbyIncidents(loc.latitude, loc.longitude);
    } else {
      setDetectedCity('Colombia');
      await loadNearbyIncidents(4.5709, -74.2973);
    }
  };

  const loadNearbyIncidents = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      const data = await api.getNearbyCommunityIncidents(lat, lon, 50000);
      setIncidents(data || []);

      // Verificación de proximidad local: si el usuario está dentro del radio del incidente
      if (data && data.length > 0) {
        const hazard = data.find(
          (inc) =>
            inc.distanceMeters <= inc.incident.radiusMeters &&
            inc.incident.status !== 'RESOLVED' &&
            !isIncidentAlerted(inc.incident.id)
        );

        if (hazard) {
          markIncidentAsAlerted(hazard.incident.id);

          const typeLabel =
            hazard.incident.incidentType === 'LANDSLIDE' ? 'Derrumbe en vía' :
            hazard.incident.incidentType === 'FIRE' ? 'Incendio activo' :
            hazard.incident.incidentType === 'STRUCTURAL_DAMAGE' ? 'Falla estructural' : 'Vía obstruida';
          const distKm = (hazard.distanceMeters / 1000).toFixed(1);
          const radKm = (hazard.incident.radiusMeters / 1000).toFixed(1);

          triggerLocalProximityAlert(
            `ALERTA COMUNITARIA: ${typeLabel}`,
            `Estás dentro del radio de afectación (${distKm} km). ${hazard.incident.description || ''}`,
            true,
            'community',
            `Radio de Afectación: ${radKm} km`
          );
        }
      }
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (incidentId: string, voteType: 'STILL_ACTIVE' | 'RESOLVED') => {
    try {
      setVotingIncidentId(incidentId);
      const validDeviceId = deviceId && deviceId.length === 36 ? deviceId : generateUUID();
      await api.confirmIncident(incidentId, validDeviceId, voteType);
      Alert.alert(
        'Voto Registrado',
        voteType === 'STILL_ACTIVE'
          ? 'Has confirmado que el incidente continúa afectando la zona.'
          : 'Has reportado que la zona ya ha sido despejada o atendida.'
      );
      if (userLocation) {
        await loadNearbyIncidents(userLocation.latitude, userLocation.longitude);
      }
    } catch (err: any) {
      Alert.alert('Información', err.message || 'No se pudo registrar el voto en el servidor.');
    } finally {
      setVotingIncidentId(null);
    }
  };

  const getIncidentIcon = (type: IncidentType) => {
    switch (type) {
      case 'FIRE':
        return <AleraCategoryIcon type="FIRE" size={18} color={colors.seismicRed} />;
      case 'LANDSLIDE':
        return <AleraCategoryIcon type="LANDSLIDE" size={18} color={colors.amberAlertText} />;
      case 'STRUCTURAL_DAMAGE':
        return <AleraCategoryIcon type="STRUCTURAL_DAMAGE" size={18} color={colors.seismicAccent} />;
      case 'ACCIDENT':
      case 'ROAD_BLOCK':
      default:
        return <AleraCategoryIcon type="ROAD_BLOCK" size={18} color={colors.textPrimary} />;
    }
  };

  const getIncidentTypeName = (type: IncidentType): string => {
    switch (type) {
      case 'LANDSLIDE':
        return 'Derrumbe / Deslizamiento';
      case 'FIRE':
        return 'Incendio Activo';
      case 'STRUCTURAL_DAMAGE':
        return 'Falla Estructural';
      case 'ROAD_BLOCK':
        return 'Vía Obstruida';
      case 'ACCIDENT':
        return 'Accidente de Tránsito';
      default:
        return 'Incidente Comunitario';
    }
  };

  const formatFullDateTime = (isoString?: string): string => {
    if (!isoString) return 'Fecha no disponible';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Fecha no disponible';

    const fecha = date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const hora = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${fecha} • ${hora} COT`;
  };

  const filtered = incidents.filter((item) => {
    const matchesSearch =
      (item.incident.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.incident.incidentType.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'TODOS') return true;
    if (selectedFilter === 'DERRUMBES') return item.incident.incidentType === 'LANDSLIDE';
    if (selectedFilter === 'INCENDIOS') return item.incident.incidentType === 'FIRE';
    if (selectedFilter === 'ACCIDENTES')
      return item.incident.incidentType === 'ACCIDENT' || item.incident.incidentType === 'ROAD_BLOCK';
    if (selectedFilter === 'ESTRUCTURAS')
      return item.incident.incidentType === 'STRUCTURAL_DAMAGE';
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.backgroundPrimary} />

      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alertas Comunitarias</Text>
          <View style={styles.headerLocationRow}>
            <MapPin size={12} color={colors.gpsBlue} strokeWidth={2} />
            <Text style={styles.headerSubtitle}>{detectedCity} • Radio 50 km</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => acquireLocationAndLoad()}
          activeOpacity={0.8}
        >
          <RefreshCw size={18} color={colors.textSecondary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* 2. SEARCH & FILTER PILLS */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} strokeWidth={1.8} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por vía, barrio o incidente..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Filter size={16} color={colors.textSecondary} strokeWidth={1.8} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          {['TODOS', 'DERRUMBES', 'INCENDIOS', 'ACCIDENTES', 'ESTRUCTURAS'].map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. MAPA NATIVO CON TOGGLE DE RADIO */}
      <View style={styles.mapSection}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: userLocation ? userLocation.latitude : 4.5709,
            longitude: userLocation ? userLocation.longitude : -74.2973,
            latitudeDelta: 0.25,
            longitudeDelta: 0.25,
          }}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
        >
          {userLocation && (
            <Marker coordinate={userLocation} title="Tu Ubicación Real">
              <View style={styles.userMarkerDot} />
            </Marker>
          )}

          {filtered.map((item) => (
            <React.Fragment key={item.incident.id}>
              {showRadius && (
                <Circle
                  center={{
                    latitude: item.incident.latitude,
                    longitude: item.incident.longitude,
                  }}
                  radius={item.incident.radiusMeters || 1000}
                  fillColor="rgba(240, 106, 53, 0.18)"
                  strokeColor={colors.seismicAccent}
                  strokeWidth={1.5}
                />
              )}
              <Marker
                coordinate={{
                  latitude: item.incident.latitude,
                  longitude: item.incident.longitude,
                }}
                title={getIncidentTypeName(item.incident.incidentType)}
                description={item.incident.description || ''}
              >
                <View style={styles.incidentMarkerBadge}>
                  {getIncidentIcon(item.incident.incidentType)}
                </View>
              </Marker>
            </React.Fragment>
          ))}
        </MapView>

        {/* Botón flotante para mostrar/ocultar radio */}
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
      </View>

      {/* 4. REAL INCIDENT FEED CON FOTOS ADJUNTAS */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>REPORTES VECINALES ACTIVOS</Text>
          <Text style={styles.listCountBadge}>{filtered.length}</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={colors.seismicAccent} />
            <Text style={styles.feedbackText}>Consultando reportes vecinales en la base de datos...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <AlertTriangle size={24} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No hay incidentes activos en tu zona</Text>
            <Text style={styles.emptySubtitle}>
              Todos los caminos y estructuras se encuentran despejados según la comunidad.
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const inc = item.incident;
            const isVotingThis = votingIncidentId === inc.id;

            return (
              <View key={inc.id} style={styles.incidentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTypeRow}>
                    <View style={styles.iconTag}>{getIncidentIcon(inc.incidentType)}</View>
                    <Text style={styles.cardTypeName}>{getIncidentTypeName(inc.incidentType)}</Text>
                  </View>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>a {item.distanceKm.toFixed(1)} km</Text>
                  </View>
                </View>

                <Text style={styles.cardDescription}>
                  {inc.description || 'Sin descripción adicional registrada por el usuario.'}
                </Text>

                {/* Galería de Fotos del Incidente */}
                {inc.images && inc.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceImagesScroll}>
                    {inc.images.map((imgUri, idx) => (
                      <Image key={idx} source={{ uri: resolveMediaUrl(imgUri) }} style={styles.incidentFeedImage} />
                    ))}
                  </ScrollView>
                )}

                <View style={styles.cardMetaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={colors.textMuted} strokeWidth={1.8} />
                    <Text style={styles.metaText}>{formatFullDateTime(inc.reportedAt)}</Text>
                  </View>
                  <Text style={styles.statusTagText}>
                    {inc.status === 'CONFIRMED_ACTIVE' ? 'Verificado por Comunidad' : 'En Evaluación'}
                  </Text>
                </View>

                <View style={styles.voteDivider} />
                <View style={styles.voteSection}>
                  <Text style={styles.votePrompt}>¿Continúa este incidente en la vía?</Text>
                  <View style={styles.voteButtonsRow}>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.voteButtonActive]}
                      onPress={() => handleVote(inc.id, 'STILL_ACTIVE')}
                      disabled={isVotingThis}
                      activeOpacity={0.7}
                    >
                      <ThumbsUp size={14} color={colors.amberAlertText} strokeWidth={2} />
                      <Text style={styles.voteButtonActiveText}>
                        SÍ, SIGUE ({inc.positiveVotes})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.voteButton, styles.voteButtonResolved]}
                      onPress={() => handleVote(inc.id, 'RESOLVED')}
                      disabled={isVotingThis}
                      activeOpacity={0.7}
                    >
                      <ThumbsDown size={14} color={colors.successGreen} strokeWidth={2} />
                      <Text style={styles.voteButtonResolvedText}>
                        YA SE RESOLVIÓ ({inc.negativeVotes})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 5. FLOATING BOTTOM CTA */}
      <View style={[styles.bottomCtaContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <PrimaryButton
          title="+ Nuevo Reporte de Incidente"
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
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
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
    searchSection: {
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: colors.surfaceInputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
      gap: 8,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
    },
    filterPillsContainer: {
      gap: 8,
      paddingBottom: 4,
    },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    filterPillActive: {
      backgroundColor: colors.ctaPrimary,
      borderColor: colors.ctaPrimary,
    },
    filterPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterPillTextActive: {
      color: colors.ctaPrimaryText,
      fontWeight: '700',
    },
    mapSection: {
      height: 180,
      marginHorizontal: 20,
      marginBottom: 10,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: isDark ? '#11151C' : '#E5E7EB',
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    userMarkerDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.gpsBlue,
      borderWidth: 2.5,
      borderColor: '#FFFFFF',
    },
    incidentMarkerBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1.5,
      borderColor: colors.amberAlertText,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    radiusToggleButton: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(24, 27, 32, 0.92)' : 'rgba(255, 255, 255, 0.92)',
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
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    listHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    listTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
    },
    listCountBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.seismicAccent,
      backgroundColor: isDark ? '#261710' : '#FFEDD5',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    centerBox: {
      paddingVertical: 30,
      alignItems: 'center',
      gap: 10,
    },
    feedbackText: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
    emptyCard: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
    incidentCard: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    cardTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconTag: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: isDark ? '#1E2229' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTypeName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    distanceBadge: {
      backgroundColor: isDark ? '#1E2229' : '#EEF2FF',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    distanceText: {
      fontSize: 11,
      color: colors.gpsBlue,
      fontWeight: '600',
    },
    cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  evidenceImagesScroll: {
    marginBottom: 10,
  },
  incidentFeedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.surfaceCardBorder,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.amberAlertText,
  },
  voteDivider: {
    height: 1,
    backgroundColor: colors.surfaceCardBorder,
    marginBottom: 10,
  },
  voteSection: {
    gap: 8,
  },
  votePrompt: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  voteButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
  },
  voteButtonActive: {
    backgroundColor: colors.amberAlertBg,
    borderColor: colors.amberAlertBorder,
  },
  voteButtonActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amberAlertText,
  },
  voteButtonResolved: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderColor: colors.successGreen,
  },
  voteButtonResolvedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successGreen,
  },
  bottomCtaContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});