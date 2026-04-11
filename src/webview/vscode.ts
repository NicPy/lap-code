import type { WebviewMessage, CompletionStatus, ActiveTask, TaskRecord, LeetcodeProblem, TaskSource } from '@shared/types';
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
    source: 'leetcode',
    language: 'javascript',
    difficulty: 'Easy',
  },
  {
    id: 'seed-2',
    name: 'Longest Substring Without Repeating Characters',
    plannedSeconds: 2700,
    elapsedSeconds: 3120,
    completedAt: Date.now() - 172800000,
    status: 'failed',
    source: 'neetcode',
    language: 'python3',
    difficulty: 'Medium',
  },
];

function simulateSnapshot(): void {
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
}

function simulateStart(
  name: string,
  plannedMinutes: number,
  source: TaskSource,
  language?: string,
  difficulty?: ActiveTask['difficulty'],
): void {
  mockTask = {
    id: 'dev-' + Date.now(),
    name,
    plannedSeconds: plannedMinutes * 60,
    elapsedSeconds: 0,
    isPaused: false,
    source,
    language,
    difficulty,
  };
  // Add history entry for the new task
  mockHistory.unshift({
    id: mockTask.id,
    name: mockTask.name,
    plannedSeconds: mockTask.plannedSeconds,
    elapsedSeconds: 0,
    completedAt: 0,
    status: 'paused',
    source: mockTask.source,
    language: mockTask.language,
    difficulty: mockTask.difficulty,
  });
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
  // Remove old entry, prepend completed version
  const idx = mockHistory.findIndex(t => t.id === mockTask!.id);
  if (idx !== -1) { mockHistory.splice(idx, 1); }
  mockHistory.unshift({
    id: mockTask.id,
    name: mockTask.name,
    plannedSeconds: mockTask.plannedSeconds,
    elapsedSeconds: mockTask.elapsedSeconds,
    completedAt: Date.now(),
    status,
    source: mockTask.source,
    language: mockTask.language,
    difficulty: mockTask.difficulty,
  });
  mockTask = null;
  applyStateSnapshot({ activeTask: null, history: [...mockHistory] });
}

function simulateShelve(): void {
  if (!mockTask) { return; }
  clearInterval(mockInterval);
  mockInterval = undefined;
  // Remove old entry, prepend updated shelved version
  const idx = mockHistory.findIndex(t => t.id === mockTask!.id);
  if (idx !== -1) { mockHistory.splice(idx, 1); }
  mockHistory.unshift({
    id: mockTask.id,
    name: mockTask.name,
    plannedSeconds: mockTask.plannedSeconds,
    elapsedSeconds: mockTask.elapsedSeconds,
    completedAt: Date.now(),
    status: 'paused',
    source: mockTask.source,
    language: mockTask.language,
    difficulty: mockTask.difficulty,
  });
  mockTask = null;
  applyStateSnapshot({ activeTask: null, history: [...mockHistory] });
}

function simulateResumeHistory(id: string): void {
  // Sync current active task's elapsed back into history
  if (mockTask) {
    clearInterval(mockInterval);
    mockInterval = undefined;
    const old = mockHistory.find(t => t.id === mockTask!.id);
    if (old) { old.elapsedSeconds = mockTask.elapsedSeconds; }
  }
  // Find the task (keep it in history at its position)
  const found = mockHistory.find(t => t.id === id);
  if (!found) { return; }
  mockTask = {
    id: found.id,
    name: found.name,
    plannedSeconds: found.plannedSeconds,
    elapsedSeconds: found.elapsedSeconds,
    isPaused: true,
    source: found.source,
    language: found.language,
    difficulty: found.difficulty,
  };
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
}

function simulateDelete(id: string): void {
  const idx = mockHistory.findIndex(t => t.id === id);
  if (idx !== -1) { mockHistory.splice(idx, 1); }
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
}

function simulateToggleFavourite(id: string): void {
  const task = mockHistory.find(t => t.id === id);
  if (task) { task.isFavourite = !task.isFavourite; }
  applyStateSnapshot({ activeTask: mockTask, history: [...mockHistory] });
}

function createMockVsCode(): VsCodeApi {
  return {
    postMessage(msg: WebviewMessage) {
      console.log('[mock-vscode] →', msg);
      switch (msg.type) {
        case 'webviewReady':
          setTimeout(simulateSnapshot, 50);
          break;
        case 'startTask': {
          const problem = msg.source === 'leetcode'
            ? msg.leetcodeProblem
            : msg.source === 'neetcode'
              ? msg.neetcodeProblem
              : undefined;
          setTimeout(() => simulateStart(
            msg.name,
            msg.plannedMinutes,
            msg.source,
            msg.language,
            problem?.difficulty,
          ), 50);
          break;
        }
        case 'pauseTask':
          simulatePause();
          break;
        case 'resumeTask':
          simulateResume();
          break;
        case 'completeTask':
          simulateComplete(msg.status);
          break;
        case 'shelveTask':
          simulateShelve();
          break;
        case 'resumeHistoryTask':
          simulateResumeHistory(msg.id);
          break;
        case 'deleteTask':
          simulateDelete(msg.id);
          break;
        case 'toggleFavourite':
          simulateToggleFavourite(msg.id);
          break;
        case 'exportTasks':
          console.log(`[mock-vscode] Export as ${msg.format} — would open save dialog`);
          break;
        case 'searchLeetcode':
          setTimeout(() => simulateLeetcodeSearch(msg.query), 300);
          break;
        case 'searchNeetcode':
          setTimeout(() => simulateNeetcodeSearch(msg.query), 300);
          break;
      }
    },
  };
}

const MOCK_PROBLEMS: LeetcodeProblem[] = [
  { slug: 'two-sum',                                  title: 'Two Sum',                                  frontendId: '1',   difficulty: 'Easy'   },
  { slug: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', frontendId: '3', difficulty: 'Medium' },
  { slug: 'median-of-two-sorted-arrays',              title: 'Median of Two Sorted Arrays',              frontendId: '4',   difficulty: 'Hard'   },
  { slug: 'reverse-linked-list',                      title: 'Reverse Linked List',                      frontendId: '206', difficulty: 'Easy'   },
  { slug: 'valid-parentheses',                        title: 'Valid Parentheses',                        frontendId: '20',  difficulty: 'Easy'   },
];

function simulateLeetcodeSearch(query: string): void {
  const q = query.toLowerCase();
  const problems = q
    ? MOCK_PROBLEMS.filter(p => p.title.toLowerCase().includes(q) || p.frontendId.includes(q))
    : MOCK_PROBLEMS;
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'leetcodeSearchResults', problems } }));
}

function simulateNeetcodeSearch(query: string): void {
  const q = query.toLowerCase();
  const problems = q
    ? MOCK_PROBLEMS.filter(p => p.title.toLowerCase().includes(q) || p.frontendId.includes(q))
    : MOCK_PROBLEMS;
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'neetcodeSearchResults', problems } }));
}

// ── Export real or mock API ───────────────────────────────────────────────────

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode: VsCodeApi =
  typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : createMockVsCode();
