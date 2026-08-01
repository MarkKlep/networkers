import { useEffect, useState } from 'react';
import { resolveCompanyLogo } from './companyLogo';

// Shows the real company logo when one can be found, and the existing
// colour-coded monogram otherwise - never a broken image icon. The monogram
// renders immediately (no network round trip needed to show *something*),
// and is swapped for the real logo if and when one resolves.
function CompanyBadge({ name, size = 'md', tint }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);

    resolveCompanyLogo(name).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  const showLogo = src && !failed;
  const className = `CompanyBadge CompanyBadge-${size}${tint ? ` Avatar-${tint}` : ''}`;

  if (showLogo) {
    return (
      <img
        className={className}
        src={src}
        alt=""
        // A resolved domain doesn't guarantee the favicon actually exists -
        // fall back to the monogram rather than show a broken image.
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default CompanyBadge;
