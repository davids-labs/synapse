import { COLORS } from '../../shared/constants';

export function getMasteryColor(score: number): string {
  if (score === 0) return COLORS.MASTERY.LOCKED;
  if (score <= 0.3) return COLORS.MASTERY.ACTIVATED;
  if (score <= 0.6) return COLORS.MASTERY.UNDERSTANDING;
  if (score <= 0.85) return COLORS.MASTERY.PRACTICING;
  return COLORS.MASTERY.MASTERED;
}
