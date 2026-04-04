import * as vscode from 'vscode';
import { TimerViewProvider } from './TimerViewProvider';
import { VIEW_TYPE, GLOBALSTATE_KEY, CMD_FOCUS_PANEL, LEETCODE_LANGUAGES } from './constants';
import type { ActiveTask, TaskRecord, WebviewMessage, LeetcodeProblem } from './types';
import { searchProblems, getProblemDetails, buildFileContent } from './leetcode';
import { searchProblems as searchNeetcodeProblems, getProblemDetails as getNeetcodeProblemDetails, buildNeetcodeFileContent } from './neetcode';

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

    case 'searchLeetcode': {
      searchProblems(msg.query)
        .then(problems => provider.sendHostMessage({ type: 'leetcodeSearchResults', problems }))
        .catch(err =>
          provider.sendHostMessage({ type: 'leetcodeError', message: String(err?.message ?? err) }),
        );
      break;
    }

    case 'searchNeetcode': {
      searchNeetcodeProblems(msg.query)
        .then(problems => provider.sendHostMessage({ type: 'neetcodeSearchResults', problems }))
        .catch(err =>
          provider.sendHostMessage({ type: 'neetcodeError', message: String(err?.message ?? err) }),
        );
      break;
    }

    case 'startTask': {
      const taskName = msg.name;
      const plannedSeconds = msg.plannedMinutes * 60;
      const problem = msg.leetcodeProblem ?? msg.neetcodeProblem;

      // Start the timer immediately
      activeTask = {
        id: generateId(),
        name: taskName,
        plannedSeconds,
        elapsedSeconds: 0,
        isPaused: false,
        source: msg.source,
        language: msg.language,
        difficulty: problem?.difficulty,
      };
      startInterval();
      statusBarItem.text = formatStatusBar(activeTask);
      statusBarItem.show();
      provider.sendSnapshot(activeTask, loadHistory());

      // For LeetCode tasks: fetch details and create file in the background
      if (msg.source === 'leetcode' && msg.leetcodeProblem && msg.language) {
        createLeetcodeFile(msg.leetcodeProblem, msg.language).catch(err => {
          console.error('[lap-code] Failed to create LeetCode file:', err);
        });
      }

      // For NeetCode tasks: same but under neetcode/ with NeetCode URL
      if (msg.source === 'neetcode' && msg.neetcodeProblem && msg.language) {
        createNeetcodeFile(msg.neetcodeProblem, msg.language).catch(err => {
          console.error('[lap-code] Failed to create NeetCode file:', err);
        });
      }
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

    case 'deleteTask': {
      const history = loadHistory().filter(t => t.id !== msg.id);
      saveHistory(history);
      provider.sendSnapshot(activeTask, history);
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
        source: activeTask.source,
        language: activeTask.language,
        difficulty: activeTask.difficulty,
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

async function createNeetcodeFile(problem: LeetcodeProblem, langSlug: string): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceRoot) { return; }

  const lang = LEETCODE_LANGUAGES.find(l => l.slug === langSlug);
  const ext = lang?.ext ?? 'js';

  const details = await getNeetcodeProblemDetails(problem.slug);
  const content = buildNeetcodeFileContent(problem, details, langSlug);

  const neetcodeDir = vscode.Uri.joinPath(workspaceRoot, 'neetcode');
  const fileUri = vscode.Uri.joinPath(neetcodeDir, `${problem.slug}.${ext}`);

  await vscode.workspace.fs.createDirectory(neetcodeDir);
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));

  const doc = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(doc, { preview: false });
}

async function createLeetcodeFile(problem: LeetcodeProblem, langSlug: string): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceRoot) { return; }

  const lang = LEETCODE_LANGUAGES.find(l => l.slug === langSlug);
  const ext = lang?.ext ?? 'js';

  const details = await getProblemDetails(problem.slug);
  const content = buildFileContent(problem, details, langSlug);

  const leetcodeDir = vscode.Uri.joinPath(workspaceRoot, 'leetcode');
  const fileUri = vscode.Uri.joinPath(leetcodeDir, `${problem.slug}.${ext}`);

  // Ensure the directory exists
  await vscode.workspace.fs.createDirectory(leetcodeDir);

  // Write the file (overwrite if it already exists)
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));

  // Open the file in the editor
  const doc = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(doc, { preview: false });
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
