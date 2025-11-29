// src/screens/GameScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, useWindowDimensions, Platform, StyleSheet } from 'react-native';
import useGameStore, { GamePhase } from '../store/useGameStore';
import { metersToPx } from '../game/physics';

import BGMountains from '../components/BGMountains';
import IceGround from '../components/IceGround';
import Penguin from '../components/Penguin';
import HUD from '../components/HUD';
import Cannon from '../components/Cannon';
import ArrowIndicator from '../components/ArrowIndicator';
import FlightDistance from '../components/FlightDistance';
import HeadInSnow from '../components/HeadInSnow';
import MenuOverlay, { MenuToggle } from '../components/MenuOverlay';
import {
  configureAudio,
  startAmbientSound,
  stopAmbientSound,
  cleanupSounds,
  playLaunchSound,
  playArrivalSound,
} from '../services/audio';

const ppm = 32;
const marginLeftPx = 60; // mesmo valor usado no setCrashed() pra alinhar o xPx
const groundBottomPx = 26;

// ⬆️ Sobe a mola visualmente (sem alterar física nem onde o pinguim cai)
const CANNON_LIFT_PX = 69;
const cannonBottomPx = groundBottomPx + CANNON_LIFT_PX;

export default function GameScreen() {
  const { width: Wpx } = useWindowDimensions();
  const screenMeters = Wpx / ppm;
  const marginMeters = marginLeftPx / ppm;

  const rafRef = useRef<number | null>(null);

  const step            = useGameStore((s) => s.step);
  const px              = useGameStore((s) => s.px);
  const py              = useGameStore((s) => s.py);
  const vx              = useGameStore((s) => s.vx);
  const vy              = useGameStore((s) => s.vy);
  const phase           = useGameStore((s) => s.phase);
  const paused          = useGameStore((s) => s.paused);
  const cameraX         = useGameStore((s) => s.cameraX);
  const cameraZoom      = useGameStore((s) => s.cameraZoom);
  const impact          = useGameStore((s) => s.impact);
  const clearImpact     = useGameStore((s) => s.clearImpact);
  const power01         = useGameStore((s) => s.power01 ?? 0);
  const suppressArrivalSound = useGameStore((s) => s.suppressArrivalSound);
  const clearArrivalSuppression = useGameStore((s) => s.clearArrivalSuppression);
  const prevPhaseRef    = useRef<GamePhase>(phase);

  const setCameraTarget = useGameStore((s) => s.setCameraTarget);
  const snapCamera      = useGameStore((s) => s.snapCamera);
  const tickCamera      = useGameStore((s) => s.tickCamera);
  const followPenguin   = useGameStore((s) => s.followPenguin);
  const setZoomTarget   = useGameStore((s) => s.setZoomTarget);
  
  useEffect(() => {
    (async () => {
      try {
        await configureAudio();
        void startAmbientSound();
      } catch (error) {
        console.warn('[GameScreen] failed to init audio', error);
      }
    })();
    return () => {
      void stopAmbientSound();
      void cleanupSounds();
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        void stopAmbientSound();
      } else {
        void startAmbientSound();
      }
    };

    const handlePageHide = () => {
      void stopAmbientSound();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, []);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    if (phase === 'flight' && prevPhase !== 'flight') {
      const variant = power01 >= 0.75 ? 'strong' : power01 >= 0.4 ? 'nice' : 'bad';
      void playLaunchSound(variant);
    }
    if (
      (phase === 'landed' && prevPhase !== 'landed') ||
      (phase === 'crashed' && prevPhase !== 'crashed')
    ) {
      if (suppressArrivalSound) {
        clearArrivalSuppression();
      } else {
        void playArrivalSound();
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, power01, suppressArrivalSound, clearArrivalSuppression]);

  // Loop do jogo (física)
  useEffect(() => {
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      step(dt, ppm);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step]);

  // Snap inicial ao entrar em voo com leve zoom
  useEffect(() => {
    if (phase === 'flight') {
      const target = Math.max(0, px - screenMeters * 0.32 + marginMeters);
      setCameraTarget(target);
      snapCamera(target);
      setZoomTarget(1.06);
    } else if (phase === 'landed') {
      setZoomTarget(1.0);
    }
  }, [phase, px, screenMeters, marginMeters, setCameraTarget, snapCamera, setZoomTarget]);

  // Loop da câmera: follow + zoom dinâmico
  useEffect(() => {
    let raf = 0;
    let last = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const loop = (t: number) => {
      const now = (typeof performance !== 'undefined' ? t : Date.now());
      const dt = Math.max(0, (now - last) / 1000);
      last = now;

      if (phase === 'flight') {
        followPenguin(px, screenMeters, marginMeters);

        const speed = Math.sqrt(vx * vx + vy * vy);
        const vMax = 28;
        const k = Math.min(1, speed / vMax);
        const zoomTarget = 1.03 + k * 0.07;
        setZoomTarget(zoomTarget);
      } else if (phase === 'landed') {
        setZoomTarget(1.0);
      }

      tickCamera(dt);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    phase,
    px, vx, vy,
    screenMeters, marginMeters,
    followPenguin, setZoomTarget, tickCamera
  ]);

 

  // Mundo -> Tela
  const worldToScreen = (wx: number, wy: number) => {
    const xPx = metersToPx(wx, ppm) - metersToPx(cameraX, ppm) + marginLeftPx;
    const yPx = metersToPx(wy, ppm);
    return { xPx, yPx };
  };

  // Converte impact (wx ou xPx) -> { key, x (px), power } para o IceGround
  const mappedImpact = (() => {
    if (!impact) return undefined as undefined;

    const hasWx  = Number.isFinite((impact as any)?.wx);
    const hasXPx = Number.isFinite((impact as any)?.xPx);

    const ixPx = hasWx
      ? worldToScreen((impact as any).wx, 0).xPx
      : hasXPx
        ? (impact as any).xPx
        : null;

    if (!Number.isFinite(ixPx)) return undefined as undefined;

    return {
      key: (impact as any).key ?? Date.now(),
      x: Math.round(ixPx as number),
      power: (impact as any).power ?? 1,
    };
  })();

  return (
    <View style={styles.screen}>
      <BGMountains cameraX={cameraX} />

      {/* chão com partículas de impacto */}
      <IceGround cameraX={cameraX} impact={mappedImpact} impactOffsetX={40} />


      {/* MUNDO (com zoom/escala) */}
      <View style={styles.worldWrap}>
        <View style={{ transform: [{ scale: cameraZoom }] }}>
          <Cannon
            xMeters={0}
            yBottomPx={cannonBottomPx}
            ppm={ppm}
            marginLeftPx={marginLeftPx}
            scale={1.0}
          />

          {/* Oculta o pinguim quando crashed para não sobrepor o HeadInSnow */}
          {phase !== 'crashed' && (
            <Penguin
              ppm={ppm}
              marginLeftPx={marginLeftPx}
              groundBottomPx={groundBottomPx}
            />
          )}
        </View>

        <ArrowIndicator
          ppm={ppm}
          marginLeftPx={marginLeftPx}
          groundBottomPx={groundBottomPx}
        />
      </View>

      {/* Render do Crash — tolera formato novo (wx em metros) e legado (xPx em pixels) */}
      {phase === 'crashed' && impact && (() => {
        const ixPx = Number.isFinite((impact as any)?.wx)
          ? worldToScreen((impact as any).wx, 0).xPx
          : (Number.isFinite((impact as any)?.xPx) ? (impact as any).xPx : null);

        if (!Number.isFinite(ixPx)) return null; // fail-safe

        return (
          <HeadInSnow
            left={Math.round((ixPx as number) - 80)}
            bottom={groundBottomPx - 8}
          />
        );
      })()}

      <FlightDistance />
      <HUD />
      {!paused && <MenuToggle />}
      <MenuOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : {}),
    backgroundColor: 'transparent',
  },
  worldWrap: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    justifyContent: 'flex-end',
    pointerEvents: 'none',
  },
});
