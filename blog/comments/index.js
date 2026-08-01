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

// Docker Compose sets this to the container name (http://event-bus:4005);
// running locally with npm falls back to localhost.
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4005';

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
    content TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments (postId);
`);

const insertComment = db.prepare(
  'INSERT INTO comments (id, postId, content) VALUES (@id, @postId, @content)'
);
const commentsForPost = db.prepare(
  'SELECT id, content FROM comments WHERE postId = ? ORDER BY rowid ASC'
);

app.get('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;

  res.send(commentsForPost.all(postId));
});

app.post('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  const comment = {
    id: randomBytes(4).toString('hex'),
    content,
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
