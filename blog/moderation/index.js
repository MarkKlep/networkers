const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const EVENT_BUS_URL = 'http://localhost:4005';

// Placeholder word list for a placeholder moderation check - swap for a
// real provider/library if this ever needs to be more than a demo.
const BANNED_WORDS = ['idiot', 'stupid', 'hate', 'spam'];

function isClean(content) {
    const lower = content.toLowerCase();
    return !BANNED_WORDS.some((word) => new RegExp(`\\b${word}\\b`).test(lower));
}

app.post('/events', (req, res) => {
    const { type, data } = req.body;

    console.log('Received event:', type);

    if (type === 'CommentCreated') {
        const { id, postId, content } = data;
        const status = isClean(content) ? 'approved' : 'rejected';

        fetch(`${EVENT_BUS_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'CommentModerated',
                data: { id, postId, status },
            }),
        }).catch((err) => console.error('Failed to publish CommentModerated:', err.message));
    }

    res.send({});
});

const server = app.listen(4003, () => {
    console.log('Moderation service is running on port 4003');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
