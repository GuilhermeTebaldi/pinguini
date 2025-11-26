// src/components/ImpactSnow.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

type Variant = 'up' | 'radial';

type Props = {
  x: number;
  y: number;
  count?: number;          // quantidade de partículas
  durationMs?: number;     // duração total da animação
  variant?: Variant;       // 'up' (p/ cima) | 'radial' (360°)
  colors?: string[];       // cores alternadas das partículas
  onDone?: () => void;     // callback ao terminar
};

const DEFAULT_COLORS = ['#ffffff', '#e0f2fe', '#dbeafe'];
const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

export default function ImpactSnow({
  x,
  y,
  count = 14,
  durationMs = 900,
  variant = 'up',
  colors = DEFAULT_COLORS,
  onDone,
}: Props) {
  const parts = Math.max(4, count);
  const timers = useRef<Animated.CompositeAnimation[]>([]);

  const seeds = useMemo(() => {
    const arr = [];
    for (let i = 0; i < parts; i++) {
      const a = variant === 'radial'
        ? (i / parts) * Math.PI * 2
        : (Math.random() * Math.PI) / 2 + Math.PI; // jato pra cima/diagonal
      const r = 8 + Math.random() * 14; // alcance
      const size = 2 + Math.random() * 3;
      const life = 0.6 + Math.random() * 0.5; // vida relativa (0..1)
      arr.push({ angle: a, radius: r, size, life });
    }
    return arr;
  }, [parts, variant]);

  const anims = useMemo(
    () =>
      seeds.map(() => ({
        tx: new Animated.Value(0),
        ty: new Animated.Value(0),
        op: new Animated.Value(1),
        sc: new Animated.Value(1),
      })),
    [seeds]
  );

  useEffect(() => {
    // inicia animações
    timers.current = anims.map((a, idx) => {
      const seed = seeds[idx];
      const dx = Math.cos(seed.angle) * seed.radius;
      const dy = Math.sin(seed.angle) * seed.radius;

      return Animated.parallel([
        Animated.timing(a.tx, {
          toValue: dx,
          duration: durationMs * seed.life,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(a.ty, {
          toValue: dy,
          duration: durationMs * seed.life,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(a.op, {
          toValue: 0,
          duration: durationMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(a.sc, {
          toValue: 0.8,
          duration: durationMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(8, timers.current).start(({ finished }) => {
      if (finished && onDone) onDone();
    });

    return () => timers.current.forEach(t => t.stop());
  }, [anims, seeds, durationMs, onDone]);

  return (
    <View style={[StyleSheet.absoluteFillObject, { left: x, top: y }]}>
      {anims.map((a, i) => {
        const c = colors[i % colors.length];
        const size = seeds[i].size;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: c,
              opacity: a.op,
              transform: [{ translateX: a.tx }, { translateY: a.ty }, { scale: a.sc }],
            }}
          />
        );
      })}
    </View>
  );
}
