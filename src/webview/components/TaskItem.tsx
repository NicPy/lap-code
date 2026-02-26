import type { TaskRecord } from '@shared/types';

interface Props {
  task: TaskRecord;
}

function formatTime(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function TaskItem({ task }: Props) {
  const isPass = task.status === 'successfully';
  const isOvertime = task.elapsedSeconds > task.plannedSeconds;

  return (
    <div class="task-item">
      <div class="task-item__info">
        <div class="task-item__name" title={task.name}>{task.name}</div>
        <div class="task-item__time">
          <span class={isOvertime ? 'task-item__time--overtime' : ''}>
            {formatTime(task.elapsedSeconds)}
          </span>
          <span class="task-item__time-separator"> / </span>
          <span class="task-item__time-planned">{formatTime(task.plannedSeconds)}</span>
        </div>
      </div>
      <span class={`badge ${isPass ? 'badge--pass' : 'badge--fail'}`}>
        {isPass ? 'Pass' : 'Fail'}
      </span>
    </div>
  );
}
