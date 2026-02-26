# lap-code

A VS Code extension for timed coding practice. Start a countdown for a problem, stay focused, and review your session history — all without leaving the editor.

**Use it to:**
- Set a time budget per problem and track how long you actually spend
- See at a glance when you're over time (timer goes red and negative)
- Build a personal history of solved problems with time spent

---

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
