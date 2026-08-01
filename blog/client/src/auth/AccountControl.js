import { useState } from 'react';
import AuthPanel from './AuthPanel';
import { useAuth } from './AuthContext';

// Signing in - by either method - *is* registering. There's no separate
// "create your account" step outside this panel: the first time a person's
// Google account or a freshly-chosen email/password pair is seen is the
// first time our services know that person exists at all.
function AccountControl() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (user) {
    return (
      <div className="Account">
        {user.picture && <img className="Account-avatar" src={user.picture} alt="User Icon" />}
        <span className="Account-name">{user.name}</span>
        <button className="Account-signout" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="Account">
      <button className="Account-signin" onClick={() => setOpen((current) => !current)}>
        Sign in
      </button>
      {open && (
        <div className="Account-panel">
          <AuthPanel />
        </div>
      )}
    </div>
  );
}

export default AccountControl;
