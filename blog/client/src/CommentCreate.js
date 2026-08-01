import { useState } from 'react';
import { COMMENTS_URL } from './config';
import { useAuth } from './auth/AuthContext';
import AuthPanel from './auth/AuthPanel';

function CommentCreate({ postId, onCreated }) {
  const { user, idToken } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${COMMENTS_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ content }),
      });
      const comment = await response.json();
      setContent('');
      onCreated(comment);
    } finally {
      setSubmitting(false);
    }
  };

  // Understated on purpose: in Threads the reply composer is a quiet line at
  // the end of a thread, not a bordered form competing with the posts.
  return (
    <div className="Thread-row CommentCreate">
      <div className="Thread-gutter">
        <div className="Avatar Avatar-compose" aria-hidden="true" />
      </div>

      <div className="Thread-body">
        {user ? (
          <form className="CommentCreate-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Reply to this thread"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            {content.trim() && (
              <button type="submit" disabled={submitting}>
                Reply
              </button>
            )}
          </form>
        ) : (
          // Collapsed by default: a company page can have many threads, each
          // with its own reply prompt - showing the full sign-in form under
          // every one of them at once would be a wall of duplicate forms.
          <div className="SignInPrompt SignInPrompt-inline">
            <button type="button" className="Replace" onClick={() => setShowAuth((current) => !current)}>
              Sign in to reply.
            </button>
            {showAuth && <AuthPanel />}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentCreate;
