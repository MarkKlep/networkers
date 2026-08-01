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

// A post is always *about a company* - that's what ties this side of the app
// to the referral finder. Searching a company surfaces both the people you
// know there and the posts asking about it.
//
// - referral: "does anyone know someone at X who could introduce me?"
// - question: "what is the interview / the work actually like at X?"
// - offer:    "I work at X and am happy to refer someone"
const POST_TYPES = ['referral', 'question', 'offer'];

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
    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        type TEXT NOT NULL,
        createdAt TEXT NOT NULL
    )
`);

const insertPost = db.prepare(
    'INSERT INTO posts (id, title, company, type, createdAt) VALUES (@id, @title, @company, @type, @createdAt)'
);
const allPosts = db.prepare('SELECT * FROM posts ORDER BY rowid ASC');

app.get('/posts', (req, res) => {
    res.send(allPosts.all());
});

app.post('/posts', (req, res) => {
    const { title, company, type = 'referral' } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).send({ error: 'A post needs a title.' });
    }

    if (!company || !company.trim()) {
        return res.status(400).send({ error: 'A post needs a company.' });
    }

    if (!POST_TYPES.includes(type)) {
        return res.status(400).send({
            error: `type must be one of: ${POST_TYPES.join(', ')}`,
        });
    }

    const post = {
        id: randomBytes(4).toString('hex'),
        title: title.trim(),
        company: company.trim(),
        type,
        createdAt: new Date().toISOString(),
    };

    insertPost.run(post);

    res.status(201).send(post);

    axios.post(`${EVENT_BUS_URL}/events`, {
        type: 'PostCreated',
        data: post,
    });
});

const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
