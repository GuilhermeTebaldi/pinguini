// src/components/AngleSlider.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import useGameStore, { GameState } from '../store/useGameStore';

const MIN = 10;
const MAX = 80;

export default function AngleSlider() {
  const angle = useGameStore((s: GameState) => s.angleDeg);
  const setAngle = useGameStore((s: GameState) => s.setAngle);
  const phase = useGameStore((s: GameState) => s.phase);

  const [dir, setDir] = useState<1 | -1>(1);
  const anim = useRef(new Animated.Value(angle)).current;

  // sincroniza anim -> store
  useEffect(() => {
    const id = anim.addListener(({ value }) => setAngle(value));
    return () => {
      anim.removeAllListeners();
      // @ts-ignore
      anim.removeListener(id);
    };
  }, [anim, setAngle]);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      const to = dir === 1 ? MAX : MIN;
      Animated.timing(anim, {
        toValue: to,
        duration: 1400, //velocidade do angulo de arremeço sobe e baixa 
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !cancelled && phase === 'angle') {
          setDir(d => (d === 1 ? -1 : 1));
          tick();
        }
      });
    };

    if (phase === 'angle') {
      tick();
    } else {
      anim.stopAnimation((v: number) => setAngle(v));
    }

    return () => {
      cancelled = true;
      anim.stopAnimation();
    };
  }, [anim, phase, dir, setAngle]);

  const HEIGHT = 140;
  const WIDTH = 18;

  // normaliza [MIN..MAX] -> [0..1]
  const t = anim.interpolate({
    inputRange: [MIN, MAX],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fillH = t.interpolate({
    inputRange: [0, 1],
    outputRange: [10, HEIGHT - 10],
  });

  return (
      <View style={styles.wrap}>
       <Animated.Text></Animated.Text>                          
        {/* Trilha com contorno dourado e brilho */}
        <View style={[styles.bar, { height: HEIGHT, width: WIDTH }]}>
            {/* ticks (marquinhas) laterais */}
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[styles.tick, { top: (HEIGHT - 8) * (i / 8) + 4 }]} />
        ))}

        <Animated.View style={[styles.fill, { height: fillH }]} />
        
        <View style={styles.mid} />
        <View style={styles.gloss} />
      </View>
    </View>
  );
}

const GREEN = '#16a34a';
const styles = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 6 },
    bar: {
      backgroundColor: '#0f172a12',
      borderRadius: 999,
      justifyContent: 'flex-end',
      padding: 4,
      position: 'relative',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.75)',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 10, height: 3 },
      overflow: 'hidden',
    },
  fill: {
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 999,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.5)',
  },
  mid: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: '50%',
    height: 2,
    backgroundColor: '#0f172a25',
    borderRadius: 1,
  },
  tick: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.16)',
  },
  gloss: {
    position: 'absolute',
    left: 6,
    right: '50%',
    top: 6,
    bottom: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
  },
  cap: {
    width: 28, height: 18, borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
  },
  capIcon: { fontSize: 12, lineHeight: 12
   },

label: {
  fontSize: 12,
  color: 'transparent', // invisível
  marginVertical: 2,    // espaça pra baixo
},
});
