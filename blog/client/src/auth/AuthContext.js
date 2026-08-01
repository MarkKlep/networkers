import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_URL } from '../config';

const AuthContext = createContext(null);
const STORAGE_KEY = 'session';

// The auth service already hands back { token, user, exp } - user and exp
// come from *its* verified record, not from decoding anything ourselves, so
// there's nothing to decode here. exp is only used for a client-side "is
// this obviously stale" check for UX; the real check is always /auth/verify,
// which every post/comment write goes through server-side regardless.
function readSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (session.exp && session.exp * 1000 < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

async function postJSON(path, body) {
  const response = await fetch(`${AUTH_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  // A sign-in in one tab should sign in every other open tab, and a
  // sign-out should sign all of them out too.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setSession(readSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => {
    const persist = (result) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      setSession(result);
    };

    return {
      user: session?.user || null,
      idToken: session?.token || null,
      register: (name, email, password) =>
        postJSON('/auth/register', { name, email, password }).then(persist),
      login: (email, password) =>
        postJSON('/auth/login', { email, password }).then(persist),
      signInWithGoogle: (credentialResponse) =>
        postJSON('/auth/google', { idToken: credentialResponse.credential }).then(persist),
      signOut: () => {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      },
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
