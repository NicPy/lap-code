export type CompletionStatus = 'successfully' | 'failed' | 'paused';
export type TaskSource = 'manual' | 'leetcode' | 'neetcode';

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
  source: TaskSource;
  language?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  isFavourite?: boolean;
}

export interface ActiveTask {
  id: string;
  name: string;
  plannedSeconds: number;
  elapsedSeconds: number;
  isPaused: boolean;
  source: TaskSource;
  language?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

// Webview → Host
export type WebviewMessage =
  | { type: 'startTask'; name: string; plannedMinutes: number; source: TaskSource; language?: string; leetcodeProblem?: LeetcodeProblem; neetcodeProblem?: LeetcodeProblem }
  | { type: 'pauseTask' }
  | { type: 'resumeTask' }
  | { type: 'completeTask'; status: CompletionStatus }
  | { type: 'webviewReady' }
  | { type: 'searchLeetcode'; query: string }
  | { type: 'searchNeetcode'; query: string }
  | { type: 'deleteTask'; id: string }
  | { type: 'toggleFavourite'; id: string }
  | { type: 'shelveTask' }
  | { type: 'resumeHistoryTask'; id: string }
  | { type: 'restartTask' }
  | { type: 'exportTasks'; format: 'csv' | 'json' }
  | { type: 'importTasks' };

// Host → Webview
export type HostMessage =
  | { type: 'stateSnapshot'; activeTask: ActiveTask | null; history: TaskRecord[] }
  | { type: 'tick'; elapsedSeconds: number; isPaused: boolean }
  | { type: 'leetcodeSearchResults'; problems: LeetcodeProblem[] }
  | { type: 'leetcodeError'; message: string }
  | { type: 'neetcodeSearchResults'; problems: LeetcodeProblem[] }
  | { type: 'neetcodeError'; message: string };
