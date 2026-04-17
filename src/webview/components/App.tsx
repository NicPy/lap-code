import { useLayoutEffect, useRef } from 'preact/hooks';
import { isRunning } from '../store';
import { StartForm } from './StartForm';
import { ActiveTaskView } from './ActiveTaskView';
import { HistoryList } from './HistoryList';
import { ExportButton } from './ExportButton';

export function App() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) { return; }

    // Set initial height without animating from 0/auto.
    outer.style.transition = 'none';
    outer.style.height = `${inner.offsetHeight}px`;
    // Force a reflow so the browser registers the initial value before we re-enable transitions.
    void outer.offsetHeight;
    outer.style.transition = '';

    const ro = new ResizeObserver(() => {
      outer.style.height = `${inner.offsetHeight}px`;
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div class="app-layout">
      <div class="app-top" ref={outerRef}>
        <div class="app-top__inner" ref={innerRef}>
          {isRunning.value ? <ActiveTaskView /> : <StartForm />}
        </div>
      </div>
      <HistoryList />
      <ExportButton />
    </div>
  );
}
