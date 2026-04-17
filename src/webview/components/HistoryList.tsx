import { useState, useEffect, useRef } from 'preact/hooks';
import { history, activeTask } from '../store';
import { TaskItem } from './TaskItem';
import { applyClass } from '../utils/applyClass';

type Tab = 'all' | 'favourites';

const ENTER_ANIM_MS = 550;

export function HistoryList() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const tasks = history.value;
  const activeId = activeTask.value?.id ?? null;
  const filtered = activeTab === 'favourites' ? tasks.filter(t => t.isFavourite) : tasks;

  const seenIdsRef = useRef<Set<string> | null>(null);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(tasks.map(t => t.id));
    if (seenIdsRef.current === null) {
      seenIdsRef.current = currentIds;
      return;
    }
    const added: string[] = [];
    for (const id of currentIds) {
      if (!seenIdsRef.current.has(id)) { added.push(id); }
    }
    seenIdsRef.current = currentIds;
    if (added.length === 0) { return; }
    setEnteringIds(prev => {
      const next = new Set(prev);
      added.forEach(id => next.add(id));
      return next;
    });
    const timer = setTimeout(() => {
      setEnteringIds(prev => {
        const next = new Set(prev);
        added.forEach(id => next.delete(id));
        return next;
      });
    }, ENTER_ANIM_MS);
    return () => clearTimeout(timer);
  }, [tasks]);

  return (
    <div class="history-section">
      <div class="history-tabs">
        <button
          class={applyClass('history-tab', { 'history-tab--active': activeTab === 'all' })}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          class={applyClass('history-tab', { 'history-tab--active': activeTab === 'favourites' })}
          onClick={() => setActiveTab('favourites')}
        >
          Favourites
        </button>
      </div>
      <div class="history-scroll">
        <div class="history">
          {filtered.length === 0 ? (
            <p class="history__empty">
              {activeTab === 'favourites' ? 'No favourite tasks yet.' : 'No completed tasks yet.'}
            </p>
          ) : (
            filtered.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isActive={task.id === activeId}
                isEntering={enteringIds.has(task.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
