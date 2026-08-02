import { TUTOR_URL } from '../config';

// Talks to the tutor service, which talks to a local Ollama model. Everything
// here is written against the service's shape rather than Ollama's, so moving
// the model somewhere else is a change to tutor/index.js and not to this file.

export const loadTutorStatus = async () => {
  try {
    const response = await fetch(`${TUTOR_URL}/status`);
    if (!response.ok) throw new Error(`Tutor service returned ${response.status}`);
    return await response.json();
  } catch (err) {
    return {
      ready: false,
      model: '',
      models: [],
      error:
        "Can't reach the tutor service on port 4008. Start it with `npm run dev` from the repo root.",
    };
  }
};

// The reply streams token by token: a local 7B model is readable as it types,
// and waiting for the whole answer means several seconds of nothing. onText is
// called with each fragment; the promise settles when the reply is complete.
export async function streamChat({ problem, code, result, messages, signal, onText }) {
  const response = await fetch(`${TUTOR_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, code, result, messages }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Tutor service returned ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    // SSE frames are separated by a blank line, and a chunk can split one in
    // half - so hold the remainder over to the next read.
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.split('\n').find((part) => part.startsWith('data: '));
      if (!line) continue;

      const event = JSON.parse(line.slice(6));
      if (event.error) throw new Error(event.error);
      if (event.text) onText(event.text);
    }
  }
}

export async function requestReview({ problem, code, result, transcript }) {
  const response = await fetch(`${TUTOR_URL}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, code, result, transcript }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Tutor service returned ${response.status}`);
  return body;
}

// The tutor needs to know what the run actually did, but the full case list is
// mostly noise - the first failure is what a hint should be about.
export function summariseResult(result) {
  if (!result) return null;

  const passed = result.cases.filter((item) => item.status === 'passed').length;
  const failure = result.cases.find((item) => item.status !== 'passed');

  return {
    passed,
    total: result.cases.length,
    firstFailure: failure
      ? {
          input: failure.test.args.map((arg) => JSON.stringify(arg)).join(', '),
          expected: JSON.stringify(failure.test.expected),
          received: JSON.stringify(failure.received),
          error: failure.error || '',
        }
      : null,
  };
}

// Only the fields the prompt actually uses. Sending the whole problem object
// would ship the hidden tests to the model, which would let it leak them.
export const promptProblem = (problem) => ({
  title: problem.title,
  level: problem.level,
  statement: problem.statement,
  functionName: problem.functionName,
  examples: problem.examples,
});
