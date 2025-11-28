// src/store/useGameStore.ts
import { create } from 'zustand';
import {
  // decideImpactOutcome, // evitamos dependências externas no impacto
  // worldXToScreenPx,
  saveScoreCompat,
} from '../game/physics';
import { playHeadCrash, startAmbientSound } from '../services/audio';

const RANKING_KEY = 'pinguinboom-ranking';
const MAX_RANKING_ITEMS = 5;

const loadRankingFromStorage = (): number[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RANKING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'number');
  } catch {
    return [];
  }
};

const persistRanking = (values: number[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RANKING_KEY, JSON.stringify(values));
  } catch {}
};

const initialRanking = loadRankingFromStorage()
  .sort((a, b) => b - a)
  .slice(0, MAX_RANKING_ITEMS);

export const BOOST_BLUE_START_MS = 900;
export const BOOST_BLUE_DURATION_MS = 1000;
export const BOOST_WINDOW_MS = BOOST_BLUE_START_MS + BOOST_BLUE_DURATION_MS;
const BOOST_MULTIPLIER_MAX = 1.95;
const FISH_BASE_BOOST = 0.32;
const FISH_INCREMENT = 0.15; // impulso do peixe aumenta em incrementos pequenos
const FISH_MAX_BOOST = 0.62;
const BOMB_IMPULSE = 5.6; // impulso da bomba
const BOMB_VELOCITY_BUMP = 3.4;
const BOMB_FIRST_THRESHOLD = 5; // inicio para aparecer uma bomba
const BOMB_INTERVAL = 10;
const SLIDE_PY_THRESHOLD = 0.08;
const SLIDE_VY_THRESHOLD = 0.16;

export type ImpactData = {
  key: number | string;
  // formato novo (preferido): wx em METROS
  wx?: number;
  // formato legado (opcional): xPx em pixels
  xPx?: number;
  power: number;
} | null;

export type GamePhase = 'power' | 'angle' | 'flight' | 'landed' | 'crashed';

export type GameState = {
  time: number;
  running: boolean;
  gravity: number;
  drag: number;
  angleDeg: number;
  power01: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  groundY: number;
  cameraX: number;
  cameraTargetX: number;
  cameraZoom: number;
  cameraZoomTarget: number;
  distance: number;
  hasLanded: boolean;
  phase: GamePhase;
  impact: ImpactData;
  boostWindowStart: number;
  boostUsed: boolean;
  boostBlastKey: number | null;
  boostLastIntensity: number;
  fishBoostCount: number;
  menuOpen: boolean;
  gameStarted: boolean;
  hasStartedBefore: boolean;
  ranking: number[];
  bombReady: boolean;
  bombNextThreshold: number;

  setAngle: (a: number) => void;
  setPower01: (p: number) => void;
  openMenu: () => void;
  closeMenu: () => void;
  setGameStarted: (started: boolean) => void;
  markStartedBefore: () => void;
  addRanking: (distance: number) => void;
  reset: () => void;
  launch: () => void;
  pressMain: () => void;
  applyFishImpulse: () => void;
  triggerBombImpulse: () => void;
  step: (dt: number, pixelsPerMeter: number) => void;
  setCameraTarget: (x: number) => void;
  setZoomTarget: (z: number) => void;
  snapCamera: (x?: number) => void;
  tickCamera: (dt: number) => void;
  followPenguin: (penguinX: number, screenMeters: number, marginMeters: number) => void;

  setCrashed: (payload: { x?: number; wx?: number; distance: number; power?: number }) => void;
  clearImpact: () => void;
};

const isSlidingGroundState = (state: GameState) =>
  state.phase === 'flight' &&
  state.running &&
  state.py <= SLIDE_PY_THRESHOLD &&
  Math.abs(state.vy ?? 0) <= SLIDE_VY_THRESHOLD;

const DEG2RAD = (d: number) => (d * Math.PI) / 180;

const useGameStore = create<GameState>((set, get) => ({
  time: 0,
  running: false,
  gravity: 9.8,
  drag: 0.02,
  angleDeg: 45,
  power01: 0.6,
  px: 0,
  py: 0,
  vx: 0,
  vy: 0,
  groundY: 0,
  cameraX: 0,
  cameraTargetX: 0,
  cameraZoom: 1,
  cameraZoomTarget: 1,
  distance: 0,
  hasLanded: false,
  phase: 'power',
  impact: null,
  boostWindowStart: 0,
  boostUsed: false,
  boostBlastKey: null,
  boostLastIntensity: 0,
  fishBoostCount: 0,
  bombReady: false,
  bombNextThreshold: BOMB_FIRST_THRESHOLD,
  menuOpen: true,
  gameStarted: false,
  hasStartedBefore: false,
  ranking: initialRanking,

  setAngle: (a) => set({ angleDeg: Math.max(10, Math.min(80, a)) }),
  setPower01: (p) => set({ power01: Math.max(0, Math.min(1, p)) }),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  setGameStarted: (started) => set({ gameStarted: started }),
  markStartedBefore: () => set({ hasStartedBefore: true }),
  addRanking: (distance) =>
    set((state) => {
      const next = [distance, ...state.ranking]
        .sort((a, b) => b - a)
        .slice(0, MAX_RANKING_ITEMS);
      persistRanking(next);
      return { ranking: next };
    }),

  reset: () =>
    set((state) => ({
      time: 0,
      running: false,
      px: 0,
      py: 0,
      vx: 0,
      vy: 0,
      cameraX: 0,
      cameraTargetX: 0,
      cameraZoom: 1,
      cameraZoomTarget: 1,
      distance: 0,
      hasLanded: false,
      phase: 'power',
      power01: 0,
      angleDeg: 45,
      impact: null,
      boostWindowStart: 0,
      boostUsed: false,
      boostBlastKey: null,
      boostLastIntensity: 0,
      fishBoostCount: 0,
      bombReady: false,
      bombNextThreshold: BOMB_FIRST_THRESHOLD,
      menuOpen: state.hasStartedBefore ? false : state.menuOpen,
      gameStarted: false,
      hasStartedBefore: state.hasStartedBefore,
      ranking: state.ranking,
    })),

  launch: () => {
    const { angleDeg, power01 } = get();
    const v0 = 25 * (0.35 + 0.65 * power01);
    const rad = (angleDeg * Math.PI) / 180;
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad);
    const now = Date.now();
    set({
      running: true,
      time: 0,
      vx,
      vy,
      px: 0,
      py: 0,
      cameraX: 0,
      cameraTargetX: 0,
      cameraZoom: 1,
      cameraZoomTarget: 1,
      hasLanded: false,
      distance: 0,
      phase: 'flight',
      impact: null,
      boostWindowStart: now,
      boostUsed: false,
      boostBlastKey: null,
      boostLastIntensity: 0,
      fishBoostCount: 0,
      bombReady: false,
      bombNextThreshold: BOMB_FIRST_THRESHOLD,
    });
  },

  pressMain: () => {
    void startAmbientSound();

    set((s) => {
      if (s.phase === 'power') {
        return { phase: 'angle' };
      }

      if (s.phase === 'angle') {
        const power = Math.max(0, Math.min(1, s.power01 ?? 0));
        const angle = DEG2RAD(s.angleDeg ?? 0);

        const v0 = 8 + power * 22;
        const vx = v0 * Math.cos(angle);
        const vy = v0 * Math.sin(angle);
        const now = Date.now();

        return {
          phase: 'flight',
          running: true,
          vx,
          vy,
          boostWindowStart: now,
          boostUsed: false,
          boostBlastKey: null,
          boostLastIntensity: 0,
          fishBoostCount: 0,
          bombReady: false,
          bombNextThreshold: BOMB_FIRST_THRESHOLD,
        };
      }

      if (s.phase === 'flight' && !s.boostUsed) {
        const now = Date.now();
        const windowStart = s.boostWindowStart > 0 ? s.boostWindowStart : now;
        const elapsed = Math.max(0, now - windowStart);
        const blueStart = BOOST_BLUE_START_MS;
        const blueEnd = BOOST_BLUE_START_MS + BOOST_BLUE_DURATION_MS;
        if (elapsed < blueStart || elapsed > blueEnd) {
          return {
            boostUsed: true,
          };
        }
        const progress = (elapsed - blueStart) / BOOST_BLUE_DURATION_MS;
        const intensity = Math.max(0, 1 - progress);
        const randomness = 0.85 + Math.random() * 0.3;
        const scale = 1 + intensity * (BOOST_MULTIPLIER_MAX - 1) * randomness;

        return {
          vx: s.vx * scale,
          vy: s.vy * scale,
          boostUsed: true,
          boostBlastKey: now,
          boostLastIntensity: intensity,
        };
      }

      return {};
    });
  },

  applyFishImpulse: () => {
    set((state) => {
      if (!isSlidingGroundState(state)) return {};
      const nextCount = state.fishBoostCount + 1;
      const bonus = Math.min(nextCount * FISH_INCREMENT, FISH_MAX_BOOST - FISH_BASE_BOOST);
      const boost = Math.min(FISH_MAX_BOOST, FISH_BASE_BOOST + bonus);
      const nextPx = state.px + boost;
      const nextDistance = Math.max(state.distance, nextPx);
      const ready = state.bombReady || nextCount >= state.bombNextThreshold;
      return {
        // impulso do peixe
        px: nextPx,
        distance: nextDistance,
        cameraTargetX: state.cameraTargetX + boost,
        cameraX: state.cameraX + boost,
        fishBoostCount: nextCount,
        bombReady: ready,
      };
    });
  },

  triggerBombImpulse: () => {
    set((state) => {
      if (!state.bombReady) return {};
      if (!isSlidingGroundState(state)) return {};
      const nextPx = state.px + BOMB_IMPULSE;
      const nextDistance = Math.max(state.distance, nextPx);
      const boostedVx = Math.max(
        state.vx + BOMB_VELOCITY_BUMP,
        Math.max(1.5, state.vx * 1.25)
      );
      return {
        // impulso da bomba
        px: nextPx,
        vx: boostedVx,
        vy: 0,
        distance: nextDistance,
        cameraTargetX: state.cameraTargetX + BOMB_IMPULSE,
        cameraX: state.cameraX + BOMB_IMPULSE,
        bombReady: false,
        bombNextThreshold: state.bombNextThreshold + BOMB_INTERVAL,
      };
    });
  },

  step: (dt) => {
    const { running, gravity, drag, px, py, vx, vy, hasLanded, angleDeg } = get();
    if (!running || hasLanded) return;

    // integração simples
    let nx = px + vx * dt;
    let ny = py + vy * dt;
    let nvx = vx * (1 - drag * dt);
    let nvy = vy - gravity * dt;

    // ======== IMPACTO COM O CHÃO ========
    if (ny <= 0) {
      ny = 0;

      // Métricas do impacto
      const impactSpeed = Math.hypot(nvx, nvy); // módulo
      // "Verticalidade" do impacto: 0° = 100% horizontal; 90° = 100% vertical
      const verticalityDeg = Math.abs(Math.atan2(Math.abs(nvy), Math.abs(nvx))) * 180 / Math.PI;

      // Thresholds ajustáveis (realistas)
      const LAUNCH_HIGH_MIN = 65;   // ângulo de lançamento considerado "muito alto"
      const VERT_CRASH_HARD = 48;   // verticalidade para crash forte
      const VERT_CRASH_SOFT = 36;   // verticalidade suficiente com muita velocidade
      const SPEED_HARD = 10.5;      // impacto forte
      const SPEED_SOFT = 12.5;      // muito forte, tolera menor verticalidade
      const HORIZ_MIN = 1.0;        // quase sem horizontal (quase "em pé")
      const VY_GRACE = 2.0;         // velocidade vertical pequena vira deslize

      // REGRAS:
      // 1) Lançou muito alto + chegou bastante vertical e com impacto razoável
      const condHighLaunch = (angleDeg ?? 0) >= LAUNCH_HIGH_MIN && verticalityDeg >= 34 && impactSpeed > 6.5;

      // 2) Muito vertical + forte
      const condHardVertical = verticalityDeg >= VERT_CRASH_HARD && impactSpeed >= SPEED_HARD;

      // 3) Velocidade MUITO forte + verticalidade moderada
      const condSoftVertical = impactSpeed >= SPEED_SOFT && verticalityDeg >= VERT_CRASH_SOFT;

      // 4) Quase sem horizontal e ainda assim com impacto razoável (cai de "cabeça")
      const condLowHoriz = Math.abs(nvx) < HORIZ_MIN && impactSpeed > 6.0;

      // 5) Se a queda vertical estiver "leve", favorecer deslizar
      const favorSlide = Math.abs(nvy) < VY_GRACE && impactSpeed < SPEED_SOFT;

      const headFirst = !favorSlide && (condHighLaunch || condHardVertical || condSoftVertical || condLowHoriz);

      if (headFirst) {
        const distance = Math.max(0, nx);
        const power = Math.max(0.6, Math.min(1.6, impactSpeed / 8));

        void playHeadCrash();

        get().setCrashed({ wx: distance, distance, power });
        get().addRanking(distance);

        try {
          // @ts-ignore
          saveScoreCompat?.(Math.round(distance));
        } catch {}

        return; // encerra step neste frame
      }

      // ======== DESLIZAR (como antes) ========
      const friction = 2 * dt;
      const dir = nvx >= 0 ? 1 : -1;
      const slip = Math.max(0, Math.abs(nvx) - friction);
      nvx = slip * dir;
      nvy = 0;

      // Parou de fato?
      if (Math.abs(nvx) < 0.2) {
        const distance = Math.max(0, nx);
        set({
          running: false,
          hasLanded: true,
          distance,
          phase: 'landed',
          vx: 0,
          vy: 0,
        });

        try {
          // @ts-ignore
          saveScoreCompat?.(Math.round(distance));
        } catch {}

        get().addRanking(distance);

        return;
      }
    }

    set({
      px: nx,
      py: ny,
      vx: nvx,
      vy: nvy,
      time: get().time + dt,
    });
  },

  setCameraTarget: (x) => set(() => ({ cameraTargetX: x })),

  setZoomTarget: (z) => set(() => ({ cameraZoomTarget: Math.max(0.9, Math.min(1.2, z)) })),

  snapCamera: (x) =>
    set((s) => ({
      cameraX: x ?? s.cameraTargetX,
      cameraZoom: s.cameraZoomTarget,
    })),

  tickCamera: (dt) =>
    set((s) => {
      const followSpeed = 4;
      const zoomSpeed = 2;
      const k1 = 1 - Math.exp(-followSpeed * dt);
      const k2 = 1 - Math.exp(-zoomSpeed * dt);
      const cameraX = s.cameraX + (s.cameraTargetX - s.cameraX) * k1;
      const cameraZoom = s.cameraZoom + (s.cameraZoomTarget - s.cameraZoom) * k2;
      return { cameraX, cameraZoom };
    }),

  followPenguin: (penguinX, screenMeters, marginMeters) =>
    set(() => ({
      cameraTargetX: Math.max(0, penguinX - screenMeters * 0.5 + marginMeters),
    })),

  setCrashed: ({ x, wx, distance, power = 1 }) =>
    set(() => {
      const key = Date.now();
      const impact: ImpactData = {
        key,
        wx: typeof wx === 'number' ? wx : (typeof x === 'number' ? x : distance),
        power,
      };

      return {
        phase: 'crashed',
        running: false,
        hasLanded: true,
        distance,
        impact,
        vx: 0,
        vy: 0,
        boostWindowStart: 0,
        boostUsed: true,
        boostBlastKey: null,
        boostLastIntensity: 0,
      };
    }),

  clearImpact: () => set({ impact: null }),
}));

export default useGameStore;
