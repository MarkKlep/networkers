import { useState } from 'react';

const POSTS_URL = 'http://localhost:3000';

function PostCreate({ onCreated }) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${POSTS_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const post = await response.json();
      setTitle('');
      onCreated(post);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="PostCreate" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="New post title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" disabled={submitting}>
        Create post
      </button>
    </form>
  );
}

export default PostCreate;
