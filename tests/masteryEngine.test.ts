import {
  calculateSimpleMastery,
  getMasteryColor,
  getMasteryStatus,
} from '../src/main/masteryEngine';

describe('calculateSimpleMastery', () => {
  it('returns zero when there is no practice planned', () => {
    expect(calculateSimpleMastery(0, 0, null)).toEqual({
      calculated: 0,
      manual: null,
      final: 0,
      practiceCompleted: 0,
      practiceTotal: 0,
    });
  });

  it('uses completed over total as the transparent mastery formula', () => {
    const result = calculateSimpleMastery(15, 45, null);
    expect(result.calculated).toBeCloseTo(1 / 3);
    expect(result.final).toBeCloseTo(1 / 3);
  });

  it('honors a manual override when present', () => {
    const result = calculateSimpleMastery(3, 10, 0.82);
    expect(result.calculated).toBe(0.3);
    expect(result.final).toBe(0.82);
  });

  it('maps mastery values into the refined color and status bands', () => {
    expect(getMasteryStatus(0)).toBe('locked');
    expect(getMasteryStatus(0.4)).toBe('understanding');
    expect(getMasteryStatus(0.72)).toBe('practicing');
    expect(getMasteryStatus(0.95)).toBe('mastered');
    expect(getMasteryColor(0.95)).toBe('#F59E0B');
  });
});
