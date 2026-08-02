// Every backend this UI talks to. They are separate services on separate
// ports - the app is one frontend over several independent backends, not one
// monolith - so the URLs live here rather than being repeated per component.
//
// These stay `localhost` even when the services run in Docker: this code
// executes in the browser on the host, where the container ports are
// published, not inside the Docker network.

export const QUERY_URL = 'http://localhost:4002';
export const POSTS_URL = 'http://localhost:3000';
export const COMMENTS_URL = 'http://localhost:4000';
export const REFERRALS_URL = 'http://localhost:4006';

// Owns sign-in: register/login with a password, or Google. posts/comments
// don't talk to this directly - they call its /auth/verify the same way the
// client does everything else, over HTTP.
export const AUTH_URL = 'http://localhost:4007';

// Practice's AI coach. The only backend the practice feature has - problems,
// drafts and progress are all still client-side. It proxies to a model running
// locally under Ollama, so nothing it is sent leaves the machine.
export const TUTOR_URL = 'http://localhost:4008';

// Google Sign-In client ID. Not a secret in the sense that matters for a
// backend key - it ships to the browser in the built bundle either way, so an
// attacker reading it from here learns nothing they couldn't get from the
// network tab. It still lives in .env (see .env.example), not hardcoded here:
// that keeps it out of source so a different client ID per environment
// (local vs. a real deployment) is a config change, not a code change, and it
// matches the treatment of every other backend-issued credential in this repo.
// CRA only inlines env vars prefixed REACT_APP_, and only at build/start time -
// changing .env needs a dev-server restart to take effect.
//
// To get one: console.cloud.google.com -> APIs & Services -> Credentials ->
// Create Credentials -> OAuth client ID -> Application type "Web
// application" -> under "Authorized JavaScript origins" add
// http://localhost:3001 (and http://localhost:3000 if you also open the
// app there). Put the resulting client ID in .env, not here.
//
// auth/index.js needs the *same* value (its own GOOGLE_CLIENT_ID in
// auth/.env) - it's the only backend that verifies Google tokens now, but it
// still has to agree with the client on which app those tokens were issued for.
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
