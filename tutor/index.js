require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
// Solutions and chat transcripts are the payload here, so the default 100kb
// express limit is too tight for a long conversation about a long file.
app.use(express.json({ limit: '1mb' }));
app.use(cors());

// The model runs on the user's own machine via Ollama. That is the whole point
// of this service existing in this shape: the practice code you write, the
// questions you ask, and the reasoning in between never leave the machine, so
// the claim in CLAUDE.md - that companyLogo.js is the only thing in this app
// talking to a third party - stays true.
//
// Swapping in a hosted API later means changing `askModel` and `streamModel`
// below and nothing else; the two endpoints and the whole client are written
// against their shape, not against Ollama's.
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const TUTOR_MODEL = process.env.TUTOR_MODEL || 'qwen2.5-coder:7b';

// No sign-in check here, unlike posts/comments. Those gate writes because a
// post is shared with other people; this is a single-user local tool talking to
// a local model, so there is no shared state to protect and no per-request cost
// to meter. If this ever moves to a paid hosted model, that changes - add the
// `requireUser` middleware from blog/posts/index.js at that point.

// Hints are the product, and a hint that hands over the answer isn't one. The
// ladder is explicit because "give a hint" alone reliably produces the full
// solution on the first ask.
const CHAT_SYSTEM = `You are a data-structures-and-algorithms coach. The person is solving a problem themselves and you are helping them get unstuck.

Never give the full solution. Never write the complete function body, and never write code that would pass the tests. If asked outright for the answer, say briefly that you won't and give the next hint instead.

Climb this ladder one rung at a time. Start at the lowest rung that would actually help, and only go higher if they have tried and are still stuck:
1. Ask a question about the problem, or walk one concrete example.
2. Point at the observation that unlocks it, without naming the technique.
3. Name the technique or data structure.
4. Sketch the algorithm's shape in prose - still no code.

If their code is close, point at the specific line or the specific input that breaks it rather than restating the approach. If their code is empty, do not assume they are stuck - ask what they are thinking first.

Prefer a question over a statement. Keep replies under about 120 words. Plain prose, no headings.`;

// Kept separate from the chat prompt: a reviewer that has been told to withhold
// the answer writes uselessly vague feedback. By review time the attempt is
// already submitted, so the whole solution is on the table.
const REVIEW_SYSTEM = `You are reviewing a submitted solution to a data-structures-and-algorithms problem.

Reply with a single JSON object and nothing else. Shape:
{
  "verdict": "one sentence, plain and specific",
  "scores": { "correctness": 1-5, "efficiency": 1-5, "clarity": 1-5, "process": 1-5 },
  "complexity": { "time": "O(...)", "space": "O(...)" },
  "strengths": ["..."],
  "improvements": ["..."]
}

Scoring:
- correctness: does it actually solve the stated problem, including edge cases? If tests failed, this is low regardless of how good the idea was.
- efficiency: the complexity they achieved against the best reasonable complexity for this problem.
- clarity: naming, structure, how easily another person reads it.
- process: judge ONLY from the conversation transcript - did they reason toward it, or did they need to be walked down the whole hint ladder? If the transcript is empty, set "process" to null. Do not infer process from the code alone.

Give at most 3 strengths and at most 3 improvements, each one short and concrete - name the line, the case, or the specific change. No generic advice. Be honest: a solution that passes but is O(n^2) where O(n) exists is not a 5 for efficiency.`;

const jsonError = (res, status, error) => res.status(status).send({ error });

// Ollama is a separate process the user starts themselves, so "not running" is
// the single most likely failure and deserves a real message rather than a
// generic 500 - the UI prints this text verbatim.
function unreachable(err) {
    return (
        `Can't reach Ollama at ${OLLAMA_URL}. Start it with \`ollama serve\`, ` +
        `then pull a model with \`ollama pull ${TUTOR_MODEL}\`. (${err.message})`
    );
}

// Context the model needs to say anything useful. Built here rather than in the
// browser so the client only ever sends what it already has, and the prompt
// shape stays a server concern.
function problemContext({ problem, code, result }) {
    const lines = [
        `PROBLEM: ${problem.title} (${problem.level})`,
        problem.statement.join('\n'),
        '',
        `They must implement: ${problem.functionName}`,
    ];

    if (problem.examples?.length) {
        lines.push('', 'EXAMPLES:');
        for (const example of problem.examples) {
            lines.push(`  input: ${example.input} -> output: ${example.output}`);
        }
    }

    lines.push('', 'THEIR CURRENT CODE:', code?.trim() ? code : '(empty - they have not written anything yet)');

    // Only present after a run or submit. Without it the model guesses at what
    // is failing, which is exactly the wrong kind of hint.
    if (result) {
        lines.push('', `LAST RUN: ${result.passed}/${result.total} cases passed.`);
        if (result.firstFailure) {
            const { input, expected, received, error } = result.firstFailure;
            lines.push(
                error
                    ? `First failure: input ${input} threw ${error}`
                    : `First failure: input ${input} returned ${received}, expected ${expected}`
            );
        }
    }

    return lines.join('\n');
}

async function ollama(path, body, { signal } = {}) {
    return fetch(`${OLLAMA_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
    });
}

// Is Ollama up, and is the configured model actually pulled? Both are separate
// failure modes with different fixes, so the UI needs to tell them apart.
app.get('/status', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

        const { models = [] } = await response.json();
        const names = models.map((model) => model.name);

        res.send({
            ready: names.includes(TUTOR_MODEL),
            model: TUTOR_MODEL,
            models: names,
            error: names.includes(TUTOR_MODEL)
                ? ''
                : `Ollama is running but \`${TUTOR_MODEL}\` isn't pulled. Run \`ollama pull ${TUTOR_MODEL}\`.`,
        });
    } catch (err) {
        res.send({ ready: false, model: TUTOR_MODEL, models: [], error: unreachable(err) });
    }
});

// Streamed as Server-Sent Events. A local 7B model emits tokens at a readable
// pace, so waiting for the whole reply would mean staring at nothing for
// several seconds on every question.
app.post('/chat', async (req, res) => {
    const { problem, code, result, messages } = req.body || {};

    if (!problem || !Array.isArray(messages) || messages.length === 0) {
        return jsonError(res, 400, 'A problem and at least one message are required.');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    // The browser aborts this request when the user switches problems or
    // navigates away; without forwarding that, the model keeps generating into
    // a socket nobody is reading.
    //
    // Listen on the *response*, not the request: `req`'s close fires as soon as
    // express.json() finishes reading the body, which is every request, so
    // aborting on it kills the stream before a single token arrives.
    const controller = new AbortController();
    res.on('close', () => controller.abort());

    try {
        const upstream = await ollama(
            '/api/chat',
            {
                model: TUTOR_MODEL,
                stream: true,
                messages: [
                    { role: 'system', content: CHAT_SYSTEM },
                    { role: 'system', content: problemContext({ problem, code, result }) },
                    ...messages.map(({ role, content }) => ({ role, content })),
                ],
            },
            { signal: controller.signal }
        );

        if (!upstream.ok) {
            send({ error: `Ollama returned ${upstream.status}: ${await upstream.text()}` });
            return res.end();
        }

        // Ollama streams newline-delimited JSON, not SSE, so it has to be
        // reframed. Chunks split mid-line, hence the carried buffer.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const chunk = JSON.parse(line);
                    if (chunk.message?.content) send({ text: chunk.message.content });
                    if (chunk.done) send({ done: true });
                } catch (err) {
                    // A malformed line is not worth killing the stream over.
                }
            }
        }
    } catch (err) {
        if (!controller.signal.aborted) send({ error: unreachable(err) });
    }

    res.end();
});

// Not streamed: the reply is JSON that has to be parsed as a whole before the
// UI can render any of it, so there is nothing to show progressively.
app.post('/review', async (req, res) => {
    const { problem, code, result, transcript = [] } = req.body || {};

    if (!problem || !code) {
        return jsonError(res, 400, 'A problem and the submitted code are required.');
    }

    const conversation = transcript.length
        ? transcript.map((m) => `${m.role === 'user' ? 'THEM' : 'COACH'}: ${m.content}`).join('\n')
        : '(no conversation - they did not ask for any hints)';

    try {
        const upstream = await ollama('/api/chat', {
            model: TUTOR_MODEL,
            stream: false,
            // Ollama's JSON mode. The prompt still spells the shape out, since
            // this only guarantees valid JSON, not the right keys.
            format: 'json',
            messages: [
                { role: 'system', content: REVIEW_SYSTEM },
                {
                    role: 'user',
                    content: [
                        problemContext({ problem, code, result }),
                        '',
                        'CONVERSATION TRANSCRIPT:',
                        conversation,
                        '',
                        'Review the submitted code. Reply with the JSON object only.',
                    ].join('\n'),
                },
            ],
        });

        if (!upstream.ok) {
            return jsonError(res, 502, `Ollama returned ${upstream.status}: ${await upstream.text()}`);
        }

        const body = await upstream.json();
        const raw = body.message?.content ?? '';

        // A small local model will occasionally wrap the object in prose or a
        // code fence despite JSON mode, so recover the outermost braces rather
        // than failing the whole review on a stray sentence.
        let review;
        try {
            const start = raw.indexOf('{');
            const end = raw.lastIndexOf('}');
            review = JSON.parse(start === -1 ? raw : raw.slice(start, end + 1));
        } catch (err) {
            return jsonError(res, 502, 'The model did not return usable JSON. Try submitting again.');
        }

        // Normalized so the UI can render without defending against every
        // shape a 7B model might produce.
        const score = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : null;
        };
        const list = (value) =>
            (Array.isArray(value) ? value : []).filter((item) => typeof item === 'string').slice(0, 3);

        res.send({
            verdict: typeof review.verdict === 'string' ? review.verdict : '',
            scores: {
                correctness: score(review.scores?.correctness),
                efficiency: score(review.scores?.efficiency),
                clarity: score(review.scores?.clarity),
                process: score(review.scores?.process),
            },
            complexity: {
                time: review.complexity?.time || '',
                space: review.complexity?.space || '',
            },
            strengths: list(review.strengths),
            improvements: list(review.improvements),
        });
    } catch (err) {
        jsonError(res, 502, unreachable(err));
    }
});

app.listen(4008, () => {
    console.log(`Tutor service is running on port 4008 (model: ${TUTOR_MODEL} via ${OLLAMA_URL})`);
});
