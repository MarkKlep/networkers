function CommentList({ comments }) {
  if (!comments.length) {
    return <p className="CommentList-empty">No comments yet.</p>;
  }

  return (
    <ul className="CommentList">
      {comments.map((comment) => (
        <li key={comment.id}>{comment.content}</li>
      ))}
    </ul>
  );
}

export default CommentList;
