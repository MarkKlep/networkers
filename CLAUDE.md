# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is for

A job-search networking tool, organised entirely around **the company you want to work at**. The core loop:

1. Name a company.
2. See which of your LinkedIn connections already work there (`referrals`).
3. **If you know nobody there** — ask whether anyone can introduce you (`posts` / `comments`).
4. Read what others asked about working there.

Step 3 is why posts exist. They started life as a generic blog from a microservices tutorial; they are now company-scoped asks, and the empty state of the referral search ("none of your connections list X") is the deliberate entry point into posting. Any change here should keep that loop intact — a post with no company breaks the model and is rejected by the `posts` service.

Known gap: there are **no user accounts**. Your connections are private to your machine, but posts are one shared board, so "ask the community" only becomes real with multi-user support.

## Repository overview

This repo (`py-macos`) is currently a loose collection of learning/practice material rather than a single application:

- `macos-terminal.md` — personal notes on macOS settings and basic shell commands.
- `README.md` / `architecture-diagram.svg` — overview and diagram of the `blog/` microservices, at the repo root (not inside `blog/`).
- `blog/` — a microservices exercise: six independent projects (four Node/npm services, one Python service, one React client) wired together over HTTP. Each must be installed and run separately, and `blog/query` uses a different toolchain (Python/pip) than the rest (Node/npm).
- `referrals/` — a backend service for the client's `/referrals` page. It shares **no data** with `blog/` and is deliberately not on the event bus; only the frontend is shared (see below).
- `docker-compose.yml` — builds and runs everything (all six `blog/` services plus `referrals`) from per-service `Dockerfile`s.

There's a root `package.json`, but it's a convenience runner only (`concurrently`), not a monorepo/workspace setup — each subproject still has its own dependencies and is its own working directory for install/run/test purposes.

## Local vs. Docker service URLs

Inter-service URLs differ by how you run the stack: locally each service is on `localhost:<port>`, but inside Docker they resolve each other by compose service name (`http://event-bus:4005`). So the backend services read their peer URLs from env vars with a `localhost` fallback:

- `posts`, `comments`, `moderation` — `EVENT_BUS_URL`
- `event-bus` — `QUERY_URL`, `MODERATION_URL`

`docker-compose.yml` sets these to container names; `npm run dev` sets nothing and falls through to `localhost`. **Never hardcode a container name in the source** — it breaks `npm run dev`, which is the failure mode this indirection exists to prevent. The client's `QUERY_URL`/`POSTS_URL`/`COMMENTS_URL` are unaffected: that code runs in the browser on the host, so `localhost` is correct in both modes.

## Persistence

`posts`, `comments`, and `query` each keep a local SQLite file at `<service>/data/data.sqlite` — one database per service, matching the microservice principle that each owns its own data; nothing shares a database. No server process to run: `better-sqlite3` (Node) and the stdlib `sqlite3` module (Python) both talk to a plain file, so `npm run dev` needs nothing extra beyond what it already does, and there's no connection string to configure.

`referrals/data/connections.json` is the same idea predating this pattern — a plain file instead of SQLite because it's a single blob written wholesale on upload, not queried, but persisted for the same reason.

All four `data/` directories are gitignored — this is local run state, not something to commit — and each is bind-mounted as a Docker volume in `docker-compose.yml` (`./blog/posts/data:/app/data`, etc.). **Both matter equally**: skip the gitignore and you risk committing real people's data (`referrals/`); skip the volume mount and Docker silently throws every away on `docker-compose down`, since the file would otherwise live only in the container's writable layer.

`query`'s tables (`posts`, `comments`) are written to directly from its `/events` handler — `INSERT OR REPLACE` on `PostCreated`/`CommentCreated`, `UPDATE ... WHERE id = ?` on `CommentModerated` — using a fresh `sqlite3.connect()` per request rather than one shared connection, since FastAPI runs these sync `def` handlers across a thread pool and SQLite connections aren't safe to share across threads without serializing access; a new connection per request sidesteps that entirely at negligible cost for this traffic volume.

## `blog/` architecture

`posts`, `comments`, and `moderation` never call each other directly — they only own their own data (writes) and publish/consume events through `event-bus`; a separate `query` service listens to everything and builds the combined read-model the client actually displays.

- `posts` publishes `PostCreated` when a post is made. It owns `{ id, title }` only — no comments.
- `comments` publishes `CommentCreated` when a comment is made. It owns `comments` keyed by `postId` — the source of truth for comment *content* only. It deliberately does **not** track moderation status or consume any events — that's a read-side (`query`) concern, not something the write-side needs to know about.
- `moderation` consumes `CommentCreated`, checks the content against a hardcoded banned-term list, and publishes `CommentModerated` carrying `flaggedTerms` — the exact offending substrings, not a whole-comment verdict.
- `event-bus` receives every event via `POST /events` and routes it by event type to each subscriber's own `POST /events` endpoint (`SUBSCRIBERS` in `event-bus/index.js` pairs each URL with the event types it consumes). This matters: `moderation` only ever receives `CommentCreated`, never its own published `CommentModerated` back — a blind broadcast-to-everyone would create that self-loop.
- `query` consumes `PostCreated`, `CommentCreated`, and `CommentModerated`; it's the only service that tracks moderation state, defaulting a comment to `flaggedTerms: []` on `CommentCreated` (since `comments` doesn't send one) and filling it in on `CommentModerated`. It's also the only service whose `GET /posts` returns posts with comments embedded.
- The client reads from `query` (`GET /posts`) but writes to `posts` (`POST /posts`) and `comments` (`POST /posts/:postId/comments`) directly.

Caveats inherent to this pattern:
- There is still no event log/replay — `query`'s SQLite tables are written to directly as each event arrives, not rebuilt by replaying a log. A missed event (the bus is fire-and-forget) is permanently missed; persistence means a restart no longer *also* loses everything, not that delivery became reliable.
- Publishing an event and receiving the client-facing response are not atomic (e.g. `comments` responds `201` well before moderation has even seen the comment, let alone reached a verdict). The client compensates with optimistic UI updates and a delayed follow-up refetch (see below) rather than assuming a single refetch immediately after a write reflects the final state.

### `blog/event-bus` — Event bus (Express, port 4005)
No persistence; forwards whatever it receives. Endpoint:
- `POST /events` — accepts `{ type, data }`, forwards it only to `SUBSCRIBERS` entries whose `events` list includes that `type`, and logs (doesn't throw) if a subscriber responds non-2xx

Run: `cd blog/event-bus && npm install && npm run dev` (nodemon).

### `blog/query` — Read-model API (Python/FastAPI, port 4002)
The only Python service in `blog/` — everything else is Node. SQLite-backed (see [Persistence](#persistence)), built entirely from events. Endpoints:
- `GET /posts` — list all posts with embedded `comments` (each with a `flaggedTerms` array)
- `GET /posts?company=` — only posts about that company; this is what a company page loads
- `GET /companies` — companies that have been posted about, busiest first
- `POST /events` — internal, consumes `PostCreated`, `CommentCreated`, and `CommentModerated` from the event bus

`normalize()` here deliberately mirrors the one in `referrals/index.js` so "Google", "Google LLC" and "Google, Inc." count as one company. The two services stay independent and each keeps its own copy rather than sharing a library — but they must agree, or the two halves of a company page would disagree about which company you are looking at.

Setup: `cd blog/query && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt`.
Run: `./venv/bin/python main.py` (or `./venv/bin/uvicorn main:app --reload --port 4002` for auto-reload during development).

### `blog/moderation` — Comment moderation (Express, port 4003)
No persistence, no HTTP endpoints other than the event listener — purely event-in, event-out. Endpoint:
- `POST /events` — internal, consumes `CommentCreated`; checks `content` against a hardcoded `BANNED_TERMS` list (case-insensitive, whole-word match; entries may be multi-word phrases) and publishes `CommentModerated` with `flaggedTerms`, the matched substrings in their original casing so the client can mask exactly what was found

Run: `cd blog/moderation && npm install && npm run dev` (nodemon).

### `blog/posts` — Posts API (Express, port 3000)
SQLite-backed (see [Persistence](#persistence)). A post is `{ id, title, company, type, createdAt }` — **`company` is required**, because a post that isn't about a company can't appear on any company page and has no place in the product. `type` is one of `referral` (looking for an intro), `question` (asking about the company), or `offer` (willing to refer); anything else is a 400. Endpoints:
- `GET /posts` — list all posts (no comments — that's `query`'s job)
- `POST /posts` — create a post (`{ title, company, type? }`), assigns a random hex `id`, publishes `PostCreated`

Run: `cd blog/posts && npm install && npm run dev` (nodemon).

### `blog/comments` — Comments API (Express, port 4000)
SQLite-backed (see [Persistence](#persistence)). Unchanged by the moderation feature — no `status` field, no `/events` listener; it just owns content. Endpoints:
- `GET /posts/:postId/comments` — list comments for a post
- `POST /posts/:postId/comments` — add a comment (`{ content }` in body), assigns a random hex `id`, publishes `CommentCreated`

Run: `cd blog/comments && npm install && npm run dev` (nodemon).

Note: `comments` does not validate that `postId` refers to a real post — any id is accepted and stored.

### `blog/client` — React frontend (Create React App, port 3001)
`App.js` is only the shell — nav plus routes. `CompanyPage.js` loads a company's posts from `query` and renders `PostCreate` + `PostList`; each `Post` shows its type as a badge, its embedded `comments`, and a `CommentCreate` form that `POST`s to `comments` directly. `CommentContent` splits a comment on its `flaggedTerms` and renders each as a `MaskedWord` — shown as `█` until clicked, so a flagged word is hidden rather than the whole comment being rejected.

Because `query`'s view lags the writes by however long event propagation takes, both `CompanyPage.js` (for new posts) and `Post.js` (for new comments) apply the created item to local state immediately from the write response, then merge (never blindly replace) subsequent refetches by `id` — this is what prevents the "have to reload to see it" symptom and avoids a freshly-created item flickering away if a refetch lands before its event has propagated. `Post.js` additionally schedules one delayed follow-up refetch (1.5s) after adding a comment, since `flaggedTerms` always arrives after the immediate refetch, not before.

Commands (from `blog/client/`):
- `npm start` — dev server (runs on port 3001 via the `PORT=3001` prefix in `package.json`'s `start` script, since port 3000 is taken by `posts`)
- `npm test` — CRA/Jest test runner (interactive watch mode); use `npm test -- --watchAll=false` for a single non-interactive run, or `npm test -- <pattern>` to target specific test files
- `npm run build` — production build

## Running the full stack

`npm install && npm run dev` from the repo root starts all **seven** processes at once (the six `blog/` services plus `referrals`, via `concurrently`) with color-coded, prefixed output, and a single Ctrl+C stops everything cleanly. Requires `blog/query`'s venv to already be set up (see below) and each subproject's own `npm install` to have been run at least once.

`npm run stop` frees every port the stack uses (3000, 3001, 4000, 4002, 4003, 4005, 4006). Needed because a nodemon child can outlive its parent, so a crashed or force-killed run can leave a port held.

To start services individually instead (each in its own terminal, from that service's directory): `event-bus` (4005) → `query` (4002) → `moderation` (4003) → `posts` (3000) → `comments` (4000) → `client` (3001, `npm start`). Order mainly matters so `event-bus` has its subscribers up before anything publishes, though events are fire-and-forget so a missed event just means a stale read model, not a crash.

`docker-compose up` is the alternative to all of the above: it builds each service from its own `Dockerfile` and needs no local Node, Python, venv, or per-service `npm install`. Ports are published unchanged, so the browser still uses the same `localhost:<port>` URLs either way. `docker-compose down` stops everything.

## One frontend, several independent backends

`blog/client` is the single UI for the whole repo, routed with `react-router-dom` (pinned to **v6** — v7 uses subpath exports that CRA 5's Jest cannot resolve, so upgrading breaks `npm test`):

- `/` → `HomePage` — search a company, or pick one you already know people at
- `/company/:name` → `CompanyPage` — **the screen the product is built around**
- `/connections` → `referrals/ConnectionsPage` — import and manage the LinkedIn export

`CompanyPage` is where the two halves meet: it queries the referrals service for people you know there *and* the query service for posts about it, then renders them as one page. That join happens **in the client** — the backends share no data and must stay that way. `referrals` is not on the event bus and has no reason to be; unifying the UI is not a reason to couple the services.

Every backend URL lives in `blog/client/src/config.js` rather than being repeated per component. The referrals service therefore has **no UI of its own**; `referrals/public/index.html` is only a pointer to `localhost:3001/referrals`, so there is one interface to maintain instead of two that drift apart.

### Company logos

`blog/client/src/companyLogo.js` resolves a company name to a real logo for display next to its posts and chips (`CompanyBadge.js`). This is the **one place in the app that sends data to a third party that isn't LinkedIn**: company names (never people, never emails) go to Clearbit's free autocomplete API to find a domain, then Google's favicon service to fetch an icon — both called directly from the browser, no backend involved. If that's ever not acceptable, flip `ENABLED` to `false` in `companyLogo.js`; every caller already falls back to the existing colour-coded monogram with no other code changes needed, since that fallback is the first thing rendered regardless (the real logo swaps in only if and when one resolves).

Because the Referrals page needs its backend, `npm run dev` starts **all seven** processes, and `docker-compose.yml` has the client `depends_on` referrals.

## `referrals/` — LinkedIn referral finder (Express, port 4006)

Backend only; not part of the `blog/` event flow and not on the event bus. Answers "which of my LinkedIn connections work at company X, so I can ask for a referral."

Takes LinkedIn's own **Connections.csv** data export (Settings & Privacy → Data Privacy → Get a copy of your data → Connections). This is the only viable source: LinkedIn's public API has no connections endpoint, and scraping violates their ToS and gets accounts banned.

Its UI lives in `blog/client` (see above); this service is API-only. Endpoints:
- `GET /` — the UI
- `POST /connections` — raw CSV as the request body (`text/csv`); parses, replaces the stored list, saves to disk
- `GET /status` — `{ total, withoutCompany, savedAt }`; the UI calls this on load and skips the upload step when connections are already stored
- `GET /search?company=` — connections whose company matches, best matches first
- `GET /companies` — distinct companies with connection counts, most connections first (powers the browse chips)
- `DELETE /connections` — forget the stored export

Two things the parsing has to handle, both from the real export format:
- LinkedIn prefixes the file with a multi-line `Notes:` preamble, so `stripPreamble()` discards everything before the `First Name` header row rather than parsing from line 1.
- Company names vary across profiles for the same employer ("Google", "Google LLC", "Google, Inc."), so `normalize()` lowercases and strips punctuation plus legal suffixes before comparing, and `matchScore()` ranks exact normalized matches above prefix above substring.

Parsed connections are persisted to `referrals/data/connections.json` and reloaded on boot. This is the whole point of the app's UX: the export is uploaded **once**, and every run after that is just type-a-company-get-names. An in-memory-only version forces a fresh LinkedIn export after every restart, which is worse than not having the app.

That file holds real people's names and email addresses, so `referrals/data/` is gitignored and the data never leaves the machine. **Don't add anything that uploads or transmits it**, and don't remove the gitignore entry.

The export only ever contains **1st-degree** connections. Friends-of-friends are not in the file and cannot be obtained: LinkedIn has no connections API for individuals, and scraping violates their ToS and risks account bans. The UI therefore deep-links to LinkedIn's own people search filtered to 2nd-degree (`network=["S"]`) instead of pretending to have that data — a plain navigation link, not a fetch.

Run: `cd referrals && npm install && npm run dev` (or `npm run referrals` from the repo root).

## Working conventions

- Each Node `blog/*` subproject has its own `node_modules` and `package-lock.json` — always run `npm install` inside the specific subdirectory, not the repo root. `blog/query` instead has its own `venv/` and `requirements.txt` — use its `pip`, not the system one.
- None of the backend services have automated tests configured; `blog/client` has one Jest test (`src/App.test.js`).
- All inter-service URLs (`EVENT_BUS_URL`, `SUBSCRIBERS`, the client's `QUERY_URL`/`POSTS_URL`/`COMMENTS_URL`) are hardcoded `localhost` constants, not env vars.
