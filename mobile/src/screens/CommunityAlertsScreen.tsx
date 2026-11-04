/**
 * CommunityAlertsScreen
 *
 * Pantalla de alertas comunitarias de ALERA.
 *
 * Reglas de negocio:
 *  - Todos los usuarios ven todos los incidentes activos (lectura pública).
 *  - Solo usuarios a ≤1500 m del origen de un incidente reciben la notificación
 *    push de alerta comunitaria y pueden votar (STILL_ACTIVE / RESOLVED).
 *  - Usuarios fuera del rango ven el incidente en modo solo lectura.
 *
 * Principios SOLID aplicados:
 *  - SRP: lógica de negocio en hooks y helpers separados del render.
 *  - OCP: extensible vía IncidentType sin tocar el render.
 *  - LSP: tipos estrictos de TypeScript.
 *  - ISP: interfaces mínimas en cada componente interno.
 *  - DIP: dependencias inyectadas desde el hook raíz.
 */

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
import { AleraInteractiveMap, AleraInteractiveMapRef } from '../components/AleraInteractiveMap';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import {
  triggerLocalProximityAlert,
  isIncidentAlerted,
  markIncidentAsAlerted,
  incrementUserVotesCount,
} from '../services/notifications';
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Lock,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { AleraCategoryIcon } from '../components/AleraBrand';
import { api, generateUUID, resolveMediaUrl } from '../services/api';
import { getRealDeviceLocation } from '../services/location';
import { saveLastKnownLocation } from '../services/backgroundTask';
import { NearbyCommunityIncident, IncidentType } from '../types';

// ─── Constantes ────────────────────────────────────────────────────────────────

const DEVICE_STORAGE_KEY = '@alera_device_id';

/** Radio máximo en metros dentro del cual un usuario puede votar y recibe notificación. */
const PROXIMITY_VOTE_RADIUS_M = 1500;

/** Radio de búsqueda de incidentes alrededor del usuario. */
const SEARCH_RADIUS_M = 50_000;

// ─── Helpers puros (sin efectos secundarios) ───────────────────────────────────

/** Nombre legible del tipo de incidente. */
const getIncidentTypeName = (type: IncidentType): string => {
  const names: Partial<Record<IncidentType, string>> = {
    LANDSLIDE: 'Derrumbe / Deslizamiento',
    FIRE: 'Incendio Activo',
    STRUCTURAL_DAMAGE: 'Falla Estructural',
    ROAD_BLOCK: 'Vía Obstruida',
    ACCIDENT: 'Accidente de Tránsito',
    FLOOD: 'Inundación',
    DANGER_ON_ROAD: 'Peligro en Vía',
    OTHER: 'Incidente Comunitario',
  };
  return names[type] ?? 'Incidente Comunitario';
};

/** Fecha/hora completa en zona horaria Colombia. */
const formatFullDateTime = (isoString?: string): string => {
  if (!isoString) return 'Fecha no disponible';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Fecha no disponible';
  const fecha = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} • ${hora} COT`;
};

/** Texto de distancia compacto: "340 m" o "2.1 km". */
const formatDistance = (meters: number): string =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

/** Determina si el usuario está dentro del radio de votación. */
const isWithinVoteRadius = (distanceMeters: number): boolean =>
  distanceMeters <= PROXIMITY_VOTE_RADIUS_M;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  navigation: any;
}

// ─── Sub-componente: Icono de categoría ────────────────────────────────────────

interface CategoryIconProps {
  type: IncidentType;
  size?: number;
}

const IncidentCategoryIcon: React.FC<CategoryIconProps> = ({ type, size = 18 }) => (
  <AleraCategoryIcon type={type} size={size} color="#F06A35" />
);

// ─── Sub-componente: Tarjeta de verificación tipo Waze ────────────────────────

interface ProximityVerificationCardProps {
  incident: NearbyCommunityIncident;
  isVoting: boolean;
  onVote: (incidentId: string, vote: 'STILL_ACTIVE' | 'RESOLVED') => void;
  colors: ThemeColors;
  isDark: boolean;
  styles: ReturnType<typeof createStyles>;
}

const ProximityVerificationCard: React.FC<ProximityVerificationCardProps> = ({
  incident,
  isVoting,
  onVote,
  styles,
}) => {
  const inc = incident.incident;
  return (
    <View style={styles.proximityPromptCard}>
      <View style={styles.proximityPromptHeader}>
        <View style={styles.proximityPromptTag}>
          <MapPin size={12} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.proximityPromptTagText}>VERIFICACIÓN EN TRAYECTO</Text>
        </View>
        <Text style={styles.proximityPromptDistance}>
          A {formatDistance(incident.distanceMeters)}
        </Text>
      </View>

      <View style={styles.proximityPromptBody}>
        <View style={styles.proximityIconBox}>
          <IncidentCategoryIcon type={inc.incidentType} size={18} />
        </View>
        <View style={styles.proximityPromptTextCol}>
          <Text style={styles.proximityPromptTitle}>
            ¿{getIncidentTypeName(inc.incidentType)} sigue ocurriendo en el lugar?
          </Text>
          <Text style={styles.proximityPromptDesc} numberOfLines={2}>
            {inc.description || 'Reporte activo en este sector.'}
          </Text>
        </View>
      </View>

      <View style={styles.proximityActionRow}>
        <TouchableOpacity
          style={[styles.proximityBtn, styles.proximityBtnConfirm]}
          onPress={() => onVote(inc.id, 'STILL_ACTIVE')}
          disabled={isVoting}
          activeOpacity={0.8}
        >
          <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.proximityBtnConfirmText}>
            Sí, sigue ({inc.positiveVotes})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.proximityBtn, styles.proximityBtnClear]}
          onPress={() => onVote(inc.id, 'RESOLVED')}
          disabled={isVoting}
          activeOpacity={0.8}
        >
          <XCircle size={16} color="#888" strokeWidth={2} />
          <Text style={styles.proximityBtnClearText}>
            Despejado ({inc.negativeVotes})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Sub-componente: Sección de votación ─────────────────────────────────────

interface VoteSectionProps {
  incident: NearbyCommunityIncident;
  isVoting: boolean;
  onVote: (incidentId: string, vote: 'STILL_ACTIVE' | 'RESOLVED') => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

const VoteSection: React.FC<VoteSectionProps> = ({
  incident,
  isVoting,
  onVote,
  colors,
  styles,
}) => {
  const inc = incident.incident;
  const userCanVote = isWithinVoteRadius(incident.distanceMeters);

  if (userCanVote) {
    return (
      <>
        <View style={styles.proximityInlineTag}>
          <MapPin size={11} color="#F06A35" strokeWidth={2.2} />
          <Text style={styles.proximityInlineTagText}>
            Estás en la zona ({formatDistance(incident.distanceMeters)})
          </Text>
        </View>
        <Text style={styles.votePromptHighlight}>
          ¿Este incidente sigue ocurriendo?
        </Text>
        <View style={styles.voteButtonsRow}>
          <TouchableOpacity
            style={[styles.voteButton, styles.voteButtonActive]}
            onPress={() => onVote(inc.id, 'STILL_ACTIVE')}
            disabled={isVoting}
            activeOpacity={0.7}
          >
            <ThumbsUp size={14} color="#F06A35" strokeWidth={2} />
            <Text style={styles.voteButtonActiveText}>SÍ ({inc.positiveVotes})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteButton, styles.voteButtonResolved]}
            onPress={() => onVote(inc.id, 'RESOLVED')}
            disabled={isVoting}
            activeOpacity={0.7}
          >
            <ThumbsDown size={14} color={colors.successGreen} strokeWidth={2} />
            <Text style={styles.voteButtonResolvedText}>DESPEJADO ({inc.negativeVotes})</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Modo solo lectura — usuario fuera del radio de votación
  return (
    <View style={styles.readOnlyRow}>
      <Lock size={12} color={colors.textMuted} strokeWidth={1.8} />
      <Text style={styles.readOnlyText}>
        Votar disponible a menos de 1.5 km del incidente
      </Text>
      <View style={styles.readOnlyCountsRow}>
        <ThumbsUp size={11} color={colors.textMuted} strokeWidth={1.8} />
        <Text style={styles.readOnlyCountText}>{inc.positiveVotes}</Text>
        <ThumbsDown size={11} color={colors.textMuted} strokeWidth={1.8} />
        <Text style={styles.readOnlyCountText}>{inc.negativeVotes}</Text>
      </View>
    </View>
  );
};

// ─── Sub-componente: Tarjeta de incidente ─────────────────────────────────────

interface IncidentCardProps {
  incident: NearbyCommunityIncident;
  isVoting: boolean;
  onVote: (incidentId: string, vote: 'STILL_ACTIVE' | 'RESOLVED') => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  isVoting,
  onVote,
  colors,
  styles,
}) => {
  const inc = incident.incident;

  return (
    <View style={styles.incidentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTypeRow}>
          <View style={styles.iconTag}>
            <IncidentCategoryIcon type={inc.incidentType} size={18} />
          </View>
          <Text style={styles.cardTypeName}>{getIncidentTypeName(inc.incidentType)}</Text>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>a {incident.distanceKm.toFixed(1)} km</Text>
        </View>
      </View>

      {inc.description ? (
        <Text style={styles.cardDescription}>{inc.description}</Text>
      ) : null}

      {inc.images && inc.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.evidenceImagesScroll}
        >
          {inc.images.map((imgUri, idx) => (
            <Image
              key={idx}
              source={{ uri: resolveMediaUrl(imgUri) }}
              style={styles.incidentFeedImage}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.cardMetaRow}>
        <View style={styles.metaItem}>
          <Clock size={12} color={colors.textMuted} strokeWidth={1.8} />
          <Text style={styles.metaText}>{formatFullDateTime(inc.reportedAt)}</Text>
        </View>
        <Text style={styles.statusTagText}>
          {inc.status === 'CONFIRMED_ACTIVE' ? 'Verificado' : 'En Evaluación'}
        </Text>
      </View>

      <View style={styles.voteDivider} />
      <View style={styles.voteSection}>
        <VoteSection
          incident={incident}
          isVoting={isVoting}
          onVote={onVote}
          colors={colors}
          styles={styles}
        />
      </View>
    </View>
  );
};

// ─── Pantalla principal ────────────────────────────────────────────────────────

export const CommunityAlertsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const mapRef = useRef<AleraInteractiveMapRef>(null);

  const [incidents, setIncidents] = useState<NearbyCommunityIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [votingIncidentId, setVotingIncidentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('TODOS');
  const [deviceId, setDeviceId] = useState<string>('');
  const [showRadius, setShowRadius] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [detectedCity, setDetectedCity] = useState<string>('Buscando GPS...');

  useEffect(() => {
    initDeviceId();
  }, []);

  const initDeviceId = async (): Promise<void> => {
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

  useFocusEffect(
    useCallback(() => {
      acquireLocationAndLoad();
    }, [deviceId])
  );

  const acquireLocationAndLoad = async (): Promise<void> => {
    setLoading(true);
    const loc = await getRealDeviceLocation();

    if (loc) {
      setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
      setDetectedCity(loc.city);

      // Persiste la última ubicación para la tarea de segundo plano
      saveLastKnownLocation(loc.latitude, loc.longitude).catch(() => {});

      const validId = deviceId && deviceId.length === 36 ? deviceId : generateUUID();
      api.updateLocation(validId, loc.latitude, loc.longitude).catch(() => {});

      mapRef.current?.animateToRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      });

      await loadIncidents(loc.latitude, loc.longitude, true);
    } else {
      setDetectedCity('Colombia');
      await loadIncidents(4.5709, -74.2973, false);
    }
  };

  const loadIncidents = async (
    lat: number,
    lon: number,
    hasRealGps: boolean
  ): Promise<void> => {
    try {
      setLoading(true);
      const data = await api.getNearbyCommunityIncidents(lat, lon, SEARCH_RADIUS_M);
      setIncidents(data || []);

      if (hasRealGps && data && data.length > 0) {
        evaluateProximityAlert(data, deviceId);
      }
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Evalúa si el usuario está dentro del radio de votación de algún incidente
   * activo y, en ese caso, dispara la notificación local de alerta (una sola vez
   * por incidente gracias al registro en AsyncStorage).
   */
  const evaluateProximityAlert = (
    data: NearbyCommunityIncident[],
    currentDevId: string
  ): void => {
    const hazard = data.find(
      (inc) =>
        isWithinVoteRadius(inc.distanceMeters) &&
        inc.incident.status !== 'RESOLVED' &&
        inc.incident.reporterDeviceId !== currentDevId &&
        !isIncidentAlerted(inc.incident.id)
    );

    if (!hazard) return;

    markIncidentAsAlerted(hazard.incident.id);

    triggerLocalProximityAlert(
      `ALERTA COMUNITARIA: ${getIncidentTypeName(hazard.incident.incidentType)}`,
      `Estás a ${formatDistance(hazard.distanceMeters)} del incidente. ${hazard.incident.description || ''}`,
      true,
      'community',
      `Radio: ${formatDistance(hazard.incident.radiusMeters)}`
    );
  };

  const handleVote = async (
    incidentId: string,
    voteType: 'STILL_ACTIVE' | 'RESOLVED'
  ): Promise<void> => {
    // Verificación de seguridad en cliente: el usuario debe estar en la zona
    const target = incidents.find((i) => i.incident.id === incidentId);
    if (!target || !isWithinVoteRadius(target.distanceMeters)) {
      Alert.alert(
        'Fuera de zona',
        'Solo puedes votar si estás a menos de 1.5 km del incidente.'
      );
      return;
    }

    try {
      setVotingIncidentId(incidentId);
      const validDeviceId = deviceId && deviceId.length === 36 ? deviceId : generateUUID();
      await api.confirmIncident(incidentId, validDeviceId, voteType);
      incrementUserVotesCount().catch(() => {});

      Alert.alert(
        'Voto Registrado',
        voteType === 'STILL_ACTIVE'
          ? 'Has confirmado que el incidente continúa afectando la zona.'
          : 'Has reportado que la zona ya fue despejada o atendida.'
      );

      if (userLocation) {
        await loadIncidents(userLocation.latitude, userLocation.longitude, true);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar el voto.');
    } finally {
      setVotingIncidentId(null);
    }
  };

  // Incidente más cercano dentro del radio (para la tarjeta tipo Waze)
  const proximityTarget = useMemo(
    () =>
      incidents.find(
        (item) =>
          isWithinVoteRadius(item.distanceMeters) && item.incident.status !== 'RESOLVED'
      ),
    [incidents]
  );

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();

    const categoryMap: Partial<Record<string, IncidentType[]>> = {
      DERRUMBES: ['LANDSLIDE'],
      INCENDIOS: ['FIRE'],
      ACCIDENTES: ['ACCIDENT', 'ROAD_BLOCK', 'DANGER_ON_ROAD'],
      ESTRUCTURAS: ['STRUCTURAL_DAMAGE'],
    };

    return incidents.filter((item) => {
      const inc = item.incident;
      const matchesSearch =
        (inc.description || '').toLowerCase().includes(query) ||
        inc.incidentType.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (selectedFilter === 'TODOS') return true;

      const allowedTypes = categoryMap[selectedFilter];
      return allowedTypes ? allowedTypes.includes(inc.incidentType) : true;
    });
  }, [incidents, searchQuery, selectedFilter]);

  const mapMarkers = useMemo(
    () =>
      filtered.map((item) => ({
        id: item.incident.id,
        coordinate: {
          latitude: item.incident.latitude,
          longitude: item.incident.longitude,
        },
        title: getIncidentTypeName(item.incident.incidentType),
        description: item.incident.description || '',
        badgeText: '!',
        badgeColor: '#F06A35',
      })),
    [filtered]
  );

  const mapCircles = useMemo(
    () =>
      showRadius
        ? filtered.map((item) => ({
            id: `circ-${item.incident.id}`,
            center: {
              latitude: item.incident.latitude,
              longitude: item.incident.longitude,
            },
            radius: item.incident.radiusMeters || 1000,
            fillColor: 'rgba(240, 106, 53, 0.18)',
            strokeColor: colors.seismicAccent,
            strokeWidth: 1.5,
          }))
        : [],
    [filtered, showRadius, colors.seismicAccent]
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. HEADER */}
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
          onPress={acquireLocationAndLoad}
          activeOpacity={0.8}
        >
          <RefreshCw size={18} color={colors.textSecondary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* 2. BARRA DE BÚSQUEDA Y FILTROS */}
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
          {(['TODOS', 'DERRUMBES', 'INCENDIOS', 'ACCIDENTES', 'ESTRUCTURAS'] as const).map(
            (filter) => {
              const isActive = selectedFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setSelectedFilter(filter)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>

      {/* 3. MAPA */}
      <View style={styles.mapSection}>
        <MapErrorBoundary fallbackMessage="El mapa comunitario requiere servicios de localización activos.">
          <AleraInteractiveMap
            ref={mapRef}
            initialRegion={{
              latitude: userLocation ? userLocation.latitude : 4.5709,
              longitude: userLocation ? userLocation.longitude : -74.2973,
              latitudeDelta: 0.25,
              longitudeDelta: 0.25,
            }}
            userCoord={userLocation}
            circles={mapCircles}
            markers={mapMarkers}
            isDark={isDark}
          />
        </MapErrorBoundary>

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
          <Text
            style={[styles.radiusToggleText, showRadius && { color: colors.seismicAccent }]}
          >
            {showRadius ? 'Radio Visible' : 'Radio Oculto'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. LISTA */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>REPORTES COMUNITARIOS ACTIVOS</Text>
          <Text style={styles.listCountBadge}>{filtered.length}</Text>
        </View>

        {/* Tarjeta de verificación tipo Waze — solo si hay un incidente próximo */}
        {proximityTarget && (
          <ProximityVerificationCard
            incident={proximityTarget}
            isVoting={votingIncidentId === proximityTarget.incident.id}
            onVote={handleVote}
            colors={colors}
            isDark={isDark}
            styles={styles}
          />
        )}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={colors.seismicAccent} />
            <Text style={styles.feedbackText}>Consultando reportes vecinales...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <AlertTriangle size={24} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No hay incidentes activos en tu zona</Text>
            <Text style={styles.emptySubtitle}>
              Todos los caminos y estructuras están despejados según la comunidad.
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <IncidentCard
              key={item.incident.id}
              incident={item}
              isVoting={votingIncidentId === item.incident.id}
              onVote={handleVote}
              colors={colors}
              styles={styles}
            />
          ))
        )}
      </ScrollView>

      {/* 5. BOTÓN NUEVO REPORTE */}
      <View
        style={[styles.bottomCtaContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <PrimaryButton
          title="+ Nuevo Reporte de Incidente"
          onPress={() => navigation.navigate('NewReport')}
        />
      </View>
    </View>
  );
};

// ─── Estilos ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    headerLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    headerSubtitle: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
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
    searchSection: { paddingHorizontal: 20, marginBottom: 8 },
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
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
    filterPillsContainer: { gap: 8, paddingBottom: 4 },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    filterPillActive: { backgroundColor: colors.ctaPrimary, borderColor: colors.ctaPrimary },
    filterPillText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    filterPillTextActive: { color: colors.ctaPrimaryText, fontWeight: '700' },
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
    radiusToggleText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    listContent: { paddingHorizontal: 20, paddingBottom: 24 },
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
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
    centerBox: { paddingVertical: 30, alignItems: 'center', gap: 10 },
    feedbackText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
    emptyCard: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
    // Tarjeta de incidente
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
    cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconTag: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: isDark ? '#1E2229' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTypeName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    distanceBadge: {
      backgroundColor: isDark ? '#1E2229' : '#EEF2FF',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    distanceText: { fontSize: 11, color: colors.gpsBlue, fontWeight: '600' },
    cardDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 10,
    },
    evidenceImagesScroll: { marginBottom: 10 },
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
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: colors.textMuted },
    statusTagText: { fontSize: 10, fontWeight: '600', color: colors.amberAlertText },
    voteDivider: { height: 1, backgroundColor: colors.surfaceCardBorder, marginBottom: 10 },
    voteSection: { gap: 8 },
    // Votación (usuario en zona)
    proximityInlineTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: isDark ? '#261710' : '#FFEDD5',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    proximityInlineTagText: { fontSize: 10, fontWeight: '700', color: '#F06A35' },
    votePromptHighlight: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
    voteButtonsRow: { flexDirection: 'row', gap: 10 },
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
    voteButtonActiveText: { fontSize: 11, fontWeight: '700', color: colors.amberAlertText },
    voteButtonResolved: {
      backgroundColor: 'rgba(52, 199, 89, 0.12)',
      borderColor: colors.successGreen,
    },
    voteButtonResolvedText: { fontSize: 11, fontWeight: '700', color: colors.successGreen },
    // Solo lectura (usuario fuera del radio)
    readOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    readOnlyText: { fontSize: 11, color: colors.textMuted, flex: 1 },
    readOnlyCountsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    readOnlyCountText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    // Tarjeta de verificación tipo Waze
    proximityPromptCard: {
      backgroundColor: isDark ? 'rgba(240, 106, 53, 0.08)' : '#FFF7ED',
      borderWidth: 1.5,
      borderColor: '#F06A35',
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    proximityPromptHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    proximityPromptTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#F06A35',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    proximityPromptTagText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    proximityPromptDistance: { fontSize: 11, fontWeight: '700', color: '#F06A35' },
    proximityPromptBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    proximityIconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? '#261710' : '#FFEDD5',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(240, 106, 53, 0.3)',
    },
    proximityPromptTextCol: { flex: 1 },
    proximityPromptTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    proximityPromptDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    proximityActionRow: { flexDirection: 'row', gap: 8 },
    proximityBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
    },
    proximityBtnConfirm: { backgroundColor: '#F06A35' },
    proximityBtnConfirmText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    proximityBtnClear: {
      backgroundColor: isDark ? '#1C1F26' : '#F3F4F6',
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    proximityBtnClearText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
    bottomCtaContainer: { paddingHorizontal: 20, paddingTop: 8 },
  });
