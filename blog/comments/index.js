const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());
app.use(cors());

// Docker Compose sets these to container names; running locally with npm
// falls back to localhost.
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4005';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4007';

// This service doesn't verify sign-in itself - it forwards the token to
// auth and trusts whatever comes back. auth is the only service that knows
// whether someone signed in with Google or a password, and the only one
// that holds the secret needed to check a token's signature; duplicating
// that here (as an earlier version of this file did, Google-only) would
// mean re-learning it for every sign-in method this app ever adds. Only
// guards writes; GET comments stays open to everyone.
async function requireUser(req, res, next) {
  const header = req.get('Authorization') || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Sign in to comment.' });
  }

  try {
    const { data } = await axios.post(`${AUTH_URL}/auth/verify`, {}, { headers: { Authorization: header } });
    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).send({ error: 'Your sign-in has expired. Please sign in again.' });
  }
}

// SQLite, one file per service: this service owns its own data and nothing
// else touches this file directly. No server process to run, so `npm run
// dev` needs nothing extra beyond what it already does. Lives in data/ (like
// referrals/data/) so docker-compose can mount just that directory as a
// volume - without it, the file sits in the container's writable layer and
// is lost the moment the container is recreated.
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'data.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    content TEXT NOT NULL,
    authorId TEXT,
    authorName TEXT,
    authorPicture TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments (postId);
`);

// CREATE TABLE IF NOT EXISTS is a no-op on a database that already exists
// from before Google sign-in was added - the author columns above never
// land on it, and every insert/select referencing them would crash the
// service on boot. Add anything missing explicitly.
for (const column of ['authorId', 'authorName', 'authorPicture']) {
  const exists = db.prepare('PRAGMA table_info(comments)').all().some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE comments ADD COLUMN ${column} TEXT`);
  }
}

const insertComment = db.prepare(
  `INSERT INTO comments (id, postId, content, authorId, authorName, authorPicture)
   VALUES (@id, @postId, @content, @authorId, @authorName, @authorPicture)`
);
const commentsForPost = db.prepare(
  'SELECT id, content, authorId, authorName, authorPicture FROM comments WHERE postId = ? ORDER BY rowid ASC'
);

app.get('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;

  res.send(commentsForPost.all(postId));
});

app.post('/posts/:postId/comments', requireUser, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  const comment = {
    id: randomBytes(4).toString('hex'),
    content,
    authorId: req.user.id,
    authorName: req.user.name,
    authorPicture: req.user.picture,
  };

  insertComment.run({ ...comment, postId });
  res.status(201).send(comment);

  axios.post(`${EVENT_BUS_URL}/events`, {
    type: 'CommentCreated',
    data: { ...comment, postId },
  });
});

const server = app.listen(4000, () => {
    console.log('Server is running on port 4000');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
