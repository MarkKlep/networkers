import { display } from './runner';

const STATUS_LABEL = {
  passed: 'Passed',
  failed: 'Wrong answer',
  error: 'Runtime error',
  timeout: 'Timed out',
  skipped: 'Not run',
};

// A failure has to say which case, on what input, and what it produced instead -
// a bare "wrong answer" sends you back to guessing. Cases are tabs rather than a
// list so a 30-case submit stays one screen.
function ResultsPanel({ result, running, mode, activeIndex, onSelectCase }) {
  if (running) {
    return (
      <div className="Results">
        <div className="Results-status Results-status-running">Running…</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="Results">
        <div className="Results-idle">
          <strong>Run</strong> checks the examples above. <strong>Submit</strong> also runs
          the hidden cases.
        </div>
      </div>
    );
  }

  // A syntax error or a missing function never reaches a single case, so there
  // is nothing to tab through - just say what is wrong with the code itself.
  if (result.fatal) {
    return (
      <div className="Results">
        <div className="Results-status Results-status-bad">Could not run</div>
        <pre className="Results-fatal">{result.fatal}</pre>
      </div>
    );
  }

  const passed = result.cases.filter((item) => item.status === 'passed').length;
  const total = result.cases.length;
  const allPassed = passed === total;
  const active = result.cases[activeIndex] || result.cases[0];

  return (
    <div className="Results">
      <div className="Results-bar">
        <span
          className={`Results-status ${allPassed ? 'Results-status-good' : 'Results-status-bad'}`}
        >
          {allPassed
            ? mode === 'submit'
              ? 'Accepted'
              : 'Examples passed'
            : `${passed} / ${total} passed`}
        </span>
        <span className="Results-cases">
          {result.cases.map((item, index) => (
            <button
              key={index}
              type="button"
              className={`Results-case Results-case-${item.status} ${
                index === activeIndex ? 'Results-case-active' : ''
              }`}
              onClick={() => onSelectCase(index)}
            >
              Case {index + 1}
              {!item.test.visible && <span className="Results-hidden-dot" title="Hidden test" />}
            </button>
          ))}
        </span>
      </div>

      {active && (
        <div className="Results-detail">
          <div className={`Results-verdict Results-verdict-${active.status}`}>
            {STATUS_LABEL[active.status]}
            {active.status === 'passed' && <span className="Results-ms">{active.ms} ms</span>}
          </div>

          <div className="Results-row">
            <span className="Results-label">Input</span>
            <code>{active.test.args.map(display).join(', ')}</code>
          </div>

          {active.status === 'error' || active.status === 'timeout' ? (
            <pre className="Results-fatal">{active.error}</pre>
          ) : (
            active.status !== 'skipped' && (
              <>
                <div className="Results-row">
                  <span className="Results-label">Your output</span>
                  <code className={active.status === 'failed' ? 'Results-wrong' : ''}>
                    {display(active.received)}
                  </code>
                </div>
                <div className="Results-row">
                  <span className="Results-label">Expected</span>
                  <code>{display(active.test.expected)}</code>
                </div>
              </>
            )
          )}

          {/* Kept separate from the verdict: console.log is how you debug a
              failing case, and merging it into the output would confuse the two. */}
          {active.logs.length > 0 && (
            <div className="Results-row Results-row-logs">
              <span className="Results-label">Console</span>
              <pre>{active.logs.join('\n')}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResultsPanel;
