import { addDays, differenceInCalendarDays, format } from 'date-fns';
import type { DailyStudyPlanEntry, ExamPrepItem, ExamPrepSummary, SynapseNode, SyllabusJson } from '../../shared/types';

export function buildExamPrepSummary(
  syllabus: SyllabusJson | null,
  nodes: SynapseNode[],
  enabled: boolean,
): ExamPrepSummary {
  if (!enabled || !syllabus) {
    return {
      enabled: false,
      examDate: syllabus?.examDate,
      daysRemaining: null,
      focusedNodeIds: [],
      prioritizedItems: [],
      studyPlan: [],
    };
  }

  const focusedNodes = nodes.filter((node) => node.examWeight > 20);
  const prioritizedItems = focusedNodes
    .map<ExamPrepItem>((node) => {
      const priorityScore = (1 - node.mastery.score) * 100 * node.examWeight;
      const estimatedHoursRemaining =
        (node.metadata?.estimatedHours ?? Math.max(2, Math.round(node.examWeight / 8))) *
        (1 - node.mastery.score);
      return {
        nodeId: node.id,
        title: node.title,
        examWeight: node.examWeight,
        masteryScore: node.mastery.score,
        priorityScore,
        estimatedHoursRemaining: Number(estimatedHoursRemaining.toFixed(1)),
        severity:
          node.mastery.score < 0.5 ? 'critical' : node.mastery.score < 0.75 ? 'warning' : 'ready',
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);

  const daysRemaining = syllabus.examDate
    ? Math.max(0, differenceInCalendarDays(new Date(syllabus.examDate), new Date()))
    : null;

  return {
    enabled: true,
    examDate: syllabus.examDate,
    daysRemaining,
    focusedNodeIds: focusedNodes.map((node) => node.id),
    prioritizedItems,
    studyPlan: buildStudyPlan(prioritizedItems, daysRemaining),
  };
}

function buildStudyPlan(
  prioritizedItems: ExamPrepItem[],
  daysRemaining: number | null,
): DailyStudyPlanEntry[] {
  if (!daysRemaining || prioritizedItems.length === 0) {
    return [];
  }

  const horizon = Math.max(1, Math.min(daysRemaining, 7));
  const plan: DailyStudyPlanEntry[] = [];

  for (let dayIndex = 0; dayIndex < horizon; dayIndex += 1) {
    const start = dayIndex * 2;
    const slice = prioritizedItems.slice(start, start + 3);
    if (slice.length === 0) {
      break;
    }

    const date = addDays(new Date(), dayIndex);
    plan.push({
      date: format(date, 'yyyy-MM-dd'),
      nodeIds: slice.map((item) => item.nodeId),
      topicTitles: slice.map((item) => item.title),
    });
  }

  return plan;
}
