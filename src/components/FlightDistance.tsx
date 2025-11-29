// src/components/FlightDistance.tsx
import React, { useRef, useEffect } from 'react';
import DistanceBadge from './DistanceBadge';
import useGameStore, { GameState } from '../store/useGameStore';

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

  return <DistanceBadge distance={distance} />;
}
