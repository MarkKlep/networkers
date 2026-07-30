import { useState } from 'react';

const COMMENTS_URL = 'http://localhost:4000';

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

  return (
    <form className="CommentCreate" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Add a comment"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <button type="submit" disabled={submitting}>
        Add comment
      </button>
    </form>
  );
}

export default CommentCreate;
