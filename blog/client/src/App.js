import { useEffect, useState, useCallback } from 'react';
import PostCreate from './PostCreate';
import PostList from './PostList';
import './App.css';

const QUERY_URL = 'http://localhost:4002';

function App() {
  const [posts, setPosts] = useState([]);

  // Merge instead of replace: the query service builds its view from events
  // it may not have processed yet (e.g. right after a post/comment was just
  // created), so a fetch can still be missing something we already know
  // about. Layer the authoritative list on top by id instead of dropping it.
  const fetchPosts = useCallback(async () => {
    const response = await fetch(`${QUERY_URL}/posts`);
    const data = await response.json();
    setPosts((current) => {
      const byId = new Map(current.map((post) => [post.id, post]));
      data.forEach((post) => byId.set(post.id, post));
      return Array.from(byId.values());
    });
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostCreated = (post) => {
    setPosts((current) => [...current, { ...post, comments: [] }]);
    fetchPosts();
  };

  return (
    <div className="App">
      <h1>Blog</h1>
      <PostCreate onCreated={handlePostCreated} />
      <PostList posts={posts} onCommentAdded={fetchPosts} />
    </div>
  );
}

export default App;
