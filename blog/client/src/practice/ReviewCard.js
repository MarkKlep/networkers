// The submitted-solution review. Scores are 1-5 and rendered as filled pips
// rather than a number out of five, so the shape of the four dimensions reads
// at a glance without doing arithmetic.
//
// `process` is the thought-process score, judged from the conversation rather
// than the code. It is null when there was no conversation - a solution written
// without asking anything has nothing to judge, and inventing a score for it
// would be worse than leaving it out.
const DIMENSIONS = [
  ['correctness', 'Correctness'],
  ['efficiency', 'Efficiency'],
  ['clarity', 'Clarity'],
  ['process', 'Process'],
];

function Pips({ score }) {
  return (
    <span className="Review-pips" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <span key={step} className={step <= score ? 'Review-pip Review-pip-on' : 'Review-pip'} />
      ))}
    </span>
  );
}

function ReviewCard({ review }) {
  const { verdict, scores, complexity, strengths, improvements } = review;

  return (
    <div className="Review">
      <div className="Review-head">Review</div>

      {verdict && <p className="Review-verdict">{verdict}</p>}

      <div className="Review-scores">
        {DIMENSIONS.map(([key, label]) =>
          scores[key] == null ? null : (
            <div key={key} className="Review-score">
              <span className="Review-label">{label}</span>
              <Pips score={scores[key]} />
            </div>
          )
        )}
      </div>

      {(complexity.time || complexity.space) && (
        <div className="Review-complexity">
          {complexity.time && <span>Time {complexity.time}</span>}
          {complexity.space && <span>Space {complexity.space}</span>}
        </div>
      )}

      {strengths.length > 0 && (
        <>
          <div className="Review-section">What worked</div>
          <ul className="Review-list">
            {strengths.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {improvements.length > 0 && (
        <>
          <div className="Review-section">What to improve</div>
          <ul className="Review-list">
            {improvements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default ReviewCard;
