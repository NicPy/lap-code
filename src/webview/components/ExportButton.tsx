import { useState, useEffect, useRef } from 'preact/hooks';
import { vscode } from '../vscode';
import { history } from '../store';

export function ExportButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { return; }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [open]);

  if (history.value.length === 0) { return null; }

  function handleExport(format: 'csv' | 'json') {
    vscode.postMessage({ type: 'exportTasks', format });
    setOpen(false);
  }

  return (
    <div class="export" ref={ref}>
      {open && (
        <div class="export__dropdown">
          <button class="export__option" onClick={() => handleExport('csv')}>CSV</button>
          <button class="export__option" onClick={() => handleExport('json')}>JSON</button>
        </div>
      )}
      <button
        class="export__btn btn-secondary"
        onClick={() => setOpen(!open)}
      >
        Export
      </button>
    </div>
  );
}
