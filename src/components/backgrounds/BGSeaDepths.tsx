

// src/components/backgrounds/BGSeaDepths.tsx
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
import { theme } from '../../styles/theme';

type Props = { cameraX: number };

function BGSeaDepths({ cameraX = 0 }: Props) {
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

export default React.memo(BGSeaDepths);

// ------------------------------------------------------------------------------------
// Notas de Tiling & Performance
// - Periodicidade garantida: reefY usa período = tileW -> y(0) == y(tileW).
// - Costura invisível: duplicação do mesmo tile com <G x={tileW - overlap}> e overlap=1.  // SEAM
// - Parallax sem RAF: offsets dependem apenas de cameraX; snap() evita gaps subpixel.
// - Densidade balanceada: passos por layer, peixes/bolhas moderados (adequado para 60 FPS).
// - 100% da tela: superfície preenchida por gradiente + recifes que fecham até a base.
// ——————————————————————————————————————————
