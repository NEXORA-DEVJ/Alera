import React, { forwardRef, useImperativeHandle, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { WebView } from 'react-native-webview';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapMarkerItem {
  id: string;
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  badgeText?: string;
  badgeColor?: string;
  iconName?: 'pin' | 'alert' | 'incident';
  onPress?: () => void;
}

export interface MapCircleItem {
  id?: string;
  center: MapCoordinate;
  radius: number; // en metros
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface AleraInteractiveMapRef {
  animateToRegion: (region: MapRegion) => void;
}

export interface AleraInteractiveMapProps {
  initialRegion?: MapRegion;
  region?: MapRegion;
  userCoord?: MapCoordinate | null;
  markers?: MapMarkerItem[];
  circles?: MapCircleItem[];
  draggablePin?: MapCoordinate | null;
  onPinChange?: (coord: MapCoordinate) => void;
  onPressCoordinate?: (coord: MapCoordinate) => void;
  onMarkerPress?: (markerId: string) => void;
  isDark?: boolean;
  style?: any;
  showUserLocation?: boolean;
}

const deltaToZoom = (delta?: number): number => {
  if (!delta || delta <= 0) return 12;
  const zoom = Math.round(Math.log(360 / delta) / Math.LN2);
  return Math.min(18, Math.max(3, zoom));
};

export const AleraInteractiveMap = forwardRef<AleraInteractiveMapRef, AleraInteractiveMapProps>(
  (
    {
      initialRegion = { latitude: 4.5709, longitude: -74.2973, latitudeDelta: 6.0, longitudeDelta: 6.0 },
      region,
      userCoord,
      markers = [],
      circles = [],
      draggablePin,
      onPinChange,
      onPressCoordinate,
      onMarkerPress,
      isDark = false,
      style,
      showUserLocation = true,
    },
    ref
  ) => {
    // -------------------------------------------------------------
    // PLATAFORMA IOS: Utiliza Apple Maps nativo (react-native-maps)
    // -------------------------------------------------------------
    const nativeMapRef = useRef<MapView>(null);

    // -------------------------------------------------------------
    // PLATAFORMA ANDROID: Utiliza Leaflet + CartoDB Dark/Voyager (WebView)
    // Cero dependencias de Google Maps API Key, cero pantallas negras.
    // -------------------------------------------------------------
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (targetRegion: MapRegion) => {
        if (Platform.OS === 'ios') {
          nativeMapRef.current?.animateToRegion({
            latitude: targetRegion.latitude,
            longitude: targetRegion.longitude,
            latitudeDelta: targetRegion.latitudeDelta ?? 0.05,
            longitudeDelta: targetRegion.longitudeDelta ?? 0.05,
          });
        } else {
          const zoom = deltaToZoom(targetRegion.latitudeDelta);
          const js = `if (window.map) { window.map.flyTo([${targetRegion.latitude}, ${targetRegion.longitude}], ${zoom}, { duration: 0.8 }); } true;`;
          webViewRef.current?.injectJavaScript(js);
        }
      },
    }));

    // Actualización de región reactiva en Android cuando cambia prop region
    useEffect(() => {
      if (Platform.OS === 'android' && region) {
        const zoom = deltaToZoom(region.latitudeDelta);
        const js = `if (window.map) { window.map.setView([${region.latitude}, ${region.longitude}], ${zoom}); } true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

    // Generar HTML optimizado para Leaflet + CartoDB
    const leafletHtml = useMemo(() => {
      const activeCenter = region || initialRegion;
      const initialLat = activeCenter.latitude;
      const initialLng = activeCenter.longitude;
      const initialZoom = deltaToZoom(activeCenter.latitudeDelta);

      // CartoDB Dark Matter para modo oscuro, CartoDB Voyager para modo claro
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      const markersJson = JSON.stringify(
        markers.map((m) => ({
          id: m.id,
          lat: m.coordinate.latitude,
          lng: m.coordinate.longitude,
          badgeText: m.badgeText,
          badgeColor: m.badgeColor || '#F06A35',
          title: m.title || '',
          desc: m.description || '',
          iconName: m.iconName,
        }))
      );

      const circlesJson = JSON.stringify(
        circles.map((c) => ({
          lat: c.center.latitude,
          lng: c.center.longitude,
          radius: c.radius,
          fillColor: c.fillColor || 'rgba(240, 106, 53, 0.15)',
          strokeColor: c.strokeColor || '#F06A35',
          strokeWidth: c.strokeWidth || 1.5,
        }))
      );

      const userCoordJson = userCoord && showUserLocation
        ? JSON.stringify({ lat: userCoord.latitude, lng: userCoord.longitude })
        : 'null';

      const pinJson = draggablePin
        ? JSON.stringify({ lat: draggablePin.latitude, lng: draggablePin.longitude })
        : 'null';

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: ${isDark ? '#0B0D10' : '#E5E7EB'}; }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
    
    /* Marcador de magnitud estilo ALERA badge */
    .mag-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 8px;
      border-radius: 9999px;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 11px;
      font-family: -apple-system, Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      border: 1.5px solid rgba(255,255,255,0.9);
      cursor: pointer;
      transform: translate(-50%, -50%);
    }

    /* Punto GPS usuario con radar de pulso */
    .user-pulse-dot {
      width: 14px;
      height: 14px;
      background: #007AFF;
      border: 2.5px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.35);
      transform: translate(-50%, -50%);
    }

    /* Pin arrastrable tipo InDriver */
    .draggable-pin {
      width: 32px;
      height: 32px;
      transform: translate(-50%, -100%);
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
      cursor: grab;
    }

    /* Marcador de incidente comunitario */
    .incident-badge {
      width: 28px;
      height: 28px;
      background: #F06A35;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      transform: translate(-50%, -50%);
    }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      center: [${initialLat}, ${initialLng}],
      zoom: ${initialZoom},
      zoomControl: false,
      attributionControl: false
    });
    window.map = map;

    // Capa de CartoDB (Dark Matter o Voyager)
    L.tileLayer('${tileUrl}', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    let markersLayer = L.layerGroup().addTo(map);
    let circlesLayer = L.layerGroup().addTo(map);
    let userLayer = L.layerGroup().addTo(map);
    let pinLayer = L.layerGroup().addTo(map);

    function sendToNative(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    // Dibujar Círculos
    const circles = ${circlesJson};
    circles.forEach(c => {
      L.circle([c.lat, c.lng], {
        radius: c.radius,
        fillColor: c.fillColor,
        fillOpacity: 0.25,
        color: c.strokeColor,
        weight: c.strokeWidth
      }).addTo(circlesLayer);
    });

    // Dibujar Marcadores de Sismos / Incidentes
    const markers = ${markersJson};
    markers.forEach(m => {
      let iconHtml = '';
      if (m.badgeText) {
        iconHtml = '<div class="mag-badge" style="background-color: ' + m.badgeColor + ';">' + m.badgeText + '</div>';
      } else {
        iconHtml = '<div class="incident-badge">!</div>';
      }
      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: iconHtml,
        iconSize: [0, 0]
      });

      const marker = L.marker([m.lat, m.lng], { icon: customIcon }).addTo(markersLayer);
      marker.on('click', () => {
        sendToNative({ type: 'MARKER_PRESS', id: m.id });
      });
    });

    // Dibujar Ubicación GPS Usuario
    const userCoord = ${userCoordJson};
    if (userCoord) {
      const userIcon = L.divIcon({
        className: 'user-icon-wrapper',
        html: '<div class="user-pulse-dot"></div>',
        iconSize: [0, 0]
      });
      L.marker([userCoord.lat, userCoord.lng], { icon: userIcon, interactive: false }).addTo(userLayer);
    }

    // Dibujar Pin Arrastrable (Para formulario de nuevo incidente)
    const pin = ${pinJson};
    if (pin) {
      const pinIcon = L.divIcon({
        className: 'pin-icon-wrapper',
        html: '<svg class="draggable-pin" viewBox="0 0 24 24" fill="#F06A35" stroke="#FFFFFF" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
        iconSize: [0, 0]
      });
      const pinMarker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon,
        draggable: true
      }).addTo(pinLayer);

      pinMarker.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        sendToNative({ type: 'PIN_CHANGE', latitude: pos.lat, longitude: pos.lng });
      });
    }

    // Capturar Clic en el Mapa
    map.on('click', function(e) {
      sendToNative({ type: 'MAP_CLICK', latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
  </script>
</body>
</html>`;
    }, [isDark, markers, circles, userCoord, draggablePin, showUserLocation, initialRegion, region]);

    const handleWebViewMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MARKER_PRESS') {
          if (onMarkerPress) {
            onMarkerPress(data.id);
          } else {
            const found = markers.find((m) => m.id === data.id);
            found?.onPress?.();
          }
        } else if (data.type === 'PIN_CHANGE') {
          onPinChange?.({ latitude: data.latitude, longitude: data.longitude });
        } else if (data.type === 'MAP_CLICK') {
          onPressCoordinate?.({ latitude: data.latitude, longitude: data.longitude });
          onPinChange?.({ latitude: data.latitude, longitude: data.longitude });
        }
      } catch (err) {
        console.warn('[AleraInteractiveMap] Error procesando mensaje de WebView:', err);
      }
    };

    // -------------------------------------------------------------
    // RENDERIZADO ANDROID: CartoDB / OpenStreetMap
    // -------------------------------------------------------------
    if (Platform.OS === 'android') {
      return (
        <View style={[styles.container, style]}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={styles.webView}
            scrollEnabled={false}
            overScrollMode="never"
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
            onError={(e) => console.warn('[AleraInteractiveMap WebView Error]:', e.nativeEvent)}
          />
        </View>
      );
    }

    // -------------------------------------------------------------
    // RENDERIZADO IOS: Apple Maps (react-native-maps)
    // -------------------------------------------------------------
    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={nativeMapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          region={region}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          onPress={(e) => onPressCoordinate?.(e.nativeEvent.coordinate)}
        >
          {showUserLocation && userCoord && (
            <Marker coordinate={userCoord} title="Tu Ubicación Real">
              <View style={styles.userLocationGpsDot} />
            </Marker>
          )}

          {circles.map((c, idx) => (
            <Circle
              key={c.id || `circle-${idx}`}
              center={c.center}
              radius={c.radius}
              fillColor={c.fillColor || 'rgba(240, 106, 53, 0.15)'}
              strokeColor={c.strokeColor || '#F06A35'}
              strokeWidth={c.strokeWidth || 1.5}
            />
          ))}

          {markers.map((m) => (
            <Marker
              key={m.id}
              coordinate={m.coordinate}
              title={m.title}
              description={m.description}
              onPress={() => {
                if (onMarkerPress) {
                  onMarkerPress(m.id);
                } else {
                  m.onPress?.();
                }
              }}
            >
              {m.badgeText ? (
                <View style={[styles.markerBadge, { backgroundColor: m.badgeColor || '#F06A35' }]}>
                  <Text style={styles.markerText}>{m.badgeText}</Text>
                </View>
              ) : null}
            </Marker>
          ))}

          {draggablePin && (
            <Marker
              coordinate={draggablePin}
              draggable
              onDragEnd={(e) => onPinChange?.(e.nativeEvent.coordinate)}
            />
          )}
        </MapView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  userLocationGpsDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  markerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
});
