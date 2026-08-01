import CommentContent from './CommentContent';

// Replies sit in the same gutter grid as their post, so the connector line
// coming down from the post's avatar lands on each reply's own dot.
function CommentList({ comments }) {
  if (!comments.length) {
    return null;
  }

  return (
    <div className="Replies">
      {comments.map((comment) => (
        <div className="Thread-row Reply" key={comment.id}>
          {/* The connector through the replies is drawn in CSS on the gutter,
              so each segment meets the next one exactly at the dot's centre
              instead of leaving gaps between rows. */}
          <div className="Thread-gutter">
            <div className="Avatar Avatar-reply" aria-hidden="true" />
          </div>

          <div className="Thread-body">
            <p className="Thread-text">
              <CommentContent content={comment.content} flaggedTerms={comment.flaggedTerms} />
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CommentList;
