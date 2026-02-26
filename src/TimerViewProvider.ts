import * as vscode from 'vscode';
import { VIEW_TYPE } from './constants';
import type { ActiveTask, TaskRecord, HostMessage, WebviewMessage } from './types';

interface ProviderCallbacks {
  getState: () => { activeTask: ActiveTask | null; history: TaskRecord[] };
  onMessage: (msg: WebviewMessage) => void;
}

export class TimerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = VIEW_TYPE;
  private _webview: vscode.Webview | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly callbacks: ProviderCallbacks,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._webview = webviewView.webview;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview-dist')],
    };

    webviewView.webview.html = this._buildHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((raw: unknown) => {
      this.callbacks.onMessage(raw as WebviewMessage);
    });
  }

  sendSnapshot(activeTask: ActiveTask | null, history: TaskRecord[]): void {
    this._post({ type: 'stateSnapshot', activeTask, history });
  }

  sendTick(elapsedSeconds: number, isPaused: boolean): void {
    this._post({ type: 'tick', elapsedSeconds, isPaused });
  }

  private _post(msg: HostMessage): void {
    this._webview?.postMessage(msg);
  }

  private _buildHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview-dist', 'main.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview-dist', 'main.css'),
    );

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource};
                 script-src 'nonce-${nonce}';" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Lap Code</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(
    { length: 32 },
    () => chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
}
