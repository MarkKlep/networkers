require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(express.json());
app.use(cors());

// Must match blog/client/src/config.js's REACT_APP_GOOGLE_CLIENT_ID exactly -
// same value, read from each side's own .env (see .env.example here and in
// blog/client/). This is the *only* service that verifies Google tokens -
// posts/comments used to each do this themselves, which meant three files had
// to agree on this value and each carried the whole google-auth-library
// dependency. Centralizing here means posts/comments only ever need to trust
// this service, not Google directly, and adding a second sign-in method
// (below) didn't mean teaching two more services how to do it.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
if (!GOOGLE_CLIENT_ID) {
    console.warn(
        'GOOGLE_CLIENT_ID is not set - Google sign-in will fail verification. ' +
        'Set it in auth/.env (see auth/.env.example) to the same value as ' +
        "blog/client/.env's REACT_APP_GOOGLE_CLIENT_ID."
    );
}
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Unlike GOOGLE_CLIENT_ID, this is a real secret - anyone who has it can
// forge a valid session for any user. It must NOT be hardcoded in source the
// way the (non-secret) client ID is. If it's not set, generate a random one
// for this run: the app still works for local dev, but every restart
// invalidates every existing session, since a freshly-generated secret can't
// verify tokens signed with the last run's secret. Set APP_JWT_SECRET
// yourself (e.g. `export APP_JWT_SECRET=$(openssl rand -hex 32)`) to avoid
// that - docker-compose.yml passes the same env var through for that reason.
const JWT_SECRET = process.env.APP_JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.APP_JWT_SECRET) {
    console.warn(
        'APP_JWT_SECRET is not set - using a random secret for this run only. ' +
        'Every restart will sign everyone out. Set APP_JWT_SECRET to keep sessions across restarts.'
    );
}

const SESSION_LIFETIME = '7d';

// SQLite, one file per service - this service owns identity, nothing else
// touches this file directly. Lives in data/ (like referrals/data/) so
// docker-compose can mount just that directory as a volume.
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'data.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        passwordHash TEXT,
        googleId TEXT UNIQUE,
        name TEXT NOT NULL,
        picture TEXT,
        createdAt TEXT NOT NULL
    )
`);

const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const findByGoogleId = db.prepare('SELECT * FROM users WHERE googleId = ?');
const findById = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare(
    `INSERT INTO users (id, email, passwordHash, googleId, name, picture, createdAt)
     VALUES (@id, @email, @passwordHash, @googleId, @name, @picture, @createdAt)`
);
const attachGoogleId = db.prepare('UPDATE users SET googleId = ?, picture = COALESCE(picture, ?) WHERE id = ?');

function publicUser(row) {
    return { id: row.id, name: row.name, email: row.email, picture: row.picture };
}

function issueSession(row) {
    const payload = publicUser(row);
    const token = jwt.sign(payload, JWT_SECRET, { subject: row.id, expiresIn: SESSION_LIFETIME });
    const { exp } = jwt.decode(token);
    return { token, user: payload, exp };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).send({ error: 'A name is required.' });
    }
    if (!email || !EMAIL_RE.test(email)) {
        return res.status(400).send({ error: 'A valid email is required.' });
    }
    if (!password || password.length < 8) {
        return res.status(400).send({ error: 'Password must be at least 8 characters.' });
    }

    if (findByEmail.get(email.toLowerCase())) {
        // Deliberately vague - same message a wrong-password login gets -
        // so this endpoint can't be used to test which emails are registered.
        return res.status(400).send({ error: 'Could not create that account.' });
    }

    const row = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        googleId: null,
        name: name.trim(),
        picture: null,
        createdAt: new Date().toISOString(),
    };

    insertUser.run(row);
    res.status(201).send(issueSession(row));
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const row = email ? findByEmail.get(email.toLowerCase()) : null;

    // Same error either way - confirming an email doesn't have an account,
    // or has one but no password (Google-only), would let an attacker
    // enumerate registered addresses.
    const invalid = () => res.status(401).send({ error: 'Invalid email or password.' });

    if (!row || !row.passwordHash) {
        return invalid();
    }

    const matches = await bcrypt.compare(password || '', row.passwordHash);
    if (!matches) {
        return invalid();
    }

    res.send(issueSession(row));
});

app.post('/auth/google', async (req, res) => {
    const { idToken } = req.body || {};

    if (!idToken) {
        return res.status(400).send({ error: 'idToken is required.' });
    }

    let claims;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        claims = ticket.getPayload();
    } catch (err) {
        return res.status(401).send({ error: 'Invalid Google sign-in.' });
    }

    let row = findByGoogleId.get(claims.sub);

    if (!row) {
        // Same email as an existing password account? Link this Google
        // identity to it rather than creating a second, disconnected user -
        // one person, one account, however they choose to sign in.
        const existing = findByEmail.get(claims.email.toLowerCase());
        if (existing) {
            attachGoogleId.run(claims.sub, claims.picture, existing.id);
            row = findById.get(existing.id);
        } else {
            row = {
                id: crypto.randomUUID(),
                email: claims.email.toLowerCase(),
                passwordHash: null,
                googleId: claims.sub,
                name: claims.name,
                picture: claims.picture,
                createdAt: new Date().toISOString(),
            };
            insertUser.run(row);
        }
    }

    res.send(issueSession(row));
});

// posts/comments call this on every write instead of verifying anything
// themselves - the one place that holds JWT_SECRET is the one place that
// needs to.
app.post('/auth/verify', (req, res) => {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

    if (!token) {
        return res.status(401).send({ error: 'Sign in required.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        res.send({ user: { id: payload.id, name: payload.name, email: payload.email, picture: payload.picture } });
    } catch (err) {
        res.status(401).send({ error: 'Your sign-in has expired. Please sign in again.' });
    }
});

const server = app.listen(4007, () => {
    console.log('Auth service is running on port 4007');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
