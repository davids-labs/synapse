import { differenceInCalendarDays, format, subDays } from 'date-fns';
import type {
  CommitInfo,
  DecayAlert,
  NodeCategory,
  NodeWorkspace,
  SyllabusJson,
  SynapseNode,
} from '../../shared/types';

export interface AnalyticsMasteryBucket {
  id: string;
  label: string;
  count: number;
  accentClass: string;
}

export interface AnalyticsCategorySummary {
  category: NodeCategory;
  totalNodes: number;
  masteredNodes: number;
  averageMastery: number;
}

export interface AnalyticsTopicSummary {
  nodeId: string;
  title: string;
  masteryScore: number;
  examWeight: number;
  practiceCompletion: number;
  estimatedStudyHours: number;
  weakSpotCount: number;
  lastStudied?: string;
}

export interface AnalyticsActivityPoint {
  date: string;
  label: string;
  total: number;
  commits: number;
  practice: number;
  study: number;
}

export interface AnalyticsSummary {
  rangeDays: number | null;
  totalNodes: number;
  masteredNodes: number;
  averageMastery: number;
  examReadinessScore: number;
  practiceCompletionRate: number;
  totalStudySessions: number;
  weakSpotCount: number;
  decayCount: number;
  totalResources: number;
  totalMedia: number;
  totalNotesWords: number;
  masteryBuckets: AnalyticsMasteryBucket[];
  categoryBreakdown: AnalyticsCategorySummary[];
  topTopics: AnalyticsTopicSummary[];
  activity: AnalyticsActivityPoint[];
  csv: string;
  examDate?: string;
  daysToExam: number | null;
}

const ACTIVITY_WINDOW_FALLBACK = 14;

function safeDate(input?: string): Date | null {
  if (!input) {
    return null;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function buildCsv(
  nodes: SynapseNode[],
  workspaces: Record<string, NodeWorkspace>,
): string {
  const header = [
    'Node ID',
    'Title',
    'Category',
    'Mastery Score',
    'Status',
    'Exam Weight',
    'Study Sessions',
    'Practice Completed',
    'Practice Total',
    'Weak Spots',
    'Estimated Hours',
    'Last Studied',
  ];

  const rows = nodes.map((node) => {
    const workspace = workspaces[node.id];
    const values = [
      node.id,
      node.title,
      node.category,
      node.mastery.score.toFixed(2),
      node.mastery.status,
      String(node.examWeight),
      String(node.mastery.studySessions),
      String(node.mastery.practiceCompleted),
      String(node.mastery.practiceTotal),
      String(node.metadata?.weakSpots?.length ?? 0),
      String(node.metadata?.actualHours ?? node.metadata?.estimatedHours ?? 0),
      node.mastery.lastStudied ?? workspace?.nodeJson.lastStudied ?? '',
    ];

    return values
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

function buildActivityPoints(
  nodes: SynapseNode[],
  workspaces: Record<string, NodeWorkspace>,
  history: CommitInfo[],
  rangeDays: number | null,
): AnalyticsActivityPoint[] {
  const now = new Date();
  const windowDays = rangeDays ?? ACTIVITY_WINDOW_FALLBACK;
  const start = subDays(now, windowDays - 1);
  const points = new Map<string, AnalyticsActivityPoint>();

  for (let index = 0; index < windowDays; index += 1) {
    const day = subDays(now, windowDays - index - 1);
    const key = format(day, 'yyyy-MM-dd');
    points.set(key, {
      date: key,
      label: format(day, 'MMM d'),
      total: 0,
      commits: 0,
      practice: 0,
      study: 0,
    });
  }

  const increment = (value: string | undefined, field: 'commits' | 'practice' | 'study') => {
    const parsed = safeDate(value);
    if (!parsed || parsed < start) {
      return;
    }

    const key = format(parsed, 'yyyy-MM-dd');
    const point = points.get(key);
    if (!point) {
      return;
    }

    point[field] += 1;
    point.total += 1;
  };

  for (const node of nodes) {
    increment(node.mastery.lastStudied, 'study');
  }

  for (const workspace of Object.values(workspaces)) {
    for (const practice of workspace.practiceFiles) {
      increment(practice.lastAttempted, 'practice');
    }
  }

  for (const commit of history) {
    increment(commit.date, 'commits');
  }

  return Array.from(points.values());
}

export function buildAnalyticsSummary(options: {
  syllabus: SyllabusJson | null;
  nodes: SynapseNode[];
  workspaces: Record<string, NodeWorkspace>;
  decayAlerts: DecayAlert[];
  history: CommitInfo[];
  rangeDays: number | null;
}): AnalyticsSummary {
  const { syllabus, nodes, workspaces, decayAlerts, history, rangeDays } = options;

  const totalNodes = nodes.length;
  const masteredNodes = nodes.filter((node) => node.mastery.status === 'mastered').length;
  const totalMastery = nodes.reduce((sum, node) => sum + node.mastery.score, 0);
  const averageMastery = totalNodes === 0 ? 0 : totalMastery / totalNodes;
  const weightedExamScore = nodes.reduce(
    (sum, node) => sum + node.mastery.score * Math.max(node.examWeight, 1),
    0,
  );
  const totalExamWeight = nodes.reduce((sum, node) => sum + Math.max(node.examWeight, 1), 0);
  const examReadinessScore =
    totalExamWeight === 0 ? averageMastery : weightedExamScore / totalExamWeight;

  const totalPracticeCompleted = nodes.reduce(
    (sum, node) => sum + node.mastery.practiceCompleted,
    0,
  );
  const totalPractice = nodes.reduce((sum, node) => sum + node.mastery.practiceTotal, 0);
  const practiceCompletionRate =
    totalPractice === 0 ? 0 : totalPracticeCompleted / totalPractice;
  const totalStudySessions = nodes.reduce((sum, node) => sum + node.mastery.studySessions, 0);
  const weakSpotCount = nodes.reduce(
    (sum, node) => sum + (node.metadata?.weakSpots?.length ?? 0),
    0,
  );

  const totalResources = Object.values(workspaces).reduce(
    (sum, workspace) => sum + workspace.resources.length,
    0,
  );
  const totalMedia = Object.values(workspaces).reduce(
    (sum, workspace) => sum + workspace.media.length,
    0,
  );
  const totalNotesWords = Object.values(workspaces).reduce(
    (sum, workspace) => sum + countWords(workspace.notesContent),
    0,
  );

  const masteryBuckets: AnalyticsMasteryBucket[] = [
    {
      id: 'locked',
      label: 'Locked',
      count: nodes.filter((node) => node.mastery.status === 'locked').length,
      accentClass: 'bg-slate-500',
    },
    {
      id: 'active',
      label: 'Active',
      count: nodes.filter((node) => node.mastery.status === 'active').length,
      accentClass: 'bg-sky-400',
    },
    {
      id: 'practicing',
      label: 'Practicing',
      count: nodes.filter((node) => node.mastery.status === 'practicing').length,
      accentClass: 'bg-emerald-400',
    },
    {
      id: 'mastered',
      label: 'Mastered',
      count: masteredNodes,
      accentClass: 'bg-amber-300',
    },
  ];

  const categories: NodeCategory[] = ['foundation', 'core', 'advanced', 'integration'];
  const categoryBreakdown = categories
    .map((category) => {
      const categoryNodes = nodes.filter((node) => node.category === category);
      const categoryMastery = categoryNodes.reduce(
        (sum, node) => sum + node.mastery.score,
        0,
      );

      return {
        category,
        totalNodes: categoryNodes.length,
        masteredNodes: categoryNodes.filter((node) => node.mastery.status === 'mastered').length,
        averageMastery:
          categoryNodes.length === 0 ? 0 : categoryMastery / categoryNodes.length,
      };
    })
    .filter((entry) => entry.totalNodes > 0);

  const topTopics = nodes
    .map((node) => {
      const practiceCompletion =
        node.mastery.practiceTotal === 0
          ? 0
          : node.mastery.practiceCompleted / node.mastery.practiceTotal;
      const weakSpots = node.metadata?.weakSpots?.length ?? 0;
      const estimatedStudyHours =
        node.metadata?.actualHours ??
        node.metadata?.estimatedHours ??
        Math.max(1, node.examWeight / 8) + weakSpots;

      return {
        nodeId: node.id,
        title: node.title,
        masteryScore: node.mastery.score,
        examWeight: node.examWeight,
        practiceCompletion,
        estimatedStudyHours,
        weakSpotCount: weakSpots,
        lastStudied: node.mastery.lastStudied,
        priority:
          (1 - node.mastery.score) * Math.max(node.examWeight, 1) +
          weakSpots * 8 +
          (1 - practiceCompletion) * 15,
      };
    })
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 6)
    .map(({ priority: _priority, ...topic }) => topic);

  const activity = buildActivityPoints(nodes, workspaces, history, rangeDays);
  const examDate = syllabus?.examDate;
  const examDateValue = safeDate(examDate);
  const daysToExam = examDateValue ? differenceInCalendarDays(examDateValue, new Date()) : null;

  return {
    rangeDays,
    totalNodes,
    masteredNodes,
    averageMastery,
    examReadinessScore,
    practiceCompletionRate,
    totalStudySessions,
    weakSpotCount,
    decayCount: decayAlerts.length,
    totalResources,
    totalMedia,
    totalNotesWords,
    masteryBuckets,
    categoryBreakdown,
    topTopics,
    activity,
    csv: buildCsv(nodes, workspaces),
    examDate,
    daysToExam,
  };
}

export function formatAnalyticsPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
