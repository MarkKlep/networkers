import { useEffect, useState } from 'react';
import CommentList from './CommentList';
import CommentCreate from './CommentCreate';
import CompanyBadge from './CompanyBadge';

const TYPE_LABELS = {
  referral: 'Looking for an intro',
  question: 'Question',
  offer: 'Offering to refer',
};

// Threads puts a timestamp next to the author. There is no author here, so the
// company carries that slot and the age of the post sits beside it.
function relativeTime(iso) {
  if (!iso) return '';

  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';

  const units = [
    ['w', 604800],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ];

  for (const [suffix, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${suffix}`;
  }
  return 'now';
}

function Post({ post, onCommentAdded, showCompany }) {
  const [comments, setComments] = useState(post.comments);

  // Merge instead of replace: the query service's view is only eventually
  // consistent (populated via the event bus), so a refetch right after adding
  // a comment can still be missing it. Keep whatever we've already shown and
  // layer the authoritative list on top by id.
  useEffect(() => {
    setComments((current) => {
      const byId = new Map(current.map((comment) => [comment.id, comment]));
      post.comments.forEach((comment) => byId.set(comment.id, comment));
      return Array.from(byId.values());
    });
  }, [post.comments]);

  const handleCommentCreated = (comment) => {
    setComments((current) => [...current, comment]);
    onCommentAdded();

    // The comment shows in full at first - flaggedTerms only arrive once the
    // moderation service's verdict has round-tripped through the event bus,
    // which is slower than the immediate refetch above. One delayed follow-up
    // refetch is enough to pick up any masking.
    setTimeout(onCommentAdded, 1500);
  };

  const type = post.type || 'referral';
  const replies = comments.length;

  return (
    <article className="Thread">
      <div className="Thread-row">
        {/* The gutter holds the avatar and the connector line that runs down
            into the replies - the detail that makes a Threads feed read as
            threads rather than as a list. */}
        <div className="Thread-gutter">
          <CompanyBadge name={post.company} size="lg" tint={type} />
          {replies > 0 && <div className="Thread-line" />}
        </div>

        <div className="Thread-body">
          <div className="Thread-head">
            <span className={`Thread-kind Thread-kind-${type}`}>
              {TYPE_LABELS[type] || TYPE_LABELS.referral}
            </span>
            <span className="Thread-meta">
              {showCompany && post.company ? `${post.company} · ` : ''}
              {relativeTime(post.createdAt)}
            </span>
          </div>

          <p className="Thread-text">{post.title}</p>

          <div className="Thread-count">
            {replies === 0 ? 'No replies yet' : `${replies} ${replies === 1 ? 'reply' : 'replies'}`}
          </div>
        </div>
      </div>

      <CommentList comments={comments} />
      <CommentCreate postId={post.id} onCreated={handleCommentCreated} />
    </article>
  );
}

export default Post;
