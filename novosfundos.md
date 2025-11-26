// belo fundo do jogo src/components/BGMountains.tsx
// ------------------------------------------------------------------------------------
// Modern "mountain-ridges" — 100% montanhas (sem chão vazio), fundo mais alto.
// Compatível com seu API: { cameraX: number }.
// Parallax só move com a câmera (sem RAF). 60 FPS com react-native-svg.
// Tiling perfeito: funções periódicas (período = tileW) + tile duplicado com 1px overlap.
// Marcas // SEAM indicam pontos críticos de emenda.
// ------------------------------------------------------------------------------------

import React, { useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G } from 'react-native-svg';
import { theme } from '../styles/theme';

function BGMountains({ cameraX = 0 }: { cameraX: number }) {
  // Dimensões congeladas para estabilidade (evita flicker por relayout)
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  // Tile base = largura visível (período das ondas)
  const tileW = W;

  // Parallax — velocidades do fundo->frente (quanto mais perto, mais rápido)
  const farSpeed = 2.2;
  const midSpeed = 6.0;
  const nearSpeed = 10.0;
  const frontSpeed = 14.0;

  // Snap para eliminar gaps subpixel
  const snap = (v: number) => Math.floor(v);
  const overlap = 1; // 1px de sobreposição

  const farOffset   = snap(-((cameraX * farSpeed)   % tileW));
  const midOffset   = snap(-((cameraX * midSpeed)   % tileW));
  const nearOffset  = snap(-((cameraX * nearSpeed)  % tileW));
  const frontOffset = snap(-((cameraX * frontSpeed) % tileW));

  // Paleta (usa theme se houver)
  const skyTop       = (theme as any)?.skyTop       || '#0E1320';
  const skyBottom    = (theme as any)?.skyBottom    || '#0E1320';
  // Atmosferic perspective: longe mais claro, perto mais escuro
  const mountainFar  = (theme as any)?.mountainFar  || '#5B7DAE';
  const mountainMid  = (theme as any)?.mountainMid  || '#3C4F76';
  const mountainNear = (theme as any)?.mountainNear || '#28324A';
  const mountainFront= (theme as any)?.mountainFront|| '#1C2336';
  const fogColor     = (theme as any)?.fogColor     || '#CFE3FF';

  // ---------- Geração de cristas tileáveis ----------
  // Cada crista é uma soma de senos com período = tileW => y(0) == y(tileW)
  const TWO_PI = Math.PI * 2;

  const steps = 96; // qualidade média; pode subir p/ 160 se quiser mais detalhe

  const ridgeY = (
    x: number,
    baseY: number, // altura base da crista
    amp: number,   // amplitude
    phases: [number, number, number, number], // fases fixas por camada
  ) => {
    const t = (x / tileW) * TWO_PI;
    // Harmônicos leves p/ detalhe sem custo alto
    const y =
      Math.sin(t + phases[0]) * 1.0 +
      Math.sin(2 * t + phases[1]) * 0.45 +
      Math.sin(3 * t + phases[2]) * 0.18 +
      Math.sin(5 * t + phases[3]) * 0.08;
    return baseY - amp * y;
  };

  const buildRidgePath = (
    baseY: number,
    amp: number,
    phases: [number, number, number, number],
  ) => {
    let d = `M 0 ${H} L 0 ${ridgeY(0, baseY, amp, phases).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = ridgeY(x, baseY, amp, phases);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L ${tileW} ${H} Z`;
    return d;
  };

  // Layout vertical — fundo MAIS alto, frente MAIS baixa (profundidade)
  // (0 = topo da tela)
  const farBaseY   = H * 0.20; // picos no alto
  const midBaseY   = H * 0.34;
  const nearBaseY  = H * 0.50;
  const frontBaseY = H * 0.66; // preenche a base (sem "chão vazio")

  const farAmp   = H * 0.18;
  const midAmp   = H * 0.14;
  const nearAmp  = H * 0.12;
  const frontAmp = H * 0.10;

  // Fases fixas por camada (determinísticas, não "piscam")
  const FAR_PHASE:   [number, number, number, number] = [0.8, 1.9, 2.7, 0.4];
  const MID_PHASE:   [number, number, number, number] = [0.2, 1.2, 2.1, 1.6];
  const NEAR_PHASE:  [number, number, number, number] = [1.4, 0.4, 2.8, 0.9];
  const FRONT_PHASE: [number, number, number, number] = [0.9, 2.2, 0.7, 1.8];

  // Memo dos paths (dependem só de dimensões)
  const farPath = useMemo(() => buildRidgePath(farBaseY, farAmp, FAR_PHASE),   [tileW, H]);
  const midPath = useMemo(() => buildRidgePath(midBaseY, midAmp, MID_PHASE),   [tileW, H]);
  const nearPath = useMemo(() => buildRidgePath(nearBaseY, nearAmp, NEAR_PHASE), [tileW, H]);
  const frontPath = useMemo(() => buildRidgePath(frontBaseY, frontAmp, FRONT_PHASE), [tileW, H]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {/* Céu / fundo */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop} />
            <Stop offset="1" stopColor={skyBottom} />
          </LinearGradient>
          <LinearGradient id="fogGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fogColor} stopOpacity="0.00" />
            <Stop offset="1" stopColor={fogColor} stopOpacity="0.35" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#skyGrad)" />
      </Svg>

      {/* ======= LAYER: FAR (mais alto, mais claro) ======= */}
      <View style={{ position: 'absolute', left: farOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={farPath} fill={mountainFar} />
            {/* leve neblina para profundidade */}
            <Rect x={0} y={0} width={tileW} height={H} fill="url(#fogGrad)" opacity={0.15} />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM: tile repetido com 1px overlap */}
            <Path d={farPath} fill={mountainFar} />
            <Rect x={0} y={0} width={tileW} height={H} fill="url(#fogGrad)" opacity={0.15} />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: MID ======= */}
      <View style={{ position: 'absolute', left: midOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={midPath} fill={mountainMid} />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={midPath} fill={mountainMid} />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: NEAR ======= */}
      <View style={{ position: 'absolute', left: nearOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={nearPath} fill={mountainNear} />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={nearPath} fill={mountainNear} />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: FRONT (preenche a base — zero "chão vazio") ======= */}
      <View style={{ position: 'absolute', left: frontOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={frontPath} fill={mountainFront} />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={frontPath} fill={mountainFront} />
          </G>
        </Svg>
      </View>

      {/* Névoa baixa opcional para suavizar encontro com HUD/sprites */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={0} y={H * 0.60} width={W} height={H * 0.40} fill="url(#fogGrad)" />
      </Svg>
    </View>
  );
}

export default React.memo(BGMountains);



—————————————————————————————




// segundo fundo deserto src/components/BGDesertRidges.tsx
// ------------------------------------------------------------------------------------
// Modern "dune-ridges" — 100% dunas (sem chão vazio), tela toda útil.
// Compatível com seu API: { cameraX: number }.
// Parallax só move com a câmera (sem RAF). 60 FPS com react-native-svg.
// Tiling perfeito: funções periódicas (período = tileW) + tile duplicado com 1px overlap.
// Marcas // SEAM indicam pontos críticos de emenda.
// ------------------------------------------------------------------------------------

import React, { useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G } from 'react-native-svg';
import { theme } from '../styles/theme';

function BGDesertRidges({ cameraX = 0 }: { cameraX: number }) {
  // Dimensões congeladas para estabilidade (evita flicker por relayout)
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  // Tile base = largura visível (período das ondas)
  const tileW = W;
  const overlap = 1; // 1px de sobreposição

  // Parallax — fundo -> frente (quanto mais perto, mais rápido)
  const farSpeed   = 1.8;
  const midSpeed   = 5.5;
  const nearSpeed  = 9.5;
  const frontSpeed = 13.5;

  // Snap para eliminar gaps subpixel
  const snap = (v: number) => Math.floor(v);
  const farOffset   = snap(-((cameraX * farSpeed)   % tileW));
  const midOffset   = snap(-((cameraX * midSpeed)   % tileW));
  const nearOffset  = snap(-((cameraX * nearSpeed)  % tileW));
  const frontOffset = snap(-((cameraX * frontSpeed) % tileW));

  // Paleta (usa theme se houver)
  const skyTop        = (theme as any)?.desertSkyTop     || '#FFCC8A';
  const skyBottom     = (theme as any)?.desertSkyBottom  || '#FFF4E6';
  // Atmosferic perspective: longe mais claro, perto mais saturado/escuro
  const duneFar       = (theme as any)?.duneFar          || '#E9C08C';
  const duneMid       = (theme as any)?.duneMid          || '#D6A56F';
  const duneNear      = (theme as any)?.duneNear         || '#C1894F';
  const duneFront     = (theme as any)?.duneFront        || '#A56F3A';
  const highlightSand = (theme as any)?.sandHighlight    || '#FFF1D8';
  const hazeColor     = (theme as any)?.desertHaze       || '#FFFFFF';
  const sunA          = (theme as any)?.sunA             || '#FFF0A6';
  const sunB          = (theme as any)?.sunB             || '#FF9E6E';

  // ---------- Geração de cristas tileáveis ----------
  // Cada crista é uma soma de senos com período = tileW => y(0) == y(tileW)
  const TWO_PI = Math.PI * 2;
  const steps = 96; // qualidade média (suba p/ 160 em devices fortes)

  const ridgeY = (
    x: number,
    baseY: number, // altura base da crista
    amp: number,   // amplitude
    phases: [number, number, number, number], // fases fixas por camada
  ) => {
    const t = (x / tileW) * TWO_PI;
    // Harmônicos suaves: ondulação de duna com micro variação
    const y =
      Math.sin(t + phases[0]) * 1.00 +
      Math.sin(2 * t + phases[1]) * 0.42 +
      Math.sin(3 * t + phases[2]) * 0.19 +
      Math.sin(5 * t + phases[3]) * 0.08;
    return baseY - amp * y;
  };

  const buildFillPath = (baseY: number, amp: number, phases: [number, number, number, number]) => {
    let d = `M 0 ${H} L 0 ${ridgeY(0, baseY, amp, phases).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = ridgeY(x, baseY, amp, phases);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L ${tileW} ${H} Z`;
    return d;
  };

  // Traçado do cume (para highlight fino, sem fechar no rodapé)
  const buildCrestPath = (baseY: number, amp: number, phases: [number, number, number, number]) => {
    let d = `M 0 ${ridgeY(0, baseY, amp, phases).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = ridgeY(x, baseY, amp, phases);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  // Layout vertical — fundo MAIS alto, frente MAIS baixa (preenche tudo)
  const farBaseY   = H * 0.18; // dunas altas no horizonte
  const midBaseY   = H * 0.32;
  const nearBaseY  = H * 0.48;
  const frontBaseY = H * 0.66; // preenche a base (zero "chão vazio")

  const farAmp   = H * 0.14;
  const midAmp   = H * 0.12;
  const nearAmp  = H * 0.10;
  const frontAmp = H * 0.08;

  // Fases fixas por camada (determinísticas, não "piscam")
  const FAR_PHASE:   [number, number, number, number] = [0.35, 1.6, 2.4, 0.7];
  const MID_PHASE:   [number, number, number, number] = [1.10, 0.3, 2.7, 1.9];
  const NEAR_PHASE:  [number, number, number, number] = [0.65, 2.0, 0.9, 1.3];
  const FRONT_PHASE: [number, number, number, number] = [1.75, 0.9, 1.6, 2.2];

  // Memo dos paths (dependem só de dimensões)
  const farFill   = useMemo(() => buildFillPath(farBaseY,   farAmp,   FAR_PHASE),   [tileW, H]);
  const midFill   = useMemo(() => buildFillPath(midBaseY,   midAmp,   MID_PHASE),   [tileW, H]);
  const nearFill  = useMemo(() => buildFillPath(nearBaseY,  nearAmp,  NEAR_PHASE),  [tileW, H]);
  const frontFill = useMemo(() => buildFillPath(frontBaseY, frontAmp, FRONT_PHASE), [tileW, H]);

  const midCrest   = useMemo(() => buildCrestPath(midBaseY,   midAmp,   MID_PHASE),   [tileW, H]);
  const nearCrest  = useMemo(() => buildCrestPath(nearBaseY,  nearAmp,  NEAR_PHASE),  [tileW, H]);
  const frontCrest = useMemo(() => buildCrestPath(frontBaseY, frontAmp, FRONT_PHASE), [tileW, H]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {/* Céu + sol */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop} />
            <Stop offset="1" stopColor={skyBottom} />
          </LinearGradient>
          <LinearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sunA} />
            <Stop offset="1" stopColor={sunB} />
          </LinearGradient>
          <LinearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hazeColor} stopOpacity="0.00" />
            <Stop offset="1" stopColor={hazeColor} stopOpacity="0.28" />
          </LinearGradient>
        </Defs>

        {/* Fundo do céu */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#skyGrad)" />

        {/* Sol elíptico sutil, alto no céu */}
        <Path
          d={`M ${W * 0.72} ${H * 0.20} m -${H * 0.09}, 0 a ${H * 0.09},${H * 0.09} 0 1,0 ${H * 0.18},0 a ${H * 0.09},${H * 0.09} 0 1,0 -${H * 0.18},0`}
          fill="url(#sunGrad)"
          opacity={0.85}
        />
      </Svg>

      {/* ======= LAYER: FAR (horizonte, mais claro) ======= */}
      <View style={{ position: 'absolute', left: farOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={farFill} fill={duneFar} />
            <Rect x={0} y={0} width={tileW} height={H} fill="url(#hazeGrad)" opacity={0.12} />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM: tile repetido com 1px overlap */}
            <Path d={farFill} fill={duneFar} />
            <Rect x={0} y={0} width={tileW} height={H} fill="url(#hazeGrad)" opacity={0.12} />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: MID ======= */}
      <View style={{ position: 'absolute', left: midOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={midFill} fill={duneMid} />
            {/* Highlight suave no cume */}
            <Path d={midCrest} stroke={highlightSand} strokeOpacity={0.18} strokeWidth={2} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={midFill} fill={duneMid} />
            <Path d={midCrest} stroke={highlightSand} strokeOpacity={0.18} strokeWidth={2} fill="none" />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: NEAR ======= */}
      <View style={{ position: 'absolute', left: nearOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={nearFill} fill={duneNear} />
            <Path d={nearCrest} stroke={highlightSand} strokeOpacity={0.22} strokeWidth={2.2} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={nearFill} fill={duneNear} />
            <Path d={nearCrest} stroke={highlightSand} strokeOpacity={0.22} strokeWidth={2.2} fill="none" />
          </G>
        </Svg>
      </View>

      {/* ======= LAYER: FRONT (preenche base) ======= */}
      <View style={{ position: 'absolute', left: frontOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={frontFill} fill={duneFront} />
            <Path d={frontCrest} stroke={highlightSand} strokeOpacity={0.26} strokeWidth={2.4} fill="none" />
          </G>
          <G x={tileW - overlap}>
            {/* SEAM */}
            <Path d={frontFill} fill={duneFront} />
            <Path d={frontCrest} stroke={highlightSand} strokeOpacity={0.26} strokeWidth={2.4} fill="none" />
          </G>
        </Svg>
      </View>

      {/* Haze baixo (miragem leve) para suavizar HUD/sprites */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={0} y={H * 0.58} width={W} height={H * 0.42} fill="url(#hazeGrad)" />
      </Svg>
    </View>
  );
}

export default React.memo(BGDesertRidges);


----------------------------------------------------------------------------


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



—————————————




//4 mundon 
// src/components/BGDesertRidges.tsx
// ------------------------------------------------------------------------------------
// "Underwater Coral Reef & Fishes" — infantil, colorido e suave. 100% da tela usada:
// superfície luminosa + 4 camadas de recifes/corais + peixinhos e bolhas.
// Compatível com sua API: { cameraX: number } (parallax amarrado à câmera; sem RAF).
// 60 FPS com react-native-svg: paths memorizados, offsets quantizados, densidade leve.
// Tiling perfeito: funções periódicas (período = tileW) + duplicação do tile com 1px overlap.
// Marcas // SEAM indicam pontos críticos de emenda.
// ------------------------------------------------------------------------------------

import React, { JSX, useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Path, G, Circle, Ellipse, Line, Polygon
} from 'react-native-svg';

// (Opcional) Integração com tema do seu projeto:
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

  const fishA       = (theme as any)?.fishA       || '#FF8BA7';
  const fishB       = (theme as any)?.fishB       || '#FFD166';
  const fishC       = (theme as any)?.fishC       || '#6EF0A3';
  const fishD       = (theme as any)?.fishD       || '#7EA1FF';

  // ---------- Parallax amarrado à câmera ----------
  // Mais distante = mais lento; mais perto = mais rápido.
  const farSpeed   = 1.1;   // recife distante + raios de luz
  const midSpeed   = 3.0;   // peixes médios
  const nearSpeed  = 5.5;   // recife próximo + bolhas
  const frontSpeed = 8.6;   // recife frontal

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

  // Preenche do contorno para baixo (até o rodapé) — garante 100% de base ocupada
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

  // Densidade segura para mid‑range
  const stepsFar = 72, stepsMid = 88, stepsNear = 102, stepsFront = 116;

  // Memoização dos paths (dependem apenas de W/H)
  const farFill   = useMemo(() => buildFillPathBottom(farBaseY,   farAmp,   FAR_P,   stepsFar),   [tileW, H]);
  const midFill   = useMemo(() => buildFillPathBottom(midBaseY,   midAmp,   MID_P,   stepsMid),   [tileW, H]);
  const nearFill  = useMemo(() => buildFillPathBottom(nearBaseY,  nearAmp,  NEAR_P,  stepsNear),  [tileW, H]);
  const frontFill = useMemo(() => buildFillPathBottom(frontBaseY, frontAmp, FRONT_P, stepsFront), [tileW, H]);

  const midCrest   = useMemo(() => buildCrestPath(midBaseY,   midAmp,   MID_P,   stepsMid),   [tileW, H]);
  const nearCrest  = useMemo(() => buildCrestPath(nearBaseY,  nearAmp,  NEAR_P,  stepsNear),  [tileW, H]);
  const frontCrest = useMemo(() => buildCrestPath(frontBaseY, frontAmp, FRONT_P, stepsFront), [tileW, H]);

  // ---------- Utilidades determinísticas para fauna/bolhas (tileáveis) ----------
  const hash01 = (n: number) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };

  type Fish = { cx: number; cy: number; rx: number; ry: number; dir: 1 | -1; color: string; eye: string };
  const makeFish = (yTop: number, yBottom: number, densityPx: number, seed: number, colors: string[]): Fish[] => {
    const count = Math.max(4, Math.round(tileW / densityPx));
    const list: Fish[] = [];
    for (let i = 0; i < count; i++) {
      const kx = (i + 0.15 + hash01(seed + i) * 0.7) / count;
      const cx = kx * tileW;
      const cy = yTop + (yBottom - yTop) * (0.2 + 0.6 * hash01(seed * 13 + i));
      const s = Math.max(10, 16 + 24 * hash01(seed * 31 + i)); // tamanho base
      const rx = s * (0.70 + 0.4 * hash01(seed * 7 + i));      // largura (oval)
      const ry = s * (0.40 + 0.3 * hash01(seed * 11 + i));     // altura (oval)
      const dir: 1 | -1 = hash01(seed * 17 + i) > 0.5 ? 1 : -1;
      const color = colors[i % colors.length];
      const eye = '#ffffff';
      list.push({ cx, cy, rx, ry, dir, color, eye });
    }
    return list;
  };

  const fishMid  = useMemo(() => makeFish(H * 0.18, H * 0.52, 210, 101, [fishA, fishB, fishC, fishD]), [tileW, H]);
  const fishNear = useMemo(() => makeFish(H * 0.28, H * 0.68, 170, 202, [fishB, fishC, fishD, fishA]), [tileW, H]);

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

  // ---------- Desenho do Peixe (leve) ----------
 
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
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

      {/* ======= LAYER: MID (recife médio + peixinhos) ======= */}
      <View style={{ position: 'absolute', left: midOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            {/* Peixes médios */}
           
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

      {/* ======= LAYER: NEAR (recife próximo + bolhas + peixinhos) ======= */}
      <View style={{ position: 'absolute', left: nearOffset, top: -120 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            {/* Bolhas */}
            {bubblesNear.map((b, i) => (
              <Circle key={`bn-a-${i}`} cx={b.cx} cy={b.cy} r={b.r} fill={bubbleColor} opacity={b.o} />
            ))}
            {/* Peixes próximos */}
           
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

      {/* ======= LAYER: FRONT (recife frontal) ======= */}
      <View style={{ position: 'absolute', left: frontOffset, top: -120 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={frontFill} fill={reefFront} />
            <Path d={frontCrest} stroke={crestHL} strokeOpacity={0.20} strokeWidth={2.4} fill="none" />
            {/* Pequenas "algas" estilizadas (linhas curvas simples) */}
            {(() => {
              const count = Math.max(6, Math.round(tileW / 140));
              const items: JSX.Element[] = [];
              for (let i = 0; i < count; i++) {
                const x = ((i + 0.3) / count) * tileW;
                const h = H * (0.06 + 0.05 * hash01(500 + i));
                const baseY = frontBaseY + 6 + 10 * hash01(510 + i);
                const d = `M ${x} ${baseY}
                           C ${x - 8} ${baseY - h * 0.4},
                             ${x + 8} ${baseY - h * 0.8},
                             ${x} ${baseY - h}`;
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
                const baseY = frontBaseY + 6 + 10 * hash01(510 + i);
                const d = `M ${x} ${baseY}
                           C ${x - 8} ${baseY - h * 0.4},
                             ${x + 8} ${baseY - h * 0.8},
                             ${x} ${baseY - h}`;
                items.push(<Path key={`kelp-b-${i}`} d={d} stroke="#FFFFFF" strokeOpacity={0.10} strokeWidth={2} fill="none" />);
              }
              return <G>{items}</G>;
            })()}
          </G>
        </Svg>
      </View>

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
// - Periodicidade garantida: reefY usa período = tileW -> y(0) == y(tileW).
// - Costura invisível: duplicação do mesmo tile com <G x={tileW - overlap}> e overlap=1.  // SEAM
// - Parallax sem RAF: offsets dependem apenas de cameraX; snap() evita gaps subpixel.
// - Densidade balanceada: passos por layer, peixes/bolhas moderados (adequado para 60 FPS).
// - 100% da tela: superfície preenchida por gradiente + recifes que fecham até a base.
// ——————————————————————————————————————————

——————————
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


