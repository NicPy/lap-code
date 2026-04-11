import { isRunning } from '../store';
import { StartForm } from './StartForm';
import { ActiveTaskView } from './ActiveTaskView';
import { HistoryList } from './HistoryList';
import { ExportButton } from './ExportButton';

export function App() {
  return (
    <div>
      {isRunning.value ? <ActiveTaskView /> : <StartForm />}
      <HistoryList />
      <ExportButton />
    </div>
  );
}
