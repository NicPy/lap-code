export type CompletionStatus = 'successfully' | 'failed';

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
  | { type: 'startTask'; name: string; plannedMinutes: number }
  | { type: 'pauseTask' }
  | { type: 'resumeTask' }
  | { type: 'completeTask'; status: CompletionStatus }
  | { type: 'webviewReady' };

// Host → Webview
export type HostMessage =
  | { type: 'stateSnapshot'; activeTask: ActiveTask | null; history: TaskRecord[] }
  | { type: 'tick'; elapsedSeconds: number; isPaused: boolean };
