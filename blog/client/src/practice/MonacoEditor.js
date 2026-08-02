import { useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Monaco is bundled from node_modules rather than pulled from the CDN that
// @monaco-editor/react reaches for by default: nothing else in this app fetches
// code at runtime, and a practice session should work with the network off.
loader.config({ monaco });

// The language services (completions, diagnostics) normally run in their own
// worker, and Monaco throws if it is asked for one and no MonacoEnvironment
// exists. webpack 5 resolves these URLs at build time and emits each worker as
// its own chunk.
if (!window.MonacoEnvironment) {
  window.MonacoEnvironment = {
    getWorker(workerId, label) {
      // Paths go through monaco-editor's exports map, which roots them at
      // `esm/vs` - hence `monaco-editor/language/...`, not the full path on disk.
      if (label === 'javascript' || label === 'typescript') {
        return new Worker(
          new URL('monaco-editor/language/typescript/ts.worker.js', import.meta.url)
        );
      }
      return new Worker(new URL('monaco-editor/editor/editor.worker.js', import.meta.url));
    },
  };
}

// This module is loaded lazily (see CodeEditor.js), which keeps ~2MB of editor
// out of the initial bundle and out of Jest's way - CRA does not transform
// monaco's ESM in node_modules, so a static import here would break `npm test`
// for every test that mounts the app shell.
function MonacoEditor({ value, onChange, readOnly }) {
  // Semantic errors are noise on a self-contained snippet - an unused helper is
  // not a mistake here - but syntax errors are exactly what you want flagged.
  // Optional throughout because this API is not part of monaco's stable surface
  // and moved in 0.56; a missing one must not take the editor down with it.
  useEffect(() => {
    monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions?.({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
  }, []);

  return (
    <Editor
      height="100%"
      defaultLanguage="javascript"
      theme="vs-dark"
      value={value}
      onChange={(next) => onChange(next ?? '')}
      loading={<div className="Workspace-loading">Loading editor…</div>}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        scrollBeyondLastLine: false,
        tabSize: 2,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        renderLineHighlight: 'line',
        automaticLayout: true,
      }}
    />
  );
}

export default MonacoEditor;
