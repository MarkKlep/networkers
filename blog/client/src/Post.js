import { useEffect, useState } from 'react';
import CommentList from './CommentList';
import CommentCreate from './CommentCreate';

function Post({ post, onCommentAdded }) {
  const [comments, setComments] = useState(post.comments);

  // Merge instead of replace: the posts service's comment cache is only
  // eventually consistent (populated via the event bus), so a refetch right
  // after adding a comment can still be missing it. Keep whatever we've
  // already shown and layer the authoritative list on top by id.
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

    // The comment shows in full at first - flaggedTerms only arrive once
    // the moderation service's verdict has round-tripped through the event
    // bus, which is slower than the immediate refetch above. One delayed
    // follow-up refetch is enough to pick up any masking without building
    // out a full polling mechanism.
    setTimeout(onCommentAdded, 1500);
  };

  return (
    <div className="Post">
      <h3>{post.title}</h3>
      <CommentList comments={comments} />
      <CommentCreate postId={post.id} onCreated={handleCommentCreated} />
    </div>
  );
}

export default Post;
