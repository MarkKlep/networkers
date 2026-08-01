import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from './AuthContext';

// Both sign-in paths in one place: Google, or an email/password form that
// toggles between login and register. Used identically in the nav (behind a
// "Sign in" button) and inline wherever a post/comment prompt needs it -
// there's exactly one sign-in UI in the app, not one per place it's needed.
function AuthPanel() {
  const { register, login, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // A typo'd password here means a typo'd password forever, since there's
    // no "forgot password" flow to recover with - catching the mismatch
    // before submitting is worth the extra field. Never sent to the server;
    // it's a client-side check only, not part of what auth verifies.
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'register') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="AuthPanel">
      <GoogleLogin
        onSuccess={(credentialResponse) =>
          signInWithGoogle(credentialResponse).catch((err) => setError(err.message))
        }
        onError={() => setError('Google sign-in failed.')}
        size="medium"
        text="signin_with"
      />

      <div className="AuthPanel-divider">or</div>

      <form className="AuthPanel-form" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        {mode === 'register' && (
          <input
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        )}
        <button type="submit" disabled={submitting}>
          {mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        className="AuthPanel-toggle"
        onClick={() => {
          setMode(mode === 'register' ? 'login' : 'register');
          setConfirmPassword('');
          setError('');
        }}
      >
        {mode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
      </button>

      {error && <div className="Error">{error}</div>}
    </div>
  );
}

export default AuthPanel;
