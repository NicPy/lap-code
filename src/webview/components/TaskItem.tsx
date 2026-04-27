import { useState, useRef } from 'preact/hooks';
import type { TaskRecord } from '@shared/types';
import { SOURCE_DISPLAY, LEETCODE_LANGUAGES } from '@shared/constants';
import { activeTask } from '../store';
import { vscode } from '../vscode';
import { applyClass } from '../utils/applyClass';

interface Props {
  task: TaskRecord;
  isActive?: boolean;
  isEntering?: boolean;
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

export function TaskItem({ task, isActive, isEntering }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPass = task.status === 'successfully';
  const isPaused = task.status === 'paused';

  // For the active card, use live elapsed seconds from the signal
  const elapsed = isActive ? (activeTask.value?.elapsedSeconds ?? task.elapsedSeconds) : task.elapsedSeconds;
  const isOvertime = elapsed > task.plannedSeconds;
  const sourceConfig = SOURCE_DISPLAY[task.source] ?? { label: task.source, badgeClass: 'badge--source-manual' };

  function handleCardClick() {
    if (isActive || confirmDelete) { return; }
    if (task.filePath) {
      vscode.postMessage({ type: 'openTaskFile', id: task.id });
    } else {
      vscode.postMessage({ type: 'resumeHistoryTask', id: task.id });
    }
  }

  function handleFavouriteClick(e: MouseEvent) {
    e.stopPropagation();
    vscode.postMessage({ type: 'toggleFavourite', id: task.id });
  }

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
    <div ref={wrapperRef} class={applyClass('task-item-wrapper', {
      'task-item-wrapper--dismissing': dismissing,
      'task-item-wrapper--entering': isEntering,
    })}>
      <div
        class={applyClass('task-item', {
          'task-item--active': isActive,
          'task-item--paused': !isActive && isPaused,
          'task-item--pass': !isActive && !isPaused && isPass,
          'task-item--fail': !isActive && !isPaused && !isPass,
        })}
        onClick={handleCardClick}
      >
        {!isActive && (
          <div class="task-item__actions">
            <button
              class={applyClass('task-item__favourite', { 'task-item__favourite--active': task.isFavourite })}
              onClick={handleFavouriteClick}
              title={task.isFavourite ? 'Unfavourite' : 'Favourite'}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                {task.isFavourite
                  ? <path d="M8 1.23l2.18 4.41 4.87.71-3.52 3.43.83 4.85L8 12.18l-4.36 2.45.83-4.85L1 6.35l4.87-.71L8 1.23z" />
                  : <path d="M8 1.23l2.18 4.41 4.87.71-3.52 3.43.83 4.85L8 12.18l-4.36 2.45.83-4.85L1 6.35l4.87-.71L8 1.23zM8 3.42L6.39 6.68l-3.6.52 2.6 2.54-.62 3.59L8 11.35l3.23 1.98-.62-3.59 2.6-2.54-3.6-.52L8 3.42z" />
                }
              </svg>
            </button>
            <button class="task-item__delete" onClick={handleDeleteClick} title="Delete task">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10 3h3v1h-1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4H3V3h3V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1zM5 4v9h6V4H5zm2-1V2H7v1h2zm0 2h1v7H7V5zm2 0h1v7H9V5z" />
              </svg>
            </button>
          </div>
        )}
        <div class="task-item__body">
          <div class="task-item__header">
            <span class="task-item__name" title={task.name}>{task.name}</span>
            <span class={applyClass('task-chip', {
              'task-chip--active': isActive,
              'task-chip--paused': !isActive && isPaused,
              'task-chip--pass': !isActive && !isPaused && isPass,
              'task-chip--fail': !isActive && !isPaused && !isPass,
            })}>
              {isActive ? 'Active' : isPaused ? 'Paused' : isPass ? 'Pass' : 'Fail'}
            </span>
          </div>
          <div class="task-item__footer">
            <span class={applyClass('task-item__time', { 'task-item__time--overtime': isOvertime })}>
              {formatTime(elapsed)}
            </span>
            <span class="task-item__time-sep">/</span>
            <span class="task-item__time-planned">{formatTime(task.plannedSeconds)}</span>

            <span class="task-item__sep" aria-hidden="true">·</span>

            <span class={`task-tag ${sourceConfig.badgeClass}`}>{sourceConfig.label}</span>
            {task.difficulty && (
              <span
                class={applyClass('task-tag', `task-tag--diff-${task.difficulty.toLowerCase()}`, 'has-tooltip')}
                data-tooltip={task.difficulty}
              >
                {task.difficulty[0]}
              </span>
            )}
            {task.language && (
              <span class="task-tag task-tag--lang">{getLangLabel(task.language)}</span>
            )}
          </div>
          {isActive ? (
            <div class="task-item__completed-at task-item__completed-at--active">
              {activeTask.value?.isPaused ? 'Paused' : 'Running...'}
            </div>
          ) : (
            <div class="task-item__completed-at">
              {formatCompletedAt(task.completedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation bar — slides open below the card (not for active task) */}
      {!isActive && <div class={applyClass('task-item__confirm-track', { 'task-item__confirm-track--open': confirmDelete })}>
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
      </div>}
    </div>
  );
}
