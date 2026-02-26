export type CompletionStatus = 'successfully' | 'failed';
export type TaskSource = 'manual' | 'leetcode';

export interface LeetcodeProblem {
  slug: string;
  title: string;
  frontendId: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface TaskRecord {
  id: string;
  name: string;
  plannedSeconds: number;
  elapsedSeconds: number;
  completedAt: number;
  status: CompletionStatus;
}

export interface ActiveTask {
  id: string;
  name: string;
  plannedSeconds: number;
  elapsedSeconds: number;
  isPaused: boolean;
}

// Webview → Host
export type WebviewMessage =
  | { type: 'startTask'; name: string; plannedMinutes: number; source: TaskSource; language?: string; leetcodeProblem?: LeetcodeProblem }
  | { type: 'pauseTask' }
  | { type: 'resumeTask' }
  | { type: 'completeTask'; status: CompletionStatus }
  | { type: 'webviewReady' }
  | { type: 'searchLeetcode'; query: string };

// Host → Webview
export type HostMessage =
  | { type: 'stateSnapshot'; activeTask: ActiveTask | null; history: TaskRecord[] }
  | { type: 'tick'; elapsedSeconds: number; isPaused: boolean }
  | { type: 'leetcodeSearchResults'; problems: LeetcodeProblem[] }
  | { type: 'leetcodeError'; message: string };
