import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw, MapPinOff } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('[ALERA MAP ERROR BOUNDARY] Fallo en renderizado de mapa:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallbackContainer}>
          <MapPinOff size={36} color="#F06A35" strokeWidth={1.8} />
          <Text style={styles.fallbackTitle}>Visualización del Mapa No Disponible</Text>
          <Text style={styles.fallbackSubtitle}>
            {this.props.fallbackMessage || 'El servicio de mapas nativo no pudo inicializarse en este dispositivo.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry} activeOpacity={0.8}>
            <RefreshCw size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.retryButtonText}>Reintentar Carga</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111317',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 14,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    color: '#8A929A',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F06A35',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
