import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import App from './App';

// Real Google Identity Services needs a live script + a real click-through
// no test environment can drive. The mock keeps the same contract -
// GoogleLogin's onSuccess receives { credential: <ID token> } - and the
// client no longer decodes that token itself (auth/index.js does, server
// side), so any placeholder string exercises every client-side path.
jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => children,
  GoogleLogin: ({ onSuccess }) => (
    <button onClick={() => onSuccess({ credential: 'fake-google-credential' })}>
      Sign in with Google (test)
    </button>
  ),
}));

const DEFAULT_USER = { id: 'u1', name: 'Jane Smith', email: 'jane@example.com', picture: null };

function authSuccess(user = DEFAULT_USER) {
  return { ok: true, body: { token: 'test-token', user, exp: Math.floor(Date.now() / 1000) + 3600 } };
}

function renderAt(path) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );
}

// Each page fans out to several services that return different shapes, so the
// mock answers per endpoint instead of one catch-all value. `auth` lets a
// test override any of the three auth endpoints (e.g. to simulate a 401).
function mockServices({ connections = [], posts = [], knownCompanies = [], auth = {} } = {}) {
  global.fetch = jest.fn((url) => {
    let result = { ok: true, body: {} };

    if (url.includes('4007/auth/register')) {
      result = auth.register || authSuccess();
    } else if (url.includes('4007/auth/login')) {
      result = auth.login || authSuccess();
    } else if (url.includes('4007/auth/google')) {
      result = auth.google || authSuccess();
    } else if (url.includes('4006') && url.includes('/companies')) {
      result = { ok: true, body: { companies: knownCompanies } };
    } else if (url.includes('4006') && url.includes('/connections')) {
      result = { ok: true, body: { total: connections.length, connections } };
    } else if (url.includes('4006') && url.includes('/search')) {
      result = { ok: true, body: { matches: connections } };
    } else if (url.includes('/status')) {
      result = { ok: true, body: { total: connections.length, withoutCompany: 0, savedAt: null } };
    } else if (url.includes('4002') && url.includes('/companies')) {
      result = { ok: true, body: [] };
    } else if (url.includes('/posts')) {
      result = { ok: true, body: posts };
    }

    return Promise.resolve({ ok: result.ok, json: () => Promise.resolve(result.body) });
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test('home page asks which company you want to work at', async () => {
  mockServices();
  renderAt('/');

  expect(
    await screen.findByRole('heading', { name: /where do you want to work/i })
  ).toBeInTheDocument();
});

test('a company page shows both the people you know and the discussion', async () => {
  mockServices({
    connections: [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'Stripe',
        position: 'Engineer',
        url: 'https://linkedin.com/in/janesmith',
        connectedOn: '11 Mar 2019',
      },
    ],
    posts: [
      { id: 'p1', title: 'How is the interview loop?', company: 'Stripe', type: 'question', comments: [] },
    ],
  });

  renderAt('/company/Stripe');

  expect(await screen.findByRole('heading', { name: 'Stripe' })).toBeInTheDocument();
  // the referral half
  expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
  // the discussion half
  expect(await screen.findByText('How is the interview loop?')).toBeInTheDocument();
});

// The gap this app exists to close: knowing nobody somewhere should lead
// straight into asking, not into a dead end.
test('knowing nobody at a company points you at asking instead', async () => {
  mockServices({ connections: [], posts: [] });
  renderAt('/company/Stripe');

  expect(
    await screen.findByText(/none of your connections list stripe/i)
  ).toBeInTheDocument();
  // Posting requires signing in, so the panel shows instead of the form.
  expect(await screen.findByText(/sign in to post about stripe/i)).toBeInTheDocument();
  expect(screen.queryByPlaceholderText(/your post about stripe/i)).not.toBeInTheDocument();
});

test('signing in with Google reveals the post form and the nav shows who you are', async () => {
  mockServices({ connections: [], posts: [] });
  renderAt('/company/Stripe');

  await screen.findByText(/sign in to post about stripe/i);
  fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

  expect(await screen.findByPlaceholderText(/your post about stripe/i)).toBeInTheDocument();
  expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
});

test('creating an account with email and password signs you in', async () => {
  mockServices({ connections: [], posts: [], auth: { register: authSuccess({ ...DEFAULT_USER, name: 'New Person' }) } });
  renderAt('/company/Stripe');

  await screen.findByText(/sign in to post about stripe/i);
  fireEvent.click(screen.getByRole('button', { name: /create one/i }));

  fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'New Person' } });
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'correcthorse' } });
  fireEvent.change(screen.getByPlaceholderText('Repeat password'), { target: { value: 'correcthorse' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  expect(await screen.findByText('New Person')).toBeInTheDocument();
  expect(await screen.findByPlaceholderText(/your post about stripe/i)).toBeInTheDocument();
});

test('mismatched passwords are caught before registering, not after', async () => {
  mockServices({ connections: [], posts: [] });
  renderAt('/company/Stripe');

  await screen.findByText(/sign in to post about stripe/i);
  fireEvent.click(screen.getByRole('button', { name: /create one/i }));

  fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'New Person' } });
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'correcthorse' } });
  fireEvent.change(screen.getByPlaceholderText('Repeat password'), { target: { value: 'different-typo' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  // The mismatch is caught client-side before any request goes out - confirm
  // /auth/register was never actually called, not just that the UI stayed put.
  expect(global.fetch).not.toHaveBeenCalledWith(
    expect.stringContaining('/auth/register'),
    expect.anything()
  );
  expect(screen.queryByPlaceholderText(/your post about stripe/i)).not.toBeInTheDocument();
});

test('a failed login shows the error instead of silently doing nothing', async () => {
  mockServices({
    connections: [],
    posts: [],
    auth: { login: { ok: false, body: { error: 'Invalid email or password.' } } },
  });
  renderAt('/company/Stripe');

  await screen.findByText(/sign in to post about stripe/i);
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'jane@example.com' } });
  const passwordInput = screen.getByPlaceholderText('Password');
  fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
  // "Sign in" also names the nav's collapsed toggle button - scope to the
  // form itself so the query only matches its submit button.
  fireEvent.click(within(passwordInput.closest('form')).getByRole('button', { name: /^sign in$/i }));

  expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  // Still signed out - the form never unlocks on a failed attempt.
  expect(screen.queryByPlaceholderText(/your post about stripe/i)).not.toBeInTheDocument();
});

test('an expired stored session is treated as signed out', async () => {
  localStorage.setItem(
    'session',
    JSON.stringify({ token: 'x', user: DEFAULT_USER, exp: Math.floor(Date.now() / 1000) - 60 })
  );
  mockServices({ connections: [], posts: [] });
  renderAt('/company/Stripe');

  expect(await screen.findByText(/sign in to post about stripe/i)).toBeInTheDocument();
});

test('connections page is reachable for managing the export', async () => {
  mockServices();
  renderAt('/connections');

  expect(
    await screen.findByRole('heading', { name: /your connections/i })
  ).toBeInTheDocument();
});

test('the connections table lists everyone and the filter narrows it by company', async () => {
  mockServices({
    connections: [
      { firstName: 'Jane', lastName: 'Smith', company: 'Stripe, Inc.', position: 'Engineer', connectedOn: '11 Mar 2019', url: '' },
      { firstName: 'Bob', lastName: 'Lee', company: 'Stripe', position: 'PM', connectedOn: '02 Aug 2021', url: '' },
      { firstName: 'Tom', lastName: 'Brown', company: 'Meta', position: 'Engineer', connectedOn: '03 Feb 2022', url: '' },
    ],
  });
  renderAt('/connections');

  await screen.findByRole('heading', { name: /your connections/i });
  expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
  expect(screen.getByText('Bob Lee')).toBeInTheDocument();
  expect(screen.getByText('Tom Brown')).toBeInTheDocument();
  expect(screen.getByText('3 of 3')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText(/filter by company/i), { target: { value: 'stripe' } });

  // Client-side filter, case-insensitive substring on company - both Stripe
  // variants match, Meta drops out, and the count reflects the narrowed list.
  expect(await screen.findByText('2 of 3 at "stripe"')).toBeInTheDocument();
  expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  expect(screen.getByText('Bob Lee')).toBeInTheDocument();
  expect(screen.queryByText('Tom Brown')).not.toBeInTheDocument();
});
