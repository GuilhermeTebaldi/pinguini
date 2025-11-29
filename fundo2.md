
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

