import * as vscode from 'vscode';
import { TimerViewProvider } from './TimerViewProvider';
import { VIEW_TYPE, GLOBALSTATE_KEY, CMD_FOCUS_PANEL } from './constants';
import type { ActiveTask, TaskRecord, WebviewMessage } from './types';

// Module-level state — single source of truth
let activeTask: ActiveTask | null = null;
let timerInterval: ReturnType<typeof setInterval> | undefined;
let statusBarItem: vscode.StatusBarItem;
let provider: TimerViewProvider;
let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext): void {
  extensionContext = context;

  // Status bar item (right side)
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = CMD_FOCUS_PANEL;
  context.subscriptions.push(statusBarItem);

  // Register the webview view provider
  provider = new TimerViewProvider(context.extensionUri, {
    getState: () => ({ activeTask, history: loadHistory() }),
    onMessage: handleWebviewMessage,
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_TYPE, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // Status bar click focuses the panel
  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_FOCUS_PANEL, () => {
      vscode.commands.executeCommand(`${VIEW_TYPE}.focus`);
    }),
  );
}

function handleWebviewMessage(msg: WebviewMessage): void {
  switch (msg.type) {
    case 'webviewReady': {
      provider.sendSnapshot(activeTask, loadHistory());
      break;
    }

    case 'startTask': {
      activeTask = {
        id: generateId(),
        name: msg.name,
        plannedSeconds: msg.plannedMinutes * 60,
        elapsedSeconds: 0,
        isPaused: false,
      };
      startInterval();
      statusBarItem.text = formatStatusBar(activeTask);
      statusBarItem.show();
      provider.sendSnapshot(activeTask, loadHistory());
      break;
    }

    case 'pauseTask': {
      if (!activeTask) { break; }
      activeTask.isPaused = true;
      clearInterval(timerInterval);
      timerInterval = undefined;
      statusBarItem.text = formatStatusBar(activeTask);
      provider.sendSnapshot(activeTask, loadHistory());
      break;
    }

    case 'resumeTask': {
      if (!activeTask) { break; }
      activeTask.isPaused = false;
      startInterval();
      provider.sendSnapshot(activeTask, loadHistory());
      break;
    }

    case 'completeTask': {
      if (!activeTask) { break; }
      clearInterval(timerInterval);
      timerInterval = undefined;

      const record: TaskRecord = {
        id: activeTask.id,
        name: activeTask.name,
        plannedSeconds: activeTask.plannedSeconds,
        elapsedSeconds: activeTask.elapsedSeconds,
        completedAt: Date.now(),
        status: msg.status,
      };

      const history = [record, ...loadHistory()];
      saveHistory(history);
      activeTask = null;
      statusBarItem.hide();
      provider.sendSnapshot(null, history);
      break;
    }
  }
}

function startInterval(): void {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!activeTask || activeTask.isPaused) { return; }
    activeTask.elapsedSeconds++;
    statusBarItem.text = formatStatusBar(activeTask);
    provider.sendTick(activeTask.elapsedSeconds, false);
  }, 1000);
}

function formatStatusBar(task: ActiveTask): string {
  const remaining = task.plannedSeconds - task.elapsedSeconds;
  const abs = Math.abs(remaining);
  const mm = Math.floor(abs / 60).toString().padStart(2, '0');
  const ss = (abs % 60).toString().padStart(2, '0');
  const timeStr = `${remaining < 0 ? '-' : ''}${mm}:${ss}`;
  const icon = task.isPaused ? '$(debug-pause)' : '$(watch)';
  return `${icon} ${task.name}: ${timeStr}`;
}

function loadHistory(): TaskRecord[] {
  return extensionContext.globalState.get<TaskRecord[]>(GLOBALSTATE_KEY, []);
}

function saveHistory(history: TaskRecord[]): void {
  extensionContext.globalState.update(GLOBALSTATE_KEY, history);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function deactivate(): void {
  clearInterval(timerInterval);
}
