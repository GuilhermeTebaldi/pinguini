// src/game/physics.ts

// ========== Utils básicos ==========
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const metersToPx = (meters: number, ppm: number) => meters * ppm;
export const pxToMeters = (px: number, ppm: number) => px / ppm;

// ========== Conversão mundo → tela (X) ==========
/**
 * Converte X do mundo (em metros) para X de tela (px),
 * considerando a câmera (cameraX em metros), densidade (ppm) e a margem esquerda do layout.
 */
export function worldXToScreenPx(
  px_m: number,
  cameraX_m: number,
  ppm: number,
  marginLeftPx: number
): number {
  return metersToPx(px_m - cameraX_m, ppm) + marginLeftPx;
}

// ========== Parâmetros de decisão de impacto ==========
/** Ângulo de impacto mínimo (em graus) para considerar "muito vertical" e enterra a cabeça */
export const CRASH_MIN_ANGLE_DEG = 55;
/** Componente vertical mínima (m/s) para forçar crash */
export const CRASH_MIN_VY = 7.5;
/** Velocidade horizontal mínima (m/s) para permitir deslizar */
export const SLIDE_MIN_VX = 1.2;

// ========== Cálculos de impacto ==========
/** 0° = horizontal perfeita; 90° = vertical pura */
export function calcImpactAngleDeg(vx: number, vy: number): number {
  const speed = Math.hypot(vx, vy);
  if (speed <= 1e-6) return 90;
  return Math.abs(Math.atan2(vy, vx)) * 180 / Math.PI;
}

/**
 * Decide se, ao tocar no chão, o resultado é "slide" ou "crash".
 * Retorna também o ângulo para eventual telemetria.
 */
export function decideImpactOutcome(vx: number, vy: number): { outcome: 'slide' | 'crash'; angleDeg: number } {
  const angleDeg = calcImpactAngleDeg(vx, vy);
  const verticalish   = angleDeg >= CRASH_MIN_ANGLE_DEG || Math.abs(vy) >= CRASH_MIN_VY;
  const lowHorizontal = Math.abs(vx) < SLIDE_MIN_VX;

  if (verticalish || lowHorizontal) return { outcome: 'crash', angleDeg };
  return { outcome: 'slide', angleDeg };
}

// ========== Compat: salvar score sem quebrar tipos ==========
/**
 * Alguns projetos tipam saveScore(distance, power, angle, mode).
 * Para evitar erros TS (ex.: "Expected 3-4 args..."), importamos como any
 * e sempre chamamos com a assinatura longa. Se aceitar menos, a função ignora.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as ScoresAny from '../services/scores';

export function saveScoreCompat(
  distance: number,
  power: number = 0,
  angle: number = 0,
  mode: 'slide' | 'crash' = 'slide'
): void {
  try {
    const fn: any = (ScoresAny as any)?.saveScore ?? (ScoresAny as any)?.default ?? null;
    if (typeof fn === 'function') {
      fn(distance, power, angle, mode);
    }
  } catch {
    // Não deve travar o jogo se falhar ao salvar
  }
}
