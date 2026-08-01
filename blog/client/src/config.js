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

// Google Sign-In client ID. Not a secret - it's meant to be visible in
// frontend code, which is why it's a plain constant here rather than an env
// var, matching how every other URL on this page is handled.
//
// To get one: console.cloud.google.com -> APIs & Services -> Credentials ->
// Create Credentials -> OAuth client ID -> Application type "Web
// application" -> under "Authorized JavaScript origins" add
// http://localhost:3001 (and http://localhost:3000 if you also open the
// app there). Paste the resulting client ID below.
//
// auth/index.js needs the *same* value (also as GOOGLE_CLIENT_ID) - it's
// the only backend that verifies Google tokens now, but it still has to
// agree with the client on which app those tokens were issued for.
export const GOOGLE_CLIENT_ID =
  '349482072247-pr6bgglll5eo5mkqjobc04q6lsbb5m52.apps.googleusercontent.com';
