// Statements are plain strings with `backticked` identifiers - the one piece of
// markdown that actually matters when the text is about code. Splitting on
// backticks costs a regex; a markdown dependency would cost a lot more for the
// rest of a syntax nothing here uses.
function Prose({ text }) {
  return text.split(/`([^`]+)`/g).map((chunk, index) =>
    index % 2 ? <code key={index}>{chunk}</code> : <span key={index}>{chunk}</span>
  );
}

function ProblemPane({ problem, solved }) {
  return (
    <div className="Problem">
      <div className="Problem-head">
        <h1 className="Problem-title">{problem.title}</h1>
        {solved && <span className="Problem-solved">Solved</span>}
      </div>

      <div className="Problem-tags">
        <span className={`Problem-level Problem-level-${problem.level}`}>{problem.level}</span>
        {problem.topics.map((topic) => (
          <span key={topic} className="Problem-topic">
            {topic}
          </span>
        ))}
      </div>

      {problem.statement.map((paragraph, index) => (
        <p key={index} className="Problem-text">
          <Prose text={paragraph} />
        </p>
      ))}

      {problem.examples.map((example, index) => (
        <div key={index} className="Problem-example">
          <div className="Problem-example-label">Example {index + 1}</div>
          <div className="Problem-example-row">
            <span>Input</span>
            <code>{example.input}</code>
          </div>
          <div className="Problem-example-row">
            <span>Output</span>
            <code>{example.output}</code>
          </div>
          {example.explanation && (
            <p className="Problem-example-note">{example.explanation}</p>
          )}
        </div>
      ))}

      <div className="Problem-constraints">
        <div className="Problem-example-label">Constraints</div>
        <ul>
          {problem.constraints.map((constraint, index) => (
            <li key={index}>
              <Prose text={constraint} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ProblemPane;
