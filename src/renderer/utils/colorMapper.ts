import { COLORS } from '../../shared/constants';

export function getMasteryLabel(score: number): string {
  if (score === 0) return 'Locked';
  if (score <= 0.3) return 'Activated';
  if (score <= 0.6) return 'Understanding';
  if (score <= 0.85) return 'Practicing';
  return 'Mastered';
}

export function getSeverityColor(severity: 'warning' | 'critical' | 'severe'): string {
  if (severity === 'warning') return COLORS.ACCENT.WARNING;
  if (severity === 'critical') return '#FF8C00';
  return COLORS.ACCENT.ERROR;
}
