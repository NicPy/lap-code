import type { TaskRecord } from '@shared/types';
import { SOURCE_DISPLAY, LEETCODE_LANGUAGES } from '@shared/constants';

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
  const isPass = task.status === 'successfully';
  const isOvertime = task.elapsedSeconds > task.plannedSeconds;
  const sourceConfig = SOURCE_DISPLAY[task.source] ?? { label: task.source, badgeClass: 'badge--source-manual' };

  return (
    <div class={`task-item ${isPass ? 'task-item--pass' : 'task-item--fail'}`}>
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
  );
}
