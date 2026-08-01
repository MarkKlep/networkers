import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionsUpload from './ConnectionsUpload';
import CompanyBadge from '../CompanyBadge';
import { REFERRALS_URL } from '../config';

// Managing the imported LinkedIn export. Searching a specific company happens
// on the company page instead, so this is just "what have I loaded, and where
// do I already know someone".
function ConnectionsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [companies, setCompanies] = useState([]);

  const load = useCallback(async () => {
    const [statusRes, companiesRes] = await Promise.all([
      fetch(`${REFERRALS_URL}/status`),
      fetch(`${REFERRALS_URL}/companies`),
    ]);
    setStatus(await statusRes.json());
    const data = await companiesRes.json();
    setCompanies(data.companies || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLoaded = () => {
    setReplacing(false);
    load();
  };

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
        </>
      )}
    </>
  );
}

export default ConnectionsPage;
