import type { Task, TasksJson } from '../../shared/types';

function cloneTask(task: Task, destinationColumnId: string): Task {
  const completed = destinationColumnId === 'done';
  return {
    ...task,
    completed,
    completedAt: completed ? task.completedAt ?? new Date().toISOString() : undefined,
  };
}

export function moveTaskToColumn(
  board: TasksJson,
  taskId: string,
  destinationColumnId: string,
): TasksJson {
  let movedTask: Task | null = null;

  const strippedColumns = board.columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => {
      const shouldKeep = task.id !== taskId;
      if (!shouldKeep) {
        movedTask = cloneTask(task, destinationColumnId);
      }
      return shouldKeep;
    }),
  }));

  if (!movedTask) {
    return board;
  }

  return {
    columns: strippedColumns.map((column) =>
      column.id === destinationColumnId
        ? { ...column, tasks: [...column.tasks, movedTask as Task] }
        : column,
    ),
  };
}

export function updateTaskContent(
  board: TasksJson,
  taskId: string,
  content: string,
): TasksJson {
  return {
    columns: board.columns.map((column) => ({
      ...column,
      tasks: column.tasks.map((task) =>
        task.id === taskId ? { ...task, content } : task,
      ),
    })),
  };
}

export function addTaskToColumn(board: TasksJson, columnId: string): TasksJson {
  return {
    columns: board.columns.map((column) =>
      column.id === columnId
        ? {
            ...column,
            tasks: [
              ...column.tasks,
              {
                id: `task-${Date.now()}`,
                content: 'New task',
                completed: columnId === 'done',
                createdAt: new Date().toISOString(),
                completedAt: columnId === 'done' ? new Date().toISOString() : undefined,
              },
            ],
          }
        : column,
    ),
  };
}

export function removeTask(board: TasksJson, taskId: string): TasksJson {
  return {
    columns: board.columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => task.id !== taskId),
    })),
  };
}
