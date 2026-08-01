import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PostCreate from './PostCreate';
import PostList from './PostList';
import ConnectionList from './referrals/ConnectionList';
import CompanyBadge from './CompanyBadge';
import { QUERY_URL, REFERRALS_URL } from './config';

// LinkedIn only exports your 1st-degree connections, so friends-of-friends
// can't be listed here. Their own search can filter to 2nd degree and names
// the mutual who could introduce you.
function secondDegreeUrl(company) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    company
  )}&network=${encodeURIComponent('["S"]')}`;
}

// The whole point of the app in one screen: for a company you care about,
// who do you already know there, and what is everyone else asking about it.
// The two halves come from two independent services and are joined here in
// the client rather than by coupling the services to each other.
function CompanyPage() {
  const { name } = useParams();
  const company = decodeURIComponent(name);

  const [connections, setConnections] = useState(null);
  const [posts, setPosts] = useState([]);

  const fetchPosts = useCallback(async () => {
    const response = await fetch(
      `${QUERY_URL}/posts?company=${encodeURIComponent(company)}`
    );
    const data = await response.json();
    setPosts((current) => {
      const byId = new Map(current.map((post) => [post.id, post]));
      data.forEach((post) => byId.set(post.id, post));
      return Array.from(byId.values());
    });
  }, [company]);

  useEffect(() => {
    setPosts([]);
    setConnections(null);

    (async () => {
      const response = await fetch(
        `${REFERRALS_URL}/search?company=${encodeURIComponent(company)}`
      );
      const data = await response.json();
      setConnections(data.matches || []);
    })();

    fetchPosts();
  }, [company, fetchPosts]);

  const handlePostCreated = (post) => {
    setPosts((current) => [...current, { ...post, comments: [] }]);
    fetchPosts();
  };

  return (
    <>
      <Link className="Back" to="/">
        <span aria-hidden="true">←</span> All companies
      </Link>

      <div className="CompanyHead">
        <CompanyBadge name={company} size="xl" />
        <h1>{company}</h1>
      </div>

      <section>
        <h2>People you know there</h2>

        {connections === null && <p className="Empty">Checking your connections…</p>}

        {connections !== null &&
          (connections.length ? (
            <ConnectionList connections={connections} />
          ) : (
            <p className="Empty">
              None of your connections list {company}. Ask below whether anyone can
              introduce you.
            </p>
          ))}

        <div className="Second">
          <p className="Second-note">
            Your export only contains direct connections, so friends-of-friends
            aren't listed here.
          </p>
          <a
            className="Link Link-external"
            href={secondDegreeUrl(company)}
            target="_blank"
            rel="noreferrer"
          >
            Search 2nd-degree connections at {company} on LinkedIn
            <span aria-hidden="true"> ↗</span>
            <span className="sr-only"> (opens LinkedIn in a new tab)</span>
          </a>
        </div>
      </section>

      <section>
        <h2>Discussion</h2>
        <PostCreate company={company} onCreated={handlePostCreated} />
        <PostList
          posts={posts}
          onCommentAdded={fetchPosts}
          emptyText={`Nothing about ${company} yet. Start the conversation above.`}
        />
      </section>
    </>
  );
}

export default CompanyPage;
