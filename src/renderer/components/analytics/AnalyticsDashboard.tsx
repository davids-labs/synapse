import { useEffect, useMemo, useState } from 'react';
import type {
  CommitInfo,
  DecayAlert,
  NodeWorkspace,
  SyllabusJson,
  SynapseNode,
} from '../../../shared/types';
import {
  buildAnalyticsSummary,
  formatAnalyticsPercentage,
} from '../../utils/analytics';

interface AnalyticsDashboardProps {
  syllabus: SyllabusJson | null;
  nodes: SynapseNode[];
  workspaces: Record<string, NodeWorkspace>;
  decayAlerts: DecayAlert[];
  history: CommitInfo[];
  onClose: () => void;
  onOpenNode: (nodeId: string) => void;
}

const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
] as const;

export function AnalyticsDashboard({
  syllabus,
  nodes,
  workspaces,
  decayAlerts,
  history,
  onClose,
  onOpenNode,
}: AnalyticsDashboardProps) {
  const [rangeDays, setRangeDays] = useState<number | null>(30);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const summary = useMemo(
    () =>
      buildAnalyticsSummary({
        syllabus,
        nodes,
        workspaces,
        decayAlerts,
        history,
        rangeDays,
      }),
    [decayAlerts, history, nodes, rangeDays, syllabus, workspaces],
  );

  const peakActivity = Math.max(1, ...summary.activity.map((point) => point.total));

  function handleExportCsv() {
    const blob = new Blob([summary.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${syllabus?.mapId ?? 'synapse'}-analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="absolute inset-0 z-[70] overflow-y-auto bg-black/60 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <section className="panel overflow-hidden">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-sky-300">
                  Analytics Dashboard
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  {syllabus?.courseName ?? 'SYNAPSE'} analytics
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Readiness, weak spots, study activity, and resource density in one view.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/10 bg-black/25 p-1">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      className={`rounded-full px-3 py-2 text-xs transition ${
                        option.days === rangeDays
                          ? 'bg-sky-500/20 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      onClick={() => setRangeDays(option.days)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-sky-400"
                  onClick={handleExportCsv}
                >
                  Export CSV
                </button>
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-white/30"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Exam readiness"
                value={formatAnalyticsPercentage(summary.examReadinessScore)}
                hint={
                  summary.daysToExam === null
                    ? 'No exam date set'
                    : `${summary.daysToExam} days until ${summary.examDate}`
                }
              />
              <MetricCard
                label="Average mastery"
                value={formatAnalyticsPercentage(summary.averageMastery)}
                hint={`${summary.masteredNodes}/${summary.totalNodes} nodes mastered`}
              />
              <MetricCard
                label="Practice completion"
                value={formatAnalyticsPercentage(summary.practiceCompletionRate)}
                hint={`${summary.totalStudySessions} study sessions logged`}
              />
              <MetricCard
                label="Risk signals"
                value={`${summary.weakSpotCount + summary.decayCount}`}
                hint={`${summary.weakSpotCount} weak spots, ${summary.decayCount} decay alerts`}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Study activity</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Practice, study touches, and commits across the selected window.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {rangeDays === null ? 'Last 14 visible days' : `${rangeDays} day window`}
                  </p>
                </div>

                <div className="mt-6 flex h-48 items-end gap-2">
                  {summary.activity.map((point) => (
                    <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end gap-1">
                        <div
                          className="w-full rounded-t-full bg-sky-400/70"
                          style={{ height: `${(point.study / peakActivity) * 100}%` }}
                          title={`${point.study} study updates`}
                        />
                        <div
                          className="w-full rounded-t-full bg-emerald-400/70"
                          style={{ height: `${(point.practice / peakActivity) * 100}%` }}
                          title={`${point.practice} practice touches`}
                        />
                        <div
                          className="w-full rounded-t-full bg-amber-300/70"
                          style={{ height: `${(point.commits / peakActivity) * 100}%` }}
                          title={`${point.commits} commits`}
                        />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {point.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-semibold text-white">Mastery distribution</p>
                <div className="mt-4 space-y-3">
                  {summary.masteryBuckets.map((bucket) => (
                    <div key={bucket.id}>
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span>{bucket.label}</span>
                        <span>{bucket.count}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${bucket.accentClass}`}
                          style={{
                            width: `${
                              summary.totalNodes === 0
                                ? 0
                                : (bucket.count / summary.totalNodes) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MiniMetric label="Notes words" value={summary.totalNotesWords.toLocaleString()} />
                  <MiniMetric label="Media files" value={String(summary.totalMedia)} />
                  <MiniMetric label="Resources" value={String(summary.totalResources)} />
                </div>
              </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-semibold text-white">Category performance</p>
                <div className="mt-4 space-y-4">
                  {summary.categoryBreakdown.map((category) => (
                    <div key={category.category} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm capitalize text-white">{category.category}</p>
                        <p className="text-xs text-slate-400">
                          {category.masteredNodes}/{category.totalNodes} mastered
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                          style={{ width: `${category.averageMastery * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Avg mastery {formatAnalyticsPercentage(category.averageMastery)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Priority topics</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Biggest combined gaps across mastery, practice, and exam weight.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">Jump straight into a topic</p>
                </div>
                <div className="mt-4 space-y-3">
                  {summary.topTopics.map((topic) => (
                    <button
                      key={topic.nodeId}
                      className="flex w-full items-start justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-left transition hover:border-sky-400/40 hover:bg-black/35"
                      onClick={() => onOpenNode(topic.nodeId)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{topic.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatAnalyticsPercentage(topic.masteryScore)} mastery •{' '}
                          {formatAnalyticsPercentage(topic.practiceCompletion)} practice •{' '}
                          {topic.examWeight}% exam weight
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {topic.estimatedStudyHours.toFixed(1)}h estimated effort remaining
                          {topic.lastStudied ? ` • last studied ${topic.lastStudied}` : ''}
                        </p>
                      </div>
                      <div className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                        {topic.weakSpotCount} weak spot{topic.weakSpotCount === 1 ? '' : 's'}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
