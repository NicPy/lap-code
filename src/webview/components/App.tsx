import { isRunning } from '../store';
import { StartForm } from './StartForm';
import { ActiveTaskView } from './ActiveTaskView';
import { HistoryList } from './HistoryList';
import { ExportButton } from './ExportButton';

export function App() {
  return (
    <div class="app-layout">
      <div class="app-top">
        {isRunning.value ? <ActiveTaskView /> : <StartForm />}
      </div>
      <HistoryList />
      <ExportButton />
    </div>
  );
}
