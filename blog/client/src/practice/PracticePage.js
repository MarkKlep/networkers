import { useState } from 'react';
import LevelSelect, { LEVELS } from './LevelSelect';
import Workspace from './Workspace';
import { findProblem, problemsForLevel } from './problems';
import { loadSolved } from './progress';

// Practice is the one part of the app not organised around a company: pick a
// difficulty, get a DSA problem, solve it in the editor.
//
// Three states, no routing of their own - level → problem list → workspace.
// The workspace owns a lot of transient state (draft, results, split position)
// that a URL round-trip would throw away, so the step lives in component state
// and the /practice URL stays stable.
function PracticePage() {
  const [level, setLevel] = useState('');
  const [problemId, setProblemId] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [solved, setSolved] = useState(loadSolved);

  const chosen = LEVELS.find((option) => option.value === level);
  const problems = level ? problemsForLevel(level) : [];
  const problem = problemId ? findProblem(problemId) : null;

  // Straight into the editor on the problem you have not done yet - the list is
  // a detour when all you asked for was something to solve.
  const start = () => {
    const next = problems.find((item) => !solved.includes(item.id)) || problems[0];
    setProblemId(next.id);
    setBrowsing(false);
  };

  if (problem) {
    return (
      <Workspace
        // Keyed by problem id so switching problems remounts the workspace
        // instead of reusing it - the draft, run results and pane split are
        // all per-problem state that must not leak from the one you just left.
        key={problem.id}
        problem={problem}
        problems={problems}
        solvedIds={solved}
        onSolved={(id) => setSolved((current) => (current.includes(id) ? current : [...current, id]))}
        onSelect={setProblemId}
        onBack={() => {
          setProblemId('');
          setBrowsing(true);
        }}
      />
    );
  }

  // Only the workspace wants the wide shell App puts on this route; the level
  // picker and the problem list are reading content and stay in a column.
  if (browsing && chosen) {
    return (
      <div className="Practice-intro">
        <button type="button" className="Replace" onClick={() => setBrowsing(false)}>
          ← Change level
        </button>
        <h1>{chosen.label}</h1>
        <p className="subtitle">{chosen.detail}</p>

        <section>
          <h2>
            Problems ({problems.filter((item) => solved.includes(item.id)).length}/
            {problems.length} solved)
          </h2>
          <ul className="ProblemList">
            {problems.map((item) => (
              <li key={item.id}>
                <button type="button" className="ProblemList-item" onClick={() => setProblemId(item.id)}>
                  <span className="ProblemList-title">{item.title}</span>
                  <span className="ProblemList-topics">{item.topics.join(' · ')}</span>
                  {solved.includes(item.id) && <span className="ProblemList-solved">Solved</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="Practice-intro">
      <h1>Practice</h1>
      <p className="subtitle">
        Pick how hard you want it, and get a problem to solve.
      </p>

      <LevelSelect value={level} onChange={setLevel} />

      <button type="button" disabled={!chosen} onClick={start}>
        Start practising
      </button>
    </div>
  );
}

export default PracticePage;
