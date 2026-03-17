import { getMasteryColor } from '../../utils/masteryCalculator';
import { useGraphStore } from '../../store/graphStore';
import { useUIStore } from '../../store/uiStore';
import { RelatedTopicsSidebar } from './RelatedTopicsSidebar';
import { TopicHeader } from './TopicHeader';
import { ViewBlockContainer } from './ViewBlockContainer';

interface TopicCenterProps {
  nodeId: string;
  coursePath: string;
  onClose: () => void;
}

export function TopicCenter({ nodeId, coursePath, onClose }: TopicCenterProps) {
  const nodes = useGraphStore((state) => state.nodes);
  const workspaces = useGraphStore((state) => state.workspaces);
  const updateNodeJson = useGraphStore((state) => state.updateNodeJson);
  const updateNodeMastery = useGraphStore((state) => state.updateNodeMastery);
  const updateWorkspace = useGraphStore((state) => state.updateWorkspace);
  const selectNode = useGraphStore((state) => state.selectNode);
  const openTopicCenter = useUIStore((state) => state.openTopicCenter);

  const node = nodes.find((item) => item.id === nodeId);
  const workspace = workspaces[nodeId];

  if (!node || !workspace) {
    return (
      <div className="panel flex h-full items-center justify-center">
        <p className="text-sm text-slate-300">Topic data not found.</p>
      </div>
    );
  }

  async function persistNodeJson(updater: (nodeJson: typeof workspace.nodeJson) => typeof workspace.nodeJson) {
    const nextNodeJson = updater(workspace.nodeJson);
    updateNodeJson(nodeId, () => nextNodeJson);
    await window.synapse.saveNodeJson(coursePath, nodeId, nextNodeJson);
  }

  async function handleMasteryChange(newScore: number) {
    await persistNodeJson((nodeJson) => ({
      ...nodeJson,
      manualMasteryOverride: newScore,
      masteryScore: newScore,
    }));

    updateNodeMastery(nodeId, {
      score: newScore,
      color: getMasteryColor(newScore),
      status:
        newScore === 0
          ? 'locked'
          : newScore <= 0.6
            ? 'active'
            : newScore <= 0.85
              ? 'practicing'
              : 'mastered',
    });
  }

  async function handleMarkWeakSpot() {
    const weakSpots = workspace.nodeJson.weakSpots ?? [];
    const nextWeakSpots = weakSpots.includes('manual-flag')
      ? weakSpots.filter((item) => item !== 'manual-flag')
      : [...weakSpots, 'manual-flag'];

    await persistNodeJson((nodeJson) => ({
      ...nodeJson,
      weakSpots: nextWeakSpots,
    }));
  }

  async function handleNotesSave(content: string) {
    updateWorkspace(nodeId, (current) => ({ ...current, notesContent: content }));
    await window.synapse.saveNotes(coursePath, nodeId, content);
  }

  async function handleTasksSave(tasks: typeof workspace.tasks) {
    updateWorkspace(nodeId, (current) => ({ ...current, tasks }));
    await window.synapse.saveTasks(coursePath, nodeId, tasks);
  }

  async function handleFormulasSave(formulas: typeof workspace.formulas) {
    updateWorkspace(nodeId, (current) => ({ ...current, formulas }));
    await window.synapse.saveFormulas(coursePath, nodeId, formulas);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <button className="text-sm text-slate-300 hover:text-white" onClick={onClose}>
          Back to Graph
        </button>
      </div>

      <TopicHeader
        node={node}
        workspace={workspace}
        onMasteryChange={(newScore) => void handleMasteryChange(newScore)}
        onMarkWeakSpot={() => void handleMarkWeakSpot()}
      />

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
          <ViewBlockContainer
            node={node}
            workspace={workspace}
            onNotesSave={handleNotesSave}
            onTasksSave={handleTasksSave}
            onFormulasSave={handleFormulasSave}
            onNodeJsonSave={persistNodeJson}
          />
        </div>

        <RelatedTopicsSidebar
          node={node}
          nodes={nodes}
          onOpenNode={(nextNodeId) => {
            selectNode(nextNodeId);
            openTopicCenter(nextNodeId);
          }}
        />
      </div>
    </div>
  );
}
