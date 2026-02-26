import type { WebviewMessage, CompletionStatus, ActiveTask, TaskRecord } from '@shared/types';
import { applyStateSnapshot, applyTick } from './store';

export type VsCodeApi = {
  postMessage: (msg: WebviewMessage) => void;
};

// ── Mock host (browser dev only) ─────────────────────────────────────────────

let mockTask: ActiveTask | null = null;
let mockInterval: ReturnType<typeof setInterval> | undefined;

const mockHistory: TaskRecord[] = [
  {
    id: 'seed-1',
    name: 'Two Sum',
    plannedSeconds: 1800,
    elapsedSeconds: 724,
    completedAt: Date.now() - 86400000,
    status: 'successfully',
  },
  {
    id: 'seed-2',
    name: 'Longest Substring Without Repeating Characters',
    plannedSeconds: 2700,
    elapsedSeconds: 3120,
    completedAt: Date.now() - 172800000,
    status: 'failed',
  },
];

function simulateSnapshot(): void {
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
}

function simulateStart(name: string, plannedMinutes: number): void {
  mockTask = {
    id: 'dev-' + Date.now(),
    name,
    plannedSeconds: plannedMinutes * 60,
    elapsedSeconds: 0,
    isPaused: false,
  };
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
  clearInterval(mockInterval);
  mockInterval = setInterval(() => {
    if (!mockTask || mockTask.isPaused) { return; }
    mockTask.elapsedSeconds++;
    applyTick(mockTask.elapsedSeconds, false);
  }, 1000);
}

function simulatePause(): void {
  if (!mockTask) { return; }
  mockTask = { ...mockTask, isPaused: true };
  clearInterval(mockInterval);
  mockInterval = undefined;
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
}

function simulateResume(): void {
  if (!mockTask) { return; }
  mockTask = { ...mockTask, isPaused: false };
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
  clearInterval(mockInterval);
  mockInterval = setInterval(() => {
    if (!mockTask || mockTask.isPaused) { return; }
    mockTask.elapsedSeconds++;
    applyTick(mockTask.elapsedSeconds, false);
  }, 1000);
}

function simulateComplete(status: CompletionStatus): void {
  if (!mockTask) { return; }
  clearInterval(mockInterval);
  mockInterval = undefined;
  const record: TaskRecord = {
    id: mockTask.id,
    name: mockTask.name,
    plannedSeconds: mockTask.plannedSeconds,
    elapsedSeconds: mockTask.elapsedSeconds,
    completedAt: Date.now(),
    status,
  };
  mockHistory.unshift(record);
  mockTask = null;
  applyStateSnapshot({ activeTask: null, history: [...mockHistory] });
}

function createMockVsCode(): VsCodeApi {
  return {
    postMessage(msg: WebviewMessage) {
      console.log('[mock-vscode] →', msg);
      switch (msg.type) {
        case 'webviewReady':
          setTimeout(simulateSnapshot, 50);
          break;
        case 'startTask':
          setTimeout(() => simulateStart(msg.name, msg.plannedMinutes), 50);
          break;
        case 'pauseTask':
          simulatePause();
          break;
        case 'resumeTask':
          simulateResume();
          break;
        case 'completeTask':
          simulateComplete(msg.status);
          break;
      }
    },
  };
}

// ── Export real or mock API ───────────────────────────────────────────────────

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode: VsCodeApi =
  typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : createMockVsCode();
