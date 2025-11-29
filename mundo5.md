// src/components/BGKingSnowAurora.tsx
// ------------------------------------------------------------------------------------
// KING • Snow + Aurora • Cinematic, 100% preenchido (sem “chão vazio”)
// API compatível: { cameraX: number }  •  Parallax suave (sem RAF)  •  60 FPS (SVG)
// Tiling perfeito: todas as curvas são periódicas (período = tileW) + duplicação com 1px overlap
// Estilo: céu com aurora (strokes grossos em gradiente), picos glaciais “facetados”,
// vento em fiapos, flocos discretos e brilho especular nas cristas.
// Marcações // SEAM indicam pontos de emenda.
// ------------------------------------------------------------------------------------
import React, { useMemo, useRef, useEffect, useState } from 'react';

//import React, { useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  G,
  Circle,
  Line,
} from 'react-native-svg';
import { theme } from '../styles/theme';

function BGKingSnowAurora({ cameraX = 0 }: { cameraX: number }) {
  // Dimensões congeladas (evita flicker por relayout)
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  // Tile base (período)
  const tileW = W;
  const overlap = 1;

  // Parallax (mais perto → mais rápido)
  const auroraSpeed = 0.9;
  const starsSpeed  = 0.6;
  const farSpeed    = 2.2;
  const midSpeed    = 6.4;
  const nearSpeed   = 10.4;
  const frontSpeed  = 14.2;
  const windBackSpd = 1.4;
  const windFrontSpd= 7.6;

  // Snap para matar subpixel gaps
  const snap = (v: number) => Math.floor(v);

  // Offsets tileados
  const auroraOffset = snap(-((cameraX * auroraSpeed) % tileW));
  const starsOffset  = snap(-((cameraX * starsSpeed)  % tileW));
  const farOffset    = snap(-((cameraX * farSpeed)    % tileW));
  const midOffset    = snap(-((cameraX * midSpeed)    % tileW));
  const nearOffset   = snap(-((cameraX * nearSpeed)   % tileW));
  const frontOffset  = snap(-((cameraX * frontSpeed)  % tileW));
  const windBackOff  = snap(-((cameraX * windBackSpd) % tileW));
  const windFrontOff = snap(-((cameraX * windFrontSpd)% tileW));

  // Paleta (override via theme se existir)
  const skyTop       = (theme as any)?.kingSkyTop       || '#0B1024';
  const skyBottom    = (theme as any)?.kingSkyBottom    || '#16264A';
  const starColor    = (theme as any)?.kingStar         || '#B8D9FF';
  const auroraA1     = (theme as any)?.auroraA1         || '#6AF7D4';
  const auroraA2     = (theme as any)?.auroraA2         || '#8F7CFF';
  const auroraB1     = (theme as any)?.auroraB1         || '#5AE3FF';
  const auroraB2     = (theme as any)?.auroraB2         || '#FFD3FF';
  const iceFar       = (theme as any)?.iceFar           || '#A7C9FF';
  const iceMid       = (theme as any)?.iceMid           || '#7FA8E6';
  const iceNear      = (theme as any)?.iceNear          || '#577FBD';
  const iceFront     = (theme as any)?.iceFront         || '#3B5A8C';
  const iceShine     = (theme as any)?.iceShine         || '#EAF4FF';
  const crevasse     = (theme as any)?.crevasse         || '#9AD5FF';
  const haze         = (theme as any)?.kingHaze         || '#FFFFFF';
  const crownColor   = (theme as any)?.kingCrown        || '#FFE66E';

  // ---------- Utilidades periódicas ----------
  const TWO_PI = Math.PI * 2;

  // “Pico facetado” (crista mais pontuda que seno comum)
  const ridgePointed = (
    x: number,
    baseY: number,
    amp: number,
    kSharp: number, // 1.0 ~ seno, >1 mais pontudo
    phases: [number, number, number, number]
  ) => {
    const t = (x / tileW) * TWO_PI;
    const s = Math.sin(t + phases[0]);
    const p = Math.sign(s) * Math.pow(Math.abs(s), kSharp);
    const y =
      0.92 * p +
      0.38 * Math.sin(2.1 * t + phases[1]) +
      0.18 * Math.sin(3.7 * t + phases[2]) +
      0.08 * Math.sin(6.0 * t + phases[3]);
    return baseY - amp * y;
  };

  // Constrói path de preenchimento (fecha no rodapé para “sem buracos”)
  const buildFillPath = (
    baseY: number,
    amp: number,
    kSharp: number,
    phases: [number, number, number, number],
    Hfull: number
  ) => {
    const steps = 128;
    let d = `M 0 ${Hfull} L 0 ${ridgePointed(0, baseY, amp, kSharp, phases).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = ridgePointed(x, baseY, amp, kSharp, phases);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L ${tileW} ${Hfull} Z`;
    return d;
  };

  // Path só da crista (para highlight / crevasses)
  const buildCrestPath = (
    baseY: number,
    amp: number,
    kSharp: number,
    phases: [number, number, number, number]
  ) => {
    const steps = 128;
    let d = `M 0 ${ridgePointed(0, baseY, amp, kSharp, phases).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = ridgePointed(x, baseY, amp, kSharp, phases);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  // Vento/Aurora — curva periódica leve
  const buildWavePath = (y0: number, amp: number, phase: number) => {
    const steps = 48;
    let d = `M 0 ${y0.toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = y0 + amp * Math.sin((x / tileW) * TWO_PI + phase);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  // ---------- Layout vertical (aproveita a tela toda) ----------
  const farBaseY   = H * 0.16; // horizonte alto (picos no topo)
  const midBaseY   = H * 0.34;
  const nearBaseY  = H * 0.52;
  const frontBaseY = H * 0.70; // preenche a base

  const farAmp   = H * 0.20;
  const midAmp   = H * 0.16;
  const nearAmp  = H * 0.13;
  const frontAmp = H * 0.11;

  // Afiamento por camada
  const kFar   = 1.6;
  const kMid   = 1.8;
  const kNear  = 2.0;
  const kFront = 2.2;

  // Fases fixas (determinístico, não “pisca”)
  const FAR_P:   [number, number, number, number] = [0.6, 1.9, 2.7, 0.8];
  const MID_P:   [number, number, number, number] = [1.3, 0.2, 2.1, 1.6];
  const NEAR_P:  [number, number, number, number] = [0.9, 2.0, 0.7, 1.2];
  const FRONT_P: [number, number, number, number] = [1.8, 0.7, 1.5, 2.3];

  // ---------- Memo dos paths ----------
  const farFill   = useMemo(() => buildFillPath(farBaseY,   farAmp,   kFar,   FAR_P,   H), [tileW, H]);
  const midFill   = useMemo(() => buildFillPath(midBaseY,   midAmp,   kMid,   MID_P,   H), [tileW, H]);
  const nearFill  = useMemo(() => buildFillPath(nearBaseY,  nearAmp,  kNear,  NEAR_P,  H), [tileW, H]);
  const frontFill = useMemo(() => buildFillPath(frontBaseY, frontAmp, kFront, FRONT_P, H), [tileW, H]);

  const farCrest   = useMemo(() => buildCrestPath(farBaseY,   farAmp,   kFar,   FAR_P), [tileW, H]);
  const midCrest   = useMemo(() => buildCrestPath(midBaseY,   midAmp,   kMid,   MID_P), [tileW, H]);
  const nearCrest  = useMemo(() => buildCrestPath(nearBaseY,  nearAmp,  kNear,  NEAR_P),[tileW, H]);
  const frontCrest = useMemo(() => buildCrestPath(frontBaseY, frontAmp, kFront, FRONT_P),[tileW, H]);

  // ---------- Aurora (strokes grossos, tileáveis) ----------
  const auroraA = useMemo(() => buildWavePath(H * 0.24, H * 0.06, 0.4), [tileW, H]);
  const auroraB = useMemo(() => buildWavePath(H * 0.32, H * 0.05, 1.1), [tileW, H]);

  // ---------- Vento (fiapos) ----------
  const windBack = useMemo(() => buildWavePath(H * 0.44, H * 0.015, 0.2), [tileW, H]);
  const windFront= useMemo(() => buildWavePath(H * 0.58, H * 0.018, 1.3), [tileW, H]);

  // ---------- Estrelas / flocos discretos, tileáveis ----------
  const starDots = useMemo(() => {
    const count = 28;
    const arr: { x: number; y: number; r: number; o: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = (tileW / count) * i + (tileW / count) * 0.5;
      const y = (H * 0.06) + ((i * 97) % Math.max(40, Math.floor(H * 0.40)));
      const r = 0.8 + ((i * 37) % 3) * 0.4;
      const o = 0.35 + ((i * 19) % 6) * 0.09;
      arr.push({ x, y, r, o });
    }
    return arr;
  }, [tileW, H]);

  // ---------- “Coroa” KING (easter egg único, não tileado) ----------
  // Silhueta minimalista no horizonte. Aparece apenas uma vez, deslocando com camada MID.
  const crownSpeed = midSpeed;
  const crownX = snap(W * 0.18 - cameraX * crownSpeed);
  const crownY = snap(Math.min(H * 0.31, midBaseY - 12));
  const showCrown = crownX > -160 && crownX < W + 40;

  const crownPath = useMemo(() => {
    const cw = Math.max(80, W * 0.18);
    const ch = cw * 0.46;
    // Três pontas com joias (triângulos suaves)
    return [
      `M 0 ${ch * 0.80}`,
      `L ${cw * 0.18} ${ch * 0.32}`,
      `L ${cw * 0.32} ${ch * 0.72}`,
      `L ${cw * 0.50} ${ch * 0.20}`,
      `L ${cw * 0.68} ${ch * 0.72}`,
      `L ${cw * 0.82} ${ch * 0.32}`,
      `L ${cw} ${ch * 0.80}`,
      `Z`,
    ].join(' ');
  }, [W]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {/* Céu */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop} />
            <Stop offset="1" stopColor={skyBottom} />
          </LinearGradient>
          <LinearGradient id="aurA" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={auroraA1} stopOpacity="0.85" />
            <Stop offset="1" stopColor={auroraA2} stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="aurB" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={auroraB1} stopOpacity="0.85" />
            <Stop offset="1" stopColor={auroraB2} stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={haze} stopOpacity="0.00" />
            <Stop offset="1" stopColor={haze} stopOpacity="0.30" />
          </LinearGradient>
          <LinearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={iceShine} stopOpacity="0.85" />
            <Stop offset="1" stopColor={iceShine} stopOpacity="0.00" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#sky)" />
      </Svg>

      {/* AURORA (strokes grossos, tile + overlap) */}
      <View style={{ position: 'absolute', left: auroraOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H * 0.46}>
          <G opacity={0.65}>
            <Path d={auroraA} stroke="url(#aurA)" strokeWidth={28} strokeLinecap="round" fill="none" />
            <Path d={auroraB} stroke="url(#aurB)" strokeWidth={24} strokeLinecap="round" fill="none" />
          </G>
          <G x={tileW - overlap} opacity={0.65}>
            {/* SEAM */}
            <Path d={auroraA} stroke="url(#aurA)" strokeWidth={28} strokeLinecap="round" fill="none" />
            <Path d={auroraB} stroke="url(#aurB)" strokeWidth={24} strokeLinecap="round" fill="none" />
          </G>
        </Svg>
      </View>

      {/* ESTRELAS / FLOCOS LEVES (tile + overlap) */}
      <View style={{ position: 'absolute', left: starsOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H * 0.52}>
          <G>
            {starDots.map((s, i) => (
              <Circle key={`a-${i}`} cx={s.x} cy={s.y} r={s.r} fill={starColor} opacity={s.o} />
            ))}
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            {starDots.map((s, i) => (
              <Circle key={`b-${i}`} cx={s.x} cy={s.y} r={s.r} fill={starColor} opacity={s.o} />
            ))}
          </G>
        </Svg>
      </View>

      {/* FAR (horizonte glaciar, mais claro) */}
      <View style={{ position: 'absolute', left: farOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={farFill} fill={iceFar} />
            <Rect x={0} y={0} width={tileW} height={H} fill="url(#haze)" opacity={0.12} />
            {/* brilho sutil no topo distante */}
            <Path d={farCrest} stroke="url(#shine)" strokeOpacity={0.14} strokeWidth={1.5} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={farFill} fill={iceFar} />
            <Rect x={0} y={0} width={tileW} height={H} fill="url(#haze)" opacity={0.12} />
            <Path d={farCrest} stroke="url(#shine)" strokeOpacity={0.14} strokeWidth={1.5} fill="none" />
          </G>
        </Svg>
      </View>

      {/* MID (picos facetados + highlight) */}
      <View style={{ position: 'absolute', left: midOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={midFill} fill={iceMid} />
            <Path d={midCrest} stroke={iceShine} strokeOpacity={0.22} strokeWidth={2} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={midFill} fill={iceMid} />
            <Path d={midCrest} stroke={iceShine} strokeOpacity={0.22} strokeWidth={2} fill="none" />
          </G>
        </Svg>
      </View>

      {/* VENTO (meio/frente) */}
      <View style={{ position: 'absolute', left: windBackOff, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G opacity={0.26}>
            <Path d={windBack} stroke={iceShine} strokeWidth={1} fill="none" />
          </G>
          <G x={tileW - overlap} opacity={0.26}>
            {/* SEAM */}
            <Path d={windBack} stroke={iceShine} strokeWidth={1} fill="none" />
          </G>
        </Svg>
      </View>

      {/* NEAR (mais escuro, com fendas azuis) */}
      <View style={{ position: 'absolute', left: nearOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={nearFill} fill={iceNear} />
            <Path d={nearCrest} stroke={crevasse} strokeOpacity={0.22} strokeWidth={1.8} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={nearFill} fill={iceNear} />
            <Path d={nearCrest} stroke={crevasse} strokeOpacity={0.22} strokeWidth={1.8} fill="none" />
          </G>
        </Svg>
      </View>

      {/* FRONT (shelf glaciar + brilho especular forte) */}
      <View style={{ position: 'absolute', left: frontOffset, top: -80 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={frontFill} fill={iceFront} />
            <Path d={frontCrest} stroke={iceShine} strokeOpacity={0.28} strokeWidth={2.6} fill="none" />
            {/* “facetas” diagonais discretas (linhas inclinadas, repetidas) */}
            {Array.from({ length: 12 }, (_, i) => {
              const x = (tileW / 12) * i + (tileW / 24);
              const y1 = H * 0.62;
              const y2 = y1 - H * 0.10;
              return (
                <Line
                  key={`facet-a-${i}`}
                  x1={x}
                  y1={y1}
                  x2={x + 18}
                  y2={y2}
                  stroke={iceShine}
                  strokeOpacity={0.08}
                  strokeWidth={2}
                />
              );
            })}
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={frontFill} fill={iceFront} />
            <Path d={frontCrest} stroke={iceShine} strokeOpacity={0.28} strokeWidth={2.6} fill="none" />
            {Array.from({ length: 12 }, (_, i) => {
              const x = (tileW / 12) * i + (tileW / 24);
              const y1 = H * 0.62;
              const y2 = y1 - H * 0.10;
              return (
                <Line
                  key={`facet-b-${i}`}
                  x1={x}
                  y1={y1}
                  x2={x + 18}
                  y2={y2}
                  stroke={iceShine}
                  strokeOpacity={0.08}
                  strokeWidth={2}
                />
              );
            })}
          </G>
        </Svg>
      </View>

      {/* VENTO mais próximo (fiapo visível) */}
      <View style={{ position: 'absolute', left: windFrontOff, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G opacity={0.30}>
            <Path d={windFront} stroke={iceShine} strokeWidth={1.4} fill="none" />
          </G>
          <G x={tileW - overlap} opacity={0.30}>
            {/* SEAM */}
            <Path d={windFront} stroke={iceShine} strokeWidth={1.4} fill="none" />
          </G>
        </Svg>
      </View>

      {/* Névoa baixa para fundir com HUD */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={0} y={H * 0.60} width={W} height={H * 0.40} fill="url(#haze)" />
      </Svg>

      {/* COROA KING (única, NÃO tileada) */}
      {showCrown && (
        <Svg
          width={Math.max(80, W * 0.18)}
          height={Math.max(80, W * 0.18) * 0.46}
          style={{ position: 'absolute', left: crownX, top: crownY }}
        >
          <Path d={crownPath} fill={crownColor} opacity={0.95} />
          {/* base da coroa */}
          <Rect x={0} y={(Math.max(80, W * 0.18) * 0.46) * 0.78} width={Math.max(80, W * 0.18)} height={3} fill={crownColor} opacity={0.9} />
        </Svg>
      )}
    </View>
  );
}

export default React.memo(BGKingSnowAurora);


