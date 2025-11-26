// src/components/ArrowIndicator.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useGameStore, { GameState } from '../store/useGameStore';
import { metersToPx } from '../game/physics';
//import { Platform, StyleSheet } from 'react-native';
type Props = {
  ppm: number;
  marginLeftPx: number;
  groundBottomPx: number;
};

export default function ArrowIndicator({ ppm, marginLeftPx, groundBottomPx }: Props) {
  const px     = useGameStore((s: GameState) => s.px);
  const py     = useGameStore((s: GameState) => s.py);
  const cameraX= useGameStore((s: GameState) => s.cameraX);
  const phase  = useGameStore((s: GameState) => s.phase);

  const { width: W, height: H } = useWindowDimensions();

  // Mundo → tela
  const xPx = metersToPx(px, ppm) - metersToPx(cameraX, ppm) + marginLeftPx;
  const yPx = H - (groundBottomPx + py * ppm);

  // Só aparece quando está voando e acima do topo (fora da tela)
  const visible = phase === 'flight' && yPx <= 12;

  // Largura aproximada do marcador (ícone + texto)
  const INDICATOR_W = 84;
  // Clampa posição horizontal para nunca sair da tela
  const clampedLeft = useMemo(() => {
    const left = xPx - INDICATOR_W / 2;
    return Math.max(8, Math.min(left, W - INDICATOR_W - 8));
  }, [xPx, W]);

  // ---- Animações (pulso + bounce + glow) ----
  const pulse = useRef(new Animated.Value(0)).current;   // escala/opacity
  const bob   = useRef(new Animated.Value(0)).current;   // quique vertical

  useEffect(() => {
    if (!visible) return;
    // Pulso contínuo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      ])
    );
    // Quique contínuo (sutil)
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    bobLoop.start();
    return () => {
      pulseLoop.stop();
      bobLoop.stop();
      pulse.setValue(0);
      bob.setValue(0);
    };
  }, [visible, pulse, bob]);

  if (!visible) return null;

  // Interpolações
  const scale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOp  = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
  const bobDy   = bob.interpolate({   inputRange: [0, 1], outputRange: [0, -4] });

  // Altura (m) só pra informar — opcional, arredondado
  const altitudeM = Math.max(0, py);

  return (
    <View pointerEvents="none" style={[styles.wrap, { left: clampedLeft }]}>
      {/* “Glow” por trás */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOp,
            transform: [{ scale }],
          },
        ]}
      />
      {/* Conteúdo do indicador */}
      <Animated.View
        style={[
          styles.arrow,
          {
            transform: [{ translateY: bobDy }],
          },
        ]}
      >
        <Ionicons name="arrow-up-circle" size={36} color="#f59e0b" />
        <Text style={styles.txt}>Pinguim</Text>
        <Text style={styles.alt}>{altitudeM.toFixed(0)} m</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 6,               // colado no topo
    width: 84,
    alignItems: 'center',
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: 8,             // mantenha os seus valores originais
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59,130,246,0.35)',

    // 👇 web-only (tipagem segura)
    ...(Platform.OS === 'web'
      ? ({ filter: 'blur(10px)' } as any)
      : {}),
  },
  txt: {
    marginTop: 2,
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  alt: {
    fontSize: 9,
    color: '#e5e7eb',
    fontWeight: '500',
  },
});
