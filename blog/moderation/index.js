const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const EVENT_BUS_URL = 'http://localhost:4005';

// Placeholder word/phrase lists for a placeholder moderation check - swap
// for a real provider/library if this ever needs to be more than a demo.
// Phrases go through the same matcher as single words; a phrase is just a
// term containing a space.
const BANNED_TERMS = [
    'idiot',
    'stupid',
    'hate',
    'spam',
];

function escapeForRegExp(term) {
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Returns the exact substrings (original casing/spacing) that matched a
// banned term, so the client can mask precisely what was found rather than
// a normalized/lowercased version of it.
function findFlaggedTerms(content) {
    const found = new Set();

    for (const term of BANNED_TERMS) {
        const pattern = new RegExp(`\\b${escapeForRegExp(term)}\\b`, 'gi');
        const matches = content.match(pattern);

        if (matches) {
            matches.forEach((match) => found.add(match));
        }
    }

    return Array.from(found);
}

app.post('/events', (req, res) => {
    const { type, data } = req.body;

    console.log('Received event:', type);

    if (type === 'CommentCreated') {
        const { id, postId, content } = data;
        const flaggedTerms = findFlaggedTerms(content);

        axios.post(`${EVENT_BUS_URL}/events`, {
            type: 'CommentModerated',
            data: { id, postId, flaggedTerms },
        });
    }

    res.send({});
});

const server = app.listen(4003, () => {
    console.log('Moderation service is running on port 4003');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
