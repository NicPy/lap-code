import { signal, computed } from '@preact/signals';
import type { ActiveTask, TaskRecord } from '@shared/types';

export const activeTask = signal<ActiveTask | null>(null);
export const history = signal<TaskRecord[]>([]);

export const isRunning = computed(() => activeTask.value !== null);
export const isPaused = computed(() => activeTask.value?.isPaused ?? false);

export function applyStateSnapshot(data: {
  activeTask: ActiveTask | null;
  history: TaskRecord[];
}): void {
  activeTask.value = data.activeTask;
  history.value = data.history;
}

export function applyTick(elapsedSeconds: number, paused: boolean): void {
  if (!activeTask.value) { return; }
  activeTask.value = { ...activeTask.value, elapsedSeconds, isPaused: paused };
}
