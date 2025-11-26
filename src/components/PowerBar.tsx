import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import useGameStore, { GameState } from '../store/useGameStore';

export default function PowerBar() {
  const setPower01 = useGameStore((s: GameState) => s.setPower01);
  const phase = useGameStore((s: GameState) => s.phase);
  const [toggle, setToggle] = useState(true);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    const startLoop = () => {
      Animated.timing(anim, {
        toValue: toggle ? 1 : 0,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !cancelled && phase === 'power') {
          setToggle(t => !t);
          startLoop();
        }
      });
    };

    const id = anim.addListener(({ value }) => setPower01(value));

    if (phase === 'power') {
      startLoop();
    } else {
      anim.stopAnimation((v: number) => setPower01(v));
    }

    return () => {
      cancelled = true;
      anim.removeAllListeners();
      anim.stopAnimation();
      // @ts-ignore
      anim.removeListener(id);
    };
  }, [anim, toggle, setPower01, phase]);

  const HEIGHT = 140;
  const WIDTH = 18;
  const value = anim as unknown as Animated.AnimatedInterpolation<number>;
  const fillH = value.interpolate({
     inputRange: [0, 1], 
     outputRange: [10, HEIGHT - 10]
     });

  return (
    <View style={styles.wrap}>
     <Animated.Text> </Animated.Text>             
     <Animated.Text></Animated.Text>
      {/* Trilha com contorno dourado e brilho */}
      <View style={[styles.bar, { height: HEIGHT, width: WIDTH }]}>
        {/* ticks (marquinhas) laterais */}
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[styles.tick, { top: (HEIGHT - 8) * (i / 8) + 4 }]} />
        ))}

        {/* preenchimento */}
        <Animated.View style={[styles.fill, { height: fillH }]} />
        {/* linha alvo no meio */}
        <View style={styles.mid} />

        {/* brilho lateral */}
        <View style={styles.gloss} />
      </View>
    </View>
  );
}

const GOLD = '#f59e0b';
const GOLD_LIGHT = '#fbbf24';
const DARK = '#0f172a';

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
    shadowOffset: { width: 10, height: 1 },
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    backgroundColor: GOLD,
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
  crownCap: {
    width: 28, height: 18, borderRadius: 14,
    backgroundColor: GOLD_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
  },
  crown: { fontSize: 12, lineHeight: 12 
  },
  label: {
    fontSize: 12,
    color: 'transparent', // invisível
    marginVertical: 2,    // espaça pra baixo
  },
});
