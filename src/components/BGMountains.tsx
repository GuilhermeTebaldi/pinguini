import React from 'react';
import { StyleSheet, View } from 'react-native';
import useGameStore from '../store/useGameStore';
import BGSeaDepths from './backgrounds/BGSeaDepths';
import BGKingSnowAurora from './backgrounds/BGKingSnowAurora';
import BGDesertRidges from './backgrounds/BGDesertRidges';
import BGDesertCanyons from './backgrounds/BGDesertCanyons';
import BGUniverseNebula from './backgrounds/BGUniverseNebula';
import BGAlienPass from './backgrounds/BGAlienPass';

type StageProps = { cameraX: number };

type StageDefinition = {
  id: string;
  start: number;
  Component: React.ComponentType<StageProps>;
};

type RawStageDefinition = {
  id: string;
  Component: React.ComponentType<StageProps>;
  start?: number;
};

const TRANSITION_HALF = 140;
const TRANSITION_WINDOW = TRANSITION_HALF * 2;
const PREEMPTIVE_WINDOW = TRANSITION_HALF;

const RAW_STAGES: RawStageDefinition[] = [
  { id: 'sea', Component: BGSeaDepths, start: 0 },
  { id: 'ice', Component: BGKingSnowAurora, start: 900 }, // mundo troca em 900m
  { id: 'desert', Component: BGDesertRidges, start: 2000 }, // mundo troca em 2000m
  { id: 'canyon', Component: BGDesertCanyons, start: 3000 }, // mundo troca em 3000m
  { id: 'nebula', Component: BGUniverseNebula },
  { id: 'alien', Component: BGAlienPass },
];

const STAGES: StageDefinition[] = RAW_STAGES.reduce((acc: StageDefinition[], stage) => {
  const previous = acc[acc.length - 1];
  const start =
    typeof stage.start === 'number'
      ? stage.start
      : (previous?.start ?? 0) + 1000;
  acc.push({
    id: stage.id,
    Component: stage.Component,
    start,
  });
  return acc;
}, []);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothStep = (t: number) => t * t * (3 - 2 * t);

type StageLayerProps = {
  stage: StageDefinition;
  cameraX: number;
  opacity: number;
};

const StageLayer = ({ stage, cameraX, opacity }: StageLayerProps) => (
  <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
    <stage.Component cameraX={cameraX} />
  </View>
);

type Props = {
  cameraX?: number;
};

function BGMountains({ cameraX = 0 }: Props) {
  const distance = useGameStore((state) => state.flightDistance);
  const activeStageIndex = STAGES.reduce(
    (current, stage, index) =>
      distance + PREEMPTIVE_WINDOW >= stage.start ? index : current,
    0
  );
  const activeStage = STAGES[activeStageIndex];
  const hasPreviousStage = activeStageIndex > 0;
  const transitionStart =
    hasPreviousStage ? activeStage.start - TRANSITION_HALF : Number.NEGATIVE_INFINITY;
  const transitionEnd = activeStage.start + TRANSITION_HALF;
  const rawProgress =
    transitionStart === Number.NEGATIVE_INFINITY
      ? 1
      : clamp01((distance - transitionStart) / TRANSITION_WINDOW);
  const easedProgress =
    transitionStart === Number.NEGATIVE_INFINITY ? 1 : smoothStep(rawProgress);
  const previousStage = hasPreviousStage ? STAGES[activeStageIndex - 1] : undefined;
  const showPreviousStage = previousStage && distance < transitionEnd;

  const previousOpacity = showPreviousStage ? 1 - easedProgress : 0;
  const activeOpacity =
    transitionStart === Number.NEGATIVE_INFINITY ? 1 : easedProgress;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {showPreviousStage && previousStage && (
        <StageLayer
          key={`stage-${previousStage.id}`}
          stage={previousStage}
          cameraX={cameraX}
          opacity={previousOpacity}
        />
      )}
      <StageLayer
        key={`stage-${activeStage.id}`}
        stage={activeStage}
        cameraX={cameraX}
        opacity={activeOpacity}
      />
    </View>
  );
}

export default React.memo(BGMountains);
