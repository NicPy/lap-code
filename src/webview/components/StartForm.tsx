import { useRef } from 'preact/hooks';
import { vscode } from '../vscode';

export function StartForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  function handleStart() {
    const name = nameRef.current?.value.trim() ?? '';
    const plannedMinutes = parseInt(minutesRef.current?.value ?? '45', 10) || 45;

    if (!name) {
      nameRef.current?.focus();
      return;
    }

    vscode.postMessage({ type: 'startTask', name, plannedMinutes });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { handleStart(); }
  }

  return (
    <div class="start-form">
      <div class="form-group">
        <label for="task-name">Task Name</label>
        <input
          id="task-name"
          ref={nameRef}
          type="text"
          placeholder="e.g. Two Sum"
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
      <div class="form-group">
        <label for="planned-time">Planned Time (minutes)</label>
        <input
          id="planned-time"
          ref={minutesRef}
          type="number"
          value={45}
          min={1}
          max={300}
          onKeyDown={handleKeyDown}
        />
      </div>
      <button class="btn-primary btn-full" onClick={handleStart}>
        Start Task
      </button>
    </div>
  );
}
