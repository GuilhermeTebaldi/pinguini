// src/components/BGDesertRidges.tsx
// ------------------------------------------------------------------------------------
// "Underwater Coral Reef & Fishes" + marine snow (partículas caindo) no overlay.
// 100% da tela usada: superfície + 4 camadas de recifes + bolhas + "neve" subaquática.
// Compatível: { cameraX: number, snowDensity?: number }  •  Parallax sem RAF (só a neve usa RAF).
// Tiling perfeito: funções periódicas (período = tileW) + tile duplicado com 1px overlap.
// Marcas // SEAM indicam pontos críticos de emenda.
// ------------------------------------------------------------------------------------

import React, { JSX, useMemo, useRef, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Path, G, Circle, Ellipse, Line, Polygon
} from 'react-native-svg';

// (Opcional) Integração com tema do seu projeto:
import { theme } from '../styles/theme';

type Props = { cameraX: number; snowDensity?: number };

function BGDesertRidges({ cameraX = 0, snowDensity = 1 }: Props) {
  // Dimensões congeladas para estabilidade (evita flicker por relayout)
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  // Tile base = largura visível (período das funções)
  const tileW = W;
  const overlap = 1; // 1px de sobreposição para costura invisível

  // ---------- Paleta (pastéis aquáticos; customizável via theme) ----------
  const waterTop    = (theme as any)?.waterTop    || '#A2E4FF';
  const waterMid    = (theme as any)?.waterMid    || '#8BD6FF';
  const waterBot    = (theme as any)?.waterBot    || '#66C1F5';
  const rayColor    = (theme as any)?.rayColor    || '#FFFFFF';
  const bubbleColor = (theme as any)?.bubbleColor || '#FFFFFF';

  const reefFar     = (theme as any)?.reefFar     || '#BDE7F2';
  const reefMid     = (theme as any)?.reefMid     || '#9ADFEF';
  const reefNear    = (theme as any)?.reefNear    || '#79D1E3';
  const reefFront   = (theme as any)?.reefFront   || '#59C2D9';
  const crestHL     = (theme as any)?.crestHL     || '#FFFFFF';

  // ---------- Parallax amarrado à câmera ----------
  // Mais distante = mais lento; mais perto = mais rápido.
  const farSpeed   = 1.1;   // recife distante + raios de luz
  const midSpeed   = 3.0;   // mediano
  const nearSpeed  = 5.5;   // próximo + bolhas
  const frontSpeed = 8.6;   // frontal

  // Snap elimina gaps subpixel
  const snap = (v: number) => Math.floor(v);
  const farOffset   = snap(-((cameraX * farSpeed)   % tileW));
  const midOffset   = snap(-((cameraX * midSpeed)   % tileW));
  const nearOffset  = snap(-((cameraX * nearSpeed)  % tileW));
  const frontOffset = snap(-((cameraX * frontSpeed) % tileW));

  // ---------- Funções periódicas (seamless em X) ----------
  const TWO_PI = Math.PI * 2;

  // Curva de "recife/ondulação" suave (tileável)
  const reefY = (x: number, baseY: number, amp: number, p0: number, p1: number, p2: number) => {
    const t = (x / tileW) * TWO_PI;
    const y =
      Math.sin(t + p0) * 1.00 +
      Math.sin(2 * t + p1) * 0.36 +
      Math.cos(3 * t + p2) * 0.20;
    return baseY + amp * y;
  };

  // Preenche do contorno para baixo (até o rodapé)
  const buildFillPathBottom = (
    baseY: number,
    amp: number,
    phases: [number, number, number],
    steps: number
  ) => {
    let d = `M 0 ${H} L 0 ${reefY(0, baseY, amp, phases[0], phases[1], phases[2]).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = reefY(x, baseY, amp, phases[0], phases[1], phases[2]);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L ${tileW} ${H} Z`;
    return d;
  };

  // Traçado do cume (highlight suave do recife)
  const buildCrestPath = (
    baseY: number,
    amp: number,
    phases: [number, number, number],
    steps: number
  ) => {
    let d = `M 0 ${reefY(0, baseY, amp, phases[0], phases[1], phases[2]).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = reefY(x, baseY, amp, phases[0], phases[1], phases[2]);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  // ---------- Layout vertical (100% da tela: superfície + 4 recifes) ----------
  const farBaseY   = H * 0.40; // recife distante
  const midBaseY   = H * 0.56;
  const nearBaseY  = H * 0.70;
  const frontBaseY = H * 0.82; // ocupa o rodapé (sem chão vazio)

  const farAmp   = H * 0.10;
  const midAmp   = H * 0.11;
  const nearAmp  = H * 0.12;
  const frontAmp = H * 0.12;

  // Fases determinísticas (sem flicker)
  const FAR_P:   [number, number, number] = [0.35, 1.65, 2.80];
  const MID_P:   [number, number, number] = [1.10, 0.30, 2.15];
  const NEAR_P:  [number, number, number] = [0.65, 2.00, 1.35];
  const FRONT_P: [number, number, number] = [1.75, 0.90, 1.10];

  // Densidade segura para mid-range
  const stepsFar = 72, stepsMid = 88, stepsNear = 102, stepsFront = 116;

  // Memoização dos paths (dependem apenas de W/H)
  const farFill   = useMemo(() => buildFillPathBottom(farBaseY,   farAmp,   FAR_P,   stepsFar),   [tileW, H]);
  const midFill   = useMemo(() => buildFillPathBottom(midBaseY,   midAmp,   MID_P,   stepsMid),   [tileW, H]);
  const nearFill  = useMemo(() => buildFillPathBottom(nearBaseY,  nearAmp,  NEAR_P,  stepsNear),  [tileW, H]);
  const frontFill = useMemo(() => buildFillPathBottom(frontBaseY, frontAmp, FRONT_P, stepsFront), [tileW, H]);

  const midCrest   = useMemo(() => buildCrestPath(midBaseY,   midAmp,   MID_P,   stepsMid),   [tileW, H]);
  const nearCrest  = useMemo(() => buildCrestPath(nearBaseY,  nearAmp,  NEAR_P,  stepsNear),  [tileW, H]);
  const frontCrest = useMemo(() => buildCrestPath(frontBaseY, frontAmp, FRONT_P, stepsFront), [tileW, H]);

  // ---------- Utilidades determinísticas ----------
  const hash01 = (n: number) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };

  type Bubble = { cx: number; cy: number; r: number; o: number };
  const makeBubbles = (yTop: number, yBottom: number, densityPx: number, seed: number): Bubble[] => {
    const count = Math.max(8, Math.round(tileW / densityPx));
    const list: Bubble[] = [];
    for (let i = 0; i < count; i++) {
      const cx = ((i + 0.3 + hash01(seed + i) * 0.4) / count) * tileW;
      const cy = yTop + (yBottom - yTop) * hash01(seed * 19 + i);
      const r  = 3 + 4 * hash01(seed * 23 + i);
      const o  = 0.30 + 0.35 * hash01(seed * 29 + i);
      list.push({ cx, cy, r, o });
    }
    return list;
  };

  const bubblesNear = useMemo(() => makeBubbles(H * 0.42, H * 0.78, 70, 303), [tileW, H]);

  // ===================== MARINE SNOW (as “mesmas neves”) =====================
  // Só o overlay de partículas usa RAF; resto é 100% determinístico por cameraX.
  const [time, setTime] = useState(0); // segundos
  const raf = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    const loop = (now: number) => {
      if (t0.current == null) t0.current = now;
      setTime((now - t0.current) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      t0.current = null;
    };
  }, []);

  const SNOW_N = Math.round(42 * Math.max(0.4, Math.min(2, snowDensity)));
  const snowParticles = useMemo(() => {
    const arr: { sx: number; sy: number; r: number; w: number; vy: number; a: number }[] = [];
    for (let i = 0; i < SNOW_N; i++) {
      const rnd = (n: number) => {
        const s = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
        return s - Math.floor(s);
      };
      const sx = rnd(1) * W;             // posição base X
      const sy = -40 - rnd(2) * (H + 80); // começa acima (para fazer “loop” vertical)
      const r  = 0.9 + rnd(3) * 2.2;     // raio
      const w  = 10 + rnd(4) * 28;       // “wiggle” horizontal
      const vy = 12 + rnd(5) * 26;       // queda px/s (lenta)
      const a  = 0.18 + rnd(6) * 0.30;   // opacidade
      arr.push({ sx, sy, r, w, vy, a });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, snowDensity]);

  // ===========================================================================

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 /* ... */ }}>

      {/* Superfície da água: gradiente + raios de luz suaves */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={waterTop} />
            <Stop offset="0.55" stopColor={waterMid} />
            <Stop offset="1" stopColor={waterBot} />
          </LinearGradient>
          <LinearGradient id="rayGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={rayColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={rayColor} stopOpacity="0.00" />
          </LinearGradient>
          <LinearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.00" />
            {/* névoa de profundidade para suavizar HUD/sprites */}
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.14" />
          </LinearGradient>
        </Defs>

        {/* Fundo do mar */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#seaGrad)" />

        {/* Raios de luz (leve, triangulares, não animados) */}
        {(() => {
          const cx = W * 0.35;
          const top = 0;
          const base = H * 0.55;
          const rays = 5;
          const spread = W * 0.9;
          const nodes: JSX.Element[] = [];
          for (let i = 0; i < rays; i++) {
            const k = (i / (rays - 1)) - 0.5;
            const x = cx + spread * k * 0.25;
            const p = `${x - W * 0.08},${top} ${x + W * 0.08},${top} ${x + W * 0.25},${base}`;
            nodes.push(<Polygon key={`ray-${i}`} points={p} fill="url(#rayGrad)" opacity={0.12} />);
          }
          return <G>{nodes}</G>;
        })()}
      </Svg>

      {/* ======= LAYER: FAR (recife distante) ======= */}
      <View style={{ position: 'absolute', left: farOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          {/* Tile A */}
          <G>
            <Path d={farFill} fill={reefFar} />
          </G>
          {/* Tile B (SEAM + 1px overlap) */}
          <G x={tileW - overlap}>
            {/* SEAM: tile repetido com 1px overlap */}
            <Path d={farFill} fill={reefFar} />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: MID ======= */}
      <View style={{ position: 'absolute', left: midOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={midFill} fill={reefMid} />
            <Path d={midCrest} stroke={crestHL} strokeOpacity={0.12} strokeWidth={2} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={midFill} fill={reefMid} />
            <Path d={midCrest} stroke={crestHL} strokeOpacity={0.12} strokeWidth={2} fill="none" />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: NEAR (recife próximo + bolhas) ======= */}
      <View style={{ position: 'absolute', left: nearOffset, top: -120 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            {/* Bolhas */}
            {bubblesNear.map((b, i) => (
              <Circle key={`bn-a-${i}`} cx={b.cx} cy={b.cy} r={b.r} fill={bubbleColor} opacity={b.o} />
            ))}

            <Path d={nearFill} fill={reefNear} />
            <Path d={nearCrest} stroke={crestHL} strokeOpacity={0.16} strokeWidth={2.2} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            {bubblesNear.map((b, i) => (
              <Circle key={`bn-b-${i}`} cx={b.cx} cy={b.cy} r={b.r} fill={bubbleColor} opacity={b.o} />
            ))}

            <Path d={nearFill} fill={reefNear} />
            <Path d={nearCrest} stroke={crestHL} strokeOpacity={0.16} strokeWidth={2.2} fill="none" />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: FRONT (recife frontal + “algas”) ======= */}
      <View style={{ position: 'absolute', left: frontOffset, top: -170 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={frontFill} fill={reefFront} />
            <Path d={frontCrest} stroke={crestHL} strokeOpacity={0.20} strokeWidth={2.4} fill="none" />
            {/* Pequenas “algas” estilizadas */}
            {(() => {
              const count = Math.max(6, Math.round(tileW / 140));
              const items: JSX.Element[] = [];
              for (let i = 0; i < count; i++) {
                const x = ((i + 0.3) / count) * tileW;
                const h = H * (0.06 + 0.05 * hash01(500 + i));
                const bY = frontBaseY + 6 + 10 * hash01(510 + i);
                const d = `M ${x} ${bY}
                           C ${x - 8} ${bY - h * 0.4},
                             ${x + 8} ${bY - h * 0.8},
                             ${x} ${bY - h}`;
                items.push(<Path key={`kelp-a-${i}`} d={d} stroke="#FFFFFF" strokeOpacity={0.10} strokeWidth={2} fill="none" />);
              }
              return <G>{items}</G>;
            })()}
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={frontFill} fill={reefFront} />
            <Path d={frontCrest} stroke={crestHL} strokeOpacity={0.20} strokeWidth={2.4} fill="none" />
            {(() => {
              const count = Math.max(6, Math.round(tileW / 140));
              const items: JSX.Element[] = [];
              for (let i = 0; i < count; i++) {
                const x = ((i + 0.3) / count) * tileW;
                const h = H * (0.06 + 0.05 * hash01(500 + i));
                const bY = frontBaseY + 6 + 10 * hash01(510 + i);
                const d = `M ${x} ${bY}
                           C ${x - 8} ${bY - h * 0.4},
                             ${x + 8} ${bY - h * 0.8},
                             ${x} ${bY - h}`;
                items.push(<Path key={`kelp-b-${i}`} d={d} stroke="#FFFFFF" strokeOpacity={0.10} strokeWidth={2} fill="none" />);
              }
              return <G>{items}</G>;
            })()}
          </G>
        </Svg>
      </View>

      {/* ===================== OVERLAY: “NEVE” SUBAQUÁTICA ===================== */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <G opacity={0.95} pointerEvents="none">
          {snowParticles.map((p, i) => {
            // drift horizontal sinusoidal + queda linear
            const x = (p.sx + Math.sin(time * 0.6 + i) * p.w + W) % W;
            const yFalling = p.sy + p.vy * time;
            // recicla ao ultrapassar a base — reentra por cima
            const y = ((yFalling + (H + 80)) % (H + 80)) - 40;
            return <Circle key={`snow-${i}`} cx={x} cy={y} r={p.r} fill="#FFFFFF" opacity={p.a} />;
          })}
        </G>
      </Svg>

      {/* Névoa de profundidade no rodapé (melhora legibilidade de HUD/sprites) */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={0} y={H * 0.64} width={W} height={H * 0.36} fill="url(#hazeGrad)" />
      </Svg>
    </View>
  );
}

export default React.memo(BGDesertRidges);

// ------------------------------------------------------------------------------------
// Notas de Tiling & Performance
// - Periodicidade garantida nas camadas: reefY usa período = tileW -> y(0) == y(tileW).
// - Costura invisível: duplicação do tile com <G x={tileW - overlap}> e overlap=1.  // SEAM
// - Parallax sem RAF: offsets dependem só de cameraX; snap() evita gaps subpixel.
// - “Neve”/marine snow usa RAF leve (só círculos), densidade controlável via snowDensity.
// - 100% da tela: superfície preenchida por gradiente + recifes que fecham até a base.
// ------------------------------------------------------------------------------------
