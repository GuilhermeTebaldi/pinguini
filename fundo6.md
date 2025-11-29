// BGUniverseNebula.tsx — Cenário completo de Universo/Galáxia/Bureal
// -----------------------------------------------------------------------------
// Totalmente tileável, 4 camadas de parallax, nebulosas, estrelas e astros.
// Estrutura idêntica ao seu BG padrão. Seguro, independente e sem alterar lógica.

import React, { useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, RadialGradient, Circle } from 'react-native-svg';
import { theme } from '../styles/theme';

export default function BGUniverseNebula({ cameraX = 0 }: { cameraX: number }) {
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  const tileW = W;
  const overlap = 1;

  // Parallax igual aos seus cenários
  const farSpeed   = 1.2;
  const midSpeed   = 3.8;
  const nearSpeed  = 7.8;
  const frontSpeed = 12.5;

  const snap = (v: number) => Math.floor(v);
  const farOffset   = snap(-((cameraX * farSpeed)   % tileW));
  const midOffset   = snap(-((cameraX * midSpeed)   % tileW));
  const nearOffset  = snap(-((cameraX * nearSpeed)  % tileW));
  const frontOffset = snap(-((cameraX * frontSpeed) % tileW));

  // Paleta espacial
  const skyTop      = (theme as any)?.spaceSkyTop     || '#0A0222';
  const skyBottom   = (theme as any)?.spaceSkyBottom  || '#11003B';

  const nebFar      = (theme as any)?.nebFar          || '#3A0087';
  const nebMid      = (theme as any)?.nebMid          || '#7E0CE6';
  const nebNear     = (theme as any)?.nebNear         || '#C742FF';
  const nebFront    = (theme as any)?.nebFront        || '#FFB1FF';

  const nebLight    = (theme as any)?.nebLight        || '#FFD8FF';

  const hazeColor   = (theme as any)?.spaceHaze       || '#FFFFFF';

  const sunA        = (theme as any)?.starA           || '#FFE9A6';
  const sunB        = (theme as any)?.starB           || '#FF8ED9';

  const TWO_PI = Math.PI * 2;
  const steps = 100;

  // Curvas tileáveis (nebulosas)
  const ridgeY = (
    x: number,
    baseY: number,
    amp: number,
    phases: [number, number, number, number]
  ) => {
    const t = (x / tileW) * TWO_PI;
    return (
      baseY -
      amp * (
        Math.sin(t + phases[0]) * 1.3 +
        Math.sin(2 * t + phases[1]) * 0.45 +
        Math.sin(3 * t + phases[2]) * 0.22 +
        Math.sin(5 * t + phases[3]) * 0.10
      )
    );
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

  // Altura das camadas
  const farBaseY   = H * 0.30;
  const midBaseY   = H * 0.45;
  const nearBaseY  = H * 0.62;
  const frontBaseY = H * 0.78;

  const farAmp   = H * 0.20;
  const midAmp   = H * 0.18;
  const nearAmp  = H * 0.14;
  const frontAmp = H * 0.11;

  // Fases da nebulosa
  const FAR_P:   [number, number, number, number] = [0.4, 1.1, 2.8, 0.9];
  const MID_P:   [number, number, number, number] = [1.6, 0.5, 2.2, 1.4];
  const NEAR_P:  [number, number, number, number] = [0.8, 2.4, 1.3, 1.9];
  const FRONT_P: [number, number, number, number] = [1.9, 0.3, 1.7, 2.6];

  const farFill   = useMemo(() => buildFillPath(farBaseY,   farAmp,   FAR_P),   [tileW, H]);
  const midFill   = useMemo(() => buildFillPath(midBaseY,   midAmp,   MID_P),   [tileW, H]);
  const nearFill  = useMemo(() => buildFillPath(nearBaseY,  nearAmp,  NEAR_P),  [tileW, H]);
  const frontFill = useMemo(() => buildFillPath(frontBaseY, frontAmp, FRONT_P), [tileW, H]);

  const midCrest   = useMemo(() => buildCrestPath(midBaseY,   midAmp,   MID_P),   [tileW, H]);
  const nearCrest  = useMemo(() => buildCrestPath(nearBaseY,  nearAmp,  NEAR_P),  [tileW, H]);
  const frontCrest = useMemo(() => buildCrestPath(frontBaseY, frontAmp, FRONT_P), [tileW, H]);

  // -------------------- ESTRELAS FIXAS --------------------
  const starCount = 120;
  const stars = useMemo(() => {
    const s: { x: number; y: number; r: number; o: number }[] = [];
    for (let i = 0; i < starCount; i++) {
      s.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.4,
        o: Math.random() * 0.9 + 0.2
      });
    }
    return s;
  }, [W, H]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {/* SKY + ASTRO */}
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Defs>
          {/* Céu cósmico */}
          <LinearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop}/>
            <Stop offset="1" stopColor={skyBottom}/>
          </LinearGradient>

          {/* Estrela gigante (sol galáctico) */}
          <RadialGradient id="starG" cx="50%" cy="38%" r="40%">
            <Stop offset="0" stopColor={sunA} stopOpacity="1"/>
            <Stop offset="1" stopColor={sunB} stopOpacity="0"/>
          </RadialGradient>

          {/* Haze geral */}
          <LinearGradient id="hazeG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hazeColor} stopOpacity="0"/>
            <Stop offset="1" stopColor={hazeColor} stopOpacity="0.25"/>
          </LinearGradient>
        </Defs>

        {/* Fundo do Universo */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#skyG)" />

        {/* Estrela galáctica */}
        <Circle cx={W * 0.72} cy={H * 0.28} r={H * 0.22} fill="url(#starG)" opacity={0.90} />

        {/* Estrelas pequenas */}
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o}/>
        ))}
      </Svg>

      {/* FAR */}
      <View style={{ position: 'absolute', left: farOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <Path d={farFill} fill={nebFar} opacity={0.60}/>
          <G x={tileW - overlap}>
            <Path d={farFill} fill={nebFar} opacity={0.60}/>
          </G>
        </Svg>
      </View>

      {/* MID */}
      <View style={{ position: 'absolute', left: midOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={midFill} fill={nebMid} opacity={0.70}/>
            <Path d={midCrest} stroke={nebLight} strokeWidth={2} strokeOpacity={0.25} fill="none"/>
          </G>
          <G x={tileW - overlap}>
            <Path d={midFill} fill={nebMid} opacity={0.70}/>
            <Path d={midCrest} stroke={nebLight} strokeWidth={2} strokeOpacity={0.25} fill="none"/>
          </G>
        </Svg>
      </View>

      {/* NEAR */}
      <View style={{ position: 'absolute', left: nearOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={nearFill} fill={nebNear} opacity={0.80}/>
            <Path d={nearCrest} stroke={nebLight} strokeWidth={2.4} strokeOpacity={0.30} fill="none"/>
          </G>
          <G x={tileW - overlap}>
            <Path d={nearFill} fill={nebNear} opacity={0.80}/>
            <Path d={nearCrest} stroke={nebLight} strokeWidth={2.4} strokeOpacity={0.30} fill="none"/>
          </G>
        </Svg>
      </View>

      {/* FRONT */}
      <View style={{ position: 'absolute', left: frontOffset, top: 0 }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <G>
            <Path d={frontFill} fill={nebFront} opacity={0.85}/>
            <Path d={frontCrest} stroke={nebLight} strokeWidth={2.8} strokeOpacity={0.34} fill="none"/>
          </G>
          <G x={tileW - overlap}>
            <Path d={frontFill} fill={nebFront} opacity={0.85}/>
            <Path d={frontCrest} stroke={nebLight} strokeWidth={2.8} strokeOpacity={0.34} fill="none"/>
          </G>
        </Svg>
      </View>

      {/* HAZE BAIXO */}
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Rect x={0} y={H * 0.55} width={W} height={H * 0.45} fill="url(#hazeG)"/>
      </Svg>
    </View>
  );
}
