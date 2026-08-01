import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './HomePage';
import CompanyPage from './CompanyPage';
import ConnectionsPage from './referrals/ConnectionsPage';
import AccountControl from './auth/AccountControl';
import './App.css';

// The company is the unit the whole app is organised around: a company page
// joins the people you know there (referrals service) with what people are
// asking about it (posts/comments/query services). Those backends share no
// data and stay decoupled - the client is what composes them.
function App() {
  return (
    <div className="App">
      <nav className="Nav">
        <div className="Nav-links">
          <NavLink to="/" end>
            Companies
          </NavLink>
          <NavLink to="/connections">Your connections</NavLink>
        </div>
        <AccountControl />
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/company/:name" element={<CompanyPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
      </Routes>
    </div>
  );
}

export default App;
