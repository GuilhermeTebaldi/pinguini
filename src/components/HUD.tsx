// src/components/HUD.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PowerBar from './PowerBar';
import AngleSlider from './AngleSlider';
import useGameStore, {
  GameState,
  BOOST_WINDOW_MS,
  BOOST_BLUE_START_MS,
  BOOST_BLUE_DURATION_MS,
} from '../store/useGameStore';
import { Ionicons } from '@expo/vector-icons';

export default function HUD() {
  const reset     = useGameStore((s: GameState) => s.reset);
  const distance  = useGameStore((s: GameState) => s.distance);
  const hasLanded = useGameStore((s: GameState) => s.hasLanded);
  const running   = useGameStore((s: GameState) => s.running);
  const phase     = useGameStore((s: GameState) => s.phase);
  const pressMain = useGameStore((s: GameState) => s.pressMain);

  const boostWindowStart = useGameStore((s: GameState) => s.boostWindowStart);
  const boostUsed = useGameStore((s: GameState) => s.boostUsed);
  const boostBlastKey = useGameStore((s: GameState) => s.boostBlastKey);
  const boostLastIntensity = useGameStore((s: GameState) => s.boostLastIntensity);

  const angleDeg  = useGameStore((s: GameState) => s.angleDeg ?? 0);
  const powerVal  = useGameStore((s: GameState) => s.power01 ?? 0);
  const [tick, setTick] = useState(Date.now());
  const [blastVisible, setBlastVisible] = useState(false);

  useEffect(() => {
    let frame: number | null = null;
    const loop = () => {
      setTick(Date.now());
      frame = requestAnimationFrame(loop);
    };
    if (phase === 'flight' && !boostUsed) {
      frame = requestAnimationFrame(loop);
    }
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [phase, boostUsed]);

  useEffect(() => {
    if (!boostBlastKey) return;
    setBlastVisible(true);
    const id = setTimeout(() => setBlastVisible(false), 520);
    return () => clearTimeout(id);
  }, [boostBlastKey]);

  const boostWindowActive = phase === 'flight' && !boostUsed && boostWindowStart > 0;
  const elapsedMs = boostWindowActive
    ? Math.min(BOOST_WINDOW_MS, Math.max(0, tick - boostWindowStart))
    : 0;
  const yellowProgress =
    BOOST_BLUE_START_MS > 0 ? Math.min(1, elapsedMs / BOOST_BLUE_START_MS) : 1;
  const blueReady =
    elapsedMs >= BOOST_BLUE_START_MS && elapsedMs <= BOOST_BLUE_START_MS + BOOST_BLUE_DURATION_MS;
  const blueIntensity = blueReady
    ? Math.max(0, 1 - (elapsedMs - BOOST_BLUE_START_MS) / BOOST_BLUE_DURATION_MS)
    : 0;
  const haloScale = blueReady ? 1 + blueIntensity * 0.22 : 0.9 + yellowProgress * 0.2;
  const haloOpacity = blueReady ? 0.25 + blueIntensity * 0.6 : 0.2 + yellowProgress * 0.55;
  const haloColor = blueReady ? '#2563eb' : '#fbbf24';
  const blastScale = 0.8 + boostLastIntensity * 0.9;
  const blastOpacity = 0.35 + boostLastIntensity * 0.55;

  return (
    <View style={styles.hud} pointerEvents="box-none">
      {/* Título */}
      <View style={styles.topRow}>
        <Text style={styles.title}>PINGUINI</Text>
      </View>

      {/* Barras na ESQUERDA (sempre em pé) */}
      <View style={styles.leftBars} pointerEvents="box-none">
        {/* Força */}
        <View style={styles.barCard}>
          <Text style={[styles.badge, styles.badgeForce]}>Força</Text>
          <PowerBar />
        </View>

        {/* Ângulo (em pé + número no topo) */}
        <View style={styles.barCard}>
          <Text style={styles.label}> </Text>
          <Text style={styles.label}></Text>
          <Text style={[styles.badge, styles.badgeAngle]}>{Math.round(angleDeg)}°</Text>
          <AngleSlider />
        </View>
      </View>

      {/* Botões na DIREITA */}
      <View style={styles.sideButtons} pointerEvents="box-none">
        <View style={styles.boostBtnWrap}>
          {boostWindowActive && (
            <View
              pointerEvents="none"
              style={[
                styles.boostHalo,
                {
                  opacity: haloOpacity,
                  borderColor: haloColor,
                  transform: [{ scale: haloScale }],
                },
              ]}
            />
          )}
          {blastVisible && (
            <View
              pointerEvents="none"
              style={[
                styles.boostBlast,
                {
                  opacity: blastOpacity,
                  transform: [{ scale: blastScale }],
                },
              ]}
            >
              <View style={[styles.boostBubble, styles.blastMain]} />
              <View style={styles.boostBubble} />
              <View style={[styles.boostBubble, styles.blastTail]} />
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={hasLanded && !running ? reset : pressMain}
            style={[
              styles.floatBtn,
              hasLanded && !running ? styles.resetBtn : styles.mainBtn,
            ]}
          >
            {hasLanded && !running ? (
              <Ionicons name="arrow-undo" size={32} color="#fff" />
            ) : phase === 'power' ? (
              <Ionicons name="flash" size={32} color="#fff" />
            ) : phase === 'angle' ? (
              <Ionicons name="speedometer" size={32} color="#fff" />
            ) : (
              <Ionicons name="rocket" size={32} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={reset}
          style={[styles.floatBtn, styles.resetBtn]}
        >
          <Text style={styles.floatIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Resultado */}
      {hasLanded && !running && (
        <View style={styles.resultTop}>
          <View style={styles.row}>
            <Text style={styles.caption}>DISTÂNCIA</Text>
            <View style={{ height: 4 }} />
            <View style={styles.numRow}>
              <Text style={styles.value}>{(distance ?? 0).toFixed(1)}</Text>
              <Text style={styles.unit}>m</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const BTN_SIZE = 64;
const BAR_CARD_W = 64;
const BAR_CARD_H = 160;
const INSET = 8;

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    padding: 12,
  },
  topRow: { paddingTop: 8, alignItems: 'center' },
  title: {
    fontSize: 28, fontWeight: '900', color: '#F59E0B', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },

  /* ESQUERDA */
  leftBars: {
    position: 'absolute',
    left: 16,
    top: 140,
    gap: 14,
  },
  barCard: {
    width: BAR_CARD_W,
    height: BAR_CARD_H,
    borderRadius: 18,
    backgroundColor: '#ffffffee',
    paddingVertical: INSET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  badgeForce: { backgroundColor: '#0ea5e9' }, // azul
  badgeAngle: { backgroundColor: '#16a34a' }, // verde

  /* Resultado flutuante (alinhado com FlightDistance) */
  resultTop: {
    position: 'absolute',
    top: 394,           // E TAMBEM NO FlightDistance.tsx aumentar a autura do valor distancia para cima ou para baixo ⬅️ se seu FlightDistance está no topo, mude para 64
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 80,
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
    color: '#0f172a',
    textShadowColor: 'rgba(96,165,250,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  label: {
    fontSize: 12,
    color: 'transparent', // invisível, serve só pra “empurrar” layout
    marginVertical: 2,
  },
  unit: {
    marginLeft: 6,
    marginBottom: 2,
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(15,23,42,0.7)',
  },

  /* DIREITA */
  sideButtons: { position: 'absolute', right: 16, top: 140, alignItems: 'flex-end', gap: 14 },
  floatBtn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
    zIndex: 2,
  },
  mainBtn: { backgroundColor: '#f59e0b' },
  resetBtn: { backgroundColor: '#3b82f6' },
  floatIcon: { fontSize: 28, color: '#fff' },
  boostBtnWrap: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostHalo: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: -10,
    right: -10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fde68a',
    zIndex: 1,
  },
  boostBlast: {
    position: 'absolute',
    bottom: -14,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  boostBubble: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#fde68a',
    marginLeft: 4,
    opacity: 0.8,
  },
  blastMain: {
    width: 8,
    height: 8,
    marginLeft: 0,
  },
  blastTail: {
    backgroundColor: '#fbbf24',
    width: 5,
    height: 5,
    marginLeft: 2,
  },
});
