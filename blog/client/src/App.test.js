import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({}) })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the blog heading', async () => {
  render(<App />);
  const heading = await screen.findByText(/blog/i);
  expect(heading).toBeInTheDocument();
});
