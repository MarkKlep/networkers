import Post from './Post';

function PostList({ posts, onCommentAdded }) {
  if (!posts.length) {
    return <p className="PostList-empty">No posts yet. Create the first one above.</p>;
  }

  return (
    <div className="PostList">
      {posts.map((post) => (
        <Post key={post.id} post={post} onCommentAdded={onCommentAdded} />
      ))}
    </div>
  );
}

export default PostList;
