import Post from './Post';

function PostList({ posts, onCommentAdded, showCompany, emptyText }) {
  if (!posts.length) {
    return <p className="PostList-empty">{emptyText || 'Nothing here yet.'}</p>;
  }

  return (
    <div className="PostList">
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          onCommentAdded={onCommentAdded}
          showCompany={showCompany}
        />
      ))}
    </div>
  );
}

export default PostList;
