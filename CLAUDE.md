# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo (`py-macos`) is currently a loose collection of learning/practice material rather than a single application:

- `macos-terminal.md` — personal notes on macOS settings and basic shell commands.
- `blog/` — a microservices exercise: five independent projects (three Node/npm services, one Python service, one React client) wired together over HTTP, with no root-level build, docker-compose, or workspace config. Each must be installed and run separately, and `blog/query` uses a different toolchain (Python/pip) than the rest (Node/npm).

There is no root `package.json`, monorepo tooling, or shared build system. Treat each subproject under `blog/` as its own working directory for install/run/test purposes.

## `blog/` architecture

`posts` and `comments` never call each other directly — they only own their own data (writes) and publish events; a separate `query` service listens to both and builds the combined read-model the client actually displays.

- `posts` publishes `PostCreated` when a post is made. It owns `{ id, title }` only — no comments.
- `comments` publishes `CommentCreated` when a comment is made. It owns `comments` keyed by `postId` — the source of truth for comment content.
- `event-bus` receives every event via `POST /events` and rebroadcasts it to each subscribed service's own `POST /events` endpoint (subscriber list is hardcoded in `event-bus/index.js`; currently only `query` is subscribed).
- `query` listens for both `PostCreated` (adds the post) and `CommentCreated` (appends the comment into that post's `comments` array) and is the only service whose `GET /posts` returns posts with comments embedded.
- The client reads from `query` (`GET /posts`) but writes to `posts` (`POST /posts`) and `comments` (`POST /posts/:postId/comments`) directly.

Caveats inherent to this pattern:
- All state is in-memory with no event log/replay, so restarting `query` loses its combined view even though `posts`/`comments` still have the underlying data — `query`'s store is a denormalized cache built from events, not a source of truth.
- Publishing an event and receiving the client-facing response are not atomic (e.g. `comments` responds `201` before the event has necessarily reached `query`). The client compensates with optimistic UI updates (see below) rather than assuming a refetch immediately after a write reflects it.

### `blog/event-bus` — Event bus (Express, port 4005)
No persistence; forwards whatever it receives. Endpoint:
- `POST /events` — accepts `{ type, data }`, forwards it to every URL in `SUBSCRIBERS`, and logs (doesn't throw) if a subscriber responds non-2xx

Run: `cd blog/event-bus && npm install && npm run dev` (nodemon).

### `blog/query` — Read-model API (Python/FastAPI, port 4002)
The only Python service in `blog/` — everything else is Node. In-memory store (`posts` dict, no persistence), built entirely from events. Endpoints:
- `GET /posts` — list all posts with embedded `comments`
- `POST /events` — internal, consumes `PostCreated` and `CommentCreated` from the event bus

Setup: `cd blog/query && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt`.
Run: `./venv/bin/python main.py` (or `./venv/bin/uvicorn main:app --reload --port 4002` for auto-reload during development).

### `blog/posts` — Posts API (Express, port 3000)
In-memory store (`posts` object, no persistence). Endpoints:
- `GET /posts` — list all posts (title only, no comments — that's `query`'s job)
- `POST /posts` — create a post (`{ title }` in body), assigns a random hex `id`, publishes `PostCreated`

Run: `cd blog/posts && npm install && npm run dev` (nodemon).

### `blog/comments` — Comments API (Express, port 4000)
In-memory store (`comments` keyed by `postId`, no persistence). Endpoints:
- `GET /posts/:postId/comments` — list comments for a post
- `POST /posts/:postId/comments` — add a comment (`{ content }` in body), assigns a random hex `id`, publishes `CommentCreated`

Run: `cd blog/comments && npm install && npm run dev` (nodemon).

Note: `comments` does not validate that `postId` refers to a real post — any id is accepted and stored.

### `blog/client` — React frontend (Create React App, port 3001)
`App.js` fetches `GET /posts` from `query` and renders `PostCreate` + `PostList`; each `Post` renders its embedded `comments` plus a `CommentCreate` form that `POST`s to `comments` directly.

Because `query`'s view lags the writes by however long event propagation takes, both `App.js` (for new posts) and `Post.js` (for new comments) apply the created item to local state immediately from the write response, then merge (never blindly replace) subsequent refetches by `id` — this is what prevents the "have to reload to see it" symptom and avoids a freshly-created item flickering away if a refetch lands before its event has propagated.

Commands (from `blog/client/`):
- `npm start` — dev server (runs on port 3001 via the `PORT=3001` prefix in `package.json`'s `start` script, since port 3000 is taken by `posts`)
- `npm test` — CRA/Jest test runner (interactive watch mode); use `npm test -- --watchAll=false` for a single non-interactive run, or `npm test -- <pattern>` to target specific test files
- `npm run build` — production build

## Running the full stack

Start in this order (each in its own terminal, from that service's directory): `event-bus` (4005) → `query` (4002) → `posts` (3000) → `comments` (4000) → `client` (3001, `npm start`). Order mainly matters so `event-bus` has `query` up before anything publishes, though events are fire-and-forget so a missed event just means a stale read model, not a crash.

## Working conventions

- Each Node `blog/*` subproject has its own `node_modules` and `package-lock.json` — always run `npm install` inside the specific subdirectory, not the repo root. `blog/query` instead has its own `venv/` and `requirements.txt` — use its `pip`, not the system one.
- None of the backend services have automated tests configured; `blog/client` has one Jest test (`src/App.test.js`).
- All inter-service URLs (`EVENT_BUS_URL`, `SUBSCRIBERS`, the client's `QUERY_URL`/`POSTS_URL`/`COMMENTS_URL`) are hardcoded `localhost` constants, not env vars.
