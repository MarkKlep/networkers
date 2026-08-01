import { useState } from 'react';
import { POSTS_URL } from './config';
import { useAuth } from './auth/AuthContext';
import AuthPanel from './auth/AuthPanel';

// The three reasons someone posts about a company. `referral` is the default
// because "who can introduce me?" is the question this app exists to answer.
export const POST_TYPES = [
  { value: 'referral', label: 'Looking for an intro' },
  { value: 'question', label: 'Asking about the company' },
  { value: 'offer', label: 'Offering to refer' },
];

function PostCreate({ company, onCreated }) {
  const { user, idToken } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('referral');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${POSTS_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ title, company, type }),
      });
      const post = await response.json();

      if (!response.ok) {
        setError(post.error);
        return;
      }

      setTitle('');
      onCreated(post);
    } finally {
      setSubmitting(false);
    }
  };

  // Posting requires an identity to attach to the post - reading never did
  // and still doesn't. Shown in place of the form, not blocking the page.
  if (!user) {
    return (
      <div className="SignInPrompt">
        <p>Sign in to post about {company}.</p>
        <AuthPanel />
      </div>
    );
  }

  return (
    <form className="PostCreate" onSubmit={handleSubmit}>
      {/* Real radio inputs, visually hidden but still focusable, with the pill
          as their label - so arrow-key navigation, tab order and screen
          reader semantics all survive the restyling. */}
      <fieldset className="Segments">
        <legend className="Segments-legend">What is this post for?</legend>
        {POST_TYPES.map((option) => (
          <label key={option.value} className="Segment">
            <input
              type="radio"
              name={`type-${company}`}
              value={option.value}
              checked={type === option.value}
              onChange={(event) => setType(event.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="PostCreate-row">
        <input
          type="text"
          aria-label={`Your post about ${company}`}
          placeholder={`Your post about ${company}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>

      {error && <div className="Error">{error}</div>}
    </form>
  );
}

export default PostCreate;
