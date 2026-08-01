import CommentContent from './CommentContent';
import PersonAvatar from './PersonAvatar';

// Replies sit in the same gutter grid as their post, so the connector line
// coming down from the post's avatar lands on each reply's own avatar.
// This used to be a small identity-less dot - that was correct when the app
// had no accounts, but now a comment has a real author, so it shows them.
function CommentList({ comments }) {
  if (!comments.length) {
    return null;
  }

  return (
    <div className="Replies">
      {comments.map((comment) => (
        <div className="Thread-row Reply" key={comment.id}>
          {/* The connector through the replies is drawn in CSS on the gutter,
              so each segment meets the next one exactly at the avatar's
              centre instead of leaving gaps between rows. */}
          <div className="Thread-gutter">
            <PersonAvatar name={comment.authorName} picture={comment.authorPicture} size="reply" />
          </div>

          <div className="Thread-body">
            {comment.authorName && (
              <div className="Reply-author">{comment.authorName}</div>
            )}
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
