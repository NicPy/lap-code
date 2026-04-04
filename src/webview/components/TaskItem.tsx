import { useState, useRef } from 'preact/hooks';
import type { TaskRecord } from '@shared/types';
import { SOURCE_DISPLAY, LEETCODE_LANGUAGES } from '@shared/constants';
import { vscode } from '../vscode';

interface Props {
  task: TaskRecord;
}

function formatTime(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatCompletedAt(timestampMs: number): string {
  const date = new Date(timestampMs);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${year} · ${hour}:${minute}`;
}

function getLangLabel(slug: string): string {
  return LEETCODE_LANGUAGES.find(l => l.slug === slug)?.label ?? slug;
}

export function TaskItem({ task }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPass = task.status === 'successfully';
  const isOvertime = task.elapsedSeconds > task.plannedSeconds;
  const sourceConfig = SOURCE_DISPLAY[task.source] ?? { label: task.source, badgeClass: 'badge--source-manual' };

  function handleDeleteClick(e: MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  function handleConfirmDelete(e: MouseEvent) {
    e.stopPropagation();
    setDismissing(true);
    const el = wrapperRef.current;
    if (el) {
      el.addEventListener('transitionend', () => {
        vscode.postMessage({ type: 'deleteTask', id: task.id });
      }, { once: true });
    } else {
      vscode.postMessage({ type: 'deleteTask', id: task.id });
    }
  }

  function handleCancelDelete(e: MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  return (
    <div ref={wrapperRef} class={`task-item-wrapper ${dismissing ? 'task-item-wrapper--dismissing' : ''}`}>
      <div class={`task-item ${isPass ? 'task-item--pass' : 'task-item--fail'}`}>
        <button class="task-item__delete" onClick={handleDeleteClick} title="Delete task">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 3h3v1h-1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4H3V3h3V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1zM5 4v9h6V4H5zm2-1V2H7v1h2zm0 2h1v7H7V5zm2 0h1v7H9V5z" />
          </svg>
        </button>
        <div class="task-item__body">
          <div class="task-item__header">
            <span class="task-item__name" title={task.name}>{task.name}</span>
            <span class={`task-chip ${isPass ? 'task-chip--pass' : 'task-chip--fail'}`}>
              {isPass ? 'Pass' : 'Fail'}
            </span>
          </div>
          <div class="task-item__footer">
            <span class={`task-item__time ${isOvertime ? 'task-item__time--overtime' : ''}`}>
              {formatTime(task.elapsedSeconds)}
            </span>
            <span class="task-item__time-sep">/</span>
            <span class="task-item__time-planned">{formatTime(task.plannedSeconds)}</span>

            <span class="task-item__sep" aria-hidden="true">·</span>

            <span class={`task-tag ${sourceConfig.badgeClass}`}>{sourceConfig.label}</span>
            {task.difficulty && (
              <span
                class={`task-tag task-tag--diff-${task.difficulty.toLowerCase()} has-tooltip`}
                data-tooltip={task.difficulty}
              >
                {task.difficulty[0]}
              </span>
            )}
            {task.language && (
              <span class="task-tag task-tag--lang">{getLangLabel(task.language)}</span>
            )}
          </div>
          <div class="task-item__completed-at">
            {formatCompletedAt(task.completedAt)}
          </div>
        </div>
      </div>

      {/* Confirmation bar — slides open below the card */}
      <div class={`task-item__confirm-track ${confirmDelete ? 'task-item__confirm-track--open' : ''}`}>
        <div class="task-item__confirm-bar">
          <span class="task-item__confirm-label">Delete this task?</span>
          <div class="task-item__confirm-actions">
            <button class="task-item__confirm-btn task-item__confirm-btn--yes" onClick={handleConfirmDelete}>
              Delete
            </button>
            <button class="task-item__confirm-btn task-item__confirm-btn--no" onClick={handleCancelDelete}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
