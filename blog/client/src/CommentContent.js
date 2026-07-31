import MaskedWord from './MaskedWord';

function escapeForRegExp(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Splits content on the exact substrings moderation flagged (same casing
// and spacing it found them in) and renders each as a click-to-reveal
// MaskedWord, leaving everything else as plain text.
function CommentContent({ content, flaggedTerms }) {
  if (!flaggedTerms || flaggedTerms.length === 0) {
    return content;
  }

  const pattern = new RegExp(
    `(${flaggedTerms.map(escapeForRegExp).join('|')})`,
    'g'
  );
  const parts = content.split(pattern);

  return parts.map((part, index) =>
    flaggedTerms.includes(part) ? (
      <MaskedWord key={index} text={part} />
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

export default CommentContent;
