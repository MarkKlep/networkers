import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

// Each page fans out to several services that return different shapes, so the
// mock answers per endpoint instead of one catch-all value.
function mockServices({ connections = [], posts = [], knownCompanies = [] } = {}) {
  global.fetch = jest.fn((url) => {
    let body = {};

    if (url.includes('4006') && url.includes('/companies')) {
      body = { companies: knownCompanies };
    } else if (url.includes('4006') && url.includes('/search')) {
      body = { matches: connections };
    } else if (url.includes('/status')) {
      body = { total: connections.length, withoutCompany: 0, savedAt: null };
    } else if (url.includes('4002') && url.includes('/companies')) {
      body = [];
    } else if (url.includes('/posts')) {
      body = posts;
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
}

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
  expect(screen.getByPlaceholderText(/your post about stripe/i)).toBeInTheDocument();
});

test('connections page is reachable for managing the export', async () => {
  mockServices();
  renderAt('/connections');

  expect(
    await screen.findByRole('heading', { name: /your connections/i })
  ).toBeInTheDocument();
});
