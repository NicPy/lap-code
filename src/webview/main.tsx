import { render } from 'preact';
import { App } from './components/App';
import { vscode } from './vscode';
import { applyStateSnapshot, applyTick } from './store';
import type { HostMessage } from '@shared/types';
import './style.css';

// Dev theme (VS Code variable stubs + narrow width) — only in Vite dev server
if (import.meta.env.DEV) {
  import('./dev-theme.css');
}

window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
  const msg = event.data;
  if (msg.type === 'stateSnapshot') { applyStateSnapshot(msg); }
  if (msg.type === 'tick') { applyTick(msg.elapsedSeconds, msg.isPaused); }
});

render(<App />, document.getElementById('app')!);

// Signal host that webview is ready to receive initial state
vscode.postMessage({ type: 'webviewReady' });
