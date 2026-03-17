import { useEffect, useState } from 'react';
import type { TasksJson } from '../../../../shared/types';
import {
  addTaskToColumn,
  moveTaskToColumn,
  removeTask,
  updateTaskContent,
} from '../../../utils/kanban';

interface KanbanBoardProps {
  tasks: TasksJson;
  onSave: (tasks: TasksJson) => Promise<void>;
}

export function KanbanBoard({ tasks, onSave }: KanbanBoardProps) {
  const [draft, setDraft] = useState<TasksJson>(tasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(tasks);
  }, [tasks]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {draft.columns.map((column) => (
          <div
            key={column.id}
            className="rounded-xl border border-white/10 bg-black/25 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!draggedTaskId) {
                return;
              }
              setDraft((current) => moveTaskToColumn(current, draggedTaskId, column.id));
              setDraggedTaskId(null);
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">{column.title}</h4>
                <p className="text-xs text-slate-500">{column.tasks.length} cards</p>
              </div>
              <button
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => setDraft((current) => addTaskToColumn(current, column.id))}
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {column.tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  className={`rounded-lg border border-white/10 bg-black/35 p-3 transition ${
                    draggedTaskId === task.id ? 'opacity-50' : 'opacity-100'
                  }`}
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDragEnd={() => setDraggedTaskId(null)}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {task.completed ? 'Done' : 'Task'}
                    </span>
                    <button
                      className="text-[11px] text-red-200 hover:text-red-100"
                      onClick={() => setDraft((current) => removeTask(current, task.id))}
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    className="min-h-[88px] w-full rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white"
                    value={task.content}
                    onChange={(event) =>
                      setDraft((current) =>
                        updateTaskContent(current, task.id, event.target.value),
                      )
                    }
                  />
                  <p className="mt-2 text-[11px] text-slate-500">
                    Created {task.createdAt}
                    {task.completedAt ? ` • completed ${task.completedAt}` : ''}
                  </p>
                </div>
              ))}
              {column.tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-slate-500">
                  Drop a task here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm text-white"
          onClick={() => void onSave(draft)}
        >
          Save board
        </button>
      </div>
    </div>
  );
}
