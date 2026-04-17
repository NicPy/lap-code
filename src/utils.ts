import type { ActiveTask, TaskRecord } from './types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function formatStatusBar(task: ActiveTask): string {
  const remaining = task.plannedSeconds - task.elapsedSeconds;
  const abs = Math.abs(remaining);
  const mm = Math.floor(abs / 60).toString().padStart(2, '0');
  const ss = (abs % 60).toString().padStart(2, '0');
  const timeStr = `${remaining < 0 ? '-' : ''}${mm}:${ss}`;
  const icon = task.isPaused ? '$(debug-pause)' : '$(watch)';
  return `${icon} ${task.name}: ${timeStr}`;
}

/** Convert an ActiveTask to a TaskRecord. */
export function toTaskRecord(task: ActiveTask, status: TaskRecord['status']): TaskRecord {
  return {
    id: task.id,
    name: task.name,
    plannedSeconds: task.plannedSeconds,
    elapsedSeconds: task.elapsedSeconds,
    completedAt: Date.now(),
    status,
    source: task.source,
    language: task.language,
    difficulty: task.difficulty,
  };
}
