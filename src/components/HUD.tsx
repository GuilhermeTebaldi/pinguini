// src/components/HUD.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Image, Animated, Vibration } from 'react-native';
import PowerBar from './PowerBar';
import AngleSlider from './AngleSlider';
import useGameStore, {
  GameState,
  BOOST_WINDOW_MS,
  BOOST_BLUE_START_MS,
  BOOST_BLUE_DURATION_MS,
} from '../store/useGameStore';
import { Ionicons } from '@expo/vector-icons';
import { playFishSuccess, playFishFail, playBombCountdown, playBombExplosion } from '../services/audio';

const FISH_SPRITE = require('../../assets/fish-icon.png');
const FISH_TIMEOUT_MS = 1100;
const FISH_RESPAWN_MS = 260;
const FISH_OFFSET_X = 120;
const FISH_OFFSET_Y = 55;
const FISH_SIZE = 48;
const BOMB_SIZE = 60;
const SLIDE_PY_THRESHOLD = 0.08;
const SLIDE_VY_THRESHOLD = 0.16;

export default function HUD() {
  const reset     = useGameStore((s: GameState) => s.reset);
  const distance  = useGameStore((s: GameState) => s.distance);
  const hasLanded = useGameStore((s: GameState) => s.hasLanded);
  const running   = useGameStore((s: GameState) => s.running);
  const phase     = useGameStore((s: GameState) => s.phase);
  const pressMain = useGameStore((s: GameState) => s.pressMain);
  const applyFishImpulse = useGameStore((s: GameState) => s.applyFishImpulse);
  const fishBoostCount = useGameStore((s: GameState) => s.fishBoostCount);
  const bombReady = useGameStore((s: GameState) => s.bombReady);
  const triggerBombImpulse = useGameStore((s: GameState) => s.triggerBombImpulse);
  const py        = useGameStore((s: GameState) => s.py);
  const vy        = useGameStore((s: GameState) => s.vy ?? 0);

  const boostWindowStart = useGameStore((s: GameState) => s.boostWindowStart);
  const boostUsed = useGameStore((s: GameState) => s.boostUsed);
  const boostBlastKey = useGameStore((s: GameState) => s.boostBlastKey);
  const boostLastIntensity = useGameStore((s: GameState) => s.boostLastIntensity);

  const angleDeg  = useGameStore((s: GameState) => s.angleDeg ?? 0);
  const [tick, setTick] = useState(Date.now());
  const [blastVisible, setBlastVisible] = useState(false);
  const [fishVisible, setFishVisible] = useState(false);
  const [fishActive, setFishActive] = useState(false);
  const [fishFailed, setFishFailed] = useState(false);
  const [fishStatus, setFishStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [fishPosition, setFishPosition] = useState({ x: 0, y: 0 });
  const [fishSessionActive, setFishSessionActive] = useState(false);
  const fishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFishTimer = useCallback(() => {
    if (fishTimerRef.current) {
      clearTimeout(fishTimerRef.current);
      fishTimerRef.current = null;
    }
  }, []);
  const failFish = useCallback(() => {
    if (fishFailed) return;
    clearFishTimer();
    setFishSessionActive(false);
    setFishActive(false);
    setFishFailed(true);
    setFishStatus('fail');
    setFishVisible(true);
    void playFishFail();
  }, [fishFailed, clearFishTimer]);
  const spawnFish = useCallback(() => {
    if (fishFailed) return;
    const offsetX = (Math.random() - 0.5) * 2 * FISH_OFFSET_X;
    const offsetY = (Math.random() - 0.5) * 2 * FISH_OFFSET_Y;
    setFishPosition({ x: offsetX, y: offsetY });
    setFishStatus('idle');
    setFishVisible(true);
    setFishActive(true);
    clearFishTimer();
    fishTimerRef.current = setTimeout(() => failFish(), FISH_TIMEOUT_MS);
  }, [fishFailed, clearFishTimer, failFish]);
  const handleFishPress = () => {
    if (!fishActive || fishFailed) return;
    clearFishTimer();
    setFishActive(false);
    setFishStatus('success');
    setFishVisible(false);
    void playFishSuccess();
    applyFishImpulse();
    fishTimerRef.current = setTimeout(() => {
      if (!fishFailed) {
        spawnFish();
      }
    }, FISH_RESPAWN_MS);
  };
  const handleBombPress = () => {
    if (bombPhase !== 'ready') return;
    setBombPhase('countdown');
    clearBombTimer();
    void playBombCountdown();
    bombTimerRef.current = setTimeout(() => {
      setBombPhase('explode');
      void playBombExplosion();
      triggerBombImpulse();
      bombTimerRef.current = setTimeout(() => {
        setBombPhase('idle');
        bombTimerRef.current = null;
      }, 700);
    }, 420);
  };
  const [bombPhase, setBombPhase] = useState<'idle' | 'ready' | 'countdown' | 'explode'>('idle');
  const bombTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearBombTimer = useCallback(() => {
    if (bombTimerRef.current) {
      clearTimeout(bombTimerRef.current);
      bombTimerRef.current = null;
    }
  }, []);
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

  const slidingGround =
    phase === 'flight' &&
    running &&
    py <= SLIDE_PY_THRESHOLD &&
    Math.abs(vy) <= SLIDE_VY_THRESHOLD;

  useEffect(() => {
    if (slidingGround) {
      if (!fishSessionActive && !fishFailed) {
        setFishSessionActive(true);
        setFishFailed(false);
        spawnFish();
      }
    } else {
      clearFishTimer();
      setFishSessionActive(false);
      setFishVisible(false);
      setFishActive(false);
      setFishFailed(false);
      setFishStatus('idle');
    }
  }, [slidingGround, fishSessionActive, fishFailed, spawnFish, clearFishTimer]);

  useEffect(() => () => clearFishTimer(), [clearFishTimer]);

  useEffect(() => {
    if (!slidingGround) {
      if (bombPhase !== 'idle') {
        setBombPhase('idle');
      }
      clearBombTimer();
      return;
    }
    if (bombReady && bombPhase === 'idle') {
      setBombPhase('ready');
    }
  }, [slidingGround, bombReady, bombPhase, clearBombTimer]);

  useEffect(() => () => clearBombTimer(), [clearBombTimer]);

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
  const smokeOpacity = blueReady ? 0.32 + blueIntensity * 0.5 : 0;
  const smokeScale = blueReady ? 0.95 + blueIntensity * 1.2 : 0.8;
  const sparkScale = blueReady ? 1 + blueIntensity * 0.7 : 0.8;
  const haloScale = blueReady ? 1 + blueIntensity * 0.22 : 0.9 + yellowProgress * 0.2;
  const haloOpacity = blueReady ? 0.25 + blueIntensity * 0.6 : 0.2 + yellowProgress * 0.55;
  const haloColor = blueReady ? '#2563eb' : '#fbbf24';
  const blastScale = 0.8 + boostLastIntensity * 0.9;
  const blastOpacity = 0.35 + boostLastIntensity * 0.55;
  const fishTransform = [
    { translateX: fishPosition.x },
    { translateY: fishPosition.y },
    ...(fishStatus === 'success'
      ? [{ scale: 1.05 }]
      : fishStatus === 'fail'
        ? [{ scale: 0.96 }]
        : []),
  ];
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shakeStyle = {
    transform: [
      {
        translateX: shakeAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 6, -4],
        }),
      },
      {
        translateY: shakeAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -3, 5],
        }),
      },
    ],
  };

  useEffect(() => {
    if (bombPhase !== 'explode') return;
    Vibration.vibrate(260);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => shakeAnim.setValue(0));
  }, [bombPhase, shakeAnim]);

  return (
    <Animated.View style={[styles.hud, shakeStyle]} pointerEvents="box-none">
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
          {blueReady && (
            <>
              <View
                pointerEvents="none"
                style={[
                  styles.boostSmokeCloud,
                  {
                    opacity: smokeOpacity,
                    transform: [{ scale: smokeScale }],
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.boostSmokeTrail,
                  {
                    opacity: smokeOpacity * 0.7,
                    transform: [{ scale: sparkScale }],
                  },
                ]}
              />
            </>
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

      {fishVisible && (
        <View pointerEvents="box-none" style={styles.fishLayer}>
          <View
            pointerEvents="box-none"
            style={[styles.fishHolder, { transform: fishTransform }]}
          >
            <Pressable
              pointerEvents={fishActive ? 'auto' : 'none'}
              onPress={handleFishPress}
              style={({ pressed }) => [
                styles.fishButton,
                fishStatus === 'success' && styles.fishSuccess,
                fishFailed && styles.fishFailed,
                pressed && styles.fishPressed,
              ]}
            >
              <Image source={FISH_SPRITE} style={styles.fishImage} />
              {fishFailed && <View style={styles.fishFailBadge} />}
            </Pressable>
            {!fishFailed && <Text style={styles.fishHint}>Clique rápido!</Text>}
          </View>
        </View>
      )}

      {bombPhase !== 'idle' && (
        <View pointerEvents="box-none" style={styles.bombLayer}>
          {bombPhase === 'explode' && (
            <>
              <View style={styles.bombExplosionGlow} />
              <View style={styles.bombExplosionSmoke} />
            </>
          )}
          <Pressable
            pointerEvents={bombPhase === 'ready' ? 'auto' : 'none'}
            onPress={handleBombPress}
            style={({ pressed }) => [
              styles.bombButton,
              bombPhase === 'ready' && styles.bombReady,
              pressed && styles.bombPressed,
            ]}
          >
            <View style={styles.bombCore}>
              <View style={styles.bombFuse} />
              <View style={styles.bombSpark} />
            </View>
            {bombPhase === 'explode' && <View style={styles.bombFlame} />}
          </Pressable>
          {bombPhase === 'countdown' && (
            <Text style={styles.bombCountdownText}>3...</Text>
          )}
        </View>
      )}

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
          <Text style={styles.fishResult}>Peixinhos: {fishBoostCount}</Text>
          </View>
        </View>
      )}
    </Animated.View>
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
  fishResult: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.6,
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
  boostSmokeCloud: {
    position: 'absolute',
    top: -28,
    bottom: -28,
    left: -28,
    right: -28,
    borderRadius: 999,
    borderWidth: 1.25,
    borderColor: 'rgba(59,130,246,0.45)',
    backgroundColor: 'rgba(37,99,235,0.24)',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    zIndex: 0,
  },
  boostSmokeTrail: {
    position: 'absolute',
    bottom: -32,
    right: -8,
    width: 46,
    height: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(37,99,235,0.25)',
    borderWidth: 0.85,
    borderColor: 'rgba(59,130,246,0.5)',
    zIndex: 0,
  },
  fishLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 140,
    pointerEvents: 'none',
  },
  fishHolder: {
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  fishButton: {
    width: FISH_SIZE,
    height: FISH_SIZE,
    borderRadius: FISH_SIZE / 2,
    borderWidth: 2,
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(37,99,235,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  fishImage: {
    width: FISH_SIZE * 0.8,
    height: FISH_SIZE * 0.8,
    resizeMode: 'contain',
  },
  fishHint: {
    marginTop: 6,
    color: '#f8fafc',
    fontSize: 11,
    letterSpacing: 0.6,
    textShadowColor: 'rgba(15,23,42,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  fishSuccess: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  fishFailed: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248,113,113,0.28)',
  },
  fishPressed: {
    opacity: 0.8,
  },
  fishFailBadge: {
    position: 'absolute',
    width: 12,
    height: 3,
    borderRadius: 6,
    backgroundColor: '#f87171',
    top: 4,
    right: 4,
  },
  bombLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 180,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 190,
    pointerEvents: 'box-none',
  },
  bombButton: {
    width: BOMB_SIZE,
    height: BOMB_SIZE,
    borderRadius: BOMB_SIZE / 2,
    borderWidth: 3,
    borderColor: '#fb923c',
    backgroundColor: '#b91c1c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  bombReady: {
    backgroundColor: '#dc2626',
  },
  bombPressed: {
    opacity: 0.85,
  },
  bombCore: {
    width: BOMB_SIZE * 0.6,
    height: BOMB_SIZE * 0.6,
    borderRadius: (BOMB_SIZE * 0.6) / 2,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#fcd34d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bombFuse: {
    position: 'absolute',
    top: -10,
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#fde68a',
  },
  bombSpark: {
    position: 'absolute',
    top: -18,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    opacity: 0.9,
  },
  bombFlame: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(249,115,22,0.75)',
    bottom: -18,
    opacity: 0.9,
  },
  bombExplosionGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(248,113,113,0.35)',
    zIndex: -2,
  },
  bombExplosionSmoke: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(15,23,42,0.55)',
    opacity: 0.8,
    zIndex: -1,
  },
  bombCountdownText: {
    marginTop: 8,
    color: '#fde68a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
