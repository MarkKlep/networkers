import { useEffect, useRef, useState } from 'react';
import { loadTutorStatus, promptProblem, streamChat } from './tutor';
import { clearChat, saveChat } from './progress';
import ReviewCard from './ReviewCard';

// The coach panel: ask for a hint while you work, and read the review of a
// submitted solution. Both live here because they are one conversation - the
// review is a judgement on how that conversation went, not a separate feature.
//
// Messages are owned by Workspace, not by this component: the review needs the
// transcript at submit time, and Workspace is what knows a submit happened.
function TutorPanel({ problem, code, result, messages, onMessages, review, reviewing, reviewError }) {
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  // Whether Ollama is running is the first thing worth knowing, and it can
  // change while the page is open (they start it after seeing the message), so
  // it is re-checked when a send fails rather than only on mount.
  useEffect(() => {
    let live = true;
    loadTutorStatus().then((next) => live && setStatus(next));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    saveChat(problem.id, messages);
  }, [problem.id, messages]);

  // Pin to the newest message as tokens arrive, the way a chat should behave.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, review, reviewing]);

  // A stream left running after the panel unmounts writes into dead state and
  // keeps the model busy; Workspace remounts on every problem switch.
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (event) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || streaming) return;

    const asked = [...messages, { role: 'user', content: question }];
    setDraft('');
    setError('');
    setStreaming(true);
    // The empty assistant message is the target the stream fills in, so the
    // reply appears to type rather than arriving all at once at the end.
    onMessages([...asked, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let reply = '';
      await streamChat({
        problem: promptProblem(problem),
        code,
        result,
        messages: asked,
        signal: controller.signal,
        onText: (text) => {
          reply += text;
          onMessages([...asked, { role: 'assistant', content: reply }]);
        },
      });

      // A reply that streamed nothing at all would otherwise sit as a blank
      // bubble with no explanation.
      if (!reply.trim()) {
        onMessages(asked);
        setError('The model returned an empty reply. Try asking again.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onMessages(asked);
        setError(err.message);
        loadTutorStatus().then(setStatus);
      }
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    if (messages.length && !window.confirm('Clear this conversation?')) return;
    clearChat(problem.id);
    onMessages([]);
    setError('');
  };

  const blocked = status && !status.ready;

  return (
    <div className="Tutor">
      <div className="Tutor-head">
        <span className="Tutor-title">Coach</span>
        {status?.ready && <span className="Tutor-model">{status.model}</span>}
        {messages.length > 0 && (
          <button type="button" className="Tutor-clear" onClick={reset}>
            Clear
          </button>
        )}
      </div>

      <div className="Tutor-log" ref={scrollRef}>
        {/* Setup problems are the expected first-run state, not an edge case -
            Ollama is a separate program the user has to install and start. */}
        {blocked && <div className="Tutor-setup">{status.error}</div>}

        {!blocked && messages.length === 0 && !review && !reviewing && (
          <div className="Tutor-empty">
            Stuck? Ask for a nudge — it gives the smallest hint that helps, and won't
            hand you the answer. Submit and it reviews what you wrote.
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`Tutor-message Tutor-message-${message.role}`}>
            {message.content}
            {streaming && index === messages.length - 1 && message.role === 'assistant' && (
              <span className="Tutor-caret" />
            )}
          </div>
        ))}

        {reviewing && <div className="Tutor-reviewing">Reviewing your solution…</div>}
        {reviewError && <div className="Tutor-error">{reviewError}</div>}
        {review && <ReviewCard review={review} />}
        {error && <div className="Tutor-error">{error}</div>}
      </div>

      <form className="Tutor-compose" onSubmit={send}>
        <input
          type="text"
          aria-label="Ask the coach"
          placeholder={blocked ? 'Start Ollama to ask' : 'Ask for a hint…'}
          value={draft}
          disabled={blocked || streaming}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={blocked || streaming || !draft.trim()}>
          {streaming ? '…' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

export default TutorPanel;
