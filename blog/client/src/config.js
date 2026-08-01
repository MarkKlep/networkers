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
