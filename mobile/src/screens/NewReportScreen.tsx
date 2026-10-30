import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  Flame,
  Building2,
  Car,
  Camera,
  X,
  Crosshair,
  Search,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { AleraCategoryIcon } from '../components/AleraBrand';
import { api, generateUUID, resolveMediaUrl } from '../services/api';
import { getRealDeviceLocation } from '../services/location';
import { triggerLocalProximityAlert, markIncidentAsAlerted, incrementUserReportsCount } from '../services/notifications';
import { IncidentType } from '../types';

interface Props {
  navigation: any;
}

const DEVICE_STORAGE_KEY = '@alera_device_id';

interface PlaceSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export const NewReportScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const mapRef = useRef<MapView>(null);

  const [deviceId, setDeviceId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<IncidentType>('LANDSLIDE');
  const [description, setDescription] = useState<string>('');
  const [radiusMeters, setRadiusMeters] = useState<number>(2000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Imágenes de evidencia (Mínimo 1, Máximo 4)
  const [images, setImages] = useState<string[]>([]);

  // Ubicación GPS real del pin (tipo InDriver)
  const [locationCoord, setLocationCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: 4.5709,
    longitude: -74.2973,
  });
  const [locationAddress, setLocationAddress] = useState<string>('Detectando GPS real...');
  const [locatingGps, setLocatingGps] = useState<boolean>(true);

  // Buscador de direcciones
  const [addressSearch, setAddressSearch] = useState<string>('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState<boolean>(false);

  useEffect(() => {
    initDeviceId();
    acquireCurrentGpsLocation();
  }, []);

  const initDeviceId = async () => {
    try {
      let id = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
      // Validar si es un UUID de 36 caracteres. Si no, generar un UUID v4 estándar.
      if (!id || id.length !== 36) {
        id = generateUUID();
        await AsyncStorage.setItem(DEVICE_STORAGE_KEY, id);
      }
      setDeviceId(id);
    } catch {
      setDeviceId(generateUUID());
    }
  };

  const acquireCurrentGpsLocation = async () => {
    try {
      setLocatingGps(true);
      const loc = await getRealDeviceLocation();
      if (loc) {
        const target = { latitude: loc.latitude, longitude: loc.longitude };
        setLocationCoord(target);
        setLocationAddress(loc.address);
        mapRef.current?.animateToRegion({
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      } else {
        setLocationAddress('Toca el mapa para fijar tu ubicación');
      }
    } catch {
      setLocationAddress('Toca el mapa para fijar la ubicación');
    } finally {
      setLocatingGps(false);
    }
  };

  // Capa 1 y 2: Compresión en dispositivo y subida a almacenamiento desacoplado
  const processAndAttachImage = async (uri: string) => {
    try {
      // 1. Compresión en cliente: resolución máx 1024px de ancho, calidad 65% JPEG (~80 KB en vez de 4 MB) con Base64
      let compressedUri = uri;
      let base64Data: string | undefined;

      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        compressedUri = manipResult.uri;
        base64Data = manipResult.base64;
      } catch (manipErr) {
        console.warn('Compresión en cliente omitida:', manipErr);
      }

      // 2. Subida prioritaria en Base64 (100% compatible con React Native / Hermes en iOS y Android)
      if (base64Data) {
        try {
          const publicUrl = await api.uploadImageBase64(base64Data);
          setImages((prev) => [...prev, publicUrl]);
          return;
        } catch (uploadBase64Err) {
          console.warn('Subida Base64 falló, intentando subida estándar:', uploadBase64Err);
        }
      }

      // Respaldo secundario
      try {
        const publicUrl = await api.uploadImage(compressedUri);
        setImages((prev) => [...prev, publicUrl]);
      } catch (uploadErr) {
        console.warn('Subida estándar falló, guardando URI local:', uploadErr);
        setImages((prev) => [...prev, compressedUri]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo procesar la imagen seleccionada.');
    }
  };

  // Selector de Imágenes (Galería o Cámara)
  const handlePickImage = async () => {
    if (images.length >= 4) {
      Alert.alert('Límite alcanzado', 'Puedes adjuntar un máximo de 4 imágenes por reporte.');
      return;
    }

    Alert.alert('Adjuntar Foto de Evidencia', 'Selecciona el origen de la imagen:', [
      {
        text: 'Cámara',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para tomar la foto.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled && result.assets && result.assets[0].uri) {
            await processAndAttachImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar la foto.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled && result.assets && result.assets[0].uri) {
            await processAndAttachImage(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const searchAddressInColombia = async (query: string) => {
    setAddressSearch(query);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      setSearchingPlaces(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=co&limit=4&q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'AleraApp/1.0' } });
      const data: PlaceSuggestion[] = await res.json();
      setSuggestions(data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchingPlaces(false);
    }
  };

  const selectSuggestion = (place: PlaceSuggestion) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const newCoord = { latitude: lat, longitude: lon };

    setLocationCoord(newCoord);
    setLocationAddress(place.display_name.split(',').slice(0, 3).join(', '));
    setSuggestions([]);
    setAddressSearch('');

    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    });
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Descripción requerida', 'Por favor describe brevemente el incidente para alertar a los vecinos.');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Evidencia requerida', 'Debes adjuntar al menos 1 fotografía como evidencia del incidente.');
      return;
    }

    try {
      setIsSubmitting(true);
      const validDeviceId = deviceId && deviceId.length === 36 ? deviceId : generateUUID();

      const createdIncident = await api.createCommunityIncident({
        reporterDeviceId: validDeviceId,
        incidentType: selectedType,
        description: description.trim(),
        latitude: locationCoord.latitude,
        longitude: locationCoord.longitude,
        radiusMeters: radiusMeters,
        images: images,
      });

      if (createdIncident && createdIncident.id) {
        markIncidentAsAlerted(createdIncident.id);
        incrementUserReportsCount().catch(() => {});
      }

      Alert.alert(
        'Alerta Publicada',
        `El incidente ha sido registrado y notificado a la comunidad en un radio de ${(radiusMeters / 1000).toFixed(1)} km.`,
        [
          {
            text: 'Ver en Mapa',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error al publicar', err.message || 'No fue posible registrar el reporte en el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.backgroundPrimary} />

        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Nuevo Reporte de Incidente</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* PASO 1: MAPA NATIVO Y BUSCADOR TIPO INDRIVER */}
          <View style={styles.stepSection}>
            <Text style={styles.stepLabel}>1. UBICACIÓN DEL INCIDENTE (TIPO INDRIVER)</Text>

            <View style={styles.searchBarContainer}>
              <Search size={16} color={colors.textMuted} strokeWidth={1.8} />
              <TextInput
                style={styles.addressInput}
                placeholder="Escribe una dirección, barrio o municipio..."
                placeholderTextColor={colors.textMuted}
                value={addressSearch}
                onChangeText={searchAddressInColombia}
              />
              {searchingPlaces && <ActivityIndicator size="small" color={colors.gpsBlue} />}
            </View>

            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(item)}
                  >
                    <MapPin size={14} color={colors.gpsBlue} strokeWidth={2} />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.mapCard}>
              <MapErrorBoundary fallbackMessage="Toca el botón GPS para centrar coordenadas.">
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    latitude: locationCoord.latitude,
                    longitude: locationCoord.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  userInterfaceStyle={isDark ? 'dark' : 'light'}
                  onPress={(e) => {
                    const coord = e.nativeEvent.coordinate;
                    setLocationCoord(coord);
                  }}
                >
                  <Circle
                    center={locationCoord}
                    radius={radiusMeters}
                    fillColor={colors.gpsBlueFill}
                    strokeColor={colors.gpsBlue}
                    strokeWidth={1.5}
                  />

                  <Marker
                    coordinate={locationCoord}
                    draggable
                    onDragEnd={(e) => {
                      const coord = e.nativeEvent.coordinate;
                      setLocationCoord(coord);
                    }}
                  >
                    <View style={styles.customPin}>
                      <MapPin size={26} color={colors.seismicAccent} strokeWidth={2.5} />
                    </View>
                  </Marker>
                </MapView>
              </MapErrorBoundary>

              <TouchableOpacity
                style={styles.gpsButtonFloating}
                onPress={acquireCurrentGpsLocation}
                activeOpacity={0.8}
              >
                {locatingGps ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Crosshair size={20} color={colors.textPrimary} strokeWidth={2} />
                )}
              </TouchableOpacity>

              <View style={styles.locationPill}>
                <MapPin size={12} color={colors.gpsBlue} strokeWidth={2} />
                <Text style={styles.locationPillText} numberOfLines={1}>
                  {locationAddress}
                </Text>
              </View>
            </View>

            <Text style={styles.subLabel}>Radio de notificación a vecinos:</Text>
            <View style={styles.radiusRow}>
              {[500, 1000, 2000, 5000].map((r) => {
                const isSel = radiusMeters === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusPill, isSel && styles.radiusPillActive]}
                    onPress={() => setRadiusMeters(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.radiusPillText, isSel && styles.radiusPillTextActive]}>
                      {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* PASO 2: TIPO DE INCIDENTE */}
          <View style={styles.stepSection}>
            <Text style={styles.stepLabel}>2. TIPO DE INCIDENTE</Text>
            <View style={styles.typesGrid}>
              <TouchableOpacity
                style={[
                  styles.typeCard,
                  selectedType === 'LANDSLIDE' && styles.typeCardActive,
                ]}
                onPress={() => setSelectedType('LANDSLIDE')}
                activeOpacity={0.8}
              >
                <AleraCategoryIcon
                  type="LANDSLIDE"
                  size={26}
                  color={selectedType === 'LANDSLIDE' ? colors.seismicAccent : colors.amberAlertText}
                />
                <Text style={styles.typeTitle}>Derrumbe</Text>
                <Text style={styles.typeSubtitle}>Deslizamiento de tierra</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  selectedType === 'FIRE' && styles.typeCardActive,
                ]}
                onPress={() => setSelectedType('FIRE')}
                activeOpacity={0.8}
              >
                <AleraCategoryIcon
                  type="FIRE"
                  size={26}
                  color={selectedType === 'FIRE' ? colors.seismicAccent : colors.seismicRed}
                />
                <Text style={styles.typeTitle}>Incendio</Text>
                <Text style={styles.typeSubtitle}>Forestal o estructural</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  selectedType === 'STRUCTURAL_DAMAGE' && styles.typeCardActive,
                ]}
                onPress={() => setSelectedType('STRUCTURAL_DAMAGE')}
                activeOpacity={0.8}
              >
                <AleraCategoryIcon
                  type="STRUCTURAL_DAMAGE"
                  size={26}
                  color={selectedType === 'STRUCTURAL_DAMAGE' ? colors.seismicAccent : colors.textSecondary}
                />
                <Text style={styles.typeTitle}>Estructura</Text>
                <Text style={styles.typeSubtitle}>Grieta o colapso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  selectedType === 'ROAD_BLOCK' && styles.typeCardActive,
                ]}
                onPress={() => setSelectedType('ROAD_BLOCK')}
                activeOpacity={0.8}
              >
                <AleraCategoryIcon
                  type="ROAD_BLOCK"
                  size={26}
                  color={selectedType === 'ROAD_BLOCK' ? colors.seismicAccent : colors.textPrimary}
                />
                <Text style={styles.typeTitle}>Vía Obstruida</Text>
                <Text style={styles.typeSubtitle}>Accidente o bloqueo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PASO 3: DESCRIPCIÓN */}
          <View style={styles.stepSection}>
            <Text style={styles.stepLabel}>3. DESCRIPCIÓN DETALLADA</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe lo que observas (carril afectado, postes caídos, heridos, magnitud visual)..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* PASO 4: FOTOS DE EVIDENCIA (1 A 4 IMÁGENES) */}
          <View style={styles.stepSection}>
            <View style={styles.imagesHeaderRow}>
              <Text style={styles.stepLabel}>4. FOTOS DE EVIDENCIA</Text>
              <Text style={styles.imagesCountBadge}>{images.length}/4 fotos</Text>
            </View>

            {/* Galería de miniaturas */}
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsScroll}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri: resolveMediaUrl(uri) }} style={styles.thumbnailImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(index)}
                      activeOpacity={0.7}
                    >
                      <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Botón para adjuntar foto */}
            {images.length < 4 && (
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <View style={styles.uploadRow}>
                  <Camera size={20} color={colors.seismicAccent} strokeWidth={1.8} />
                  <Text style={styles.uploadText}>
                    {images.length === 0 ? '+ Adjuntar Foto de Evidencia (Mín 1)' : '+ Agregar Otra Foto (Máx 4)'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* BOTÓN CTA FINAL */}
          <View style={styles.submitContainer}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.ctaPrimary} />
            ) : (
              <PrimaryButton
                title="Publicar Reporte Comunitario"
                onPress={handleSubmit}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    keyboardContainer: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
    },
    container: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
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
    stepSection: {
      marginBottom: 20,
    },
    stepLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    searchBarContainer: {
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
    addressInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
    },
    suggestionsContainer: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceCardBorder,
    },
    suggestionText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 12,
    },
    mapCard: {
      height: 190,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: isDark ? '#11151C' : '#E5E7EB',
    },
    customPin: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    gpsButtonFloating: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    locationPill: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(24, 27, 32, 0.94)' : 'rgba(255, 255, 255, 0.94)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    locationPillText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '600',
      flex: 1,
    },
    subLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 10,
      marginBottom: 8,
    },
    radiusRow: {
      flexDirection: 'row',
      gap: 8,
    },
    radiusPill: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    radiusPillActive: {
      backgroundColor: colors.gpsBlueFill,
      borderColor: colors.gpsBlue,
    },
    radiusPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    radiusPillTextActive: {
      color: colors.gpsBlue,
      fontWeight: '700',
    },
    typesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    typeCard: {
      width: '48%',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    typeCardActive: {
      borderColor: colors.seismicAccent,
      backgroundColor: isDark ? '#201614' : '#FFEDD5',
    },
    typeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 4,
    },
    typeSubtitle: {
      fontSize: 11,
      color: colors.textMuted,
    },
    textAreaContainer: {
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: colors.surfaceInputBorder,
      borderRadius: 12,
      padding: 12,
      height: 110,
    },
    textArea: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    imagesHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    imagesCountBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.seismicAccent,
      backgroundColor: isDark ? '#261710' : '#FFEDD5',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
  thumbnailsScroll: {
    marginBottom: 10,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  thumbnailImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceCardBorder,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.seismicRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBox: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfaceCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  submitContainer: {
    marginTop: 10,
  },
});