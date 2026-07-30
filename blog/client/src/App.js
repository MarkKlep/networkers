import { useEffect, useState, useCallback } from 'react';
import PostCreate from './PostCreate';
import PostList from './PostList';
import './App.css';

const POSTS_URL = 'http://localhost:3000';

function App() {
  const [posts, setPosts] = useState({});

  const fetchPosts = useCallback(async () => {
    const response = await fetch(`${POSTS_URL}/posts`);
    const data = await response.json();
    setPosts(data);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="App">
      <h1>Blog</h1>
      <PostCreate onCreated={fetchPosts} />
      <PostList posts={posts} onCommentAdded={fetchPosts} />
    </div>
  );
}

export default App;
