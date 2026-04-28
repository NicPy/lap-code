import { useState } from 'preact/hooks';
import type { CompletionStatus } from '@shared/types';
import { activeTask, isPaused } from '../store';
import { vscode } from '../vscode';
import { applyClass } from '../utils/applyClass';

function formatCountdown(remainingSeconds: number): string {
  const abs = Math.abs(remainingSeconds);
  const mm = Math.floor(abs / 60).toString().padStart(2, '0');
  const ss = (abs % 60).toString().padStart(2, '0');
  return `${remainingSeconds < 0 ? '-' : ''}${mm}:${ss}`;
}

function formatPlanned(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  return `Goal: ${m} min`;
}

export function ActiveTaskView() {
  const task = activeTask.value;
  const paused = isPaused.value;
  const [showComplete, setShowComplete] = useState(false);
  const [showRestart, setShowRestart] = useState(false);

  if (!task) { return null; }

  const remaining = task.plannedSeconds - task.elapsedSeconds;
  const isOvertime = remaining < 0;

  function handlePauseResume() {
    // Resuming dismisses the completion picker — Complete originally paused
    // the task, so resuming should also close the prompt it triggered.
    if (showComplete) { setShowComplete(false); }
    vscode.postMessage({ type: paused ? 'resumeTask' : 'pauseTask' });
  }

  function handleToggleComplete() {
    const opening = !showComplete;
    setShowComplete(opening);
    setShowRestart(false);
    if (opening && !paused) {
      vscode.postMessage({ type: 'pauseTask' });
    } else if (!opening && paused) {
      vscode.postMessage({ type: 'resumeTask' });
    }
  }

  function handleCompleteWith(status: CompletionStatus) {
    vscode.postMessage({ type: 'completeTask', status });
    setShowComplete(false);
  }

  function handleCloseComplete() {
    setShowComplete(false);
    if (paused) {
      vscode.postMessage({ type: 'resumeTask' });
    }
  }

  function handleToggleRestart() {
    setShowRestart(!showRestart);
    setShowComplete(false);
  }

  function handleConfirmRestart() {
    vscode.postMessage({ type: 'restartTask' });
    setShowRestart(false);
  }

  function handleStartNewTask() {
    vscode.postMessage({ type: 'shelveTask' });
  }

  return (
    <div class="active-task">
      <p class="active-task__name" key={`name-${task.id}`}>{task.name}</p>
      <p class="active-task__planned" key={`planned-${task.id}`}>{formatPlanned(task.plannedSeconds)}</p>

      <div key={`timer-${task.id}`} class={applyClass('active-task__timer', {
        'active-task__timer--paused': paused,
        'active-task__timer--overtime': isOvertime,
      })}>
        {formatCountdown(remaining)}
      </div>

      <div class="active-task__controls">
        <button class="btn-secondary" onClick={handlePauseResume}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button class="btn-secondary" onClick={handleToggleRestart}>
          Restart
        </button>
        <button class="btn-primary" onClick={handleToggleComplete}>
          Complete
        </button>
      </div>

      {!showComplete && (
        <button class="btn-secondary btn-full active-task__new" onClick={handleStartNewTask}>
          Start New Task
        </button>
      )}

      {showRestart && (
        <div class="confirm-popover">
          <p class="confirm-popover__label">Restart from 0?</p>
          <div class="confirm-popover__actions">
            <button class="btn-primary" onClick={handleConfirmRestart}>
              Confirm
            </button>
            <button class="btn-secondary" onClick={() => setShowRestart(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showComplete && (
        <div class="completion-area">
          <button
            type="button"
            class="completion-area__close"
            aria-label="Close"
            onClick={handleCloseComplete}
          >
            ×
          </button>
          <p class="completion-area__label">How did it go?</p>
          <div class="completion-area__choices">
            <button
              class="btn-success btn-full"
              onClick={() => handleCompleteWith('successfully')}
            >
              Successfully
            </button>
            <button
              class="btn-danger btn-full"
              onClick={() => handleCompleteWith('failed')}
            >
              Failed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
