import { useState } from 'preact/hooks';
import { history } from '../store';
import { TaskItem } from './TaskItem';

type Tab = 'all' | 'favourites';

export function HistoryList() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const tasks = history.value;
  const filtered = activeTab === 'favourites' ? tasks.filter(t => t.isFavourite) : tasks;

  return (
    <div class="history">
      <div class="history-tabs">
        <button
          class={`history-tab ${activeTab === 'all' ? 'history-tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          class={`history-tab ${activeTab === 'favourites' ? 'history-tab--active' : ''}`}
          onClick={() => setActiveTab('favourites')}
        >
          Favourites
        </button>
      </div>
      {filtered.length === 0 ? (
        <p class="history__empty">
          {activeTab === 'favourites' ? 'No favourite tasks yet.' : 'No completed tasks yet.'}
        </p>
      ) : (
        filtered.map((task) => <TaskItem key={task.id} task={task} />)
      )}
    </div>
  );
}
