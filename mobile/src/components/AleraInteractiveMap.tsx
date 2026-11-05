import React, { forwardRef, useImperativeHandle, useRef, useMemo, useEffect, useCallback } from 'react';
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

export const deltaToZoom = (delta?: number): number => {
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
    const webViewRef = useRef<any>(null);
    const isMapReadyRef = useRef<boolean>(false);

    // Método imperativo para volar suavemente a una región
    useImperativeHandle(ref, () => ({
      animateToRegion: (targetRegion: MapRegion) => {
        const zoom = deltaToZoom(targetRegion.latitudeDelta);
        const js = `if (window.flyToRegion) { window.flyToRegion(${targetRegion.latitude}, ${targetRegion.longitude}, ${zoom}); } true;`;
        webViewRef.current?.injectJavaScript(js);
      },
    }));

    // Sincronización reactiva cuando cambia la prop region
    useEffect(() => {
      if (region && region.latitude && region.longitude) {
        const zoom = deltaToZoom(region.latitudeDelta);
        const js = `if (window.flyToRegion) { window.flyToRegion(${region.latitude}, ${region.longitude}, ${zoom}); } true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

    // Serialización limpia de marcadores para inyección sin recargar HTML
    const serializedMarkers = useMemo(() => {
      return JSON.stringify(
        markers.map((m) => ({
          id: m.id,
          lat: m.coordinate.latitude,
          lng: m.coordinate.longitude,
          badgeText: m.badgeText || '',
          badgeColor: m.badgeColor || '#F06A35',
          title: m.title || '',
          desc: m.description || '',
          iconName: m.iconName || 'badge',
        }))
      );
    }, [markers]);

    // Serialización limpia de círculos de afectación
    const serializedCircles = useMemo(() => {
      return JSON.stringify(
        circles.map((c) => ({
          lat: c.center.latitude,
          lng: c.center.longitude,
          radius: c.radius,
          fillColor: c.fillColor || 'rgba(240, 106, 53, 0.15)',
          strokeColor: c.strokeColor || '#F06A35',
          strokeWidth: c.strokeWidth || 1.5,
        }))
      );
    }, [circles]);

    // Inyección en vivo de marcadores en el mapa Leaflet (sin refrescar página)
    useEffect(() => {
      if (isMapReadyRef.current) {
        const js = `if (window.setMarkers) { window.setMarkers(${serializedMarkers}); } true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    }, [serializedMarkers]);

    // Inyección en vivo de círculos en el mapa Leaflet
    useEffect(() => {
      if (isMapReadyRef.current) {
        const js = `if (window.setCircles) { window.setCircles(${serializedCircles}); } true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    }, [serializedCircles]);

    // Inyección en vivo de coordenada de usuario
    useEffect(() => {
      if (isMapReadyRef.current) {
        const coordData = userCoord && showUserLocation
          ? JSON.stringify({ lat: userCoord.latitude, lng: userCoord.longitude })
          : 'null';
        const js = `if (window.setUserCoord) { window.setUserCoord(${coordData}); } true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    }, [userCoord?.latitude, userCoord?.longitude, showUserLocation]);

    // HTML autosuficiente memoizado únicamente por tema (se carga UNA sola vez)
    const leafletHtml = useMemo(() => {
      const initialLat = initialRegion.latitude || 4.5709;
      const initialLng = initialRegion.longitude || -74.2973;
      const initialZoom = deltaToZoom(initialRegion.latitudeDelta);

      const tileUrl = isDark
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      const fallbackTileUrl = 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      border: 1.5px solid rgba(255,255,255,0.95);
      cursor: pointer;
      transform: translate(-50%, -50%);
      white-space: nowrap;
    }

    .city-search-pin {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #2563EB;
      color: #FFFFFF;
      padding: 4px 9px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 3px 10px rgba(37, 99, 235, 0.5);
      border: 1.8px solid #FFFFFF;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      cursor: pointer;
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

        window.circlesLayer = L.layerGroup().addTo(map);
        window.markersLayer = L.layerGroup().addTo(map);
        window.userLayer = L.layerGroup().addTo(map);
        window.pinLayer = L.layerGroup().addTo(map);

        // Funciones de actualización dinámica en tiempo real
        window.setMarkers = function(markersList) {
          if (!window.map || !window.markersLayer) return;
          window.markersLayer.clearLayers();
          markersList.forEach(function(m) {
            var iconHtml = '';
            if (m.iconName === 'pin') {
              iconHtml = '<div class="city-search-pin">📍 ' + m.badgeText + '</div>';
            } else if (m.badgeText) {
              iconHtml = '<div class="mag-badge" style="background-color: ' + (m.badgeColor || '#F06A35') + ';">' + m.badgeText + '</div>';
            } else {
              iconHtml = '<div class="incident-badge">!</div>';
            }
            var customIcon = L.divIcon({
              className: 'custom-leaflet-icon',
              html: iconHtml,
              iconSize: [0, 0]
            });
            var marker = L.marker([m.lat, m.lng], { icon: customIcon }).addTo(window.markersLayer);
            marker.on('click', function() {
              sendToNative({ type: 'MARKER_PRESS', id: m.id });
            });
          });
        };

        window.setCircles = function(circlesList) {
          if (!window.map || !window.circlesLayer) return;
          window.circlesLayer.clearLayers();
          circlesList.forEach(function(c) {
            L.circle([c.lat, c.lng], {
              radius: c.radius,
              fillColor: c.fillColor || 'rgba(240, 106, 53, 0.15)',
              fillOpacity: 0.25,
              color: c.strokeColor || '#F06A35',
              weight: c.strokeWidth || 1.5
            }).addTo(window.circlesLayer);
          });
        };

        window.setUserCoord = function(coord) {
          if (!window.map || !window.userLayer) return;
          window.userLayer.clearLayers();
          if (coord && coord.lat && coord.lng) {
            var userIcon = L.divIcon({
              className: 'user-icon-wrapper',
              html: '<div class="user-pulse-dot"></div>',
              iconSize: [0, 0]
            });
            L.marker([coord.lat, coord.lng], { icon: userIcon, interactive: false }).addTo(window.userLayer);
          }
        };

        window.flyToRegion = function(lat, lng, zoom) {
          if (!window.map) return;
          window.map.flyTo([lat, lng], zoom, { duration: 0.9 });
        };

        map.on('click', function(e) {
          sendToNative({ type: 'MAP_CLICK', latitude: e.latlng.lat, longitude: e.latlng.lng });
        });

        setTimeout(function() { map.invalidateSize(); }, 80);
        setTimeout(function() { map.invalidateSize(); }, 300);

        sendToNative({ type: 'MAP_READY' });
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
    }, [isDark]);

    const handleWebViewMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MAP_READY') {
          isMapReadyRef.current = true;
          // Inyectar datos iniciales inmediatamente al estar listo Leaflet
          const syncJs = `
            if (window.setMarkers) window.setMarkers(${serializedMarkers});
            if (window.setCircles) window.setCircles(${serializedCircles});
            if (window.setUserCoord) window.setUserCoord(${userCoord ? JSON.stringify({ lat: userCoord.latitude, lng: userCoord.longitude }) : 'null'});
            true;
          `;
          webViewRef.current?.injectJavaScript(syncJs);
        } else if (data.type === 'MARKER_PRESS') {
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
          onError={(e: any) => console.warn('[AleraInteractiveMap WebView Error]:', e.nativeEvent)}
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
