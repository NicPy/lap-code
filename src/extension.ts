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

      // Add a history entry so the task appears in the list
      const newRecord: TaskRecord = {
        id: activeTask.id,
        name: activeTask.name,
        plannedSeconds: activeTask.plannedSeconds,
        elapsedSeconds: 0,
        completedAt: 0,
        status: 'paused',
        source: activeTask.source,
        language: activeTask.language,
        difficulty: activeTask.difficulty,
      };
      const history = [newRecord, ...loadHistory()];
      saveHistory(history);
      provider.sendSnapshot(activeTask, history);

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
      statusBarItem.text = formatStatusBar(activeTask);
      provider.sendSnapshot(activeTask, loadHistory());
      break;
    }

    case 'shelveTask': {
      if (!activeTask) { break; }
      clearInterval(timerInterval);
      timerInterval = undefined;
      statusBarItem.hide();

      const shelvedRecord: TaskRecord = {
        id: activeTask.id,
        name: activeTask.name,
        plannedSeconds: activeTask.plannedSeconds,
        elapsedSeconds: activeTask.elapsedSeconds,
        completedAt: Date.now(),
        status: 'paused',
        source: activeTask.source,
        language: activeTask.language,
        difficulty: activeTask.difficulty,
      };

      // Remove the old history entry (task was kept in-place), prepend shelved
      const history = [shelvedRecord, ...loadHistory().filter(t => t.id !== activeTask!.id)];
      saveHistory(history);
      activeTask = null;
      provider.sendSnapshot(null, history);
      break;
    }

    case 'resumeHistoryTask': {
      let history = loadHistory();

      // If there's already an active task, sync its elapsed back into history
      if (activeTask) {
        clearInterval(timerInterval);
        timerInterval = undefined;
        history = history.map(t =>
          t.id === activeTask!.id
            ? { ...t, elapsedSeconds: activeTask!.elapsedSeconds }
            : t,
        );
      }

      // Find the task (keep it in history at its position)
      const found = history.find(t => t.id === msg.id);
      if (!found) { break; }
      saveHistory(history);

      // Convert to active task — stays paused until user clicks Resume
      activeTask = {
        id: found.id,
        name: found.name,
        plannedSeconds: found.plannedSeconds,
        elapsedSeconds: found.elapsedSeconds,
        isPaused: true,
        source: found.source,
        language: found.language,
        difficulty: found.difficulty,
      };
      statusBarItem.text = formatStatusBar(activeTask);
      statusBarItem.show();
      provider.sendSnapshot(activeTask, history);
      break;
    }

    case 'restartTask': {
      if (!activeTask) { break; }
      activeTask.elapsedSeconds = 0;
      activeTask.isPaused = false;
      startInterval();
      statusBarItem.text = formatStatusBar(activeTask);
      // Sync reset elapsed into history entry
      const history = loadHistory().map(t =>
        t.id === activeTask!.id ? { ...t, elapsedSeconds: 0 } : t,
      );
      saveHistory(history);
      provider.sendSnapshot(activeTask, history);
      break;
    }

    case 'deleteTask': {
      const history = loadHistory().filter(t => t.id !== msg.id);
      saveHistory(history);
      provider.sendSnapshot(activeTask, history);
      break;
    }

    case 'exportTasks': {
      const history = loadHistory();
      if (history.length === 0) {
        vscode.window.showInformationMessage('No tasks to export.');
        break;
      }
      const format = msg.format;
      let content: string;
      let defaultName: string;
      let filters: Record<string, string[]>;

      if (format === 'json') {
        content = JSON.stringify(history, null, 2);
        defaultName = 'lap-code-export.json';
        filters = { 'JSON': ['json'] };
      } else {
        const headers = 'id,name,plannedSeconds,elapsedSeconds,completedAt,status,source,language,difficulty,isFavourite';
        const rows = history.map(t => [
          t.id,
          `"${(t.name ?? '').replace(/"/g, '""')}"`,
          t.plannedSeconds,
          t.elapsedSeconds,
          t.completedAt,
          t.status,
          t.source,
          t.language ?? '',
          t.difficulty ?? '',
          t.isFavourite ? 'true' : 'false',
        ].join(','));
        content = [headers, ...rows].join('\n');
        defaultName = 'lap-code-export.csv';
        filters = { 'CSV': ['csv'] };
      }

      vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(defaultName), filters }).then(uri => {
        if (!uri) { return; }
        vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8')).then(() => {
          vscode.window.showInformationMessage(`Exported ${history.length} tasks to ${uri.fsPath}`);
        });
      });
      break;
    }

    case 'toggleFavourite': {
      const history = loadHistory().map(t =>
        t.id === msg.id ? { ...t, isFavourite: !t.isFavourite } : t,
      );
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

      // Remove the old history entry (task was kept in-place), prepend completed
      const history = [record, ...loadHistory().filter(t => t.id !== activeTask!.id)];
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
  timerInterval = undefined;

  // Auto-pause running task — update its history entry in-place
  if (activeTask) {
    const id = activeTask.id;
    const elapsed = activeTask.elapsedSeconds;
    const history = loadHistory().map(t =>
      t.id === id ? { ...t, elapsedSeconds: elapsed, completedAt: Date.now(), status: 'paused' as const } : t,
    );
    saveHistory(history);
    activeTask = null;
  }
}
