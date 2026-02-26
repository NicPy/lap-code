import { history } from '../store';
import { TaskItem } from './TaskItem';

export function HistoryList() {
  const tasks = history.value;

  return (
    <div class="history">
      <p class="section-label">Previous Tasks</p>
      {tasks.length === 0 ? (
        <p class="history__empty">No completed tasks yet.</p>
      ) : (
        tasks.map((task) => <TaskItem key={task.id} task={task} />)
      )}
    </div>
  );
}
