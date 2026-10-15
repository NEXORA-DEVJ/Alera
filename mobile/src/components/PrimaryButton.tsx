import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  style,
  loading = false,
  disabled = false,
  icon,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.ctaPrimaryText} size="small" />
      ) : (
        <>
          {icon ? icon : null}
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.ctaPrimary,
    height: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.ctaPrimaryText,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});