import { Suspense, lazy } from 'react';

// Monaco is code-split behind a dynamic import for two reasons: it is by far
// the largest thing in the app and nothing outside /practice needs it, and a
// static import would pull monaco's untranspiled ESM into every Jest run that
// mounts App. The fallback is a real, editable textarea rather than a spinner -
// if the editor chunk is slow or fails, you can still type a solution.
const MonacoEditor = lazy(() => import('./MonacoEditor'));

function PlainEditor({ value, onChange, readOnly }) {
  // Tab indents instead of leaving the field. Without this the fallback is
  // unusable for code, which defeats the point of having one.
  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const { selectionStart, selectionEnd } = event.target;
    onChange(`${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`);
    requestAnimationFrame(() => {
      event.target.selectionStart = selectionStart + 2;
      event.target.selectionEnd = selectionStart + 2;
    });
  };

  return (
    <textarea
      className="PlainEditor"
      spellCheck="false"
      aria-label="Your solution"
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}

function CodeEditor(props) {
  return (
    <Suspense fallback={<PlainEditor {...props} />}>
      <MonacoEditor {...props} />
    </Suspense>
  );
}

export default CodeEditor;
