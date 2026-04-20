# Local Development

## Debug (run the extension)

1. Install dependencies:
   ```
   npm install
   ```
2. Build the extension and webview:
   ```
   npm run build
   ```
3. Press **F5** in VS Code — this opens an Extension Development Host with the extension loaded.
4. Click the timer icon in the Activity Bar to open the panel.

## Local Development

Run watchers for both the extension host and the webview in parallel:

```
npm run dev
```

- Changes to `src/extension.ts` or other host files recompile automatically via `tsc --watch`.
- Changes to `src/webview/` rebuild the Vite bundle automatically.
- After a host-side change, reload the Extension Development Host window (**Ctrl+R** / **Cmd+R**).

**Webview-only iteration** (faster, no VS Code needed):

```
npm run dev:webview
```

Opens a Vite dev server at `http://localhost:5173` with HMR and mock data — useful for UI work.

## Build & Install Locally

To package the extension and install it into your local VS Code:

1. Install `vsce` if you don't have it:
   ```
   npm install -g @vscode/vsce
   ```
2. Build the extension:
   ```
   npm run build
   ```
3. Package it into a `.vsix` file:
   ```
   vsce package
   ```
4. Install the `.vsix` in VS Code (replace `x.x.x` with the version in `package.json`):
   ```
   code --install-extension lap-code-x.x.x.vsix
   ```
5. Reload VS Code (reopen the window or run **Developer: Reload Window** from the command palette).

> **Tip:** After making changes, repeat steps 2–5 to update the installed extension. The `.vsix` filename always reflects the `version` field in `package.json`.
