import * as vscode from 'vscode';
import { GLOBALSTATE_KEY, LEETCODE_LANGUAGES } from './constants';
import { TimerViewProvider } from './TimerViewProvider';
import type { ActiveTask, TaskRecord, CompletionStatus, TaskSource, LeetcodeProblem } from './types';
import { generateId, formatStatusBar, toTaskRecord, slugify } from './utils';
import { createProblemFile } from './fileCreator';

export class TaskManager {
  private activeTask: ActiveTask | null = null;
  private timerInterval: ReturnType<typeof setInterval> | undefined;

  readonly provider: TimerViewProvider;

  constructor(
    private readonly globalState: vscode.Memento,
    private readonly statusBar: vscode.StatusBarItem,
    provider: TimerViewProvider,
  ) {
    this.provider = provider;
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  getActiveTask(): ActiveTask | null {
    return this.activeTask;
  }

  getHistory(): TaskRecord[] {
    return this.globalState.get<TaskRecord[]>(GLOBALSTATE_KEY, []);
  }

  // ── Timer lifecycle ──────────────────────────────────────────────────────

  start(
    name: string,
    plannedMinutes: number,
    source: TaskSource,
    language?: string,
    problem?: LeetcodeProblem,
  ): void {
    this.activeTask = {
      id: generateId(),
      name,
      plannedSeconds: plannedMinutes * 60,
      elapsedSeconds: 0,
      isPaused: false,
      source,
      language,
      difficulty: problem?.difficulty,
    };

    this.startInterval();
    this.showStatusBar();

    // Insert a "paused" history entry so the task is visible in the list
    const record: TaskRecord = { ...toTaskRecord(this.activeTask, 'paused'), slug: problem?.slug };
    this.saveHistory([record, ...this.getHistory()]);
    this.broadcastSnapshot();

    // Create problem file in the background; store path so the task can be reopened later
    if ((source === 'leetcode' || source === 'neetcode') && problem && language) {
      const taskId = this.activeTask.id;
      createProblemFile(source, problem, language)
        .then(filePath => {
          if (filePath) {
            this.updateHistoryEntry(taskId, { filePath });
            this.broadcastSnapshot();
          }
        })
        .catch(err => {
          console.error(`[lap-code] Failed to create ${source} file:`, err);
        });
    }
  }

  pause(): void {
    if (!this.activeTask) { return; }
    this.activeTask.isPaused = true;
    this.stopInterval();
    this.updateStatusBar();
    this.syncActiveToHistory();
    this.broadcastSnapshot();
  }

  resume(): void {
    if (!this.activeTask) { return; }
    this.activeTask.isPaused = false;
    this.startInterval();
    this.updateStatusBar();
    this.broadcastSnapshot();
  }

  restart(): void {
    if (!this.activeTask) { return; }
    this.activeTask.elapsedSeconds = 0;
    this.activeTask.isPaused = false;
    this.startInterval();
    this.updateStatusBar();
    this.updateHistoryEntry(this.activeTask.id, { elapsedSeconds: 0 });
    this.broadcastSnapshot();
  }

  shelve(): void {
    if (!this.activeTask) { return; }
    this.stopInterval();
    this.statusBar.hide();

    const history = this.getHistory();
    const existing = history.find(t => t.id === this.activeTask!.id);
    const record = { ...toTaskRecord(this.activeTask, 'paused'), filePath: existing?.filePath, slug: existing?.slug };
    this.saveHistory([record, ...history.filter(t => t.id !== this.activeTask!.id)]);
    this.activeTask = null;
    this.broadcastSnapshot();
  }

  discardActive(): void {
    if (!this.activeTask) { return; }
    this.stopInterval();
    this.statusBar.hide();

    // Remove the in-progress history entry that was inserted on start
    this.saveHistory(this.getHistory().filter(t => t.id !== this.activeTask!.id));
    this.activeTask = null;
    this.broadcastSnapshot();
  }

  complete(status: CompletionStatus): void {
    if (!this.activeTask) { return; }
    this.stopInterval();

    const history = this.getHistory();
    const existing = history.find(t => t.id === this.activeTask!.id);
    const record = { ...toTaskRecord(this.activeTask, status), filePath: existing?.filePath, slug: existing?.slug };
    this.saveHistory([record, ...history.filter(t => t.id !== this.activeTask!.id)]);
    this.activeTask = null;
    this.statusBar.hide();
    this.broadcastSnapshot();
  }

  resumeFromHistory(id: string): void {
    let history = this.getHistory();

    // Sync current active task back into history
    if (this.activeTask) {
      this.stopInterval();
      history = history.map(t =>
        t.id === this.activeTask!.id
          ? { ...t, elapsedSeconds: this.activeTask!.elapsedSeconds, completedAt: !this.activeTask!.isPaused ? Date.now() : t.completedAt }
          : t,
      );
    }

    const found = history.find(t => t.id === id);
    if (!found) { return; }
    this.saveHistory(history);

    this.activeTask = {
      id: found.id,
      name: found.name,
      plannedSeconds: found.plannedSeconds,
      elapsedSeconds: found.elapsedSeconds,
      isPaused: false,
      source: found.source,
      language: found.language,
      difficulty: found.difficulty,
    };
    this.showStatusBar();
    this.startInterval();
    this.broadcastSnapshot();

    // Also open the associated file if there is one — so resuming a paused task brings the user back into context
    this.openTaskFile(id).catch(() => { /* swallow — file-open is best-effort */ });
  }

  deleteTask(id: string): void {
    this.saveHistory(this.getHistory().filter(t => t.id !== id));
    this.broadcastSnapshot();
  }

  /** Append new tasks to history (used by import). */
  appendToHistory(tasks: TaskRecord[]): void {
    this.saveHistory([...this.getHistory(), ...tasks]);
    this.broadcastSnapshot();
  }

  toggleFavourite(id: string): void {
    this.updateHistoryEntry(id, t => ({ isFavourite: !t.isFavourite }));
    this.broadcastSnapshot();
  }

  async openTaskFile(id: string): Promise<void> {
    const task = this.getHistory().find(t => t.id === id);
    if (!task) { return; }

    const candidates = this.buildFileCandidates(task);
    if (candidates.length === 0) {
      vscode.window.showInformationMessage(`No file is associated with "${task.name}".`);
      return;
    }

    for (const candidate of candidates) {
      const fileUri = vscode.Uri.file(candidate);
      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        continue;
      }
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc, { preview: false });
      // Cache the resolved path so future clicks are instant
      if (task.filePath !== candidate) {
        this.updateHistoryEntry(id, { filePath: candidate });
      }
      return;
    }

    vscode.window.showWarningMessage(
      `File for "${task.name}" was not found. It may have been moved or deleted.`,
    );
  }

  /** Build ordered list of candidate file paths to try opening. */
  private buildFileCandidates(task: TaskRecord): string[] {
    const candidates: string[] = [];
    if (task.filePath) { candidates.push(task.filePath); }

    // Reconstruct from source + slug + language for tasks created before filePath was stored
    if ((task.source === 'leetcode' || task.source === 'neetcode') && task.language) {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!workspaceRoot) { return candidates; }

      const ext = LEETCODE_LANGUAGES.find(l => l.slug === task.language)?.ext ?? 'js';
      const slugs = new Set<string>();
      if (task.slug) { slugs.add(task.slug); }
      slugs.add(slugify(task.name));

      for (const slug of slugs) {
        const reconstructed = vscode.Uri.joinPath(workspaceRoot, task.source, `${slug}.${ext}`).fsPath;
        if (!candidates.includes(reconstructed)) { candidates.push(reconstructed); }
      }
    }

    return candidates;
  }

  /** Called on extension deactivate — auto-pause any running task. */
  dispose(): void {
    this.stopInterval();
    if (this.activeTask) {
      this.updateHistoryEntry(this.activeTask.id, {
        elapsedSeconds: this.activeTask.elapsedSeconds,
        completedAt: Date.now(),
        status: 'paused' as const,
      });
      this.activeTask = null;
    }
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────

  broadcastSnapshot(): void {
    this.provider.sendSnapshot(this.activeTask, this.getHistory());
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private startInterval(): void {
    this.stopInterval();
    this.timerInterval = setInterval(() => {
      if (!this.activeTask || this.activeTask.isPaused) { return; }
      this.activeTask.elapsedSeconds++;
      this.updateStatusBar();
      this.provider.sendTick(this.activeTask.elapsedSeconds, false);
    }, 1000);
  }

  private stopInterval(): void {
    clearInterval(this.timerInterval);
    this.timerInterval = undefined;
  }

  private showStatusBar(): void {
    this.updateStatusBar();
    this.statusBar.show();
  }

  private updateStatusBar(): void {
    if (this.activeTask) {
      this.statusBar.text = formatStatusBar(this.activeTask);
    }
  }

  private saveHistory(history: TaskRecord[]): void {
    this.globalState.update(GLOBALSTATE_KEY, history);
  }

  /** Sync current activeTask elapsed time into its history entry. */
  private syncActiveToHistory(): void {
    if (!this.activeTask) { return; }
    this.updateHistoryEntry(this.activeTask.id, {
      elapsedSeconds: this.activeTask.elapsedSeconds,
      completedAt: Date.now(),
    });
  }

  /** Update a single history entry by id with partial fields or a mapper. */
  private updateHistoryEntry(
    id: string,
    update: Partial<TaskRecord> | ((t: TaskRecord) => Partial<TaskRecord>),
  ): void {
    const history = this.getHistory().map(t => {
      if (t.id !== id) { return t; }
      const patch = typeof update === 'function' ? update(t) : update;
      return { ...t, ...patch };
    });
    this.saveHistory(history);
  }
}
