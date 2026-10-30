import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { playEmergencySiren, stopEmergencySiren } from '../services/sound';
import { api } from '../services/api';
import {
  ArrowLeft,
  Volume2,
  Vibrate,
  ShieldAlert,
  Radio,
  MapPin,
  Activity,
  Sliders,
  Sun,
  Moon,
  Play,
  Square,
  AlertCircle,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { getRealDeviceLocation } from '../services/location';

interface Props {
  navigation: any;
}

const SETTINGS_STORAGE_KEY = '@alera_user_settings';

export const AlertSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [loudSirenEnabled, setLoudSirenEnabled] = useState<boolean>(true);
  const [heavyVibrationEnabled, setHeavyVibrationEnabled] = useState<boolean>(true);
  const [communityAlertsEnabled, setCommunityAlertsEnabled] = useState<boolean>(true);
  const [coverageRadiusKm, setCoverageRadiusKm] = useState<number>(100);

  // Umbral en Escala de Richter
  const [minRichterMagnitude, setMinRichterMagnitude] = useState<number>(4.0);

  // Estado de prueba de alarma activa
  const [isTestingAlarm, setIsTestingAlarm] = useState<boolean>(false);
  const [isSendingPushTest, setIsSendingPushTest] = useState<boolean>(false);

  // GPS Real
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cityName, setCityName] = useState<string>('Detectando GPS...');

  // Referencia al objeto de audio de la sirena
  const stopAlarm = async () => {
    await stopEmergencySiren();
    setIsTestingAlarm(false);
  };

  const handleTestPushNotification = async () => {
    setIsSendingPushTest(true);
    try {
      await api.dispatchBackendTestAlert();
      Alert.alert(
        'Simulacro Despachado por Red',
        'El backend envió la señal de emergencia vía Firebase FCM a tu dispositivo.\n\nSi estás dentro de la app verás el banner ALERA con sirena; si estás fuera de la app recibirás la notificación push nativa.',
        [{ text: 'Entendido' }]
      );
    } catch {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor de ALERA para emitir el simulacro push.'
      );
    } finally {
      setIsSendingPushTest(false);
    }
  };

  useEffect(() => {
    loadSettings();
    detectLocation();

    return () => {
      stopAlarm();
    };
  }, []);

  const detectLocation = async () => {
    const loc = await getRealDeviceLocation();
    if (loc) {
      setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
      setCityName(loc.city);
    } else {
      setCityName('Ubicación Base');
    }
  };

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.loudSiren !== undefined) setLoudSirenEnabled(parsed.loudSiren);
        if (parsed.heavyVibration !== undefined) setHeavyVibrationEnabled(parsed.heavyVibration);
        if (parsed.communityAlerts !== undefined) setCommunityAlertsEnabled(parsed.communityAlerts);
        if (parsed.radiusKm !== undefined) setCoverageRadiusKm(parsed.radiusKm);
        if (parsed.minRichter !== undefined) setMinRichterMagnitude(parsed.minRichter);
      }
    } catch {
      // Predeterminado
    }
  };

  const saveSettings = async () => {
    try {
      const payload = {
        loudSiren: loudSirenEnabled,
        heavyVibration: heavyVibrationEnabled,
        communityAlerts: communityAlertsEnabled,
        radiusKm: coverageRadiusKm,
        minRichter: minRichterMagnitude,
      };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      Alert.alert(
        'Ajustes Guardados',
        `Preferencias actualizadas: Recibirás alerta ante sismos de magnitud ≥ ${minRichterMagnitude.toFixed(1)} M.`,
        [{ text: 'Entendido' }]
      );
    } catch {
      Alert.alert('Error', 'No se pudieron almacenar los cambios en el dispositivo.');
    }
  };

  // Función de prueba de alarma sísmica sonora y vibración extrema en iPhone / Android
  const handleTestAlarm = async () => {
    if (isTestingAlarm) {
      await stopAlarm();
      return;
    }

    setIsTestingAlarm(true);

    if (loudSirenEnabled) {
      await playEmergencySiren('test');
    } else if (heavyVibrationEnabled) {
      Vibration.vibrate([0, 600, 200, 600, 200, 1200], true);
    }

    Alert.alert(
      'PRUEBA DE ALARMA SÍSMICA ACTIVA',
      'ALERTA SÍSMICA SIMULADA\n\nEmitiendo sirena de emergencia a máximo volumen y vibración háptica.\n\nPresiona "DETENER ALARMA" para finalizar la prueba.',
      [
        {
          text: 'DETENER ALARMA',
          style: 'destructive',
          onPress: () => {
            stopAlarm();
          },
        },
      ],
      { cancelable: false }
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
        <Text style={styles.topBarTitle}>Configuración de Alertas</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          {isDark ? (
            <Sun size={18} color={colors.textPrimary} strokeWidth={1.8} />
          ) : (
            <Moon size={18} color={colors.textPrimary} strokeWidth={1.8} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
      >
        {/* SELECCIÓN DE TEMA VISUAL */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>TEMA DE LA APLICACIÓN</Text>
          <View style={styles.themeSelectorCard}>
            <TouchableOpacity
              style={[styles.themeOptionBtn, isDark && styles.themeOptionBtnActive]}
              onPress={() => !isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <Moon size={16} color={isDark ? colors.seismicAccent : colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.themeOptionText, isDark && styles.themeOptionTextActive]}>
                Modo Oscuro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOptionBtn, !isDark && styles.themeOptionBtnActive]}
              onPress={() => isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <Sun size={16} color={!isDark ? colors.seismicAccent : colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.themeOptionText, !isDark && styles.themeOptionTextActive]}>
                Modo Claro (Blanco)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MAPA DE RADIO DE COBERTURA NATIVO */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>RADIO DE COBERTURA ESPACIAL</Text>
          <View style={styles.mapCard}>
            <MapErrorBoundary fallbackMessage="Radio de cobertura configurado correctamente.">
              <MapView
                style={StyleSheet.absoluteFill}
                region={{
                  latitude: userLocation ? userLocation.latitude : 4.5709,
                  longitude: userLocation ? userLocation.longitude : -74.2973,
                  latitudeDelta: coverageRadiusKm > 100 ? 3.5 : 1.8,
                  longitudeDelta: coverageRadiusKm > 100 ? 3.5 : 1.8,
                }}
                userInterfaceStyle={isDark ? 'dark' : 'light'}
              >
                {userLocation && (
                  <>
                    <Circle
                      center={userLocation}
                      radius={coverageRadiusKm * 1000}
                      fillColor={colors.gpsBlueFill}
                      strokeColor={colors.gpsBlue}
                      strokeWidth={1.5}
                    />
                    <Marker coordinate={userLocation}>
                      <View style={styles.userMarkerDot} />
                    </Marker>
                  </>
                )}
              </MapView>
            </MapErrorBoundary>
            <View style={styles.baseLocationTag}>
              <MapPin size={12} color={colors.gpsBlue} strokeWidth={2} />
              <Text style={styles.baseLocationText}>
                {cityName} • {coverageRadiusKm} km de radio
              </Text>
            </View>
          </View>

          {/* Selector de Distancia */}
          <View style={styles.radiusPillsRow}>
            {[25, 50, 100, 200].map((km) => {
              const isSelected = coverageRadiusKm === km;
              return (
                <TouchableOpacity
                  key={km}
                  style={[styles.radiusPill, isSelected && styles.radiusPillActive]}
                  onPress={() => setCoverageRadiusKm(km)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radiusPillText, isSelected && styles.radiusPillTextActive]}>
                    {km} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* UMBRAL EN LA ESCALA DE RICHTER */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>UMBRAL SÍSMICO (ESCALA DE RICHTER)</Text>
          <Text style={styles.sectionSubDesc}>
            Recibirás sirena y vibración únicamente cuando el sismo iguale o supere este valor:
          </Text>
          <View style={styles.richterPillsRow}>
            {[
              { val: 3.0, label: '≥ 3.0 M', desc: 'Leve' },
              { val: 4.0, label: '≥ 4.0 M', desc: 'Moderado' },
              { val: 5.0, label: '≥ 5.0 M', desc: 'Fuerte' },
              { val: 6.0, label: '≥ 6.0 M', desc: 'Crítico' },
            ].map((r) => {
              const isSel = minRichterMagnitude === r.val;
              return (
                <TouchableOpacity
                  key={r.val}
                  style={[styles.richterPill, isSel && styles.richterPillActive]}
                  onPress={() => setMinRichterMagnitude(r.val)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.richterPillText, isSel && styles.richterPillTextActive]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.richterSubText, isSel && styles.richterSubTextActive]}>
                    {r.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* MÓDULO DE SIRENA Y VIBRACIÓN EXTREMA */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>ALERTAS CRÍTICAS Y SONIDO</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrapper}>
              <Volume2 size={18} color={colors.seismicAccent} strokeWidth={2} />
            </View>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Sirena de Alarma Extrema</Text>
              <Text style={styles.toggleDesc}>
                Suena a máximo volumen ante sismos inminentes ignorando el modo silencio del teléfono.
              </Text>
            </View>
            <Switch
              value={loudSirenEnabled}
              onValueChange={setLoudSirenEnabled}
              trackColor={{ false: colors.surfaceInputBorder, true: colors.successGreen }}
              thumbColor={colors.ctaPrimary}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrapper}>
              <Vibrate size={18} color={colors.seismicAccent} strokeWidth={2} />
            </View>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Vibración Sísmica Intensa</Text>
              <Text style={styles.toggleDesc}>
                Patrón continuo de sacudida háptica para alertarte incluso si estás durmiendo.
              </Text>
            </View>
            <Switch
              value={heavyVibrationEnabled}
              onValueChange={setHeavyVibrationEnabled}
              trackColor={{ false: colors.surfaceInputBorder, true: colors.successGreen }}
              thumbColor={colors.ctaPrimary}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrapper}>
              <Radio size={18} color={colors.gpsBlue} strokeWidth={2} />
            </View>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Alertas Comunitarias de Vecinos</Text>
              <Text style={styles.toggleDesc}>
                Derrumbes, incendios o vías cerradas reportadas dentro de tu radio de cobertura.
              </Text>
            </View>
            <Switch
              value={communityAlertsEnabled}
              onValueChange={setCommunityAlertsEnabled}
              trackColor={{ false: colors.surfaceInputBorder, true: colors.successGreen }}
              thumbColor={colors.ctaPrimary}
            />
          </View>
        </View>

        {/* PRUEBA MANUAL DE ALARMA Y VIBRACIÓN (INSPIRADO EN "MI TERREMOTO") */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>VERIFICACIÓN DE HARDWARE</Text>
          <View style={styles.testAlertCard}>
            <View style={styles.testAlertHeader}>
              <AlertCircle size={20} color={colors.seismicAccent} strokeWidth={2} />
              <Text style={styles.testAlertTitle}>Simulador de Sirena y Hápticos</Text>
            </View>
            <Text style={styles.testAlertDesc}>
              Prueba inmediatamente en tu iPhone cómo vibrará y sonará tu teléfono cuando ocurra un sismo real.
            </Text>
            <TouchableOpacity
              style={[styles.testAlertBtn, isTestingAlarm && styles.testAlertBtnActive]}
              onPress={handleTestAlarm}
              activeOpacity={0.8}
            >
              {isTestingAlarm ? (
                <>
                  <Square size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.testAlertBtnText}>DETENER PRUEBA DE ALARMA</Text>
                </>
              ) : (
                <>
                  <Play size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.testAlertBtnText}>PROBAR ALARMA SÍSMICA AHORA</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.testAlertBtn,
                {
                  marginTop: 10,
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.seismicAccent,
                  borderWidth: 1,
                },
              ]}
              onPress={handleTestPushNotification}
              disabled={isSendingPushTest}
              activeOpacity={0.8}
            >
              <Radio size={16} color={colors.seismicAccent} strokeWidth={2} />
              <Text style={[styles.testAlertBtnText, { color: colors.seismicAccent, marginLeft: 8 }]}>
                {isSendingPushTest ? 'ENVIANDO A DISPOSITIVO...' : 'DESPACHAR PRUEBA PUSH REAL (FCM)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.saveContainer}>
          <PrimaryButton title="Guardar Preferencias de Alerta" onPress={saveSettings} />
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
    sectionBlock: {
      marginBottom: 20,
    },
    sectionHeaderTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    sectionSubDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 10,
      lineHeight: 16,
    },
    themeSelectorCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 6,
    },
    themeOptionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 8,
    },
    themeOptionBtnActive: {
      backgroundColor: isDark ? 'rgba(240, 106, 53, 0.15)' : '#FFEDD5',
      borderWidth: 1,
      borderColor: colors.seismicAccent,
    },
    themeOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    themeOptionTextActive: {
      color: colors.seismicAccent,
      fontWeight: '700',
    },
    mapCard: {
      height: 180,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: 10,
      backgroundColor: isDark ? '#11151C' : '#E2E8F0',
    },
    userMarkerDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.gpsBlue,
      borderWidth: 2.5,
      borderColor: '#FFFFFF',
    },
    baseLocationTag: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(24, 27, 32, 0.92)' : 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
    },
    baseLocationText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '600',
    },
    radiusPillsRow: {
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
    richterPillsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    richterPill: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      gap: 2,
    },
    richterPillActive: {
      backgroundColor: isDark ? '#241612' : '#FFEDD5',
      borderColor: colors.seismicAccent,
    },
    richterPillText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    richterPillTextActive: {
      color: colors.seismicAccent,
    },
    richterSubText: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '500',
    },
    richterSubTextActive: {
      color: colors.seismicAccent,
      fontWeight: '700',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    toggleIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E2229' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleTextCol: {
      flex: 1,
    },
    toggleTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    toggleDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    testAlertCard: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 16,
      gap: 10,
    },
    testAlertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    testAlertTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    testAlertDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    testAlertBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.seismicAccent,
      height: 46,
      borderRadius: 10,
      marginTop: 4,
    },
    testAlertBtnActive: {
      backgroundColor: colors.seismicRed,
    },
    testAlertBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    saveContainer: {
      marginTop: 6,
    },
  });