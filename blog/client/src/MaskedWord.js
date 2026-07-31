import { useState } from 'react';

function MaskedWord({ text }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <span
        className="MaskedWord MaskedWord-revealed"
        onClick={() => setRevealed(false)}
        title="Click to hide"
      >
        {text}
      </span>
    );
  }

  return (
    <span className="MaskedWord" onClick={() => setRevealed(true)} title="Click to reveal">
      {'█'.repeat(Math.max(text.length, 3))}
    </span>
  );
}

export default MaskedWord;
