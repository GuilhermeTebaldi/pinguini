// src/components/IceGround.tsx
// ------------------------------------------------------------------------------------
// IceGround+ — chão de gelo infinito com *profundidade* (sub-gelo) e *neve real*.
// - Tiling perfeito (período = largura da tela) + 1px de overlap.
// - Sub-gelo com "caustics" (faixas móveis) que só se movem com a câmera.
// - Partículas de neve reais (overlay leve animado via RAF).
// - Bursts de neve no impacto (impact.x em PX; power 0.6–2.0).
// - Failsafes para nunca passar NaN/undefined pra SVG/View.
// ------------------------------------------------------------------------------------
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  G,
  Circle,
  ClipPath,
} from 'react-native-svg';

// API do impacto (x em pixels!)
type Impact = { key: number | string; x?: number; power?: number };

type Props = {
  cameraX?: number;
  groundHeight?: number;  // altura total do chão
  speed?: number;         // parallax do chão (px offset por px de cameraX)
  density?: number;       // densidade da neve (0.5–2)
  tileW?: number;         // período; padrão = largura da tela
  impact?: Impact;        // ponto de impacto pra "puff" de neve
  impactOffsetX?: number; // ⬅️ NOVO

};

export default function IceGround({
  cameraX = 0,
  groundHeight = 168,
  speed = 14,
  density = 1,
  tileW: tileWProp,
  impact,
  impactOffsetX = 60, // ⬅️ NOVO aonde o sprey  da neve cai
}: Props) {
  // Dimensões “congeladas” (evita flicker com re-layout)
  const dims = useWindowDimensions();
  const W = useRef(Math.max(1, dims.width)).current; // nunca 0
  const H = Math.max(1, groundHeight);

  // Periodicidade horizontal
  const tileW = Math.max(64, tileWProp ?? W); // evita tile 0
  const overlap = 1;

  // Offset com snap evita gaps subpixel
  const snap = (v: number) => Math.floor(v);
  const offset = snap(-((cameraX * speed) % tileW));

  // ---------- Curva do topo (periódica) ----------
  const TWO_PI = Math.PI * 2;
  const steps = 120;
  const baseY = Math.round(H * 0.30); // nível médio do lábio de neve
  const amp1 = Math.round(H * 0.08);
  const amp2 = Math.round(H * 0.035);

  const topY = (x: number) => {
    const t = (x / tileW) * TWO_PI;
    return baseY + amp1 * Math.sin(t + 0.5) + amp2 * Math.sin(2 * t + 1.7);
  };

  const fillPath = useMemo(() => {
    let d = `M 0 ${topY(0).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      d += ` L ${x.toFixed(2)} ${topY(x).toFixed(2)}`;
    }
    d += ` L ${tileW} ${H} L 0 ${H} Z`;
    return d;
  }, [tileW, H, baseY, amp1, amp2]);

  const crestPath = useMemo(() => {
    let d = `M 0 ${topY(0).toFixed(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * tileW;
      d += ` L ${x.toFixed(2)} ${topY(x).toFixed(2)}`;
    }
    return d;
  }, [tileW, baseY, amp1, amp2]);

  // ---------- Sub-gelo com “caustics” ----------
  // move só com a câmera (não piscando com o tempo)
  const causticPhase = (cameraX * 0.03) % (Math.PI * 2);
  const makeCaustic = (y0: number, amp: number, kx: number) => {
    let d = `M 0 ${y0}`;
    for (let i = 1; i <= 48; i++) {
      const t = i / 48;
      const x = t * tileW;
      const y =
        y0 +
        amp * Math.sin(t * TWO_PI * kx) +
        amp * 0.5 * Math.sin(t * TWO_PI * (kx * 1.9) + 1.3);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  const caustic1 = useMemo(
    () => makeCaustic(baseY + H * 0.18, H * 0.025, 1.1),
    [tileW, H, baseY]
  );
  const caustic2 = useMemo(
    () => makeCaustic(baseY + H * 0.33, H * 0.020, 1.6),
    [tileW, H, baseY]
  );
  const caustic3 = useMemo(
    () => makeCaustic(baseY + H * 0.48, H * 0.018, 2.2),
    [tileW, H, baseY]
  );

  // ---------- Rachaduras discretas ----------
  const cracks = useMemo(() => {
    const arr: { x: number; y1: number; y2: number; o: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const x = (tileW / 8) * (i + 1);
      const y1 = baseY + 12 + ((i * 29) % 16);
      const y2 = H - 10 - ((i * 41) % 24);
      arr.push({ x, y1, y2, o: 0.08 + (i % 3) * 0.06 });
    }
    return arr;
  }, [tileW, H, baseY]);

  // ========= Overlay de neve (drift) — anima só aqui =========
  const [t, setT] = useState(0); // segundos
  const raf = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    const loop = (now: number) => {
      if (t0.current == null) t0.current = now;
      setT((now - t0.current) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      t0.current = null;
    };
  }, []);

  // partículas de neve: determinísticas + deslocadas por t (vento suave)
  const SNOW_N = Math.round(36 * Math.max(0.2, Math.min(3, density)));
  const snowParticles = useMemo(() => {
    const arr: { sx: number; sy: number; r: number; w: number; vy: number; a: number }[] = [];
    for (let i = 0; i < SNOW_N; i++) {
      const rnd = (n: number) => {
        const s = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
        return s - Math.floor(s);
      };
      const sx = rnd(1) * W;                          // posição base x
      const sy = baseY - 14 - rnd(2) * (baseY * 0.9); // cai do alto do chão pra cima
      const r = 1.2 + rnd(3) * 2.4;                   // raio
      const w = 12 + rnd(4) * 24;                     // wiggle horizontal
      const vy = 18 + rnd(5) * 26;                    // queda px/s
      const a = 0.20 + rnd(6) * 0.35;                 // alpha
      arr.push({ sx, sy, r, w, vy, a });
    }
    return arr;
  }, [W, baseY, SNOW_N]);

  // ========= Bursts de impacto =========
  type Burst = { id: string | number; x: number; power: number; t0: number };
  const [bursts, setBursts] = useState<Burst[]>([]);
  const lastImpactSig = useRef<string | null>(null);

  // ====== DEPOIS ======
useEffect(() => {
  if (!impact) return;

  // "Assinatura" inclui key + offset → se offset muda, recria burst
  const sig = `${impact.key}|${impactOffsetX}`;
  if (lastImpactSig.current === sig) return; // já processado com este offset
  lastImpactSig.current = sig;

  const px = Math.round(
    Math.max(0, Math.min(W, (impact.x ?? W * 0.5) + impactOffsetX))
  );
  const power = Math.max(0.6, Math.min(2, impact.power ?? 1));

  setBursts((b) => [
    ...b.slice(-2),
    { id: sig, x: px, power, t0: Date.now() }, // id = sig para não duplicar
  ]);
}, [impact?.key, impact?.x, impact?.power, W, impactOffsetX]);



  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H }}
    >
      {/* ===== TILES ===== */}
      <Svg width={tileW * 2 + overlap} height={H} style={{ position: 'absolute', left: offset, bottom: 0 }}>
        <Defs>
          {/* Gradiente de neve */}
          <LinearGradient id="snowFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FBFEFF" />
            <Stop offset="1" stopColor="#D5EAFE" />
          </LinearGradient>

          {/* Brilho vertical sutil no topo */}
          <LinearGradient id="snowShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.07" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.00" />
          </LinearGradient>

          {/* Sub-gelo mais profundo */}
          <LinearGradient id="subIce" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9FCEF2" stopOpacity="0.20" />
            <Stop offset="1" stopColor="#3D5B86" stopOpacity="0.90" />
          </LinearGradient>

          {/* recorte abaixo do topo */}
          <ClipPath id="belowTop">
            <Path d={fillPath} />
          </ClipPath>
        </Defs>

        {/* === TILE A === */}
        <G>
          {/* preenchimento base */}
          <Rect x={0} y={0} width={tileW} height={H} fill="url(#snowFill)" />
          {/* sub-gelo com caustics (clip para baixo do topo) */}
          <G clipPath="url(#belowTop)">
            <Rect x={0} y={baseY} width={tileW} height={H - baseY} fill="url(#subIce)" />
            {/* caustics: três faixas que deslizam com cameraX (via causticPhase) */}
            <Path d={caustic1} stroke="#C7E6FF" strokeOpacity={0.20} strokeWidth={6} fill="none" transform={`translate(${(Math.sin(causticPhase) * 12).toFixed(1)},0)`} />
            <Path d={caustic2} stroke="#B2DBFF" strokeOpacity={0.18} strokeWidth={5} fill="none" transform={`translate(${(Math.sin(causticPhase + 0.8) * 14).toFixed(1)},0)`} />
            <Path d={caustic3} stroke="#A0CEFF" strokeOpacity={0.16} strokeWidth={4} fill="none" transform={`translate(${(Math.sin(causticPhase + 1.6) * 10).toFixed(1)},0)`} />
          </G>

          {/* topo orgânico */}
          <Path d={fillPath} fill="url(#snowFill)" />
          <Rect x={0} y={0} width={tileW} height={H * 0.22} fill="url(#snowShade)" />
          {/* brilho/lábio */}
          <Path d={crestPath} stroke="#FFFFFF" strokeOpacity={0.78} strokeWidth={1.6} fill="none" />
          <Path d={crestPath} stroke="#A8D8FF" strokeOpacity={0.22} strokeWidth={3} fill="none" />

          {/* rachaduras leves (verticais) */}
          <G>
            {cracks.map((c, idx) => (
              <Path key={idx} d={`M ${c.x} ${c.y1} L ${c.x} ${c.y2}`} stroke="#9AC8EB" strokeOpacity={c.o} strokeWidth={2} />
            ))}
          </G>
        </G>

        {/* === TILE B (SEAM) === */}
        <G x={tileW - overlap}>
          <Rect x={0} y={0} width={tileW} height={H} fill="url(#snowFill)" />
          <G clipPath="url(#belowTop)">
            <Rect x={0} y={baseY} width={tileW} height={H - baseY} fill="url(#subIce)" />
            <Path d={caustic1} stroke="#C7E6FF" strokeOpacity={0.20} strokeWidth={6} fill="none" transform={`translate(${(Math.sin(causticPhase) * 12).toFixed(1)},0)`} />
            <Path d={caustic2} stroke="#B2DBFF" strokeOpacity={0.18} strokeWidth={5} fill="none" transform={`translate(${(Math.sin(causticPhase + 0.8) * 14).toFixed(1)},0)`} />
            <Path d={caustic3} stroke="#A0CEFF" strokeOpacity={0.16} strokeWidth={4} fill="none" transform={`translate(${(Math.sin(causticPhase + 1.6) * 10).toFixed(1)},0)`} />
          </G>
          <Path d={fillPath} fill="url(#snowFill)" />
          <Rect x={0} y={0} width={tileW} height={H * 0.22} fill="url(#snowShade)" />
          {/* SEAM */}
          <Path d={crestPath} stroke="#FFFFFF" strokeOpacity={0.78} strokeWidth={1.6} fill="none" />
          <Path d={crestPath} stroke="#A8D8FF" strokeOpacity={0.22} strokeWidth={3} fill="none" />
          <G>
            {cracks.map((c, idx) => (
              <Path key={`b-${idx}`} d={`M ${c.x} ${c.y1} L ${c.x} ${c.y2}`} stroke="#9AC8EB" strokeOpacity={c.o} strokeWidth={2} />
            ))}
          </G>
        </G>
      </Svg>

      {/* ===== OVERLAYS: Neve real + bursts ===== */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, bottom: 0 }}>
        {/* camada 1: neve em queda (drift) */}
        <G opacity={0.95} pointerEvents="none">
          {snowParticles.map((p, i) => {
            // drift horizontal sinusoidal + queda linear
            const x = (p.sx + Math.sin(t * 0.7 + i) * p.w + W) % W;
            const y = p.sy + p.vy * t;
            // recicla verticalmente (faixa acima do topo até base)
            const span = H + baseY + 40;
            const yMod = ((y % span) + span) % span - H; // módulo seguro
            const o = Math.max(0, Math.min(1, p.a));
            return <Circle key={i} cx={x} cy={yMod} r={p.r} fill="#FFFFFF" opacity={o} />;
          })}
        </G>

        {/* bursts de impacto (se houver) */}
        {bursts.map((b) => (
  <ImpactBurst
    key={b.id}
    H={H}
    baseY={baseY}
    x={b.x + (impactOffsetX ?? 0)}
    power={b.power}
    startedAt={b.t0}
  />
))}

      </Svg>

      {/* linha sutil de contato com mundo/HUD */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 2, height: 2, backgroundColor: '#9bd0ff55' }} />
    </View>
  );
}

/** Explosão rápida de neve no impacto (autodestrói em ~0.95s) */
function ImpactBurst({
  H,
  baseY,
  x,
  power,
  startedAt,
}: {
  H: number;
  baseY: number;
  x: number;
  power: number;
  startedAt: number;
}) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const begin = nowFn();
    const loop = () => {
      const now = nowFn();
      const elapsed = (now - begin) / 1000;
      setT(elapsed);
      if (elapsed < 0.95) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [startedAt]);

  const GRAV = 880; // queda
  const N = Math.round(16 * power);
  const items: React.ReactNode[] = [];

  for (let i = 0; i < N; i++) {
    const rnd = (n: number) => {
      const s = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
    const vx = (rnd(1) * 2 - 1) * (140 + 60 * power); // leque horizontal
    const vy0 = -(260 + 120 * rnd(2) * power);        // impulso para cima
    const xt = x + vx * t;
    const yt = baseY - 3 + vy0 * t + 0.5 * GRAV * t * t;
    if (yt > H - 1) continue; // fora da área visível
    const k = Math.max(0, 1 - t / 0.95);
    const r = 1.6 + 2.6 * rnd(3) * power * k;
    const a = 0.9 * k;
    items.push(<Circle key={i} cx={xt} cy={yt} r={r} fill="#FFFFFF" opacity={a} />);
  }

  return <G pointerEvents="none">{items}</G>;
}
