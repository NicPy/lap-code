import { useState } from 'preact/hooks';
import type { CompletionStatus } from '@shared/types';
import { activeTask, isPaused } from '../store';
import { vscode } from '../vscode';

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
  const [selectedStatus, setSelectedStatus] = useState<CompletionStatus>('successfully');

  if (!task) { return null; }

  const remaining = task.plannedSeconds - task.elapsedSeconds;
  const isOvertime = remaining < 0;

  function handlePauseResume() {
    vscode.postMessage({ type: paused ? 'resumeTask' : 'pauseTask' });
  }

  function handleToggleComplete() {
    const opening = !showComplete;
    setShowComplete(opening);
    if (opening && !paused) {
      vscode.postMessage({ type: 'pauseTask' });
    } else if (!opening && paused) {
      vscode.postMessage({ type: 'resumeTask' });
    }
  }

  function handleSubmitComplete() {
    vscode.postMessage({ type: 'completeTask', status: selectedStatus });
    setShowComplete(false);
  }

  return (
    <div class="active-task">
      <p class="active-task__name">{task.name}</p>
      <p class="active-task__planned">{formatPlanned(task.plannedSeconds)}</p>

      <div class={`active-task__timer ${paused ? 'active-task__timer--paused' : ''} ${isOvertime ? 'active-task__timer--overtime' : ''}`}>
        {formatCountdown(remaining)}
      </div>

      <div class="active-task__controls">
        <button class="btn-secondary" onClick={handlePauseResume}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button class="btn-primary" onClick={handleToggleComplete}>
          Complete
        </button>
      </div>

      {showComplete && (
        <div class="completion-area">
          <p class="completion-area__label">How did it go?</p>
          <div class="completion-area__row">
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus((e.target as HTMLSelectElement).value as CompletionStatus)
              }
            >
              <option value="successfully">Successfully</option>
              <option value="failed">Failed</option>
            </select>
            <button class="btn-primary" onClick={handleSubmitComplete}>
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
