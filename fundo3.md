
// src/components/BGDesertRidges.tsx
// ------------------------------------------------------------------------------------
// "Candy Hills & Balloons" — infantil, lúdico e vibrante. 100% da tela é utilizada:
// céu divertido + 4 camadas de colinas doces + nuvens, balões e pirulitos.
// Compatível com sua API: { cameraX: number } (parallax amarrado à câmera; sem RAF).
// 60 FPS com react-native-svg: paths memorizados, offsets quantizados, densidade leve.
// Tiling perfeito: funções periódicas (período = tileW) + tile duplicado com 1px overlap.
// Marcas // SEAM indicam pontos críticos de emenda.
// ------------------------------------------------------------------------------------

import React, { useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, Circle, Line } from 'react-native-svg';

// (Opcional) Integração com tema do seu projeto.
import { theme } from '../styles/theme';

type Props = { cameraX: number };

function BGDesertRidges({ cameraX = 0 }: Props) {
  // Dimensões congeladas para estabilidade (evita flicker por relayout)
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  // Tile base = largura visível (período das funções)
  const tileW = W;
  const overlap = 1; // 1px de sobreposição para costura invisível

  // ---------- Paleta (pastéis infantis; customizável via theme) ----------
  const skyTop     = (theme as any)?.kidSkyTop     || '#B3E5FC'; // azul clarinho
  const skyMid     = (theme as any)?.kidSkyMid     || '#D1F0FF';
  const skyBot     = (theme as any)?.kidSkyBot     || '#E6F7FF';
  const cloudFill  = (theme as any)?.kidCloud      || '#FFFFFF';
  const hazeColor  = (theme as any)?.kidHaze       || '#FFFFFF';

  const hillFar    = (theme as any)?.kidHillFar    || '#D6F5C3'; // verdes/rosas suaves
  const hillMid    = (theme as any)?.kidHillMid    || '#C1EDAA';
  const hillNear   = (theme as any)?.kidHillNear   || '#A6E39A';
  const hillFront  = (theme as any)?.kidHillFront  || '#8FD98C';
  const crestHL    = (theme as any)?.kidCrestHL    || '#FFFFFF';

  const candyA     = (theme as any)?.kidCandyA     || '#FF7BAC';
  const candyB     = (theme as any)?.kidCandyB     || '#FFB86B';
  const candyC     = (theme as any)?.kidCandyC     || '#7EDEF2';
  const candyD     = (theme as any)?.kidCandyD     || '#FFE36E';
  const balloonA   = (theme as any)?.kidBalloonA   || '#FF6B6B';
  const balloonB   = (theme as any)?.kidBalloonB   || '#6BCB77';
  const balloonC   = (theme as any)?.kidBalloonC   || '#4D96FF';

  // ---------- Parallax amarrado à câmera ----------
  // Mais distante = mais lento; mais perto = mais rápido.
  const farSpeed   = 1.2;  // nuvens + colina distante
  const midSpeed   = 3.2;
  const nearSpeed  = 6.0;
  const frontSpeed = 9.2;

  const snap = (v: number) => Math.floor(v); // elimina gaps subpixel
  const farOffset   = snap(-((cameraX * farSpeed)   % tileW));
  const midOffset   = snap(-((cameraX * midSpeed)   % tileW));
  const nearOffset  = snap(-((cameraX * nearSpeed)  % tileW));
  const frontOffset = snap(-((cameraX * frontSpeed) % tileW));

  // ---------- Funções periódicas (seamless em X) ----------
  const TWO_PI = Math.PI * 2;
  // Curva de colina suave e "fofinha"
  const hillY = (x: number, baseY: number, amp: number, p0: number, p1: number, p2: number) => {
    const t = (x / tileW) * TWO_PI;
    const y =
      Math.sin(t + p0) * 1.00 +
      Math.sin(2 * t + p1) * 0.35 +
      Math.cos(3 * t + p2) * 0.18;
    return baseY + amp * y;
  };

  const buildFillPathBottom = (
    baseY: number,
    amp: number,
    phases: [number, number, number],
    steps: number
  ) => {
    let d = `M 0 ${H} L 0 ${hillY(0, baseY, amp, phases[0], phases[1], phases[2]).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = hillY(x, baseY, amp, phases[0], phases[1], phases[2]);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L ${tileW} ${H} Z`;
    return d;
  };

  const buildCrestPath = (
    baseY: number,
    amp: number,
    phases: [number, number, number],
    steps: number
  ) => {
    let d = `M 0 ${hillY(0, baseY, amp, phases[0], phases[1], phases[2]).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = hillY(x, baseY, amp, phases[0], phases[1], phases[2]);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  // ---------- Layout vertical (100% de tela: céu + colinas até a base) ----------
  const farBaseY   = H * 0.38; // colinas lá atrás
  const midBaseY   = H * 0.52;
  const nearBaseY  = H * 0.66;
  const frontBaseY = H * 0.80; // ocupa o rodapé (sem "chão vazio")

  const farAmp   = H * 0.08;
  const midAmp   = H * 0.09;
  const nearAmp  = H * 0.10;
  const frontAmp = H * 0.11;

  // Fases determinísticas (sem flicker)
  const FAR_P:   [number, number, number] = [0.35, 1.70, 2.80];
  const MID_P:   [number, number, number] = [1.10, 0.30, 1.95];
  const NEAR_P:  [number, number, number] = [0.65, 2.00, 1.35];
  const FRONT_P: [number, number, number] = [1.75, 0.90, 1.10];

  // Densidade segura para mid‑range
  const stepsFar = 72, stepsMid = 88, stepsNear = 100, stepsFront = 112;

  // Memoização dos paths (dependem apenas de W/H)
  const farFill   = useMemo(() => buildFillPathBottom(farBaseY,   farAmp,   FAR_P,   stepsFar),   [tileW, H]);
  const midFill   = useMemo(() => buildFillPathBottom(midBaseY,   midAmp,   MID_P,   stepsMid),   [tileW, H]);
  const nearFill  = useMemo(() => buildFillPathBottom(nearBaseY,  nearAmp,  NEAR_P,  stepsNear),  [tileW, H]);
  const frontFill = useMemo(() => buildFillPathBottom(frontBaseY, frontAmp, FRONT_P, stepsFront), [tileW, H]);

  const midCrest   = useMemo(() => buildCrestPath(midBaseY,   midAmp,   MID_P,   stepsMid),   [tileW, H]);
  const nearCrest  = useMemo(() => buildCrestPath(nearBaseY,  nearAmp,  NEAR_P,  stepsNear),  [tileW, H]);
  const frontCrest = useMemo(() => buildCrestPath(frontBaseY, frontAmp, FRONT_P, stepsFront), [tileW, H]);

  // ---------- Utilidades determinísticas p/ elementos decorativos (tileáveis) ----------
  const hash01 = (n: number) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };

  // Nuvem fofinha em Path (leve)
  const cloudPath = (cx: number, cy: number, r: number) => {
    // 3 "bolhas" conectadas
    const r1 = r, r2 = r * 0.85, r3 = r * 0.7;
    const x1 = cx - r * 1.0, x2 = cx, x3 = cx + r * 1.0;
    const y1 = cy, y2 = cy - r * 0.25, y3 = cy;

    return [
      `M ${x1 - r1},${y1}`,
      `a ${r1},${r1} 0 1,0 ${2 * r1},0 a ${r1},${r1} 0 1,0 ${-2 * r1},0`,
      `M ${x2 - r2},${y2}`,
      `a ${r2},${r2} 0 1,0 ${2 * r2},0 a ${r2},${r2} 0 1,0 ${-2 * r2},0`,
      `M ${x3 - r3},${y3}`,
      `a ${r3},${r3} 0 1,0 ${2 * r3},0 a ${r3},${r3} 0 1,0 ${-2 * r3},0`,
    ].join(' ');
  };

  // Geração das nuvens no "tile" (quantidade adaptativa)
  const cloudDefs = useMemo(() => {
    const count = Math.max(5, Math.round(tileW / 180));
    const arr: { d: string; opacity: number }[] = [];
    for (let i = 0; i < count; i++) {
      const kx = (i + 0.5) / count;
      const x = kx * tileW;
      const r = (H * 0.035) * (0.7 + hash01(i) * 0.6);
      const y = H * (0.12 + hash01(i + 9) * 0.15);
      arr.push({ d: cloudPath(x, y, r), opacity: 0.7 - 0.25 * hash01(i + 23) });
    }
    return arr;
  }, [tileW, H]);

  // Balões de ar quente (mid layer, cute)
  const balloonDefs = useMemo(() => {
    const count = Math.max(3, Math.round(tileW / 280));
    const arr: { cx: number; cy: number; r: number; color: string }[] = [];
    const colors = [balloonA, balloonB, balloonC];
    for (let i = 0; i < count; i++) {
      const kx = (i + 0.3) / count;
      const cx = kx * tileW;
      const r = Math.max(10, H * 0.022 * (0.7 + hash01(100 + i) * 0.6));
      const cy = H * (0.22 + hash01(200 + i) * 0.18);
      arr.push({ cx, cy, r, color: colors[i % colors.length] });
    }
    return arr;
  }, [tileW, H, balloonA, balloonB, balloonC]);

  // Pirulitos (lollipops) nas camadas near/front, seguindo o relevo das colinas
  type Lolli = { x: number; baseY: number; h: number; r: number; color: string };
  const makeLollis = (baseY: number, amp: number, phases: [number, number, number], densityPx: number, seedOff: number, colorPool: string[]) => {
    const count = Math.max(6, Math.round(tileW / densityPx));
    const list: Lolli[] = [];
    for (let i = 0; i < count; i++) {
      const kx = (i + 0.15 + hash01(seedOff + i) * 0.7) / count;
      const x = kx * tileW;
      const y = hillY(x, baseY, amp, phases[0], phases[1], phases[2]);
      const h = H * (0.06 + 0.04 * hash01(seedOff * 7 + i));
      const r = Math.max(6, h * 0.35);
      const color = colorPool[i % colorPool.length];
      list.push({ x, baseY: y, h, r, color });
    }
    return list;
  };

  const lollisNear = useMemo(
    () => makeLollis(nearBaseY, nearAmp, NEAR_P, 140, 17, [candyA, candyB, candyC, candyD]),
    [tileW, H]
  );
  const lollisFront = useMemo(
    () => makeLollis(frontBaseY, frontAmp, FRONT_P, 110, 33, [candyB, candyC, candyD, candyA]),
    [tileW, H]
  );

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {/* Céu em gradiente suave (preenche topo inteiro) */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop} />
            <Stop offset="0.55" stopColor={skyMid} />
            <Stop offset="1" stopColor={skyBot} />
          </LinearGradient>
          <LinearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hazeColor} stopOpacity="0.00" />
            <Stop offset="1" stopColor={hazeColor} stopOpacity="0.16" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#skyGrad)" />
      </Svg>

      {/* ======= FAR: nuvens + colina distante ======= */}
      <View style={{ position: 'absolute', left: farOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          {/* Tile A */}
          <G>
            {/* Nuvens fofinhas */}
            {cloudDefs.map((c, i) => (
              <Path key={`c-a-${i}`} d={c.d} fill={cloudFill} opacity={c.opacity} />
            ))}
            {/* Colina distante */}
            <Path d={farFill} fill={hillFar} />
          </G>
          {/* Tile B (SEAM + 1px overlap) */}
          <G x={tileW - overlap}>
            {/* SEAM */}
            {cloudDefs.map((c, i) => (
              <Path key={`c-b-${i}`} d={c.d} fill={cloudFill} opacity={c.opacity} />
            ))}
            <Path d={farFill} fill={hillFar} />
          </G>
        </Svg>
      </View>

      {/* ======= MID: colina média + balões ======= */}
      <View style={{ position: 'absolute', left: midOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            {/* Balões (corpos + cestinhos + fio) */}
            {balloonDefs.map((b, i) => (
              <G key={`b-a-${i}`}>
                <Circle cx={b.cx} cy={b.cy} r={b.r} fill={b.color} opacity={0.95} />
                <RectLike x={b.cx - b.r * 0.28} y={b.cy + b.r * 0.55} w={b.r * 0.56} h={b.r * 0.28} r={b.r * 0.08} fill="#8A5A44" opacity={0.9} />
                <Line x1={b.cx} y1={b.cy + b.r} x2={b.cx} y2={b.cy + b.r * 0.55} stroke="#7D7D7D" strokeWidth={1} />
              </G>
            ))}
            <Path d={midFill} fill={hillMid} />
            <Path d={midCrest} stroke={crestHL} strokeOpacity={0.14} strokeWidth={2} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            {balloonDefs.map((b, i) => (
              <G key={`b-b-${i}`}>
                <Circle cx={b.cx} cy={b.cy} r={b.r} fill={b.color} opacity={0.95} />
                <RectLike x={b.cx - b.r * 0.28} y={b.cy + b.r * 0.55} w={b.r * 0.56} h={b.r * 0.28} r={b.r * 0.08} fill="#8A5A44" opacity={0.9} />
                <Line x1={b.cx} y1={b.cy + b.r} x2={b.cx} y2={b.cy + b.r * 0.55} stroke="#7D7D7D" strokeWidth={1} />
              </G>
            ))}
            <Path d={midFill} fill={hillMid} />
            <Path d={midCrest} stroke={crestHL} strokeOpacity={0.14} strokeWidth={2} fill="none" />
          </G>
        </Svg>
      </View>

      {/* ======= NEAR: colina próxima + pirulitos ======= */}
      <View style={{ position: 'absolute', left: nearOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={nearFill} fill={hillNear} />
            <Path d={nearCrest} stroke={crestHL} strokeOpacity={0.18} strokeWidth={2.2} fill="none" />
            {/* Pirulitos (haste + cabeça redonda) */}
            {lollisNear.map((l, i) => (
              <G key={`ln-a-${i}`}>
                <Line x1={l.x} y1={l.baseY} x2={l.x} y2={l.baseY - l.h} stroke="#E0CEC0" strokeWidth={3} />
                <Circle cx={l.x} cy={l.baseY - l.h - l.r * 0.1} r={l.r} fill={l.color} opacity={0.95} />
                <Circle cx={l.x - l.r * 0.35} cy={l.baseY - l.h - l.r * 0.35} r={l.r * 0.18} fill="#FFFFFF" opacity={0.6} />
              </G>
            ))}
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={nearFill} fill={hillNear} />
            <Path d={nearCrest} stroke={crestHL} strokeOpacity={0.18} strokeWidth={2.2} fill="none" />
            {lollisNear.map((l, i) => (
              <G key={`ln-b-${i}`}>
                <Line x1={l.x} y1={l.baseY} x2={l.x} y2={l.baseY - l.h} stroke="#E0CEC0" strokeWidth={3} />
                <Circle cx={l.x} cy={l.baseY - l.h - l.r * 0.1} r={l.r} fill={l.color} opacity={0.95} />
                <Circle cx={l.x - l.r * 0.35} cy={l.baseY - l.h - l.r * 0.35} r={l.r * 0.18} fill="#FFFFFF" opacity={0.6} />
              </G>
            ))}
          </G>
        </Svg>
      </View>

      {/* ======= FRONT: colina frontal + pirulitos maiores ======= */}
      <View style={{ position: 'absolute', left: frontOffset, top: -120 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={frontFill} fill={hillFront} />
            <Path d={frontCrest} stroke={crestHL} strokeOpacity={0.22} strokeWidth={0.4} fill="none" />
            {lollisFront.map((l, i) => (
              <G key={`lf-a-${i}`}>
                <Line x1={l.x} y1={l.baseY} x2={l.x} y2={l.baseY - l.h} stroke="#DEC7B6" strokeWidth={9.2} />
                <Circle cx={l.x} cy={l.baseY - l.h - l.r * 0.1} r={l.r} fill={l.color} opacity={0.98} />
                <Circle cx={l.x - l.r * 0.35} cy={l.baseY - l.h - l.r * 0.35} r={l.r * 0.18} fill="#FFFFFF" opacity={0.65} />
              </G>
            ))}
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={frontFill} fill={hillFront} />
            <Path d={frontCrest} stroke={crestHL} strokeOpacity={0.22} strokeWidth={2.4} fill="none" />
            {lollisFront.map((l, i) => (
              <G key={`lf-b-${i}`}>
                <Line x1={l.x} y1={l.baseY} x2={l.x} y2={l.baseY - l.h} stroke="#DEC7B6" strokeWidth={3.2} />
                <Circle cx={l.x} cy={l.baseY - l.h - l.r * 0.1} r={l.r} fill={l.color} opacity={0.98} />
                <Circle cx={l.x - l.r * 0.35} cy={l.baseY - l.h - l.r * 0.35} r={l.r * 0.18} fill="#FFFFFF" opacity={0.65} />
              </G>
            ))}
          </G>
        </Svg>
      </View>

      {/* Haze leve na base para realçar HUD/sprites */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={0} y={H * 0.62} width={W} height={H * 0.38} fill="url(#hazeGrad)" />
      </Svg>
    </View>
  );
}

// Pequena "Rounded Rect" em SVG (leve, evita imports de componentes extras)
function RectLike({ x, y, w, h, r, fill, opacity = 1 }: { x: number; y: number; w: number; h: number; r: number; fill: string; opacity?: number }) {
  const d = [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
  return <Path d={d} fill={fill} opacity={opacity} />;
}

export default React.memo(BGDesertRidges);

// ------------------------------------------------------------------------------------
// Notas de Tiling & Performance
// - Periodicidade garantida nas colinas: hillY usa período = tileW -> y(x=0) == y(x=tileW).
// - Costura invisível: duplicação do mesmo tile com <G x={tileW - overlap}> e overlap=1.  // SEAM
// - Parallax sem RAF: offsets dependem somente de cameraX; snap() evita gaps subpixel.
// - Densidade balanceada para 60 FPS (passos por layer, quantidades de nuvens/pirulitos).
// - 100% da tela: céu (topo) + colinas que fecham até a base (rodapé).
// ——————————————————————————————————————————


