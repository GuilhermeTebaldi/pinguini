import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

type PauseOverlayProps = {
  resumeCountdown: number | null;
  onContinue: () => void;
  onReset: () => void;
};

const DRIP_POSITIONS = [18, 52];

export default function PauseOverlay({ resumeCountdown, onContinue, onReset }: PauseOverlayProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulse]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.12, 0.55, 0.18],
  });
  const veilOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.08, 0.36, 0.1],
  });
  const cornerOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.82, 0.25],
  });

  return (
    <View style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            transform: [{ scale: haloScale }],
            opacity: haloOpacity,
          },
        ]}
      />
      <Animated.View pointerEvents="none" style={[styles.veil, { opacity: veilOpacity }]} />
      <View style={styles.card}>
        <View style={styles.titleBackdrop}>
          <Text style={styles.title}>Pausado</Text>
        </View>
        {resumeCountdown == null ? (
          <View style={styles.actions}>
            <View style={styles.buttonWrapper}>
              <IceButton variant="secondary" label="REINICIAR" onPress={onReset} />
            </View>
            <View style={styles.buttonWrapper}>
              <IceButton variant="primary" label="CONTINUAR" onPress={onContinue} />
            </View>
          </View>
        ) : (
          <Text style={styles.countdown}>{resumeCountdown}</Text>
        )}
      </View>
    </View>
  );
}

type IceButtonProps = {
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
};

function IceButton({ label, onPress, variant }: IceButtonProps) {
  const dropAnims = useMemo(() => [new Animated.Value(0), new Animated.Value(0)], []);
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loopsRef.current = dropAnims.map((anim, index) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(index * 360),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(500),
        ]),
      );
      loop.start();
      return loop;
    });
    return () => loopsRef.current.forEach(loop => loop.stop());
  }, [dropAnims]);

  const buttonStyle =
    variant === 'primary' ? [styles.button, styles.buttonPrimary] : [styles.button, styles.buttonSecondary];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={buttonStyle}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View pointerEvents="none" style={styles.gloss} />
      <View pointerEvents="none" style={styles.glossAccent} />
      <Text style={styles.buttonLabel}>{label}</Text>
      {dropAnims.map((anim, index) => (
        <Animated.View
          key={`drip-${index}`}
          style={[styles.drip, getDripStyle(anim, DRIP_POSITIONS[index])]}
        />
      ))}
    </TouchableOpacity>
  );
}

const getDripStyle = (anim: Animated.Value, left: number) => ({
  left,
  transform: [
    {
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [-10, 32],
      }),
    },
  ],
  opacity: anim.interpolate({
    inputRange: [0, 0.25, 0.6, 1],
    outputRange: [0, 0.9, 0.35, 0],
  }),
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 8, 20, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 230,
    paddingHorizontal: 18,
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    borderWidth: 0.8,
    borderColor: 'rgba(125, 211, 252, 0.5)',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  card: {
    width: 312,
    borderRadius: 36,
    paddingVertical: 26,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    borderWidth: 1.4,
    borderColor: 'rgba(59, 130, 246, 0.85)',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.32,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 8 },
    elevation: 24,
    alignItems: 'center',
  },
  titleBackdrop: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.9)',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    alignItems: 'center',
  },
  title: {
    color: '#e0f2fe',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 16,
    textShadowColor: 'rgba(8, 25, 63, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  countdown: {
    color: '#22d3ee',
    fontSize: 60,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: 'rgba(14, 165, 233, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  button: {
    position: 'relative',
    width: '100%',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  
    /* Borda congelada */
    borderWidth: 2,
    borderColor: 'rgba(230, 245, 255, 0.9)',
  
    /* Fundo gelo azulado translúcido */
    backgroundColor: 'rgba(180, 225, 255, 0.22)',
  
    /* Textura interna de vidro congelado */
    overflow: 'hidden',
    shadowColor: '#a5d8ff',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 18,
  },
  
  buttonPrimary: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(147, 197, 253, 0.9)',
  },
  buttonLabel: {
    color: '#f8fafc',
    fontWeight: '800',
    letterSpacing: 1.8,
    fontSize: 16,
    textShadowColor: 'rgba(15, 23, 42, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gloss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.20)',
    transform: [{ rotate: '128deg' }, { translateY: -18 }],
    opacity: 0.85,
    borderRadius: 24,
    /* reflexo de gelo */
    shadowColor: '#e0f2ff',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  
  glossAccent: {
    position: 'absolute',
    top: 10,
    height: 6,
    width: '58%',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20,
    opacity: 0.9,
    shadowColor: '#d0ecff',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  
  drip: {
    position: 'absolute',
    width: 7,
    height: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(225, 245, 255, 0.95)',
    shadowColor: '#ccf0ff',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  
});
