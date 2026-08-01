// A real person's avatar (their Google photo), with the same "monogram
// fallback, never a broken image" approach as CompanyBadge - except here the
// fallback also covers comments made before sign-in existed, which have no
// author on file at all.
import { useState } from 'react';

function PersonAvatar({ name, picture, size = 'reply' }) {
  const [failed, setFailed] = useState(false);
  const className = `PersonAvatar PersonAvatar-${size}`;

  if (picture && !failed) {
    return (
      <img
        className={className}
        src={picture}
        alt=""
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

export default PersonAvatar;
