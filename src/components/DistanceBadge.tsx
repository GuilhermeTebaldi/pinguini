// src/components/DistanceBadge.tsx
import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

type DistanceBadgeProps = {
  distance?: number;
  label?: string;
  renderValue?: (valueStyle: TextStyle) => ReactNode;
  numRowExtras?: ReactNode;
  children?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function DistanceBadge({
  distance = 0,
  label = 'DISTÂNCIA',
  renderValue,
  numRowExtras,
  children,
  containerStyle,
}: DistanceBadgeProps) {
  const safeDistance = Number.isFinite(distance) ? distance : 0;
  const renderValueNode = renderValue ? renderValue(styles.value) : (
    <Text style={styles.value}>{safeDistance.toFixed(1)}</Text>
  );

  return (
    <View pointerEvents="none" style={[styles.container, containerStyle]}>
      <View style={styles.row}>
        <Text style={styles.caption}>{label}</Text>
        <View style={styles.spacer} />
        <View style={styles.numRow}>
          {renderValueNode}
          <Text style={styles.unit}>m</Text>
          {numRowExtras}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },

  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },

  caption: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(15,23,42,0.55)',
    fontWeight: '800',
  },

  spacer: {
    height: 4,
  },

  numRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  value: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '900',
    color: '#0f172a',
    textShadowColor: 'rgba(96,165,250,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  unit: {
    marginLeft: 6,
    marginBottom: 2,
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(15,23,42,0.7)',
  },
});
