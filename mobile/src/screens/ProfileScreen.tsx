import React, { useState, useEffect, useMemo } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Smartphone,
  CheckCircle2,
  Bell,
  ShieldCheck,
  Server,
  Layers,
  HelpCircle,
  LogOut,
  Settings,
  Flame,
  ThumbsUp,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  navigation: any;
}

const DEVICE_STORAGE_KEY = '@alera_device_id';

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [deviceId, setDeviceId] = useState<string>('cargando...');
  const [fcmToken] = useState<string>('fcm_token_demo_alera_android_12345');

  useEffect(() => {
    loadDeviceData();
  }, []);

  const loadDeviceData = async () => {
    try {
      const id = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
      if (id) {
        setDeviceId(id);
      } else {
        const generated = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
        await AsyncStorage.setItem(DEVICE_STORAGE_KEY, generated);
        setDeviceId(generated);
      }
    } catch {
      setDeviceId('dev-local-user');
    }
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
            await loadDeviceData();
            Alert.alert('Completado', 'Nuevo identificador generado correctamente.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.backgroundPrimary} />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil y Dispositivo</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('AlertSettings')}
          activeOpacity={0.8}
        >
          <Settings size={20} color={colors.textSecondary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
      >
        {/* TARJETA PRINCIPAL DEL DISPOSITIVO */}
        <View style={styles.deviceHeroCard}>
          <View style={styles.avatarWrapper}>
            <Smartphone size={28} color={colors.seismicAccent} strokeWidth={2} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.deviceTitle}>Dispositivo Alera Móvil</Text>
            <Text style={styles.deviceIdText} numberOfLines={1}>
              ID: {deviceId}
            </Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDotLive} />
              <Text style={styles.statusPillText}>Activo en Red SGC / Redis</Text>
            </View>
          </View>
        </View>

        {/* MÉTRICAS DE PARTICIPACIÓN CIUDADANA */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>ACTIVIDAD COMUNITARIA</Text>
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

        {/* ESTADO DE CONEXIÓN CON BACKEND */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>INFRAESTRUCTURA ALERA (BACKEND)</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Server size={16} color={colors.gpsBlue} strokeWidth={2} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoRowTitle}>PostgreSQL 16 & PostGIS</Text>
                <Text style={styles.infoRowSubtitle}>Búsqueda geoespacial ST_DWithin activa</Text>
              </View>
              <CheckCircle2 size={16} color={colors.successGreen} strokeWidth={2} />
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Layers size={16} color={colors.seismicAccent} strokeWidth={2} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoRowTitle}>Redis Ephemeral GPS</Text>
                <Text style={styles.infoRowSubtitle}>TTL 20 min para alertas de proximidad</Text>
              </View>
              <CheckCircle2 size={16} color={colors.successGreen} strokeWidth={2} />
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <ShieldCheck size={16} color={colors.successGreen} strokeWidth={2} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoRowTitle}>Token Firebase Cloud Messaging</Text>
                <Text style={styles.infoRowSubtitle} numberOfLines={1}>
                  {fcmToken}
                </Text>
              </View>
              <CheckCircle2 size={16} color={colors.successGreen} strokeWidth={2} />
            </View>
          </View>
        </View>

        {/* PROTOCOLO SGC Y AYUDA */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>SISTEMA Y SOPORTE</Text>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Servicio Geológico Colombiano',
                'Alera consume la red oficial de acelerógrafos y sismógrafos nacionales del SGC para la detección temprana de eventos telúricos.'
              )
            }
          >
            <HelpCircle size={18} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.actionRowText}>Protocolos Sísmicos del SGC</Text>
          </TouchableOpacity>
        </View>

        {/* BOTÓN RESTABLECER DISPOSITIVO */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetDevice}
          activeOpacity={0.8}
        >
          <LogOut size={16} color={colors.seismicRed} strokeWidth={2} />
          <Text style={styles.resetButtonText}>Restablecer Identificador de Dispositivo</Text>
        </TouchableOpacity>
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
    },
    deviceHeroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceCardBorder,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      gap: 14,
    },
    avatarWrapper: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E1714' : '#FFEDD5',
      borderWidth: 1,
      borderColor: isDark ? '#3D251C' : '#FDBA74',
      alignItems: 'center',
      justifyContent: 'center',
    },
  heroInfo: {
    flex: 1,
  },
  deviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deviceIdText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDotLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.successGreen,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.successGreen,
    letterSpacing: 0.4,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
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
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.surfaceCardBorder,
    borderRadius: 14,
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoTextCol: {
    flex: 1,
  },
  infoRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoRowSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.surfaceCardBorder,
    marginVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.surfaceCardBorder,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    backgroundColor: isDark ? '#1E1414' : '#FEE2E2',
    borderWidth: 1,
    borderColor: isDark ? '#3D1C1C' : '#FCA5A5',
    gap: 8,
    marginTop: 6,
  },
  resetButtonText: {
    color: colors.seismicRed,
    fontWeight: '700',
    fontSize: 13,
  },
});