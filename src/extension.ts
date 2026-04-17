import * as vscode from 'vscode';
import { TimerViewProvider } from './TimerViewProvider';
import { TaskManager } from './TaskManager';
import { VIEW_TYPE, CMD_FOCUS_PANEL } from './constants';
import { exportToJSON, exportToCSV, importTasksFromFile } from './importExport';
import { searchProblems } from './leetcode';
import { searchProblems as searchNeetcodeProblems } from './neetcode';
import type { WebviewMessage } from './types';

let manager: TaskManager;

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = CMD_FOCUS_PANEL;
  context.subscriptions.push(statusBar);

  const provider = new TimerViewProvider(context.extensionUri, {
    getState: () => ({ activeTask: manager.getActiveTask(), history: manager.getHistory() }),
    onMessage: handleMessage,
  });

  manager = new TaskManager(context.globalState, statusBar, provider);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_TYPE, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand(CMD_FOCUS_PANEL, () => {
      vscode.commands.executeCommand(`${VIEW_TYPE}.focus`);
    }),
  );
}

export function deactivate(): void {
  manager?.dispose();
}

// ── Message router ───────────────────────────────────────────────────────────

function handleMessage(msg: WebviewMessage): void {
  switch (msg.type) {
    case 'webviewReady':
      manager.broadcastSnapshot();
      break;

    case 'searchLeetcode':
      searchProblems(msg.query)
        .then(problems => manager.provider.sendHostMessage({ type: 'leetcodeSearchResults', problems }))
        .catch(err => manager.provider.sendHostMessage({ type: 'leetcodeError', message: String(err?.message ?? err) }));
      break;

    case 'searchNeetcode':
      searchNeetcodeProblems(msg.query)
        .then(problems => manager.provider.sendHostMessage({ type: 'neetcodeSearchResults', problems }))
        .catch(err => manager.provider.sendHostMessage({ type: 'neetcodeError', message: String(err?.message ?? err) }));
      break;

    case 'startTask':
      manager.start(
        msg.name,
        msg.plannedMinutes,
        msg.source,
        msg.language,
        msg.leetcodeProblem ?? msg.neetcodeProblem,
      );
      break;

    case 'pauseTask':
      manager.pause();
      break;

    case 'resumeTask':
      manager.resume();
      break;

    case 'restartTask':
      manager.restart();
      break;

    case 'shelveTask':
      manager.shelve();
      break;

    case 'completeTask':
      manager.complete(msg.status);
      break;

    case 'resumeHistoryTask':
      manager.resumeFromHistory(msg.id);
      break;

    case 'deleteTask':
      manager.deleteTask(msg.id);
      break;

    case 'toggleFavourite':
      manager.toggleFavourite(msg.id);
      break;

    case 'exportTasks':
      handleExport(msg.format);
      break;

    case 'importTasks':
      handleImport();
      break;
  }
}

// ── Export / Import ──────────────────────────────────────────────────────────

function handleExport(format: 'csv' | 'json'): void {
  const history = manager.getHistory();
  if (history.length === 0) {
    vscode.window.showInformationMessage('No tasks to export.');
    return;
  }

  const content = format === 'json' ? exportToJSON(history) : exportToCSV(history);
  const defaultName = `lap-code-export.${format}`;
  const filters: Record<string, string[]> = format === 'json' ? { 'JSON': ['json'] } : { 'CSV': ['csv'] };

  vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(defaultName), filters }).then(uri => {
    if (!uri) { return; }
    vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8')).then(() => {
      vscode.window.showInformationMessage(`Exported ${history.length} tasks to ${uri.fsPath}`);
    });
  });
}

async function handleImport(): Promise<void> {
  let imported;
  try {
    imported = await importTasksFromFile();
  } catch (err: any) {
    vscode.window.showErrorMessage(`Import failed: ${err.message}`);
    return;
  }

  if (imported.length === 0) {
    vscode.window.showInformationMessage('No valid tasks found in file.');
    return;
  }

  const history = manager.getHistory();
  const existingIds = new Set(history.map(t => t.id));
  const newTasks = imported.filter(t => !existingIds.has(t.id));

  if (newTasks.length === 0) {
    vscode.window.showInformationMessage('All tasks already exist in history.');
    return;
  }

  manager.appendToHistory(newTasks);
  vscode.window.showInformationMessage(`Imported ${newTasks.length} task(s).`);
}
