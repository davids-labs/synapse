import { DAVID_MASTERY_COLORS } from '../shared/constants';
import type { ComputedMastery } from '../shared/types';

export function clampMastery(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function calculateSimpleMastery(
  practiceCompleted: number,
  practiceTotal: number,
  manualOverride: number | null,
): ComputedMastery {
  const safeCompleted = Math.max(0, practiceCompleted);
  const safeTotal = Math.max(0, practiceTotal);
  const calculated = safeTotal === 0 ? 0 : clampMastery(safeCompleted / safeTotal);
  const manual = manualOverride == null ? null : clampMastery(manualOverride);

  return {
    calculated,
    manual,
    final: manual ?? calculated,
    practiceCompleted: safeCompleted,
    practiceTotal: safeTotal,
  };
}

export function getMasteryStatus(score: number): 'locked' | 'active' | 'understanding' | 'practicing' | 'mastered' {
  const normalized = clampMastery(score);

  if (normalized === 0) {
    return 'locked';
  }

  if (normalized < 0.35) {
    return 'active';
  }

  if (normalized < 0.65) {
    return 'understanding';
  }

  if (normalized < 0.9) {
    return 'practicing';
  }

  return 'mastered';
}

export function getMasteryColor(score: number): string {
  const status = getMasteryStatus(score);

  switch (status) {
    case 'locked':
      return DAVID_MASTERY_COLORS.locked;
    case 'active':
      return DAVID_MASTERY_COLORS.active;
    case 'understanding':
      return DAVID_MASTERY_COLORS.understanding;
    case 'practicing':
      return DAVID_MASTERY_COLORS.practicing;
    case 'mastered':
      return DAVID_MASTERY_COLORS.mastered;
    default:
      return DAVID_MASTERY_COLORS.weak;
  }
}
