import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionsUpload from './ConnectionsUpload';
import ConnectionsTable from './ConnectionsTable';
import CompanyBadge from '../CompanyBadge';
import { REFERRALS_URL } from '../config';

// Managing the imported LinkedIn export: what's loaded, which companies you
// have people at (chips - each navigates to that company page, where
// connections and discussion sit together), and the full list as a
// filterable table for scanning/searching across everyone at once.
function ConnectionsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [connections, setConnections] = useState([]);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    const [statusRes, companiesRes, connectionsRes] = await Promise.all([
      fetch(`${REFERRALS_URL}/status`),
      fetch(`${REFERRALS_URL}/companies`),
      fetch(`${REFERRALS_URL}/connections`),
    ]);
    setStatus(await statusRes.json());
    setCompanies((await companiesRes.json()).companies || []);
    setConnections((await connectionsRes.json()).connections || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLoaded = () => {
    setReplacing(false);
    load();
  };

  // Client-side, over the whole list already in memory - a LinkedIn export
  // tops out around a few thousand rows at most, so there's no need for a
  // server round trip per keystroke the way /search (a different, ranked
  // "best match" query) is built for.
  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return connections;
    return connections.filter((person) => (person.company || '').toLowerCase().includes(needle));
  }, [connections, filter]);

  if (!status) {
    return <p className="Empty">Loading…</p>;
  }

  return (
    <>
      <h1>Your connections</h1>
      <p className="subtitle">
        Imported from LinkedIn so the app can tell you where you already know someone.
      </p>

      {!status.total || replacing ? (
        <ConnectionsUpload onLoaded={handleLoaded} />
      ) : (
        <>
          <div className="Loaded">
            {status.total} connections
            {status.savedAt && ` · saved ${new Date(status.savedAt).toLocaleDateString()}`}
            {status.withoutCompany > 0 &&
              ` · ${status.withoutCompany} with no company listed can't be matched`}{' '}
            ·{' '}
            <button className="Replace" onClick={() => setReplacing(true)}>
              upload a newer export
            </button>
          </div>

          <section>
            <h2>Where you know people</h2>
            <div className="Chips">
              {companies.map(({ company, count }) => (
                <button
                  key={company}
                  className="Chip"
                  onClick={() => navigate(`/company/${encodeURIComponent(company)}`)}
                >
                  <CompanyBadge name={company} size="sm" />
                  {company} ({count})
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>All connections</h2>
            <input
              className="Search"
              type="text"
              placeholder="Filter by company"
              aria-label="Filter by company"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <div className="Count">
              {filtered.length} of {connections.length}
              {filter.trim() && ` at "${filter.trim()}"`}
            </div>
            <ConnectionsTable connections={filtered} />
          </section>
        </>
      )}
    </>
  );
}

export default ConnectionsPage;
