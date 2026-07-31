import CommentContent from './CommentContent';

function CommentList({ comments }) {
  if (!comments.length) {
    return <p className="CommentList-empty">No comments yet.</p>;
  }

  return (
    <ul className="CommentList">
      {comments.map((comment) => (
        <li key={comment.id} className="Comment">
          <CommentContent content={comment.content} flaggedTerms={comment.flaggedTerms} />
        </li>
      ))}
    </ul>
  );
}

export default CommentList;
