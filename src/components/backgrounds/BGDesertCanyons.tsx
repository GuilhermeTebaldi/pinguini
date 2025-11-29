// src/components/backgrounds/BGDesertCanyons.tsx — Fundo épico de cânions (tileável, 4 camadas, configs iguais)
// ------------------------------------------------------------------------------------

import React, { useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G } from 'react-native-svg';
import { theme } from '../../styles/theme';

function BGDesertCanyons({ cameraX = 0 }: { cameraX: number }) {
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  const tileW = W;
  const overlap = 1;

  // Parallax igual ao seu fundo
  const farSpeed   = 1.8;
  const midSpeed   = 5.5;
  const nearSpeed  = 9.5;
  const frontSpeed = 13.5;

  const snap = (v: number) => Math.floor(v);
  const farOffset   = snap(-((cameraX * farSpeed)   % tileW));
  const midOffset   = snap(-((cameraX * midSpeed)   % tileW));
  const nearOffset  = snap(-((cameraX * nearSpeed)  % tileW));
  const frontOffset = snap(-((cameraX * frontSpeed) % tileW));

  // Paleta — cânion roxo/âmbar
  const skyTop    = (theme as any)?.canyonSkyTop    || '#6A4FE8';
  const skyBottom = (theme as any)?.canyonSkyBottom || '#F2D8FF';

  const rockFar   = (theme as any)?.rockFar         || '#C4A1FF';
  const rockMid   = (theme as any)?.rockMid         || '#B383FF';
  const rockNear  = (theme as any)?.rockNear        || '#9B5DF0';
  const rockFront = (theme as any)?.rockFront       || '#7A3FB9';

  const highlight = (theme as any)?.canyonLight     || '#FFE8FF';
  const hazeColor = (theme as any)?.canyonHaze      || '#FFFFFF';
  const sunA      = (theme as any)?.canyonSunA      || '#FFD3A2';
  const sunB      = (theme as any)?.canyonSunB      || '#FF9A66';

  // Geração ondulada vertical (cânions altos)
  const TWO_PI = Math.PI * 2;
  const steps = 100;

  const ridgeY = (
    x: number,
    baseY: number,
    amp: number,
    phases: [number, number, number, number]
  ) => {
    const t = (x / tileW) * TWO_PI;
    const y =
      Math.sin(t + phases[0]) * 1.2 +
      Math.sin(2 * t + phases[1]) * 0.45 +
      Math.sin(3 * t + phases[2]) * 0.20 +
      Math.sin(5 * t + phases[3]) * 0.10;
    return baseY - amp * y;
  };

  const buildFillPath = (baseY: number, amp: number, p: [number, number, number, number]) => {
    let d = `M 0 ${H} L 0 ${ridgeY(0, baseY, amp, p).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = ridgeY(x, baseY, amp, p);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L ${tileW} ${H} Z`;
    return d;
  };

  const buildCrestPath = (baseY: number, amp: number, p: [number, number, number, number]) => {
    let d = `M 0 ${ridgeY(0, baseY, amp, p).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      const y = ridgeY(x, baseY, amp, p);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  // Cânions verticais altos, estilo Monument Valley
  const farBaseY   = H * 0.25;
  const midBaseY   = H * 0.40;
  const nearBaseY  = H * 0.58;
  const frontBaseY = H * 0.75;

  const farAmp   = H * 0.20;
  const midAmp   = H * 0.18;
  const nearAmp  = H * 0.14;
  const frontAmp = H * 0.10;

  // Fases do novo fundo (diferentes do deserto antigo)
  const FAR_P:   [number, number, number, number] = [0.4, 1.9, 2.2, 0.7];
  const MID_P:   [number, number, number, number] = [1.3, 0.5, 2.5, 1.4];
  const NEAR_P:  [number, number, number, number] = [0.9, 2.4, 1.1, 1.9];
  const FRONT_P: [number, number, number, number] = [1.8, 0.4, 1.6, 2.3];

  const farFill   = useMemo(() => buildFillPath(farBaseY,   farAmp,   FAR_P),   [tileW, H]);
  const midFill   = useMemo(() => buildFillPath(midBaseY,   midAmp,   MID_P),   [tileW, H]);
  const nearFill  = useMemo(() => buildFillPath(nearBaseY,  nearAmp,  NEAR_P),  [tileW, H]);
  const frontFill = useMemo(() => buildFillPath(frontBaseY, frontAmp, FRONT_P), [tileW, H]);

  const midCrest   = useMemo(() => buildCrestPath(midBaseY,   midAmp,   MID_P),   [tileW, H]);
  const nearCrest  = useMemo(() => buildCrestPath(nearBaseY,  nearAmp,  NEAR_P),  [tileW, H]);
  const frontCrest = useMemo(() => buildCrestPath(frontBaseY, frontAmp, FRONT_P), [tileW, H]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {/* SKY + SUN */}
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop}/>
            <Stop offset="1" stopColor={skyBottom}/>
          </LinearGradient>
          <LinearGradient id="sunG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sunA}/>
            <Stop offset="1" stopColor={sunB}/>
          </LinearGradient>
          <LinearGradient id="hazeG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hazeColor} stopOpacity="0"/>
            <Stop offset="1" stopColor={hazeColor} stopOpacity="0.28"/>
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={W} height={H} fill="url(#skyG)" />

        {/* Sol maior e mais épico */}
        <Path
          d={`M ${W*0.70} ${H*0.22} m -${H*0.12},0 a ${H*0.12},${H*0.12} 0 1,0 ${H*0.24},0 a ${H*0.12},${H*0.12} 0 1,0 -${H*0.24},0`}
          fill="url(#sunG)"
          opacity={0.82}
        />
      </Svg>

      {/* FAR */}
      <View style={{ position:'absolute', left: farOffset, top:0 }}>
        <Svg width={tileW*2+overlap} height={H}>
          <G>
            <Path d={farFill} fill={rockFar}/>
          </G>
          <G x={tileW - overlap}>
            <Path d={farFill} fill={rockFar}/>
          </G>
        </Svg>
      </View>

      {/* MID */}
      <View style={{ position:'absolute', left: midOffset, top:0 }}>
        <Svg width={tileW*2+overlap} height={H}>
          <G>
            <Path d={midFill} fill={rockMid}/>
            <Path d={midCrest} stroke={highlight} strokeOpacity={0.22} strokeWidth={2} fill="none"/>
          </G>
          <G x={tileW - overlap}>
            <Path d={midFill} fill={rockMid}/>
            <Path d={midCrest} stroke={highlight} strokeOpacity={0.22} strokeWidth={2} fill="none"/>
          </G>
        </Svg>
      </View>

      {/* NEAR */}
      <View style={{ position:'absolute', left: nearOffset, top:0 }}>
        <Svg width={tileW*2+overlap} height={H}>
          <G>
            <Path d={nearFill} fill={rockNear}/>
            <Path d={nearCrest} stroke={highlight} strokeOpacity={0.28} strokeWidth={2.4} fill="none"/>
          </G>
          <G x={tileW - overlap}>
            <Path d={nearFill} fill={rockNear}/>
            <Path d={nearCrest} stroke={highlight} strokeOpacity={0.28} strokeWidth={2.4} fill="none"/>
          </G>
        </Svg>
      </View>

      {/* FRONT */}
      <View style={{ position:'absolute', left: frontOffset, top:0 }}>
        <Svg width={tileW*2+overlap} height={H}>
          <G>
            <Path d={frontFill} fill={rockFront}/>
            <Path d={frontCrest} stroke={highlight} strokeOpacity={0.30} strokeWidth={2.8} fill="none"/>
          </G>
          <G x={tileW - overlap}>
            <Path d={frontFill} fill={rockFront}/>
            <Path d={frontCrest} stroke={highlight} strokeOpacity={0.30} strokeWidth={2.8} fill="none"/>
          </G>
        </Svg>
      </View>

      {/* HAZE BAIXO */}
      <Svg width={W} height={H} style={{ position:'absolute' }}>
        <Rect x={0} y={H * 0.60} width={W} height={H*0.40} fill="url(#hazeG)"/>
      </Svg>
    </View>
  );
}

export default React.memo(BGDesertCanyons);
