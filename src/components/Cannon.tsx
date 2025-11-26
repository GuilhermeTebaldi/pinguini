// src/components/Cannon.tsx
// ------------------------------------------------------------------------------------
// SPRING LAUNCHER — compressão forte + balanço lateral no pós-lançamento
// • Lê cameraX, power01 e phase do store.
// • Quando phase muda para 'flight' → comprime forte (proporcional à força),
//   solta com overshoot e balança esquerda↔direita com amortecimento.
// • Tampa fixa (não usa angleDeg).
// • FIX TypeScript TS2345: cleanups de useEffect sempre retornam void.
// ------------------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Circle, Ellipse, Path, G, Polygon
} from 'react-native-svg';
import useGameStore, { GameState } from '../store/useGameStore';

type Props = {
  xMeters: number;
  yBottomPx: number;
  ppm: number;
  marginLeftPx?: number;
  scale?: number;
};

export default function Cannon({
  xMeters,
  yBottomPx,
  ppm,
  marginLeftPx = 60,
  scale = 1,
}: Props) {
  // compat: lemos angleDeg mas não usamos (a mira está no pinguim)
  useGameStore((s: GameState) => s.angleDeg ?? 0);
  const cameraX = useGameStore((s: GameState) => s.cameraX ?? 0);
  const power01 = useGameStore((s: GameState) => s.power01 ?? 0);
  const phase   = useGameStore((s: GameState) => s.phase   ?? 'power');

  // ----- Layout -----
  const leftPx = Math.round((xMeters - cameraX) * ppm + marginLeftPx);
  const bottom = Math.round(yBottomPx);
  const W = 220 * scale;
  const H = 160 * scale;

  // Geometria
  const baseW = 120 * scale;
  const baseH = 26 * scale;
  const baseX = 20 * scale;
  const baseY = H - baseH - 10 * scale;

  const springTopX0 = baseX + baseW * 0.5;
  const springTopY0 = baseY - 74 * scale; // repouso

  const capW = 88 * scale;
  const capH = 14 * scale;

  // Paleta
  const purple = '#2C2768';
  const purpleShadow = '#241E59';
  const yellow = '#FFD86B';

  // ----- Animação (acionada por phase → 'flight') -----
  const prevPhase = useRef<string>(phase);
  const [animStart, setAnimStart] = useState<number | null>(null);
  const [animT, setAnimT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const savedPower = useRef(0);

  useEffect(() => {
    const now = () =>
      typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();

    const startAnim = () => {
      const t0 = now();
      setAnimStart(t0);
      setAnimT(0);

      const tick = () => {
        const t = (now() - t0) / 1000;
        setAnimT(t);
        if (t < 1.2) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setAnimStart(null);
          setAnimT(1.2);
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (prevPhase.current !== 'flight' && phase === 'flight') {
      savedPower.current = Math.max(0, Math.min(1, power01));
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startAnim();
    }
    prevPhase.current = phase;

    // ✅ cleanup sempre retorna void (corrige TS2345)
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, power01]);

  // ---------------- Curvas ----------------
  // Compressão vertical (mais agressiva)
  const Amax = 0.75 * savedPower.current; // até 75% de compressão
  const tCompress = 0.16;                  // rápido pra baixo
  const omega = 18;                        // osc. vertical
  const damp  = 5.0;                       // amortecimento vertical

  function compressionK(): number {
    if (animStart == null) return 1;
    const t = animT;
    if (t <= tCompress) {
      const u = t / tCompress;
      const ease = 1 - Math.pow(1 - u, 3); // ease-out cúbica
      return 1 - Amax * ease;              // 1 → 1-Amax
    }
    const td = t - tCompress;
    const overshoot = Amax * 0.8;
    return 1 + overshoot * Math.exp(-damp * td) * Math.cos(omega * td);
  }

  // Balanço lateral após soltar
  function lateralSway(): number {
    if (animStart == null) return 0;
    const t = Math.max(0, animT - tCompress);
    const swayOmega = 9;                   // frequência do balanço
    const swayDamp  = 2.6;                 // amortecimento lateral
    const amp = (12 + 12 * savedPower.current) * scale; // px
    return amp * Math.exp(-swayDamp * t) * Math.sin(swayOmega * t);
  }

  const k = compressionK();
  const swayX = lateralSway();

  // Mais deslocamento vertical para sensação de “espremida”
  const springTopY = springTopY0 - (1 - k) * (34 * scale); // antes ~22
  const springTopX = springTopX0 + swayX;

  // Mola (zigue-zague). Afinamos um pouco quando comprimida.
  const springPath = () => {
    const turns = 6;
    const height = (baseY - springTopY) - 6 * scale;
    const step = height / turns;
    const baseWidth = 46 * scale;
    const width = baseWidth * (0.9 + 0.1 * k); // mais estreita quando k é menor
    const left  = springTopX - width * 0.5;
    const right = springTopX + width * 0.5;
    let y = baseY - 6 * scale;
    let x = left;
    let d = `M ${x} ${y}`;
    for (let i = 0; i < turns; i++) {
      x = (i % 2 === 0) ? right : left;
      y -= step;
      d += ` L ${x} ${y}`;
    }
    d += ` L ${springTopX} ${springTopY}`;
    return d;
  };

  // Estalo curto no início
  const showPop = animStart != null && animT < 0.18;
  const popScale = showPop ? 1 + 0.45 * savedPower.current : 0;

  // Tilt sutil da tampa conforme balanço
  const capTiltDeg = (swayX / (24 * scale)) * 6; // ~±6°

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: leftPx, bottom }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={purple} />
            <Stop offset="1" stopColor={purpleShadow} />
          </LinearGradient>
          <LinearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={purple} />
            <Stop offset="1" stopColor={purpleShadow} />
          </LinearGradient>
        </Defs>

        {/* Sombra */}
        <Ellipse
          cx={baseX + baseW * 0.5}
          cy={H - 6 * scale}
          rx={70 * scale}
          ry={10 * scale}
          fill="#000"
          opacity={0.10}
        />

        {/* Base */}
        <Rect
          x={baseX - 8 * scale}
          y={baseY + baseH - 10 * scale}
          width={baseW + 16 * scale}
          height={8 * scale}
          rx={4 * scale}
          fill={purpleShadow}
          opacity={0.9}
        />
        <Rect
          x={baseX}
          y={baseY}
          width={baseW}
          height={baseH}
          rx={baseH * 0.5}
          fill="url(#baseGrad)"
        />

        {/* Mola (mais espremida) */}
        <Path
          d={springPath()}
          stroke={yellow}
          strokeWidth={8 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Tampa fixa (com leve tilt do balanço) */}
        <G x={springTopX} y={springTopY} rotation={capTiltDeg} originX={0} originY={0}>
          <Rect
            x={-capW * 0.5}
            y={-capH * 0.5}
            width={capW}
            height={capH}
            rx={capH * 0.5}
            fill="url(#capGrad)"
          />
        </G>

        {/* Estalo do lançamento */}
        {showPop && (
          <G x={springTopX} y={springTopY - 8 * scale}>
            <Polygon
              points={Array.from({ length: 8 }).map((_, i) => {
                const a = (i * 45) * Math.PI / 180;
                const R = (10 + 6 * (i % 2)) * popScale * scale;
                const x  = Math.cos(a) * R;
                const y  = Math.sin(a) * R;
                return `${x},${y}`;
              }).join(' ')}
              fill={yellow}
              opacity={0.75}
            />
            <Circle r={3 * popScale * scale} fill="#FFF6C2" />
          </G>
        )}
      </Svg>
    </View>
  );
}
