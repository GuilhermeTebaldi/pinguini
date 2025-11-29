import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Image } from 'react-native';
import useGameStore from '../store/useGameStore';
import { startAmbientSound } from '../services/audio';

export default function MenuOverlay() {
  const menuOpen          = useGameStore((s) => s.menuOpen);
  const hasStartedBefore  = useGameStore((s) => s.hasStartedBefore);
  const closeMenu         = useGameStore((s) => s.closeMenu);
  const setGameStarted    = useGameStore((s) => s.setGameStarted);
  const markStartedBefore = useGameStore((s) => s.markStartedBefore);
  const ranking           = useGameStore((s) => s.ranking);
  const [showRanking, setShowRanking] = useState(false);

  const handleCloseRanking = () => setShowRanking(false);

  if (!menuOpen && hasStartedBefore) return null;

  const handleStart = () => {
    startAmbientSound();
    setGameStarted(true);
    markStartedBefore();
    closeMenu();
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.cloudTop} />
      <View style={styles.cloudBottom} />

      <View style={styles.card}>
        {/* topo: ícone + nome da liga */}
        <View style={styles.logoRow}>
          <View style={styles.logoBubble}>
            <Image source={require('../../assets/icon.png')} style={styles.icon} />
          </View>
          <View style={styles.logoTextWrap}>
            <Text style={styles.logoTitle}>Pinguin League</Text>
            <Text style={styles.logoSub}>Reino de Gelo</Text>
            <Text style={styles.subtitle}>2.0</Text>
          </View>
        </View>

        {/* título principal */}
        <Text style={styles.title}>PINGUINI </Text>
       
        <Text style={styles.subtitle}>Lança, voa e desliza!</Text>

        {/* faixa colorida simples */}
        <View style={styles.ribbon}>
          <View style={styles.ribbonLeft} />
          <View style={styles.ribbonCenter} />
          <View style={styles.ribbonRight} />
        </View>

        {/* melhor distância (se houver) */}
        <View style={styles.bestBox}>
          <Text style={styles.bestEmoji}>👑</Text>
          <View>
            <Text style={styles.bestLabel}>Melhor distância</Text>
            <Text style={styles.bestValue}>
              {ranking.length > 0 ? `${ranking[0].toFixed(1)} m` : 'Nenhum recorde ainda'}
            </Text>
          </View>
        </View>

        {/* botões */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.9}>
            <Text style={styles.startText}>JOGAR</Text>
            <Text style={styles.startHint}>Lançar pinguim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rankButton, showRanking && styles.rankButtonActive]}
            onPress={() => setShowRanking((prev) => !prev)}
            activeOpacity={0.9}
          >
            <Text style={styles.rankText}>RANKING</Text>
            <Text style={styles.rankHint}>{ranking.length || 0} registros</Text>
          </TouchableOpacity>
        </View>

      </View>

        {/* floating ranking card (centralizado) */}
        {showRanking && (
          <>
            <Pressable style={styles.backdrop} onPress={handleCloseRanking} />
            <View style={styles.floatingRanking} pointerEvents="box-none">
              <View style={styles.rankingList}>
                <View style={styles.rankingHeaderRow}>
                  <Text style={styles.rankingTitle}>Quadro de Honra</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={handleCloseRanking}>
                    <Text style={styles.closeText}>×</Text>
                  </TouchableOpacity>
                </View>

                {ranking.length === 0 ? (
                  <Text style={styles.emptyText}>Sem registros ainda. Comece a reinar!</Text>
                ) : (
                  ranking.map((value, index) => {
                    const pos = index + 1;
                    const medal =
                      pos === 1 ? '🥇' :
                      pos === 2 ? '🥈' :
                      pos === 3 ? '🥉' : '❄️';
                    return (
                      <View key={index} style={styles.rankRow}>
                        <View style={styles.rankLeft}>
                          <Text style={styles.medal}>{medal}</Text>
                          <Text style={styles.rankLine}>#{pos}</Text>
                        </View>
                        <Text style={styles.rankDistance}>{value.toFixed(1)} m</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </>
        )}

    </View>
  );
}

export function MenuToggle() {
  const openMenu = useGameStore((s) => s.openMenu);
  const menuOpen = useGameStore((s) => s.menuOpen);
  if (menuOpen) return null;

  return (
    <TouchableOpacity style={styles.toggle} onPress={openMenu} activeOpacity={0.9}>
      <View style={styles.toggleIcon}>
        <View style={styles.bar} />
        <View style={styles.bar} />
        <View style={[styles.bar, styles.barSmall]} />
      </View>
      <View>
        <Text style={styles.toggleText}>MENU</Text>
        <Text style={styles.toggleSub}>Pinguin King</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 120,
    paddingHorizontal: 16,
  },

  cloudTop: {
    position: 'absolute',
    top: -40,
    left: -20,
    width: 200,
    height: 120,
    borderRadius: 70,
    backgroundColor: 'rgba(191,219,254,0.75)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: -50,
    right: -10,
    width: 220,
    height: 130,
    borderRadius: 80,
    backgroundColor: 'rgba(196,181,253,0.75)',
  },

  card: {
    width: 260,
    maxWidth: '88%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 3,
    borderColor: '#f97316',
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  logoBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  icon: {
    width: 30,
    height: 30,
  },
  logoTextWrap: {},
  logoTitle: {
    color: '#f9fafb',
    fontWeight: '800',
    fontSize: 13,
  },
  logoSub: {
    color: '#e5e7eb',
    fontSize: 11,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fde047',
    letterSpacing: 1.6,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 8,
    color: '#e5e7eb',
    fontSize: 13,
    textAlign: 'center',
  },

  ribbon: {
    flexDirection: 'row',
    width: '90%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 8,
  },
  ribbonLeft: {
    flex: 1,
    backgroundColor: '#22c55e',
  },
  ribbonCenter: {
    flex: 1,
    backgroundColor: '#60a5fa',
  },
  ribbonRight: {
    flex: 1,
    backgroundColor: '#f97316',
  },

  bestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
    marginBottom: 10,
    gap: 8,
  },
  bestEmoji: {
    fontSize: 18,
  },
  bestLabel: {
    color: '#f9fafb',
    fontSize: 11,
    fontWeight: '700',
  },
  bestValue: {
    color: '#fef9c3',
    fontWeight: '900',
    fontSize: 13,
  },

  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  startButton: {
    flex: 1.1,
    backgroundColor: '#22c55e',
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  startHint: {
    marginTop: 2,
    color: '#14532d',
    fontSize: 11,
    fontWeight: '600',
  },

  rankButton: {
    flex: 0.9,
    backgroundColor: '#1d4ed8',
    borderRadius: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  rankButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#f9a8d4',
  },
  rankText: {
    color: '#e0f2fe',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
  },
  rankHint: {
    marginTop: 1,
    color: '#dbeafe',
    fontSize: 10,
  },
  floatingRanking: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rankingList: {
    width: '82%',
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderWidth: 3,
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 110,
  },
  rankingHeaderRow: {
    alignItems: 'center',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8,16,36,0.8)',
  },
  closeText: {
    color: '#f97316',
    fontSize: 18,
    fontWeight: '900',
  },
  rankingTitle: {
    color: '#e0f2fe',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.2,
  },
  rankingSubtitle: {
    marginTop: 2,
    color: '#bae6fd',
    fontSize: 11,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginTop: 2,
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medal: {
    width: 26,
    textAlign: 'center',
    fontSize: 17,
  },
  rankLine: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  rankDistance: {
    color: '#facc15',
    fontSize: 13,
    fontWeight: '900',
  },


  toggle: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#bae6fd',
    backgroundColor: '#60a5fa',
    zIndex: 130,
    shadowColor: '#bae6fd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  toggleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 3,
  },
  bar: {
    width: 15,
    height: 2,
    backgroundColor: '#0f172a',
    borderRadius: 2,
  },
  barSmall: {
    width: 11,
  },
  toggleText: {
    color: '#eff6ff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.1,
  },
  toggleSub: {
    color: '#e0f2fe',
    fontWeight: '600',
    fontSize: 9,
  },
});
