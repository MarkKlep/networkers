import { useCallback, useEffect, useRef, useState } from 'react';
import CodeEditor from './CodeEditor';
import ProblemPane from './ProblemPane';
import ResultsPanel from './ResultsPanel';
import { runTests } from './runner';
import { clearDraft, loadDraft, markSolved, saveDraft } from './progress';

// The solve screen: statement on the left, editor and results on the right.
//
// Run and Submit are deliberately two buttons, not one. Run executes only the
// cases printed in the statement - fast, and safe to hammer while iterating.
// Submit executes those plus the hidden ones and is what marks the problem
// solved. Collapsing them costs you the safe iteration loop.
function Workspace({ problem, problems, solvedIds, onSolved, onSelect, onBack }) {
  const solved = solvedIds.includes(problem.id);
  const [code, setCode] = useState(() => loadDraft(problem.id) ?? problem.starterCode);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState('run');
  const [result, setResult] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [split, setSplit] = useState(42);
  const paneRef = useRef(null);

  useEffect(() => {
    saveDraft(problem.id, code);
  }, [problem.id, code]);

  const run = useCallback(
    async (nextMode) => {
      const tests =
        nextMode === 'run' ? problem.tests.filter((test) => test.visible) : problem.tests;

      setMode(nextMode);
      setRunning(true);
      setResult(null);

      const outcome = await runTests({
        code,
        functionName: problem.functionName,
        tests,
      });

      // Land on the first thing that went wrong rather than on case 1, which is
      // almost always the case you already know passes.
      const firstBad = outcome.cases.findIndex((item) => item.status !== 'passed');
      setActiveIndex(firstBad === -1 ? 0 : firstBad);
      setResult(outcome);
      setRunning(false);

      if (
        nextMode === 'submit' &&
        !outcome.fatal &&
        outcome.cases.every((item) => item.status === 'passed')
      ) {
        markSolved(problem.id);
        onSolved(problem.id);
      }
    },
    [code, problem, onSolved]
  );

  // Cmd/Ctrl+Enter runs and Cmd/Ctrl+Shift+Enter submits - the shortcut every
  // one of these editors uses, and the shortcut you want most, since your hands
  // are already in the editor. Bound in the capture phase: Monaco stops
  // propagation on keys it handles, so a bubble-phase listener never sees this.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!running) run(event.shiftKey ? 'submit' : 'run');
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [run, running]);

  // Statement and code compete for width, and which one you want bigger changes
  // as you go: wide statement while reading, wide editor while typing.
  const startDrag = (event) => {
    event.preventDefault();
    const onMove = (move) => {
      const bounds = paneRef.current.getBoundingClientRect();
      const percent = ((move.clientX - bounds.left) / bounds.width) * 100;
      setSplit(Math.min(70, Math.max(22, percent)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const reset = () => {
    if (code !== problem.starterCode && !window.confirm('Discard your code for this problem?')) {
      return;
    }
    clearDraft(problem.id);
    setCode(problem.starterCode);
    setResult(null);
  };

  return (
    <div className="Workspace">
      <header className="Workspace-bar">
        <button type="button" className="Workspace-back" onClick={onBack}>
          ← All {problem.level} problems
        </button>
        <div className="Workspace-actions">
          <button type="button" className="Workspace-reset" onClick={reset}>
            Reset
          </button>
          <button
            type="button"
            className="Workspace-run"
            onClick={() => run('run')}
            disabled={running}
          >
            Run
          </button>
          <button
            type="button"
            className="Workspace-submit"
            onClick={() => run('submit')}
            disabled={running}
          >
            Submit
          </button>
        </div>
      </header>

      {/* Jumps straight to a sibling problem without a detour through the list
          screen - the workspace is keyed by problem id in PracticePage, so
          picking one here remounts fresh (own draft, own results, own split). */}
      <div className="Workspace-switcher" role="tablist" aria-label={`${problem.level} problems`}>
        {problems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === problem.id}
            className={`Workspace-tab ${item.id === problem.id ? 'Workspace-tab-active' : ''}`}
            onClick={() => item.id !== problem.id && onSelect(item.id)}
          >
            <span className="Workspace-tab-index">{index + 1}</span>
            {item.title}
            {solvedIds.includes(item.id) && (
              <span className="Workspace-tab-solved" aria-label="Solved">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* The split is a CSS variable rather than two inline widths so the
          narrow-screen media query can stack the panes without fighting inline
          styles for specificity. */}
      <div className="Workspace-panes" ref={paneRef} style={{ '--split': `${split}%` }}>
        <div className="Workspace-problem">
          <ProblemPane problem={problem} solved={solved} />
        </div>

        <div
          className="Workspace-divider"
          onMouseDown={startDrag}
          role="separator"
          aria-orientation="vertical"
        />

        <div className="Workspace-right">
          <div className="Workspace-editor">
            <CodeEditor value={code} onChange={setCode} readOnly={running} />
          </div>
          <ResultsPanel
            result={result}
            running={running}
            mode={mode}
            activeIndex={activeIndex}
            onSelectCase={setActiveIndex}
          />
        </div>
      </div>
    </div>
  );
}

export default Workspace;
