// The three difficulty bands a practice session can be run at. Exported so the
// task-fetching code added later has one source of truth for the level values
// it will send, rather than re-typing the strings.
export const LEVELS = [
  {
    value: 'amateur',
    label: 'Amateur',
    summary: 'Arrays, strings, hash maps',
    detail: 'One idea per problem, no tricky edge cases. Think two pointers and counting.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    summary: 'Trees, sorting, binary search',
    detail: 'Problems that need the right data structure before they need the right loop.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    summary: 'Graphs, DP, greedy proofs',
    detail: 'Interview-hard: several moving parts, and a naive solution that times out.',
  },
];

// Real radio inputs behind the cards - same trick as the post-type segments, so
// arrow keys, tab order and screen reader semantics survive the restyling.
function LevelSelect({ value, onChange }) {
  return (
    <fieldset className="Levels">
      <legend className="sr-only">Difficulty level</legend>
      {LEVELS.map((level) => (
        <label key={level.value} className="Level">
          <input
            type="radio"
            name="practice-level"
            value={level.value}
            checked={value === level.value}
            onChange={(event) => onChange(event.target.value)}
          />
          <span className="Level-card">
            <span className="Level-label">{level.label}</span>
            <span className="Level-summary">{level.summary}</span>
            <span className="Level-detail">{level.detail}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export default LevelSelect;
