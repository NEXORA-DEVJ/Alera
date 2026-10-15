import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react-native';
import { registerBannerListener } from '../services/notifications';
import { SirenAlertType, stopEmergencySiren } from '../services/sound';

interface BannerData {
  title: string;
  body: string;
  type: SirenAlertType;
  subtitle?: string;
}

export const AleraNotificationBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [currentAlert, setCurrentAlert] = useState<BannerData | null>(null);
  const translateY = useRef(new Animated.Value(-150)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unregister = registerBannerListener((alert) => {
      showAlert(alert);
    });

    return () => {
      unregister();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const showAlert = (alert: BannerData) => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }

    setCurrentAlert(alert);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 14,
    }).start();

    // Auto-cierre sincronizado con la duracion de la alerta (4.5 segundos)
    dismissTimer.current = setTimeout(() => {
      hideAlert();
    }, 4500);
  };

  const hideAlert = () => {
    Animated.timing(translateY, {
      toValue: -180,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentAlert(null);
    });
  };

  if (!currentAlert) return null;

  const isSeismic = currentAlert.type === 'seismic';
  const badgeSource = require('../../assets/notification-badge-dark.png');

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12),
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bannerCard}
        activeOpacity={0.9}
        onPress={() => {
          stopEmergencySiren();
          hideAlert();
        }}
      >
        {/* Lado Izquierdo: Badge oficial de ALERA */}
        <View style={styles.badgeWrapper}>
          <Image
            source={badgeSource}
            style={styles.badgeImage}
            resizeMode="cover"
          />
        </View>

        {/* Centro: Contenido tipográfico estricto del mockup oficial */}
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <View style={[styles.pulseDot, { backgroundColor: isSeismic ? '#D93829' : '#F06A35' }]} />
              <Text style={styles.brandText}>ALERA</Text>
            </View>
            <Text style={styles.timeText}>Ahora</Text>
          </View>

          <Text style={styles.titleText} numberOfLines={1}>
            {currentAlert.title}
          </Text>

          {currentAlert.subtitle && (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {currentAlert.subtitle}
            </Text>
          )}

          <Text style={styles.bodyText} numberOfLines={2}>
            {currentAlert.body}
          </Text>
        </View>

        {/* Botón cerrar */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            stopEmergencySiren();
            hideAlert();
          }}
          activeOpacity={0.7}
        >
          <X size={14} color="#9CA3AF" strokeWidth={2} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingHorizontal: 12,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(24, 27, 32, 0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2E37',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  badgeWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0D0F12',
    borderWidth: 1,
    borderColor: '#2A2E37',
    marginRight: 10,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  contentWrapper: {
    flex: 1,
    marginRight: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EDEDEA',
    letterSpacing: 0.6,
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F06A35',
    marginTop: 1,
  },
  bodyText: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 2,
    lineHeight: 15,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E2229',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
