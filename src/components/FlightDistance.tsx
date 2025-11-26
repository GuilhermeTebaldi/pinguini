// src/components/FlightDistance.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useGameStore, { GameState } from '../store/useGameStore';

// ALTURA: ajuste aqui distncia por metros para onde quiser e tambem no HUD.tsx(504 = mesma que você usou; 64 = topo) 
const TOP_Y = 394;

// “Balanço” derivado de px (sem timers/Animated)
const WIGGLE_X = 1.4;
const WIGGLE_Y = 1.8;

export default function FlightDistance() {
  const phase = useGameStore((s: GameState) => s.phase);
  const px    = useGameStore((s: GameState) => s.px);

  // Marca X no instante do disparo
  const launchXRef = useRef<number | null>(null);
  const prevPhase  = useRef<string | null>(null);

  useEffect(() => {
    if (prevPhase.current !== 'flight' && phase === 'flight') {
      launchXRef.current = px;
    }
    if (phase !== 'flight') {
      launchXRef.current = null;
    }
    prevPhase.current = phase;
  }, [phase, px]);

  if (phase !== 'flight') return null;

  // Distância em tempo real (m)
  const x0 = launchXRef.current ?? px;
  const d  = Math.max(0, px - x0);
  const distance = Number.isFinite(d) ? d : 0;

  // “voando junto” derivado do px (sem riscos de crash)
  const t = px;
  const offX = Math.sin(t * 2.0) * WIGGLE_X;
  const offY = Math.sin(t * 2.8 + 0.6) * WIGGLE_Y;

  return (
    <View pointerEvents="none" style={[styles.container, { top: TOP_Y }]}>
   
         
          {/* conteúdo */}
          <View style={styles.row}>
            {/* label pequeno, opaco */}
            <Text style={styles.caption}>DISTÂNCIA</Text>
            <View style={{ height: 4 }} />
            <View style={styles.numRow}>
              <Text style={styles.value}>
                {distance.toFixed(1)}
              </Text>
              <Text style={styles.unit}>m</Text>
            </View>
          </View>
        </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 60,
    marginLeft: 20,   // desloca ~40px pra direita
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

  numRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  value: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '900',
    color: '#0f172a', // slate-900
    textShadowColor: 'rgba(96,165,250,0.35)', // brilho azul leve
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
