import { useState } from 'react';
import { COMMENTS_URL } from './config';

function CommentCreate({ postId, onCreated }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${COMMENTS_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <form className="Thread-row CommentCreate" onSubmit={handleSubmit}>
      <div className="Thread-gutter">
        <div className="Avatar Avatar-compose" aria-hidden="true" />
      </div>

      <div className="Thread-body">
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
      </div>
    </form>
  );
}

export default CommentCreate;
