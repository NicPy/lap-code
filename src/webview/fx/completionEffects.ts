import { effect } from '@preact/signals';
import { history, selectedCompletedTask } from '../store';
import { triggerConfetti } from './confetti';

// Tasks completed within this window are treated as fresh completions and
// trigger celebration / review-view selection. Older entries — e.g. those
// loaded from the initial stateSnapshot on plugin launch — are ignored.
const RECENT_COMPLETION_WINDOW_MS = 10_000;

export function setupCompletionEffects(): void {
  let prevTopId: string | undefined;
  let prevTopStatus: string | undefined;

  effect(() => {
    const top = history.value[0];
    if (!top || (top.id === prevTopId && top.status === prevTopStatus)) { return; }
    prevTopId = top.id;
    prevTopStatus = top.status;

    const isFresh = Date.now() - top.completedAt < RECENT_COMPLETION_WINDOW_MS;
    if (!isFresh) { return; }

    // Surface the completion in the review view so the user sees the outcome
    // (and, for failures, the encouragement quote rendered there).
    selectedCompletedTask.value = top;

    if (top.status === 'successfully') { triggerConfetti(); }
  });
}
