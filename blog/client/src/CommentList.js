function CommentList({ comments }) {
  if (!comments.length) {
    return <p className="CommentList-empty">No comments yet.</p>;
  }

  return (
    <ul className="CommentList">
      {comments.map((comment) => (
        <li key={comment.id} className={`Comment Comment-${comment.status || 'approved'}`}>
          {comment.content}
          {comment.status === 'pending' && (
            <span className="Comment-status"> (pending review)</span>
          )}
          {comment.status === 'rejected' && (
            <span className="Comment-status"> (flagged by moderation)</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default CommentList;
