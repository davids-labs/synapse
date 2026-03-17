import type { DecayAlert, SynapseNode } from '../shared/types';
import { getDaysSince } from './masteryEngine';

export class DecayMonitor {
  private readonly decayThresholds = {
    warning: 14,
    critical: 21,
    severe: 30,
  };

  async checkDecay(nodes: SynapseNode[]): Promise<DecayAlert[]> {
    const alerts: DecayAlert[] = [];

    for (const node of nodes) {
      if (!node.mastery.lastStudied) {
        continue;
      }

      const daysSince = getDaysSince(node.mastery.lastStudied);

      if (daysSince >= this.decayThresholds.severe) {
        alerts.push({
          nodeId: node.id,
          severity: 'severe',
          daysSince,
          message: `${node.title} severely decayed (${daysSince} days)`,
        });
      } else if (daysSince >= this.decayThresholds.critical) {
        alerts.push({
          nodeId: node.id,
          severity: 'critical',
          daysSince,
          message: `${node.title} critically decayed (${daysSince} days)`,
        });
      } else if (daysSince >= this.decayThresholds.warning) {
        alerts.push({
          nodeId: node.id,
          severity: 'warning',
          daysSince,
          message: `${node.title} decaying (${daysSince} days)`,
        });
      }
    }

    return alerts;
  }
}
