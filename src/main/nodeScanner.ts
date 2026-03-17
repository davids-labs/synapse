import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { DEFAULT_VIEW_BLOCKS } from '../shared/constants';
import { FormulaEntrySchema, NodeJsonSchema, TasksJsonSchema } from '../shared/schemas';
import type {
  CourseData,
  FormulaEntry,
  GraphLink,
  MediaAsset,
  NodeJson,
  NodeWorkspace,
  PracticeFile,
  ResourceFile,
  SynapseNode,
  TasksJson,
  TimelineEvent,
} from '../shared/types';
import { DecayMonitor } from './decayMonitor';
import {
  fileExists,
  listFiles,
  readJsonFile,
  readTextFile,
  safeJoin,
  writeJsonFile,
} from './fileHelpers';
import { buildNodeMastery, getMasteryColor } from './masteryEngine';
import { loadSyllabus } from './syllabusLoader';

const DEFAULT_TASKS: TasksJson = {
  columns: [
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'in-progress', title: 'In Progress', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] },
  ],
};

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const PDF_EXTENSION = '.pdf';

function getDefaultNodeJson(nodeId: string): NodeJson {
  const now = new Date().toISOString();
  return {
    id: nodeId,
    status: 'locked',
    masteryScore: 0,
    createdAt: now,
    studySessions: 0,
    practiceCompleted: 0,
    practiceTotal: 0,
    viewBlocks: DEFAULT_VIEW_BLOCKS,
  };
}

async function loadNodeJson(nodePath: string, nodeId: string): Promise<NodeJson> {
  const nodeJsonPath = safeJoin(nodePath, '_node.json');
  if (await fileExists(nodeJsonPath)) {
    return readJsonFile(nodeJsonPath, NodeJsonSchema);
  }

  const fallback = getDefaultNodeJson(nodeId);
  await writeJsonFile(nodeJsonPath, fallback);
  return fallback;
}

async function loadPracticeFiles(practiceFolder: string): Promise<PracticeFile[]> {
  const files = await listFiles(practiceFolder);
  const markdownFiles = files.filter((file) => file.endsWith('.md'));

  return Promise.all(
    markdownFiles.map(async (filePath) => {
      const raw = await readTextFile(filePath);
      const parsed = matter(raw);
      const preview = parsed.content.split('\n').find(Boolean)?.slice(0, 120) ?? '';
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        title: String(parsed.data.title || path.basename(filePath, '.md')),
        completed: Boolean(parsed.data.completed),
        lastAttempted: stats.mtime.toISOString(),
        preview,
      };
    }),
  );
}

async function loadMedia(mediaFolder: string): Promise<MediaAsset[]> {
  const files = await listFiles(mediaFolder);
  return files.map((filePath) => {
    const extension = path.extname(filePath).toLowerCase();
    const type = SUPPORTED_IMAGE_EXTENSIONS.has(extension)
      ? 'image'
      : extension === PDF_EXTENSION
        ? 'pdf'
        : 'other';

    return {
      path: filePath,
      name: path.basename(filePath),
      type,
    };
  });
}

async function loadResources(resourcesFolder: string): Promise<ResourceFile[]> {
  const files = await listFiles(resourcesFolder);
  return files.map((filePath) => ({
    path: filePath,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
  }));
}

async function loadFormulas(formulasPath: string): Promise<FormulaEntry[]> {
  if (!(await fileExists(formulasPath))) {
    return [];
  }

  const formulas = await readJsonFile<FormulaEntry[]>(formulasPath);
  return formulas.map((entry) => FormulaEntrySchema.parse(entry));
}

async function loadTasks(tasksPath: string): Promise<TasksJson> {
  if (!(await fileExists(tasksPath))) {
    return DEFAULT_TASKS;
  }

  return readJsonFile(tasksPath, TasksJsonSchema);
}

async function buildTimeline(
  nodeTitle: string,
  nodeJson: NodeJson,
  practiceFiles: PracticeFile[],
  resources: ResourceFile[],
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [
    {
      id: `${nodeJson.id}-created`,
      label: `${nodeTitle} created`,
      date: nodeJson.createdAt,
      type: 'node-created',
    },
  ];

  if (nodeJson.lastStudied) {
    events.push({
      id: `${nodeJson.id}-studied`,
      label: 'Last studied session',
      date: nodeJson.lastStudied,
      type: 'studied',
    });
  }

  events.push(
    ...practiceFiles.slice(0, 5).map((file, index) => ({
      id: `${nodeJson.id}-practice-${index}`,
      label: `${file.title} ${file.completed ? 'completed' : 'attempted'}`,
      date: file.lastAttempted ?? nodeJson.createdAt,
      type: 'practice' as const,
    })),
  );

  events.push(
    ...resources.slice(0, 5).map((resource, index) => ({
      id: `${nodeJson.id}-resource-${index}`,
      label: `Resource added: ${resource.name}`,
      date: nodeJson.lastStudied ?? nodeJson.createdAt,
      type: 'resource-added' as const,
    })),
  );

  return events.sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function loadGraphLayout(coursePath: string): Promise<Record<string, { x: number; y: number }>> {
  const layoutPath = safeJoin(coursePath, '_meta', 'graph-layout.json');
  if (!(await fileExists(layoutPath))) {
    return {};
  }

  const layout = await readJsonFile<{ positions?: Record<string, { x: number; y: number }> }>(
    layoutPath,
  );
  return layout.positions ?? {};
}

export async function scanCourse(coursePath: string): Promise<CourseData> {
  const syllabus = await loadSyllabus(coursePath);
  const graphLayout = await loadGraphLayout(coursePath);
  const workspaces: Record<string, NodeWorkspace> = {};
  const nodes: SynapseNode[] = [];
  const links: GraphLink[] = [];

  for (const syllabusNode of syllabus.nodes) {
    const nodePath = safeJoin(coursePath, syllabusNode.id);
    const notesPath = safeJoin(nodePath, 'notes.md');
    const practiceFolder = safeJoin(nodePath, 'practice');
    const mediaFolder = safeJoin(nodePath, 'media');
    const resourcesFolder = safeJoin(nodePath, 'resources');
    const formulasPath = safeJoin(nodePath, 'formulas.json');
    const tasksJsonPath = safeJoin(nodePath, 'tasks.json');

    const nodeJson = await loadNodeJson(nodePath, syllabusNode.id);
    const notesContent = await readTextFile(notesPath);
    const practiceFiles = await loadPracticeFiles(practiceFolder);
    const media = await loadMedia(mediaFolder);
    const resources = await loadResources(resourcesFolder);
    const formulas = await loadFormulas(formulasPath);
    const tasks = await loadTasks(tasksJsonPath);
    const timeline = await buildTimeline(
      syllabusNode.title,
      nodeJson,
      practiceFiles,
      resources,
    );

    const practiceCompleted = practiceFiles.filter((file) => file.completed).length;
    const manualLinksCreated = nodeJson.manualLinks?.length ?? 0;
    const mastery = buildNodeMastery(nodeJson, {
      notesCreated: notesContent.trim().length > 0,
      practiceCompleted,
      practiceTotal: practiceFiles.length,
      manualLinksCreated,
      lastStudied: nodeJson.lastStudied,
    });

    nodes.push({
      id: syllabusNode.id,
      title: syllabusNode.title,
      category: syllabusNode.category,
      examWeight: syllabusNode.examWeight,
      prerequisites: syllabusNode.prerequisites,
      unlocks: syllabusNode.unlocks,
      mastery,
      position: graphLayout[syllabusNode.id],
      metadata: {
        weakSpots: nodeJson.weakSpots,
        estimatedHours: syllabusNode.estimatedHours,
      },
    });

    for (const prerequisite of syllabusNode.prerequisites) {
      links.push({
        source: prerequisite,
        target: syllabusNode.id,
        type: 'prerequisite',
        strength: 1,
      });
    }

    for (const manualLink of nodeJson.manualLinks ?? []) {
      links.push({
        source: syllabusNode.id,
        target: manualLink,
        type: 'manual',
        strength: 0.6,
      });
    }

    workspaces[syllabusNode.id] = {
      nodeId: syllabusNode.id,
      absolutePath: nodePath,
      nodeJson,
      notesPath,
      notesContent,
      practiceFolder,
      practiceFiles,
      media,
      resources,
      formulasPath,
      formulas,
      tasksJsonPath,
      tasks,
      timeline,
      viewBlocks: nodeJson.viewBlocks ?? DEFAULT_VIEW_BLOCKS,
    };
  }

  const masteryById = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    const unlocked = node.prerequisites.every((prerequisiteId) => {
      const prerequisite = masteryById.get(prerequisiteId);
      return prerequisite ? prerequisite.mastery.score > 0 : true;
    });

    if (!unlocked) {
      node.mastery = {
        ...node.mastery,
        score: 0,
        status: 'locked',
        color: getMasteryColor(0),
      };
    }
  }

  const decayAlerts = await new DecayMonitor().checkDecay(nodes);
  const graphLayoutPath = safeJoin(coursePath, '_meta', 'graph-layout.json');

  return {
    coursePath,
    syllabus,
    graph: {
      nodes,
      links,
    },
    workspaces,
    decayAlerts,
    graphLayoutPath,
  };
}

export async function summarizeCourse(coursePath: string) {
  const course = await scanCourse(coursePath);
  const totalNodes = course.graph.nodes.length;
  const masteredNodes = course.graph.nodes.filter(
    (node) => node.mastery.status === 'mastered',
  ).length;

  return {
    id: course.syllabus.mapId,
    title: course.syllabus.courseName,
    subtitle: course.syllabus.semester,
    path: coursePath,
    progress: totalNodes === 0 ? 0 : masteredNodes / totalNodes,
    masteredNodes,
    totalNodes,
  };
}
