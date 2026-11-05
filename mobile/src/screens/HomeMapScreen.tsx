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
import { AleraInteractiveMap, AleraInteractiveMapRef } from '../components/AleraInteractiveMap';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import {
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
  X,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AleraFullLogo } from '../components/AleraBrand';
import { api, generateUUID } from '../services/api';
import { getRealDeviceLocation } from '../services/location';
import { SeismicEvent } from '../types';

interface Props {
  navigation: any;
}

// Catalogo exhaustivo de coordenadas para capitales y municipios principales de Colombia
// Permite resolucion instantanea sin importar si el usuario escribe con o sin tildes.
const COLOMBIAN_CITIES: Record<string, { lat: number; lon: number; name: string }> = {
  bogota: { lat: 4.7110, lon: -74.0721, name: 'Bogota' },
  medellin: { lat: 6.2442, lon: -75.5812, name: 'Medellin' },
  cali: { lat: 3.4516, lon: -76.5320, name: 'Cali' },
  barranquilla: { lat: 10.9685, lon: -74.7813, name: 'Barranquilla' },
  cartagena: { lat: 10.3910, lon: -75.4794, name: 'Cartagena' },
  cucuta: { lat: 7.8939, lon: -72.5078, name: 'Cucuta' },
  bucaramanga: { lat: 7.1254, lon: -73.1198, name: 'Bucaramanga' },
  pereira: { lat: 4.8133, lon: -75.6961, name: 'Pereira' },
  santamarta: { lat: 11.2408, lon: -74.1990, name: 'Santa Marta' },
  'santa marta': { lat: 11.2408, lon: -74.1990, name: 'Santa Marta' },
  ibague: { lat: 4.4389, lon: -75.2322, name: 'Ibague' },
  pasto: { lat: 1.2136, lon: -77.2811, name: 'Pasto' },
  manizales: { lat: 5.0689, lon: -75.5174, name: 'Manizales' },
  neiva: { lat: 2.9273, lon: -75.2819, name: 'Neiva' },
  villavicencio: { lat: 4.1420, lon: -73.6266, name: 'Villavicencio' },
  armenia: { lat: 4.5339, lon: -75.6811, name: 'Armenia' },
  valledupar: { lat: 10.4631, lon: -73.2532, name: 'Valledupar' },
  monteria: { lat: 8.7479, lon: -75.8814, name: 'Monteria' },
  sincelejo: { lat: 9.3047, lon: -75.3978, name: 'Sincelejo' },
  popayan: { lat: 2.4448, lon: -76.6147, name: 'Popayan' },
  tunja: { lat: 5.5353, lon: -73.3678, name: 'Tunja' },
  riohacha: { lat: 11.5444, lon: -72.9072, name: 'Riohacha' },
  florencia: { lat: 1.6144, lon: -75.6062, name: 'Florencia' },
  yopal: { lat: 5.3378, lon: -72.3959, name: 'Yopal' },
  quibdo: { lat: 5.6919, lon: -76.6583, name: 'Quibdo' },
  mocoa: { lat: 1.1483, lon: -76.6472, name: 'Mocoa' },
  sanandres: { lat: 12.5847, lon: -81.7006, name: 'San Andres' },
  'san andres': { lat: 12.5847, lon: -81.7006, name: 'San Andres' },
  arauca: { lat: 7.0847, lon: -70.7591, name: 'Arauca' },
  leticia: { lat: -4.2153, lon: -69.9406, name: 'Leticia' },
  inirida: { lat: 3.8653, lon: -67.9239, name: 'Inirida' },
  mitu: { lat: 1.1983, lon: -70.1733, name: 'Mitu' },
  puertocarreno: { lat: 6.1890, lon: -67.4859, name: 'Puerto Carreno' },
  'puerto carreno': { lat: 6.1890, lon: -67.4859, name: 'Puerto Carreno' },
  soacha: { lat: 4.5800, lon: -74.2167, name: 'Soacha' },
  bello: { lat: 6.3333, lon: -75.5500, name: 'Bello' },
  palmira: { lat: 3.5394, lon: -76.3036, name: 'Palmira' },
  buenaventura: { lat: 3.8801, lon: -77.0312, name: 'Buenaventura' },
  barrancabermeja: { lat: 7.0653, lon: -73.8547, name: 'Barrancabermeja' },
  tulua: { lat: 4.0847, lon: -76.1954, name: 'Tulua' },
  envigado: { lat: 6.1667, lon: -75.5833, name: 'Envigado' },
  itagui: { lat: 6.1728, lon: -75.6094, name: 'Itagui' },
  dosquebradas: { lat: 4.8333, lon: -75.6667, name: 'Dosquebradas' },
  sogamoso: { lat: 5.7144, lon: -72.9339, name: 'Sogamoso' },
  duitama: { lat: 5.8267, lon: -73.0336, name: 'Duitama' },
  girardot: { lat: 4.3014, lon: -74.8058, name: 'Girardot' },
  facatativa: { lat: 4.8144, lon: -74.3547, name: 'Facatativa' },
  zipaquira: { lat: 5.0267, lon: -74.0042, name: 'Zipaquira' },
  chia: { lat: 4.8633, lon: -74.0558, name: 'Chia' },
  fusagasuga: { lat: 4.3372, lon: -74.3644, name: 'Fusagasuga' },
  cartago: { lat: 4.7464, lon: -75.9117, name: 'Cartago' },
  magangue: { lat: 9.2428, lon: -74.7547, name: 'Magangue' },
  piedecuesta: { lat: 6.9881, lon: -73.0494, name: 'Piedecuesta' },
  giron: { lat: 7.0683, lon: -73.1697, name: 'Giron' },
  floridablanca: { lat: 7.0622, lon: -73.0864, name: 'Floridablanca' },
  apartado: { lat: 7.8825, lon: -76.6258, name: 'Apartado' },
  turbo: { lat: 8.0928, lon: -76.7283, name: 'Turbo' },
  caucasia: { lat: 7.9861, lon: -75.1956, name: 'Caucasia' },
  ipiales: { lat: 0.8292, lon: -77.6433, name: 'Ipiales' },
  tumaco: { lat: 1.7986, lon: -78.8156, name: 'Tumaco' },
  santander: { lat: 7.0, lon: -73.2, name: 'Santander' },
  antioquia: { lat: 6.5, lon: -75.5, name: 'Antioquia' },
  cundinamarca: { lat: 4.8, lon: -74.1, name: 'Cundinamarca' },
  valle: { lat: 3.8, lon: -76.5, name: 'Valle del Cauca' },
  boyaca: { lat: 5.5, lon: -73.0, name: 'Boyaca' },
  tolima: { lat: 4.0, lon: -75.2, name: 'Tolima' },
  huila: { lat: 2.5, lon: -75.5, name: 'Huila' },
  caldas: { lat: 5.2, lon: -75.3, name: 'Caldas' },
  risaralda: { lat: 4.9, lon: -75.8, name: 'Risaralda' },
  quindio: { lat: 4.5, lon: -75.7, name: 'Quindio' },
  meta: { lat: 3.5, lon: -73.0, name: 'Meta' },
  narino: { lat: 1.5, lon: -77.5, name: 'Narino' },
  cauca: { lat: 2.5, lon: -76.8, name: 'Cauca' },
  cesar: { lat: 9.5, lon: -73.5, name: 'Cesar' },
  cordoba: { lat: 8.5, lon: -75.5, name: 'Cordoba' },
  sucre: { lat: 9.0, lon: -75.0, name: 'Sucre' },
  magdalena: { lat: 10.5, lon: -74.2, name: 'Magdalena' },
  guajira: { lat: 11.5, lon: -72.8, name: 'La Guajira' },
  'la guajira': { lat: 11.5, lon: -72.8, name: 'La Guajira' },
  casanare: { lat: 5.5, lon: -71.5, name: 'Casanare' },
  choco: { lat: 5.5, lon: -76.8, name: 'Choco' },
  caqueta: { lat: 1.0, lon: -74.0, name: 'Caqueta' },
  putumayo: { lat: 0.5, lon: -76.0, name: 'Putumayo' },
  guaviare: { lat: 2.0, lon: -72.0, name: 'Guaviare' },
  vaupes: { lat: 1.0, lon: -70.5, name: 'Vaupes' },
  vichada: { lat: 4.5, lon: -69.5, name: 'Vichada' },
  guainia: { lat: 2.5, lon: -68.5, name: 'Guainia' },
  amazonas: { lat: -2.0, lon: -71.5, name: 'Amazonas' },
};

// Normalizacion fonetica y remocion de diacriticos
const normalizeSearchText = (text: string): string =>
  (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Calculo esferico Haversine de distancia en km entre dos puntos
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

// Formato conciso de fecha y hora
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
  return `${dayMonth} · ${time} COT`;
};

export const HomeMapScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<AleraInteractiveMapRef>(null);
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Busqueda y localizacion de municipios
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchingCity, setSearchingCity] = useState<boolean>(false);
  const [searchedCity, setSearchedCity] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Control para mostrar u ocultar el radio de afectacion
  const [showRadius, setShowRadius] = useState<boolean>(true);

  // Ubicacion GPS real del celular
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  // Filtro de temporalidad: 'TODAY' (ultimas 24 horas) o 'ALL' (todos los recientes)
  const [timeFilter, setTimeFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const EVENTS_CACHE_KEY = '@alera_events_cache';

  // Actualizacion automatica al enfocar pantalla
  useFocusEffect(
    useCallback(() => {
      loadRecentEvents(false);
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

      // Reportar ubicacion para calculo de alertas
      try {
        let devId = await AsyncStorage.getItem('@alera_device_id');
        if (!devId) {
          devId = generateUUID();
          await AsyncStorage.setItem('@alera_device_id', devId);
        }
        api.updateLocation(devId, loc.latitude, loc.longitude).catch(() => {});
      } catch {}
    }
    await loadRecentEvents(true);
  };

  const loadRecentEvents = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setErrorMessage(null);

      // Carga instantanea desde cache local
      if (showSpinner) {
        try {
          const cached = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setEvents(parsed);
              setSelectedEventId(parsed[0].id);
              setLoading(false);
            }
          }
        } catch {}
      }

      const data = await api.getRecentSeismicEvents(500);
      if (data && data.length > 0) {
        setEvents(data);
        if (!selectedEventId) {
          setSelectedEventId(data[0].id);
        }
        AsyncStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(data)).catch(() => {});
      }
    } catch {
      setErrorMessage('No fue posible conectar con el servidor de Alera (Spring Boot).');
    } finally {
      setLoading(false);
    }
  };

  // Buscador de municipios de Colombia con soporte para tildes y sin tildes
  const handleSearchCity = async (textOverride?: string) => {
    const raw = (textOverride !== undefined ? textOverride : searchQuery).trim();
    if (!raw) {
      handleClearSearch();
      return;
    }

    try {
      setSearchingCity(true);
      const clean = normalizeSearchText(raw);

      let targetLat: number | null = null;
      let targetLon: number | null = null;
      let targetName = raw;

      // 1. Busqueda instantanea en catalogo de Colombia (sin red, cero latencia)
      if (COLOMBIAN_CITIES[clean]) {
        targetLat = COLOMBIAN_CITIES[clean].lat;
        targetLon = COLOMBIAN_CITIES[clean].lon;
        targetName = COLOMBIAN_CITIES[clean].name;
      } else {
        // 2. Busqueda en Nominatim con pais Colombia forzado
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=co&limit=1&q=${encodeURIComponent(
          clean + ', Colombia'
        )}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'AleraApp/1.0' } });
        const places = await res.json();
        if (places && places.length > 0) {
          targetLat = parseFloat(places[0].lat);
          targetLon = parseFloat(places[0].lon);
          targetName = places[0].display_name ? places[0].display_name.split(',')[0] : raw;
        }
      }

      if (targetLat !== null && targetLon !== null) {
        setSearchedCity({ latitude: targetLat, longitude: targetLon, name: targetName });

        // Centrar suavemente en la ciudad con zoom ideal (delta 0.6 = zoom 9.2 para abarcar municipio y fallas cercanas)
        mapRef.current?.animateToRegion({
          latitude: targetLat,
          longitude: targetLon,
          latitudeDelta: 0.6,
          longitudeDelta: 0.6,
        });
      }
    } catch {
      // Ignorar errores transitorios de red
    } finally {
      setSearchingCity(false);
    }
  };

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setSearchedCity(null);
      return;
    }
    const clean = normalizeSearchText(trimmed);
    if (COLOMBIAN_CITIES[clean]) {
      const city = COLOMBIAN_CITIES[clean];
      setSearchedCity({ latitude: city.lat, longitude: city.lon, name: city.name });
      mapRef.current?.animateToRegion({
        latitude: city.lat,
        longitude: city.lon,
        latitudeDelta: 0.6,
        longitudeDelta: 0.6,
      });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchedCity(null);
    if (userCoord) {
      mapRef.current?.animateToRegion({
        latitude: userCoord.latitude,
        longitude: userCoord.longitude,
        latitudeDelta: 2.5,
        longitudeDelta: 2.5,
      });
    } else {
      mapRef.current?.animateToRegion({
        latitude: 4.5709,
        longitude: -74.2973,
        latitudeDelta: 6.0,
        longitudeDelta: 6.0,
      });
    }
  };

  const getMagnitudeColor = (mag: number): string => {
    if (mag >= 5.0) return colors.seismicRed;
    if (mag >= 4.0) return colors.seismicAccent;
    if (mag >= 3.0) return colors.amberAlertText;
    return colors.successGreen;
  };

  const todayEventsCount = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      const eventTime = new Date(e.originTime).getTime();
      return now - eventTime <= ONE_DAY_MS;
    }).length;
  }, [events]);

  // Lista de sismos filtrados y ordenados
  // Si el usuario busco una ciudad, se ordenan mostrando los sismos mas cercanos a esa ciudad
  const filteredEvents = useMemo(() => {
    const now = Date.now();
    let list = [...events];

    if (timeFilter === 'TODAY') {
      list = list.filter((e) => {
        const eventTime = new Date(e.originTime).getTime();
        return now - eventTime <= ONE_DAY_MS;
      });
    }

    if (searchedCity) {
      return list
        .map((e) => ({
          ...e,
          _dist: calculateDistanceKm(searchedCity.latitude, searchedCity.longitude, e.latitude, e.longitude),
        }))
        .sort((a, b) => a._dist - b._dist);
    }

    const query = normalizeSearchText(searchQuery);
    if (query.length > 0) {
      return list.filter((e) => {
        const desc = normalizeSearchText(e.epicenterDescription);
        return desc.includes(query);
      });
    }

    return list;
  }, [events, searchQuery, timeFilter, searchedCity]);

  const mapMarkers = useMemo(() => {
    const list: any[] = filteredEvents.map((e) => ({
      id: e.id,
      coordinate: { latitude: e.latitude, longitude: e.longitude },
      badgeText: `${e.magnitude.toFixed(1)} M`,
      badgeColor: getMagnitudeColor(e.magnitude),
      title: e.epicenterDescription,
      onPress: () => {
        setSelectedEventId(e.id);
        navigation.navigate('SeismicDetail', { event: e });
      },
    }));

    // Si hay una ciudad buscada, agregar pin distintivo en el mapa para ubicar la ciudad
    if (searchedCity) {
      list.unshift({
        id: `searched-city-${searchedCity.name}`,
        coordinate: { latitude: searchedCity.latitude, longitude: searchedCity.longitude },
        badgeText: searchedCity.name,
        badgeColor: colors.gpsBlue,
        iconName: 'pin',
        title: `Municipio buscado: ${searchedCity.name}`,
      });
    }

    return list;
  }, [filteredEvents, searchedCity, colors.gpsBlue]);

  // Circulos de afectacion sismica: visibles desde 3.0 M y para el sismo seleccionado
  const mapCircles = useMemo(() => {
    if (!showRadius) return [];
    return filteredEvents
      .filter((e) => e.magnitude >= 3.0 || e.id === selectedEventId)
      .map((e) => ({
        id: `circle-${e.id}`,
        center: { latitude: e.latitude, longitude: e.longitude },
        radius: Math.max(20000, e.magnitude * 16000),
        fillColor: e.magnitude >= 5.0 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(240, 106, 53, 0.18)',
        strokeColor: e.magnitude >= 5.0 ? '#EF4444' : colors.seismicAccent,
        strokeWidth: 2,
      }));
  }, [filteredEvents, showRadius, selectedEventId, colors.seismicAccent]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. TOP HEADER BRAND CON TOGGLE DE TEMA */}
      <View style={styles.header}>
        <AleraFullLogo size={36} />

        <View style={styles.headerActionsRow}>
          {/* Boton de Cambio de Tema */}
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

          {/* Boton de Ajustes Rapidos */}
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('AlertSettings')}
            activeOpacity={0.8}
            accessibilityLabel="Configuracion de alertas"
          >
            <Radio size={19} color={colors.textSecondary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SEARCH / FILTER BAR ACTIVO CON BOTON DE LIMPIEZA */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color={colors.textMuted} strokeWidth={1.8} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar municipio o ciudad de Colombia..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={() => handleSearchCity()}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7} style={styles.clearSearchInputButton}>
              <X size={16} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
          {searchingCity ? (
            <ActivityIndicator size="small" color={colors.seismicAccent} />
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleSearchCity()}>
              <SlidersHorizontal size={18} color={colors.textSecondary} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. MAPA NATIVO EXPANDIDO CON CONTROLES FLOTANTES DESACOPLADOS */}
      <View style={styles.mapWrapper}>
        <View style={styles.mapContainer}>
          <MapErrorBoundary fallbackMessage="El mapa interactivo requiere soporte de servicios de localizacion. Los sismos recientes se listan abajo.">
            <AleraInteractiveMap
              ref={mapRef}
              initialRegion={{
                latitude: userCoord ? userCoord.latitude : 4.5709,
                longitude: userCoord ? userCoord.longitude : -74.2973,
                latitudeDelta: 6.0,
                longitudeDelta: 6.0,
              }}
              region={searchedCity ? {
                latitude: searchedCity.latitude,
                longitude: searchedCity.longitude,
                latitudeDelta: 0.6,
                longitudeDelta: 0.6,
              } : undefined}
              userCoord={userCoord}
              markers={mapMarkers}
              circles={mapCircles}
              isDark={isDark}
              onMarkerPress={(markerId) => {
                const selected = filteredEvents.find((e) => e.id === markerId);
                if (selected) {
                  setSelectedEventId(selected.id);
                  navigation.navigate('SeismicDetail', { event: selected });
                }
              }}
            />
          </MapErrorBoundary>
        </View>

        {/* Boton flotante: Mostrar / Ocultar Radio de Afectacion */}
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

        {/* Boton GPS recentrar */}
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
            loadRecentEvents(true);
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Crosshair size={20} color={colors.textPrimary} strokeWidth={1.8} />
          )}
        </TouchableOpacity>
      </View>

      {/* 4. SECCION INFERIOR UNIFICADA: FILTROS + SISMOS RECIENTES */}
      <View style={styles.eventsSection}>
        {/* Cabecera adaptativa: 2 filas limpias al buscar ciudad para eliminar cualquier colision */}
        <View style={styles.sectionHeaderContainer}>
          {searchedCity ? (
            <View style={styles.searchActiveHeader}>
              <View style={styles.searchActiveTitleRow}>
                <View style={styles.searchCityBadgeRow}>
                  <MapPin size={13} color={colors.seismicAccent} strokeWidth={2.4} />
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    CERCA DE {searchedCity.name.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.clearSearchBadge}
                  onPress={handleClearSearch}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={11} color={colors.seismicAccent} strokeWidth={2.5} />
                  <Text style={styles.clearSearchBadgeText}>Quitar filtro</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchActiveFiltersRow}>
                <View style={styles.timeFilterGroup}>
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
                      Hoy: {todayEventsCount}
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
                        timeFilter === 'ALL' && styles.timeFilterChipActive,
                      ]}
                    >
                      Todos ({events.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.historyLinkButtonLarge}
                  onPress={() => navigation.navigate('SeismicList')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.historyLinkTextLarge}>Lista</Text>
                  <ChevronRight size={17} color={colors.seismicAccent} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>SISMOS RECIENTES</Text>

              <View style={styles.filterControlsRow}>
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
                    Hoy: {todayEventsCount}
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
                      timeFilter === 'ALL' && styles.timeFilterChipActive,
                    ]}
                  >
                    Todos ({events.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.historyLinkButtonLarge}
                  onPress={() => navigation.navigate('SeismicList')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.historyLinkTextLarge}>Lista</Text>
                  <ChevronRight size={17} color={colors.seismicAccent} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>
          )}
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
            <TouchableOpacity style={styles.retryButton} onPress={() => { loadRecentEvents(true); }}>
              <RefreshCw size={14} color={colors.textPrimary} strokeWidth={2} />
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.centerFeedbackBox}>
            <Text style={styles.feedbackText}>
              {timeFilter === 'TODAY'
                ? 'No se registran sismos en las ultimas 24 horas en el catalogo.'
                : 'No se registran sismos en este momento en la base de datos.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.horizontalScrollContent,
              { paddingBottom: Math.max(insets.bottom, 12) + 6 },
            ]}
          >
            {filteredEvents.map((item) => {
              const magColor = getMagnitudeColor(item.magnitude);
              const isSelected = selectedEventId === item.id;
              const relativeTime = getRelativeTime(item.originTime);
              const conciseTime = formatConciseDateTime(item.originTime);

              // Distancia respecto a la ciudad buscada o al GPS del usuario
              const referenceCoord = searchedCity ? searchedCity : userCoord;
              const referenceName = searchedCity ? searchedCity.name : null;
              const distanceKm = referenceCoord
                ? calculateDistanceKm(referenceCoord.latitude, referenceCoord.longitude, item.latitude, item.longitude)
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
                  {/* Fila Superior: Badge Magnitud + Tiempo Relativo */}
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

                  {/* Epicentro Geografico */}
                  <Text style={styles.cardEpicenter} numberOfLines={1}>
                    {item.epicenterDescription}
                  </Text>

                  {/* Fecha exacta y Hora Legal Colombia (COT) */}
                  <Text style={styles.dateTimeSubline}>
                    {conciseTime}
                  </Text>

                  {/* Fila Inferior: Profundidad y Distancia al Epicentro */}
                  <View style={styles.cardDetailsRow}>
                    <View style={styles.detailItem}>
                      <MapPin size={11} color={colors.textSecondary} strokeWidth={1.8} />
                      <Text style={styles.detailText}>Prof: {item.depthKm.toFixed(0)} km</Text>
                    </View>

                    {distanceKm !== null ? (
                      <View style={styles.detailItem}>
                        <Navigation size={11} color={colors.gpsBlue} strokeWidth={1.8} />
                        <Text style={[styles.detailText, { color: colors.gpsBlue, fontWeight: '700' }]}>
                          A {distanceKm} km {referenceName ? `de ${referenceName}` : ''}
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
      paddingVertical: 8,
    },
    headerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerActionButton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchSection: {
      paddingHorizontal: 20,
      marginBottom: 6,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: colors.surfaceInputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      height: 42,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      paddingVertical: 0,
    },
    clearSearchInputButton: {
      padding: 4,
    },
    mapWrapper: {
      flex: 1,
      minHeight: 330,
      marginHorizontal: 16,
      position: 'relative',
    },
    mapContainer: {
      flex: 1,
      minHeight: 330,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      backgroundColor: isDark ? '#11151C' : '#E2E8F0',
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
      zIndex: 10,
      elevation: 6,
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
      elevation: 6,
      zIndex: 10,
    },
    eventsSection: {
      marginTop: 8,
      paddingBottom: 2,
    },
    sectionHeaderContainer: {
      paddingHorizontal: 18,
      marginBottom: 8,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.6,
    },
    searchActiveHeader: {
      gap: 8,
    },
    searchActiveTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    searchCityBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flex: 1,
      marginRight: 8,
    },
    searchActiveFiltersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeFilterGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    clearSearchBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#261710' : '#FFEDD5',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(240, 106, 53, 0.4)' : 'rgba(240, 106, 53, 0.3)',
    },
    clearSearchBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.seismicAccent,
    },
    filterControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timeFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      gap: 4,
    },
    timeFilterChipActive: {
      backgroundColor: isDark ? 'rgba(240, 106, 53, 0.15)' : 'rgba(240, 106, 53, 0.1)',
      borderColor: colors.seismicAccent,
    },
    timeFilterDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    timeFilterText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeFilterTextActive: {
      color: colors.seismicAccent,
      fontWeight: '700',
    },
    historyLinkButtonLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingLeft: 4,
    },
    historyLinkTextLarge: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.seismicAccent,
    },
    horizontalScrollContent: {
      paddingHorizontal: 18,
      gap: 12,
    },
    eventCard: {
      width: 255,
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      padding: 12,
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
      fontSize: 13,
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
      marginHorizontal: 18,
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
  });
