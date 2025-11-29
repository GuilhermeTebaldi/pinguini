// BGAlienPass.tsx — Fundo espacial com nave alienígena passando ao fundo
// ---------------------------------------------------------------------------
// Parallax completo, tileável, nave animada cruzando o céu, nebulosa suave.
// Compatível com qualquer GameScreen. Nenhuma lógica alterada.

import React, { useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
  Ellipse,
} from 'react-native-svg';

function BGAlienPass({ cameraX = 0 }: { cameraX: number }) {
  const dims = useWindowDimensions();
  const W = useRef(dims.width).current;
  const H = useRef(dims.height).current;

  const tileW = W;
  const overlap = 1;

  // -------------------------------------------------------------
  // ANIMAÇÃO GLOBAL
  // -------------------------------------------------------------
  const t = cameraX * 0.004;
  const wave = Math.sin(t * 1.2) * 8;

  // Nave alienígena cruzando o céu baseado no cameraX
  const ufoX = (W * 1.2 - (cameraX * 0.9) % (W * 1.8));
  const ufoY = H * 0.22 + Math.sin(t * 3) * 12;

  // Parallax
  const farSpeed = 1.2;
  const midSpeed = 4.0;
  const nearSpeed = 8.2;
  const frontSpeed = 14.3;

  const snap = (v: number) => Math.floor(v);

  const farOffset = snap(-((cameraX * farSpeed) % tileW));
  const midOffset = snap(-((cameraX * midSpeed) % tileW));
  const nearOffset = snap(-((cameraX * nearSpeed) % tileW));
  const frontOffset = snap(-((cameraX * frontSpeed) % tileW));

  // -------------------------------------------------------------
  // CURVAS TILEÁVEIS PARA CAMADAS
  // -------------------------------------------------------------
  const TWO_PI = Math.PI * 2;
  const steps = 100;

  const ridgeY = (
    x: number,
    baseY: number,
    amp: number,
    p: [number, number, number, number]
  ) => {
    const xx = x + wave;
    const tt = (xx / tileW) * TWO_PI;

    return (
      baseY -
      amp *
        (Math.sin(tt + p[0]) * 1.3 +
          Math.sin(2 * tt + p[1]) * 0.45 +
          Math.sin(3 * tt + p[2]) * 0.18 +
          Math.sin(5 * tt + p[3]) * 0.08)
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

  // Alturas
  const farBaseY = H * 0.33;
  const midBaseY = H * 0.48;
  const nearBaseY = H * 0.63;
  const frontBaseY = H * 0.80;

  const farAmp = H * 0.15;
  const midAmp = H * 0.14;
  const nearAmp = H * 0.12;
  const frontAmp = H * 0.10;

  // Fases das ondas
  const FAR_P: [number, number, number, number] = [0.8, 1.9, 2.4, 0.7];
  const MID_P: [number, number, number, number] = [1.5, 0.3, 2.2, 1.8];
  const NEAR_P: [number, number, number, number] = [0.6, 2.4, 1.5, 1.0];
  const FRONT_P: [number, number, number, number] = [1.8, 0.4, 1.2, 2.3];

  const farFill = useMemo(() => buildFillPath(farBaseY, farAmp, FAR_P), [tileW, H, t]);
  const midFill = useMemo(() => buildFillPath(midBaseY, midAmp, MID_P), [tileW, H, t]);
  const nearFill = useMemo(() => buildFillPath(nearBaseY, nearAmp, NEAR_P), [tileW, H, t]);
  const frontFill = useMemo(() => buildFillPath(frontBaseY, frontAmp, FRONT_P), [tileW, H, t]);

  const midCrest = buildCrestPath(midBaseY, midAmp, MID_P);
  const nearCrest = buildCrestPath(nearBaseY, nearAmp, NEAR_P);
  const frontCrest = buildCrestPath(frontBaseY, frontAmp, FRONT_P);

  // -------------------------------------------------------------
  // ESTRELAS
  // -------------------------------------------------------------
  const starCount = 160;
  const stars = useMemo(() => {
    const arr: { x: number; y: number; r: number; n: number }[] = [];
    for (let i = 0; i < starCount; i++) {
      arr.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.4,
        n: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [W, H]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {/* SKY + UFO */}
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="skyBG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0A0013" />
            <Stop offset="1" stopColor="#140028" />
          </LinearGradient>

          {/* Glow da nave */}
          <RadialGradient id="ufoGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#00FFCC" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#00FFCC" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect width={W} height={H} fill="url(#skyBG)" />

        {/* Estrelas com twinkle */}
        {stars.map((s, i) => (
          <Circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#fff"
            opacity={0.3 + Math.sin(t * 3 + s.n) * 0.5}
          />
        ))}

        {/* Nave alienígena passando */}
        <G opacity={0.85} x={ufoX} y={ufoY}>
          {/* Luz */}
          <Circle cx={0} cy={0} r={26} fill="url(#ufoGlow)" opacity={0.6} />

          {/* Corpo da nave */}
          <Ellipse cx={0} cy={0} rx={32} ry={12} fill="#00FFC9" opacity={0.8} />

          {/* Cúpula */}
          <Ellipse cx={0} cy={-8} rx={14} ry={8} fill="#FF72E6" opacity={0.9} />

          {/* Luzes */}
          <Circle cx={-14} cy={4} r={3} fill="#FF4AE0" />
          <Circle cx={0} cy={4} r={3} fill="#FF4AE0" />
          <Circle cx={14} cy={4} r={3} fill="#FF4AE0" />
        </G>
      </Svg>

      {/* FAR */}
      <View style={{ position: 'absolute', left: farOffset }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <Path d={farFill} fill="#3B0077" opacity={0.6} />
          <G x={tileW - overlap}>
            <Path d={farFill} fill="#3B0077" opacity={0.6} />
          </G>
        </Svg>
      </View>

      {/* MID */}
      <View style={{ position: 'absolute', left: midOffset }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <Path d={midFill} fill="#6A00D4" opacity={0.7} />
          <Path d={midCrest} stroke="#FF4AE0" strokeWidth={2} strokeOpacity={0.25} fill="none" />
          <G x={tileW - overlap}>
            <Path d={midFill} fill="#6A00D4" opacity={0.7} />
            <Path d={midCrest} stroke="#FF4AE0" strokeWidth={2} strokeOpacity={0.25} fill="none" />
          </G>
        </Svg>
      </View>

      {/* NEAR */}
      <View style={{ position: 'absolute', left: nearOffset }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <Path d={nearFill} fill="#00FFC9" opacity={0.8} />
          <Path d={nearCrest} stroke="#FFFFFF" strokeWidth={2.4} strokeOpacity={0.35} fill="none" />
          <G x={tileW - overlap}>
            <Path d={nearFill} fill="#00FFC9" opacity={0.8} />
            <Path d={nearCrest} stroke="#FFFFFF" strokeWidth={2.4} strokeOpacity={0.35} fill="none" />
          </G>
        </Svg>
      </View>

      {/* FRONT */}
      <View style={{ position: 'absolute', left: frontOffset }}>
        <Svg width={tileW * 2 + overlap} height={H}>
          <Path d={frontFill} fill="#FFE6FF" opacity={0.85} />
          <Path d={frontCrest} stroke="#FFFFFF" strokeWidth={3} strokeOpacity={0.38} fill="none" />
          <G x={tileW - overlap}>
            <Path d={frontFill} fill="#FFE6FF" opacity={0.85} />
            <Path d={frontCrest} stroke="#FFFFFF" strokeWidth={3} strokeOpacity={0.38} fill="none" />
          </G>
        </Svg>
      </View>
    </View>
  );
}

export default React.memo(BGAlienPass);
