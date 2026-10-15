import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  MapPin,
  Award,
  ChevronRight,
  Sliders,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Edit2,
  Check,
  Shield,
  Bell,
  ThumbsUp,
  Flame,
  Globe,
  Settings,
  X,
  Compass,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { getRealDeviceLocation } from '../services/location';

interface Props {
  navigation: any;
}

const DEVICE_STORAGE_KEY = '@alera_device_id';
const NICKNAME_STORAGE_KEY = '@alera_user_nickname';
const MONITORED_CITY_STORAGE_KEY = '@alera_monitored_city';
const DISTANCE_UNIT_STORAGE_KEY = '@alera_unit_preference';

const COLOMBIAN_CITIES = [
  'Bogotá D.C.',
  'Medellín',
  'Cali',
  'Bucaramanga',
  'Cúcuta',
  'Pasto',
  'Pereira',
  'Manizales',
  'Barranquilla',
  'Cartagena',
  'Ibagué',
  'Villavicencio',
];

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [deviceId, setDeviceId] = useState<string>('cargando...');
  const [nickname, setNickname] = useState<string>('Ciudadano Alera');
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);
  const [tempNickname, setTempNickname] = useState<string>('');

  const [monitoredCity, setMonitoredCity] = useState<string>('Bucaramanga');
  const [isCityModalVisible, setIsCityModalVisible] = useState<boolean>(false);
  const [gpsCity, setGpsCity] = useState<string>('Detectando...');

  const [unitPreference, setUnitPreference] = useState<'km' | 'mi'>('km');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedId = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
      if (storedId) setDeviceId(storedId);

      const storedNick = await AsyncStorage.getItem(NICKNAME_STORAGE_KEY);
      if (storedNick) setNickname(storedNick);

      const storedCity = await AsyncStorage.getItem(MONITORED_CITY_STORAGE_KEY);
      if (storedCity) setMonitoredCity(storedCity);

      const storedUnit = await AsyncStorage.getItem(DISTANCE_UNIT_STORAGE_KEY);
      if (storedUnit === 'mi' || storedUnit === 'km') setUnitPreference(storedUnit);

      const loc = await getRealDeviceLocation();
      if (loc && loc.city) {
        setGpsCity(loc.city);
      } else {
        setGpsCity('Colombia');
      }
    } catch {
      // Ignorar fallback
    }
  };

  const handleSaveNickname = async () => {
    const trimmed = tempNickname.trim();
    if (trimmed.length > 0) {
      setNickname(trimmed);
      await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, trimmed);
    }
    setIsEditingNickname(false);
  };

  const handleSelectCity = async (city: string) => {
    setMonitoredCity(city);
    await AsyncStorage.setItem(MONITORED_CITY_STORAGE_KEY, city);
    setIsCityModalVisible(false);
  };

  const handleToggleUnit = async () => {
    const newUnit = unitPreference === 'km' ? 'mi' : 'km';
    setUnitPreference(newUnit);
    await AsyncStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, newUnit);
  };

  const handleClearAlertCache = async () => {
    Alert.alert(
      'Limpiar Registro de Alertas',
      '¿Deseas vaciar el historial de incidentes notificados en este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@alera_alerted_incidents');
            Alert.alert('Registro Limpio', 'Se ha restablecido la memoria de alertas de la app.');
          },
        },
      ]
    );
  };

  const handleResetDevice = async () => {
    Alert.alert(
      'Restablecer Identificador',
      '¿Deseas desvincular este dispositivo y generar un identificador anónimo nuevo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(DEVICE_STORAGE_KEY);
            await loadUserData();
            Alert.alert('Completado', 'Nuevo identificador generado correctamente.');
          },
        },
      ]
    );
  };

  const shortenedId =
    deviceId && deviceId.length > 12
      ? `${deviceId.substring(0, 8)}...${deviceId.substring(deviceId.length - 4)}`
      : deviceId;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.backgroundPrimary} />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil Ciudadano</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('AlertSettings')}
          activeOpacity={0.8}
          accessibilityLabel="Configuración de Alertas"
        >
          <Settings size={20} color={colors.textSecondary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
      >
        {/* TARJETA DE IDENTIDAD CIUDADANA (ESTILO MI TERREMOTO) */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <User size={30} color={colors.seismicAccent} strokeWidth={2} />
            </View>
            <View style={styles.verifiedBadge}>
              <Shield size={12} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.nicknameRow}>
              <Text style={styles.nicknameText}>{nickname}</Text>
              <TouchableOpacity
                onPress={() => {
                  setTempNickname(nickname);
                  setIsEditingNickname(true);
                }}
                activeOpacity={0.7}
                style={styles.editIconButton}
              >
                <Edit2 size={14} color={colors.textSecondary} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            <View style={styles.rankPill}>
              <Award size={12} color={colors.seismicAccent} strokeWidth={2} />
              <Text style={styles.rankPillText}>Centinela Comunitario Activo</Text>
            </View>

            <Text style={styles.deviceIdText} numberOfLines={1}>
              Dispositivo: {shortenedId}
            </Text>
          </View>
        </View>

        {/* UBICACIÓN PERSONAL Y MONITOREADA (INSPIRADO EN MI TERREMOTO) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>UBICACIONES MONITOREADAS</Text>

          <View style={styles.cardGroup}>
            {/* GPS Actual */}
            <View style={styles.settingRow}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#14202B' : '#E0F2FE' }]}>
                <MapPin size={18} color={colors.gpsBlue} strokeWidth={2} />
              </View>
              <View style={styles.settingCol}>
                <Text style={styles.settingTitle}>Ubicación GPS Actual</Text>
                <Text style={styles.settingSubtitle}>{gpsCity}</Text>
              </View>
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTagText}>EN VIVO</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Ciudad Fija Monitoreada */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setIsCityModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#2B1A14' : '#FFEDD5' }]}>
                <Globe size={18} color={colors.seismicAccent} strokeWidth={2} />
              </View>
              <View style={styles.settingCol}>
                <Text style={styles.settingTitle}>Ciudad Fija Monitoreada</Text>
                <Text style={styles.settingSubtitle}>{monitoredCity} (Cambiar)</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PREFERENCIAS DE VISUALIZACIÓN */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>PREFERENCIAS REGIONALES</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleToggleUnit}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#1C1F26' : '#F1F5F9' }]}>
                <Compass size={18} color={colors.textPrimary} strokeWidth={2} />
              </View>
              <View style={styles.settingCol}>
                <Text style={styles.settingTitle}>Unidad de Distancia</Text>
                <Text style={styles.settingSubtitle}>
                  {unitPreference === 'km' ? 'Kilómetros (km)' : 'Millas (mi)'}
                </Text>
              </View>
              <View style={styles.unitTogglePill}>
                <Text style={styles.unitToggleText}>{unitPreference.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACCESO DIRECTO A PARÁMETROS DE ALERTA (SIN DUPLICAR) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>AJUSTES DE ALERTA Y SIRENA</Text>

          <TouchableOpacity
            style={styles.alertSettingsCard}
            onPress={() => navigation.navigate('AlertSettings')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#2B1414' : '#FEE2E2' }]}>
              <Sliders size={20} color={colors.seismicRed} strokeWidth={2} />
            </View>
            <View style={styles.settingCol}>
              <Text style={styles.settingTitle}>Umbrales, Radio y Sirena</Text>
              <Text style={styles.settingSubtitle}>
                Ajustar magnitud mínima Richter, radio visual y volumen acústico
              </Text>
            </View>
            <ChevronRight size={20} color={colors.seismicAccent} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* CONTRIBUCIÓN COMUNITARIA */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>REPUTACIÓN CIUDADANA</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Bell size={18} color={colors.seismicAccent} strokeWidth={2} />
              <Text style={styles.metricNumber}>18</Text>
              <Text style={styles.metricLabel}>Alertas Recibidas</Text>
            </View>
            <View style={styles.metricCard}>
              <Flame size={18} color={colors.amberAlertText} strokeWidth={2} />
              <Text style={styles.metricNumber}>3</Text>
              <Text style={styles.metricLabel}>Reportes Creados</Text>
            </View>
            <View style={styles.metricCard}>
              <ThumbsUp size={18} color={colors.successGreen} strokeWidth={2} />
              <Text style={styles.metricNumber}>14</Text>
              <Text style={styles.metricLabel}>Votos Validados</Text>
            </View>
          </View>
        </View>

        {/* PROTOCOLO SGC Y AYUDA */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>INFORMACIÓN OFICIAL</Text>
          <TouchableOpacity
            style={styles.infoActionRow}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Red Sísmica Oficial',
                'Alera se encuentra integrada con los catálogos del Servicio Geológico Colombiano (SGC) y el USGS para la detección de eventos telúricos nacionales e internacionales con afectación en Colombia.'
              )
            }
          >
            <BookOpen size={18} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.infoActionText}>Fuentes de Datos Sísmicos (SGC / USGS)</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.infoActionRow, { marginTop: 8 }]}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Protocolo de Protección en Sismo',
                '1. Agáchate, cúbrete y sujétate.\n2. Aléjate de ventanas y fachadas.\n3. Tras el sismo, corta gas y electricidad.\n4. Revisa las alertas comunitarias de Alera para zonas despejadas.'
              )
            }
          >
            <HelpCircle size={18} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.infoActionText}>Guía Rápida ante un Terremoto</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* GESTIÓN DE DISPOSITIVO */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>GESTIÓN DE DISPOSITIVO</Text>

          <TouchableOpacity
            style={styles.deviceOptionRow}
            onPress={handleClearAlertCache}
            activeOpacity={0.7}
          >
            <RotateCcw size={16} color={colors.amberAlertText} strokeWidth={1.8} />
            <Text style={styles.deviceOptionText}>Limpiar historial local de alertas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deviceOptionRow, { marginTop: 8 }]}
            onPress={handleResetDevice}
            activeOpacity={0.7}
          >
            <RotateCcw size={16} color={colors.seismicRed} strokeWidth={1.8} />
            <Text style={[styles.deviceOptionText, { color: colors.seismicRed }]}>
              Restablecer identificador anónimo
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL EDITAR NICKNAME */}
      <Modal visible={isEditingNickname} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Alias Ciudadano</Text>
            <Text style={styles.modalSubtitle}>
              Este nombre identificará tus reportes comunitarios ante los vecinos de tu zona.
            </Text>
            <TextInput
              style={styles.nicknameInput}
              value={tempNickname}
              onChangeText={setTempNickname}
              placeholder="Ej: Andrés - Centinela"
              placeholderTextColor={colors.textMuted}
              maxLength={28}
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsEditingNickname(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSaveNickname}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECCIONAR CIUDAD MONITOREADA */}
      <Modal visible={isCityModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.cityModalCard}>
            <View style={styles.cityModalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Ciudad Fija</Text>
              <TouchableOpacity onPress={() => setIsCityModalVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {COLOMBIAN_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityItemRow,
                    monitoredCity === city && styles.cityItemRowActive,
                  ]}
                  onPress={() => handleSelectCity(city)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cityItemText,
                      monitoredCity === city && styles.cityItemTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                  {monitoredCity === city && (
                    <Check size={18} color={colors.seismicAccent} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 20,
      gap: 16,
    },
    profileHeroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatarCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: isDark ? '#1C1F26' : '#F1F5F9',
      borderWidth: 2,
      borderColor: colors.seismicAccent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.seismicAccent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surfaceCard,
    },
    heroInfo: {
      flex: 1,
      gap: 4,
    },
    nicknameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nicknameText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    editIconButton: {
      padding: 4,
    },
    rankPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? 'rgba(240, 106, 53, 0.12)' : 'rgba(240, 106, 53, 0.08)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    rankPillText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.seismicAccent,
    },
    deviceIdText: {
      fontSize: 11,
      color: colors.textMuted,
      fontFamily: 'monospace',
      marginTop: 2,
    },
    sectionBlock: {
      gap: 8,
    },
    sectionHeaderTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.8,
    },
    cardGroup: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.surfaceCardBorder,
      marginLeft: 54,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingCol: {
      flex: 1,
      gap: 2,
    },
    settingTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    settingSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    liveTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.successGreen,
    },
    liveTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.successGreen,
      letterSpacing: 0.5,
    },
    unitTogglePill: {
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: colors.surfaceInputBorder,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    unitToggleText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.seismicAccent,
    },
    alertSettingsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      gap: 4,
    },
    metricNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    metricLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
      fontWeight: '600',
    },
    infoActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    infoActionText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    deviceOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    deviceOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surfaceCard,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      gap: 12,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    nicknameInput: {
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: colors.surfaceInputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    modalButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 6,
    },
    modalCancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    modalCancelText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 13,
    },
    modalConfirmButton: {
      backgroundColor: colors.seismicAccent,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 8,
    },
    modalConfirmText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    cityModalCard: {
      width: '100%',
      backgroundColor: colors.surfaceCard,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      gap: 12,
    },
    cityModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cityItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceCardBorder,
    },
    cityItemRowActive: {
      backgroundColor: isDark ? 'rgba(240, 106, 53, 0.12)' : 'rgba(240, 106, 53, 0.08)',
      borderRadius: 8,
    },
    cityItemText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    cityItemTextActive: {
      color: colors.seismicAccent,
      fontWeight: '800',
    },
  });