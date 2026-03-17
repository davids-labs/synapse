import path from 'path';
import {
  DEFAULT_BASE_MODULES,
  DEFAULT_HOME_MODULES,
  DEFAULT_NODE_MODULES,
  DEFAULT_SETTINGS,
  DEFAULT_TAGS,
  DEFAULT_TEMPLATES,
} from '../shared/constants';
import type {
  AppSettings,
  BaseRecord,
  EntityKind,
  EntityType,
  ModuleTemplate,
  NodeRecord,
  PageLayout,
  PracticeQuestion,
  TagDefinition,
  Wormhole,
} from '../shared/types';
import { stringifyCsv } from './csvUtils';
import { ensureDir, fileExists, safeJoin, slugify, writeJsonFile, writeTextFile } from './fileHelpers';

interface StarterNode {
  title: string;
  kind: EntityKind;
  itemType: EntityType;
  tags?: string[];
  color?: string | null;
  icon?: string | null;
  examWeight?: number;
  custom?: Record<string, unknown>;
  practice?: PracticeQuestion[];
  errorLog?: Array<{
    questionId: string;
    mistake: string;
    correction: string;
    conceptGap: string;
    resolved?: boolean;
    tags?: string[];
  }>;
  files?: Array<{ relativePath: string; content: string }>;
  templateId?: string;
  children?: StarterNode[];
  prerequisites?: string[];
  softPrerequisites?: string[];
  manualLinks?: string[];
  wormholes?: Wormhole[];
}

function cloneModules(modules: PageLayout['modules'], prefix: string): PageLayout['modules'] {
  return modules.map((module) => ({
    ...module,
    id: `${prefix}-${module.id}`,
    position: { ...module.position },
    canvas: module.canvas ? { ...module.canvas } : undefined,
    config: { ...module.config },
    schema: module.schema ? { ...module.schema, columns: module.schema.columns?.map((column) => ({ ...column })) } : undefined,
  }));
}

function createPage(templateId: string | undefined, kind: EntityKind): PageLayout {
  if (templateId) {
    const template = DEFAULT_TEMPLATES.find((candidate) => candidate.id === templateId);
    if (template) {
      return {
        layout: 'freeform',
        gridColumns: 12,
        modules: cloneModules(template.modules, templateId),
        templates: [templateId],
        viewport: { x: 72, y: 56, zoom: 1 },
      };
    }
  }

  return {
    layout: 'freeform',
    gridColumns: 12,
    modules: cloneModules(kind === 'base' ? DEFAULT_BASE_MODULES : DEFAULT_NODE_MODULES, kind),
    templates: [kind === 'base' ? 'base-default' : 'study-mode'],
    viewport: { x: 72, y: 56, zoom: 1 },
  };
}

function createHomePage(): PageLayout {
  return {
    layout: 'freeform',
    gridColumns: 12,
    modules: cloneModules(DEFAULT_HOME_MODULES, 'home'),
    templates: ['home-default'],
    viewport: { x: 56, y: 48, zoom: 1 },
  };
}

interface RecordSeedOptions {
  tags?: string[];
  color?: string | null;
  icon?: string | null;
  examWeight?: number;
  custom?: Record<string, unknown>;
  prerequisites?: string[];
  softPrerequisites?: string[];
  manualLinks?: string[];
  wormholes?: Wormhole[];
  mastery?: {
    manual?: number | null;
    practiceCompleted?: number;
    practiceTotal?: number;
  };
}

function createRecord(
  id: string,
  title: string,
  kind: EntityKind,
  itemType: EntityType,
  options?: RecordSeedOptions,
): BaseRecord | NodeRecord {
  const now = new Date().toISOString();
  const base = {
    id,
    title,
    kind,
    itemType,
    created: now,
    modified: now,
    tags: options?.tags ?? [],
    color: options?.color ?? null,
    icon: options?.icon ?? null,
    examWeight: options?.examWeight ?? 0,
    prerequisites: options?.prerequisites ?? [],
    softPrerequisites: options?.softPrerequisites ?? [],
    manualLinks: options?.manualLinks ?? [],
    wormholes: options?.wormholes ?? [],
    mastery: {
      manual: options?.mastery?.manual ?? null,
      practiceCompleted: options?.mastery?.practiceCompleted ?? 0,
      practiceTotal: options?.mastery?.practiceTotal ?? 0,
    },
    custom: options?.custom ?? {},
  };

  return kind === 'base' ? { ...base, kind: 'base' } : { ...base, kind: 'node' };
}

function practiceCsvRows(questions: PracticeQuestion[]): string {
  return stringifyCsv(
    questions.map((question) => {
      const lastAttempt = question.attempts[question.attempts.length - 1];
      return {
        question_id: question.id,
        title: question.title,
        topic: question.tags[0] ?? '',
        difficulty: question.difficulty,
        type: question.type,
        source: question.source,
        tags: question.tags.join('|'),
        attempted: question.attempts.length,
        correct: question.attempts.filter((attempt) => attempt.correct).length,
        status: question.status,
        last_attempt: lastAttempt?.date ?? '',
      };
    }),
    [
      'question_id',
      'title',
      'topic',
      'difficulty',
      'type',
      'source',
      'tags',
      'attempted',
      'correct',
      'status',
      'last_attempt',
    ],
  );
}

async function writeEntityTree(parentPath: string, node: StarterNode): Promise<void> {
  const slug = slugify(node.title);
  const entityPath = safeJoin(parentPath, slug);
  const nodesPath = safeJoin(entityPath, 'nodes');
  const filesPath = safeJoin(entityPath, 'files');
  const practicePath = safeJoin(filesPath, 'practice');
  const record = createRecord(slug, node.title, node.kind, node.itemType, {
    tags: node.tags,
    color: node.color,
    icon: node.icon,
    examWeight: node.examWeight,
    custom: node.custom,
    prerequisites: node.prerequisites,
    softPrerequisites: node.softPrerequisites,
    manualLinks: node.manualLinks,
    wormholes: node.wormholes,
  });

  await ensureDir(entityPath);
  await ensureDir(nodesPath);
  await ensureDir(filesPath);

  await writeJsonFile(
    safeJoin(entityPath, node.kind === 'base' ? '_base.json' : '_node.json'),
    record,
  );
  await writeJsonFile(safeJoin(entityPath, '_page.json'), createPage(node.templateId, node.kind));

  for (const file of node.files ?? []) {
    await writeTextFile(safeJoin(entityPath, file.relativePath), file.content);
  }

  if (node.practice?.length) {
    await ensureDir(practicePath);
    await writeTextFile(safeJoin(practicePath, 'questions.csv'), practiceCsvRows(node.practice));
    const completed = node.practice.filter(
      (question) => question.status === 'correct' || question.status === 'mastered',
    ).length;

    record.mastery.practiceCompleted = completed;
    record.mastery.practiceTotal = node.practice.length;
    await writeJsonFile(
      safeJoin(entityPath, node.kind === 'base' ? '_base.json' : '_node.json'),
      record,
    );
  }

  if (node.errorLog?.length) {
    await ensureDir(practicePath);
    await writeJsonFile(
      safeJoin(practicePath, 'error-log.json'),
      node.errorLog.map((entry, index) => ({
        id: `${slug}-error-${index + 1}`,
        questionId: entry.questionId,
        date: new Date().toISOString(),
        mistake: entry.mistake,
        correction: entry.correction,
        conceptGap: entry.conceptGap,
        tags: entry.tags ?? [],
        resolved: entry.resolved ?? false,
      })),
    );
  }

  for (const child of node.children ?? []) {
    await writeEntityTree(nodesPath, child);
  }
}

function createStarterTags(): TagDefinition[] {
  return DEFAULT_TAGS;
}

function createStarterTemplates(): ModuleTemplate[] {
  return DEFAULT_TEMPLATES;
}

function todayOffset(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function starterTree(): StarterNode[] {
  const mathsToPhysicsWormhole: Wormhole = {
    id: 'wormhole-matrices-physics-engine',
    sourceEntityPath: 'bases/academics/nodes/year-1/nodes/semester-1/nodes/engineering-mathematics/nodes/matrices',
    targetEntityPath: 'bases/code-repos/nodes/python/nodes/physics-engine',
    label: 'Matrices for physics transforms',
    bidirectional: true,
    created: new Date().toISOString(),
  };

  return [
    {
      title: 'Academics',
      kind: 'base',
      itemType: 'academics',
      color: '#3B82F6',
      icon: 'GraduationCap',
      tags: ['exam'],
      custom: { tagline: 'Coursework and exam prep', deadline: todayOffset(24) },
      templateId: 'project-dashboard',
      children: [
        {
          title: 'Year 1',
          kind: 'node',
          itemType: 'module',
          tags: ['exam'],
          children: [
            {
              title: 'Semester 1',
              kind: 'node',
              itemType: 'module',
              tags: ['exam'],
              children: [
                {
                  title: 'Engineering Mathematics',
                  kind: 'node',
                  itemType: 'module',
                  tags: ['exam', 'review'],
                  examWeight: 30,
                  custom: {
                    lecturerName: 'Dr. Smith',
                    textbook: 'Advanced Engineering Mathematics',
                    examDate: todayOffset(24),
                  },
                  files: [
                    {
                      relativePath: 'files/notes.md',
                      content:
                        '# Engineering Mathematics\n\nThis node is the home for linear algebra, calculus, and application links into projects.',
                    },
                    {
                      relativePath: 'files/formulas.md',
                      content: '$$A^{-1}A = I$$\n\nMatrix inversion and transformations.',
                    },
                  ],
                  children: [
                    {
                      title: 'Matrices',
                      kind: 'node',
                      itemType: 'topic',
                      tags: ['exam', 'project'],
                      examWeight: 20,
                      custom: { focus: 'Transformations and determinants' },
                      wormholes: [mathsToPhysicsWormhole],
                      manualLinks: [
                        'bases/personal-projects/nodes/m15-twin-arm/nodes/firmware',
                      ],
                      templateId: 'study-mode',
                      files: [
                        {
                          relativePath: 'files/notes.md',
                          content:
                            '# Matrices\n\nUse this page for determinants, eigenvectors, and transformation practice.',
                        },
                      ],
                      practice: [
                        {
                          id: 'q-matrix-001',
                          title: 'Compute a 2x2 determinant',
                          type: 'calculation',
                          difficulty: 'easy',
                          source: 'Lecture 3',
                          tags: ['matrices', 'exam'],
                          attempts: [{ date: new Date().toISOString(), correct: true }],
                          status: 'correct',
                        },
                        {
                          id: 'q-matrix-002',
                          title: 'Use a matrix to rotate a point',
                          type: 'calculation',
                          difficulty: 'medium',
                          source: 'Problem Sheet 2',
                          tags: ['matrices', 'physics-engine'],
                          attempts: [{ date: new Date().toISOString(), correct: false }],
                          status: 'attempted',
                        },
                      ],
                      errorLog: [
                        {
                          questionId: 'q-matrix-002',
                          mistake: 'Mixed up sine and cosine positions in the rotation matrix.',
                          correction: 'Use the standard 2D rotation form with cosine on the diagonal.',
                          conceptGap: 'Transformation matrix structure',
                          tags: ['exam'],
                        },
                      ],
                    },
                    {
                      title: 'Differential Equations',
                      kind: 'node',
                      itemType: 'topic',
                      tags: ['exam'],
                      examWeight: 10,
                      templateId: 'study-mode',
                      files: [
                        {
                          relativePath: 'files/notes.md',
                          content:
                            '# Differential Equations\n\nPlan of attack: separable equations, integrating factors, and Laplace transforms.',
                        },
                      ],
                      practice: [
                        {
                          id: 'q-de-001',
                          title: 'Solve a first-order separable equation',
                          type: 'derivation',
                          difficulty: 'medium',
                          source: 'Tutorial',
                          tags: ['exam'],
                          attempts: [],
                          status: 'not-attempted',
                        },
                      ],
                    },
                  ],
                },
                {
                  title: 'Thermodynamics',
                  kind: 'node',
                  itemType: 'module',
                  tags: ['exam'],
                  examWeight: 35,
                  custom: { examDate: todayOffset(18) },
                  files: [
                    {
                      relativePath: 'files/notes.md',
                      content:
                        '# Thermodynamics\n\nFocus areas: Carnot cycle, entropy, and efficiency calculations.',
                    },
                  ],
                  children: [
                    {
                      title: 'Carnot Cycle',
                      kind: 'node',
                      itemType: 'topic',
                      tags: ['exam', 'urgent'],
                      examWeight: 18,
                      prerequisites: [
                        'bases/academics/nodes/year-1/nodes/semester-1/nodes/thermodynamics',
                      ],
                      templateId: 'exam-prep',
                      files: [
                        {
                          relativePath: 'files/notes.md',
                          content:
                            '# Carnot Cycle\n\nMastery is based only on completed practice questions versus total questions.',
                        },
                      ],
                      practice: [
                        {
                          id: 'q-carnot-001',
                          title: 'Calculate Carnot efficiency',
                          type: 'calculation',
                          difficulty: 'medium',
                          source: 'Lecture 5',
                          tags: ['exam', 'carnot-cycle'],
                          attempts: [
                            { date: new Date().toISOString(), correct: false },
                            { date: new Date().toISOString(), correct: true },
                          ],
                          status: 'correct',
                        },
                        {
                          id: 'q-carnot-002',
                          title: 'Explain the reversible process assumptions',
                          type: 'derivation',
                          difficulty: 'hard',
                          source: 'Past Exam 2023',
                          tags: ['exam', 'entropy'],
                          attempts: [{ date: new Date().toISOString(), correct: false }],
                          status: 'attempted',
                        },
                        {
                          id: 'q-carnot-003',
                          title: 'Derive entropy change for the cycle',
                          type: 'proof',
                          difficulty: 'hard',
                          source: 'Tutorial 7',
                          tags: ['review', 'entropy'],
                          attempts: [],
                          status: 'not-attempted',
                        },
                      ],
                      errorLog: [
                        {
                          questionId: 'q-carnot-002',
                          mistake: 'Forgot to keep temperatures in Kelvin.',
                          correction: 'Convert all temperature values before applying the efficiency formula.',
                          conceptGap: 'Units discipline',
                          tags: ['exam'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Personal Projects',
      kind: 'base',
      itemType: 'projects',
      color: '#10B981',
      icon: 'Rocket',
      tags: ['project'],
      templateId: 'project-dashboard',
      children: [
        {
          title: 'M15 Twin-Arm',
          kind: 'node',
          itemType: 'project',
          tags: ['project', 'urgent'],
          custom: { deadline: todayOffset(12) },
          files: [
            {
              relativePath: 'files/notes.md',
              content:
                '# M15 Twin-Arm\n\nHardware, firmware, testing, and applied maths live here.',
            },
          ],
          children: [
            {
              title: 'Firmware',
              kind: 'node',
              itemType: 'topic',
              tags: ['project'],
              manualLinks: [
                'bases/code-repos/nodes/python/nodes/physics-engine',
              ],
              files: [
                {
                  relativePath: 'files/notes.md',
                  content:
                    '# Firmware\n\nInverse kinematics, motion planning, and test logging.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Code Repos',
      kind: 'base',
      itemType: 'projects',
      color: '#F59E0B',
      icon: 'Code2',
      tags: ['project'],
      children: [
        {
          title: 'Python',
          kind: 'node',
          itemType: 'module',
          tags: ['project'],
          children: [
            {
              title: 'Physics Engine',
              kind: 'node',
              itemType: 'project',
              tags: ['project', 'review'],
              wormholes: [
                {
                  ...mathsToPhysicsWormhole,
                  sourceEntityPath: mathsToPhysicsWormhole.targetEntityPath,
                  targetEntityPath: mathsToPhysicsWormhole.sourceEntityPath,
                },
              ],
              files: [
                {
                  relativePath: 'files/notes.md',
                  content:
                    '# Physics Engine\n\nMatrix transforms, collisions, and integration tests.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Health',
      kind: 'base',
      itemType: 'health',
      color: '#EF4444',
      icon: 'HeartPulse',
      tags: ['review'],
      children: [
        {
          title: 'Training',
          kind: 'node',
          itemType: 'module',
          tags: ['review'],
          children: [
            {
              title: 'Week 12 Split',
              kind: 'node',
              itemType: 'topic',
              tags: ['review'],
              files: [
                {
                  relativePath: 'files/notes.md',
                  content:
                    '# Week 12 Split\n\nPush, pull, legs, rugby conditioning, and recovery notes.',
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

async function ensureRootFiles(basePath: string, settings: AppSettings): Promise<void> {
  await ensureDir(basePath);
  await ensureDir(safeJoin(basePath, 'bases'));

  if (!(await fileExists(safeJoin(basePath, '_config.json')))) {
    await writeJsonFile(safeJoin(basePath, '_config.json'), settings);
  }
  if (!(await fileExists(safeJoin(basePath, '_tags.json')))) {
    await writeJsonFile(safeJoin(basePath, '_tags.json'), createStarterTags());
  }
  if (!(await fileExists(safeJoin(basePath, '_templates.json')))) {
    await writeJsonFile(safeJoin(basePath, '_templates.json'), createStarterTemplates());
  }
  if (!(await fileExists(safeJoin(basePath, '_home.json')))) {
    await writeJsonFile(safeJoin(basePath, '_home.json'), createHomePage());
  }
}

export async function ensureSeedWorkspace(basePath: string, incomingSettings?: AppSettings): Promise<void> {
  const basesPath = safeJoin(basePath, 'bases');
  const settings = {
    ...DEFAULT_SETTINGS,
    ...incomingSettings,
    basePath,
  };

  await ensureRootFiles(basePath, settings);

  if (await fileExists(path.join(basesPath, 'academics'))) {
    return;
  }

  for (const base of starterTree()) {
    await writeEntityTree(basesPath, base);
  }
}
