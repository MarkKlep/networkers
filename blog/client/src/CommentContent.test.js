import { fireEvent, render, screen } from '@testing-library/react';
import CommentContent from './CommentContent';

test('a flagged word is hidden until clicked, and hides again', () => {
  render(
    <CommentContent
      content="the recruiter was an idiot but the team is great"
      flaggedTerms={['idiot']}
    />
  );

  // Masked: the word itself is not in the document, blocks stand in for it.
  expect(screen.queryByText('idiot')).not.toBeInTheDocument();
  const masked = screen.getByTitle('Click to reveal');

  fireEvent.click(masked);
  expect(screen.getByText('idiot')).toBeInTheDocument();

  fireEvent.click(screen.getByTitle('Click to hide'));
  expect(screen.queryByText('idiot')).not.toBeInTheDocument();
});

test('an unflagged comment renders as plain text', () => {
  render(<CommentContent content="the team is great" flaggedTerms={[]} />);

  expect(screen.getByText('the team is great')).toBeInTheDocument();
  expect(screen.queryByTitle('Click to reveal')).not.toBeInTheDocument();
});
