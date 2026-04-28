import type { TaskRecord } from '@shared/types';
import { selectedCompletedTask } from '../store';
import { vscode } from '../vscode';
import { applyClass } from '../utils/applyClass';

function formatElapsed(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatPlanned(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  return `Goal: ${m} min`;
}

interface Props {
  task: TaskRecord;
}

export function CompletedTaskReviewView({ task }: Props) {
  const isPass = task.status === 'successfully';
  const isOvertime = task.elapsedSeconds > task.plannedSeconds;

  function handleTryAgain() {
    vscode.postMessage({ type: 'resumeHistoryTask', id: task.id });
  }

  function handleStartNew() {
    selectedCompletedTask.value = null;
  }

  return (
    <div class="completed-review">
      <p class="active-task__name">{task.name}</p>
      <p class="active-task__planned">{formatPlanned(task.plannedSeconds)}</p>

      <div class={applyClass('completed-review__timer', {
        'completed-review__timer--pass': isPass && !isOvertime,
        'completed-review__timer--fail': !isPass || isOvertime,
      })}>
        {formatElapsed(task.elapsedSeconds)}
      </div>

      <div class="completed-review__status-row">
        <span class={applyClass('task-chip', {
          'task-chip--pass': isPass,
          'task-chip--fail': !isPass,
        })}>
          {isPass ? 'Completed' : 'Failed'}
        </span>
        {isOvertime && (
          <span class="completed-review__overtime-badge">Overtime</span>
        )}
      </div>

      <button class="btn-primary btn-full completed-review__try-again" onClick={handleTryAgain}>
        Try Again
      </button>
      <button class="btn-secondary btn-full completed-review__start-new" onClick={handleStartNew}>
        Start New Task
      </button>
    </div>
  );
}
