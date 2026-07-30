# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo (`py-macos`) is currently a loose collection of learning/practice material rather than a single application:

- `macos-terminal.md` — personal notes on macOS settings and basic shell commands.
- `blog/` — a microservices exercise: four independent Node/npm projects (three backend services + a React client) wired together over HTTP, with no root-level build, docker-compose, or workspace config. Each must be installed and run separately.

There is no root `package.json`, monorepo tooling, or shared build system. Treat each subproject under `blog/` as its own working directory for install/run/test purposes.

## `blog/` architecture

`posts` and `comments` communicate asynchronously through `event-bus`, not by calling each other directly:

- `posts` publishes a `PostCreated` event when a post is made.
- `comments` publishes a `CommentCreated` event when a comment is made.
- `event-bus` receives every event via `POST /events` and rebroadcasts it to each subscribed service's own `POST /events` endpoint (subscriber list is hardcoded in `event-bus/index.js`).
- `posts` listens for `CommentCreated` and appends the comment into its local in-memory copy of that post. This is why `GET /posts` can return posts with `comments` embedded without ever calling the `comments` service directly at request time — and why `posts` keeps serving correctly even if `comments` (or the event it published) is delayed or lost.

Caveat inherent to this pattern: all state is in-memory with no event log/replay, so restarting `posts` loses its embedded-comments cache even though `comments` still has the underlying data (`comments`'s own store is the source of truth; `posts`'s copy is a denormalized cache built from events).

### `blog/event-bus` — Event bus (Express, port 4005)
No persistence; forwards whatever it receives. Endpoint:
- `POST /events` — accepts `{ type, data }`, forwards it to every URL in `SUBSCRIBERS`

Run: `cd blog/event-bus && npm install && npm run dev` (nodemon).

### `blog/posts` — Posts API (Express, port 3000)
In-memory store (`posts` object, no persistence). Endpoints:
- `GET /posts` — list all posts (each with its locally-cached `comments` array)
- `POST /posts` — create a post (`{ title }` in body), assigns a random hex `id`, publishes `PostCreated`
- `POST /events` — internal, consumes `CommentCreated` events from the event bus

Run: `cd blog/posts && npm install && npm run dev` (nodemon).

### `blog/comments` — Comments API (Express, port 4000)
In-memory store (`comments` keyed by `postId`, no persistence). Endpoints:
- `GET /posts/:postId/comments` — list comments for a post
- `POST /posts/:postId/comments` — add a comment (`{ content }` in body), assigns a random hex `id`, publishes `CommentCreated`

Run: `cd blog/comments && npm install && npm run dev` (nodemon).

Note: `comments` does not validate that `postId` refers to a real post — any id is accepted and stored.

### `blog/client` — React frontend (Create React App, port 3001)
Wired to the `posts`/`comments` APIs: `App.js` fetches `GET /posts` and renders `PostCreate` + `PostList`; each `Post` renders its embedded `comments` (from the posts response, not a separate fetch) plus a `CommentCreate` form that `POST`s to the comments service and then triggers a full posts refetch.

Commands (from `blog/client/`):
- `npm start` — dev server (runs on port 3001 via the `PORT=3001` prefix in `package.json`'s `start` script, since port 3000 is taken by `posts`)
- `npm test` — CRA/Jest test runner (interactive watch mode); use `npm test -- --watchAll=false` for a single non-interactive run, or `npm test -- <pattern>` to target specific test files
- `npm run build` — production build

## Running the full stack

Start in this order (each in its own terminal, from that service's directory): `event-bus` (4005) → `comments` (4000) → `posts` (3000) → `client` (3001, `npm start`). Order mainly matters so that `SUBSCRIBERS` in `event-bus` has somewhere to forward to and `posts`/`comments` have the bus up before they publish, though events are fire-and-forget so a missed event just means a stale cache, not a crash.

## Working conventions

- Each `blog/*` subproject has its own `node_modules` and `package-lock.json` — always run `npm install` inside the specific subdirectory, not the repo root.
- None of the backend services have automated tests configured; `blog/client` has one Jest test (`src/App.test.js`).
- All inter-service URLs (`EVENT_BUS_URL`, `SUBSCRIBERS`, the client's `POSTS_URL`/`COMMENTS_URL`) are hardcoded `localhost` constants, not env vars.
