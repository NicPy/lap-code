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

  const hasHistory = history.value.length > 0;

  function handleExport(format: 'csv' | 'json') {
    vscode.postMessage({ type: 'exportTasks', format });
    setOpen(false);
  }

  function handleImport() {
    vscode.postMessage({ type: 'importTasks' });
    setOpen(false);
  }

  return (
    <div class="export" ref={ref}>
      {open && (
        <div class="export__dropdown">
          {hasHistory && <button class="export__option" onClick={() => handleExport('csv')}>Export CSV</button>}
          {hasHistory && <button class="export__option" onClick={() => handleExport('json')}>Export JSON</button>}
          {hasHistory && <div class="export__divider" />}
          <button class="export__option" onClick={handleImport}>Import…</button>
        </div>
      )}
      <button
        class="export__btn btn-secondary"
        onClick={() => setOpen(!open)}
      >
        Export / Import
      </button>
    </div>
  );
}
