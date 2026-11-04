import React, { forwardRef, useImperativeHandle, useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (targetRegion: MapRegion) => {
        const zoom = deltaToZoom(targetRegion.latitudeDelta);
        const js = `if (window.map) { window.map.flyTo([${targetRegion.latitude}, ${targetRegion.longitude}], ${zoom}, { duration: 0.8 }); } true;`;
        webViewRef.current?.injectJavaScript(js);
      },
    }));

    // Actualización de región reactiva cuando cambia la prop region
    useEffect(() => {
      if (region && region.latitude && region.longitude) {
        const zoom = deltaToZoom(region.latitudeDelta);
        const js = `if (window.map) { window.map.setView([${region.latitude}, ${region.longitude}], ${zoom}); } true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

    // Generar HTML autosuficiente para OpenStreetMap / CartoDB con Leaflet
    const leafletHtml = useMemo(() => {
      const activeCenter = (region && region.latitude) ? region : initialRegion;
      const initialLat = activeCenter.latitude || 4.5709;
      const initialLng = activeCenter.longitude || -74.2973;
      const initialZoom = deltaToZoom(activeCenter.latitudeDelta);

      // Capas de mapas de alta fidelidad, 100% libres de API keys y sin marcas de agua:
      // Modo Claro: ESRI World Street Map (relieve, calles, ciudades nítidas sin marcas)
      // Modo Oscuro: ESRI World Dark Gray Canvas
      const tileUrl = isDark
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      const fallbackTileUrl = 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

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
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { width: 100%; height: 100%; background: ${isDark ? '#0B0D10' : '#E5E7EB'}; overflow: hidden; }
    #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: ${isDark ? '#0B0D10' : '#E5E7EB'}; }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
    
    .mag-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 8px;
      border-radius: 9999px;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      border: 1.5px solid rgba(255,255,255,0.95);
      cursor: pointer;
      transform: translate(-50%, -50%);
      white-space: nowrap;
    }

    .user-pulse-dot {
      width: 16px;
      height: 16px;
      background: #007AFF;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 0 5px rgba(0, 122, 255, 0.4);
      transform: translate(-50%, -50%);
    }

    .draggable-pin {
      width: 34px;
      height: 34px;
      transform: translate(-50%, -100%);
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));
      cursor: grab;
    }

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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    function sendToNative(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function initMap() {
      if (typeof L === 'undefined') {
        setTimeout(initMap, 40);
        return;
      }
      if (window._aleraMapReady) return;
      window._aleraMapReady = true;

      try {
        var map = L.map('map', {
          center: [${initialLat}, ${initialLng}],
          zoom: ${initialZoom},
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: true,
          zoomAnimation: true
        });
        window.map = map;

        // Capa de mapas satélite/relieve libre (ESRI / OpenStreetMap HOT) sin marcas ni API keys
        var primaryTile = L.tileLayer('${tileUrl}', {
          maxZoom: 19,
          attribution: ''
        }).addTo(map);

        primaryTile.on('tileerror', function() {
          if (!window._fallbackLoaded) {
            window._fallbackLoaded = true;
            L.tileLayer('${fallbackTileUrl}', { maxZoom: 19 }).addTo(map);
          }
        });

        var markersLayer = L.layerGroup().addTo(map);
        var circlesLayer = L.layerGroup().addTo(map);
        var userLayer = L.layerGroup().addTo(map);
        var pinLayer = L.layerGroup().addTo(map);

        // Dibujar Círculos de Afectación Sísmica
        var circles = ${circlesJson};
        circles.forEach(function(c) {
          L.circle([c.lat, c.lng], {
            radius: c.radius,
            fillColor: c.fillColor || 'rgba(240, 106, 53, 0.15)',
            fillOpacity: 0.25,
            color: c.strokeColor || '#F06A35',
            weight: c.strokeWidth || 1.5
          }).addTo(circlesLayer);
        });

        // Dibujar Marcadores de Sismos
        var markers = ${markersJson};
        markers.forEach(function(m) {
          var iconHtml = '';
          if (m.badgeText) {
            iconHtml = '<div class="mag-badge" style="background-color: ' + (m.badgeColor || '#F06A35') + ';">' + m.badgeText + '</div>';
          } else {
            iconHtml = '<div class="incident-badge">!</div>';
          }
          var customIcon = L.divIcon({
            className: 'custom-leaflet-icon',
            html: iconHtml,
            iconSize: [0, 0]
          });

          var marker = L.marker([m.lat, m.lng], { icon: customIcon }).addTo(markersLayer);
          marker.on('click', function() {
            sendToNative({ type: 'MARKER_PRESS', id: m.id });
          });
        });

        // Dibujar Ubicación GPS Usuario
        var userCoord = ${userCoordJson};
        if (userCoord) {
          var userIcon = L.divIcon({
            className: 'user-icon-wrapper',
            html: '<div class="user-pulse-dot"></div>',
            iconSize: [0, 0]
          });
          L.marker([userCoord.lat, userCoord.lng], { icon: userIcon, interactive: false }).addTo(userLayer);
        }

        // Dibujar Pin Arrastrable para Reportes
        var pin = ${pinJson};
        if (pin) {
          var pinIcon = L.divIcon({
            className: 'pin-icon-wrapper',
            html: '<svg class="draggable-pin" viewBox="0 0 24 24" fill="#F06A35" stroke="#FFFFFF" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
            iconSize: [0, 0]
          });
          var pinMarker = L.marker([pin.lat, pin.lng], {
            icon: pinIcon,
            draggable: true
          }).addTo(pinLayer);

          pinMarker.on('dragend', function(e) {
            var pos = e.target.getLatLng();
            sendToNative({ type: 'PIN_CHANGE', latitude: pos.lat, longitude: pos.lng });
          });
        }

        // Capturar Clic en el Mapa
        map.on('click', function(e) {
          sendToNative({ type: 'MAP_CLICK', latitude: e.latlng.lat, longitude: e.latlng.lng });
        });

        // Forzar cálculo de tamaño de azulejos
        setTimeout(function() { map.invalidateSize(); }, 60);
        setTimeout(function() { map.invalidateSize(); }, 300);
        setTimeout(function() { map.invalidateSize(); }, 1000);
      } catch (err) {
        console.error(err);
      }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initMap();
    } else {
      document.addEventListener('DOMContentLoaded', initMap);
    }
    window.addEventListener('load', initMap);
    setTimeout(initMap, 150);
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
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          onMessage={handleWebViewMessage}
          onError={(e) => console.warn('[AleraInteractiveMap WebView Error]:', e.nativeEvent)}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
