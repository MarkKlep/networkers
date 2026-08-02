import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './HomePage';
import CompanyPage from './CompanyPage';
import ConnectionsPage from './referrals/ConnectionsPage';
import PracticePage from './practice/PracticePage';
import AccountControl from './auth/AccountControl';
import './App.css';

// The company is the unit the whole app is organised around: a company page
// joins the people you know there (referrals service) with what people are
// asking about it (posts/comments/query services). Those backends share no
// data and stay decoupled - the client is what composes them.
function App() {
  // Page content is a narrow reading column - except the practice workspace,
  // which puts a problem statement and an editor side by side and needs the
  // window. Widening the shell here beats having the workspace fight its way
  // out with viewport-width tricks, which overflow once a scrollbar exists.
  //
  // The nav sits outside that container on purpose: it is chrome, not content,
  // so it keeps one width on every route rather than snapping narrow the moment
  // you leave /practice.
  const wide = useLocation().pathname.startsWith('/practice');

  return (
    <>
      <div className="NavBar">
        <nav className="Nav">
          <div className="Nav-links">
            <NavLink to="/practice" end>
              Practice
            </NavLink>
            <NavLink to="/" end>
              Companies
            </NavLink>
            <NavLink to="/connections">
              Your connections
            </NavLink>
          </div>
          <AccountControl />
        </nav>
      </div>

      <div className={wide ? 'App App-wide' : 'App'}>
        <Routes>
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/company/:name" element={<CompanyPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
