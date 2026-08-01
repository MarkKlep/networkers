import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CompanyBadge from './CompanyBadge';
import { QUERY_URL, REFERRALS_URL } from './config';

// Two ways in: search any company, or pick one you already have a foothold in.
// "Companies you know people at" comes from your own LinkedIn export, so it is
// the shortest path to an actual referral.
function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [yourCompanies, setYourCompanies] = useState([]);
  const [discussed, setDiscussed] = useState([]);

  useEffect(() => {
    (async () => {
      const [connectionsRes, postsRes] = await Promise.all([
        fetch(`${REFERRALS_URL}/companies`),
        fetch(`${QUERY_URL}/companies`),
      ]);
      const connectionsData = await connectionsRes.json();
      setYourCompanies(connectionsData.companies || []);
      setDiscussed(await postsRes.json());
    })();
  }, []);

  const open = (company) => navigate(`/company/${encodeURIComponent(company)}`);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (query.trim()) open(query.trim());
  };

  return (
    <>
      <h1>Where do you want to work?</h1>
      <p className="subtitle">
        See who you already know at a company, and ask about it if you don't.
      </p>

      <form className="SearchForm" onSubmit={handleSubmit}>
        <input
          className="Search"
          type="text"
          aria-label="Company name"
          placeholder="Company name, e.g. Stripe"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" disabled={!query.trim()}>
          Search
        </button>
      </form>

      <section>
        <h2>Companies you know people at</h2>
        {yourCompanies.length ? (
          <div className="Chips">
            {yourCompanies.slice(0, 12).map(({ company, count }) => (
              <button key={company} className="Chip" onClick={() => open(company)}>
                <CompanyBadge name={company} size="sm" />
                {company} ({count})
              </button>
            ))}
          </div>
        ) : (
          <p className="Empty">
            <Link className="Link" to="/connections">
              Add your LinkedIn connections
            </Link>{' '}
            to see which companies you already have a way into.
          </p>
        )}
      </section>

      <section>
        <h2>Being discussed</h2>
        {discussed.length ? (
          <div className="Chips">
            {discussed.map(({ company, posts }) => (
              <button key={company} className="Chip" onClick={() => open(company)}>
                <CompanyBadge name={company} size="sm" />
                {company} ({posts})
              </button>
            ))}
          </div>
        ) : (
          <p className="Empty">No one has posted about a company yet.</p>
        )}
      </section>
    </>
  );
}

export default HomePage;
