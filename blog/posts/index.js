const express = require('express');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

const EVENT_BUS_URL = 'http://localhost:4005';

const posts = {};
/*
EXAMPLE DATA STRUCTURE:
{
  "postId1": { "id": "postId1", "title": "Post Title 1" },
  "postId2": { "id": "postId2", "title": "Post Title 2" }
}
*/

app.get('/posts', (req, res) => {
    res.send(Object.values(posts));
});

app.post('/posts', (req, res) => {
    const id = randomBytes(4).toString('hex');

    const { title } = req.body;
    posts[id] = { id, title };

    res.status(201).send(posts[id]);

    fetch(`${EVENT_BUS_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'PostCreated',
            data: posts[id],
        }),
    }).catch((err) => console.error('Failed to publish PostCreated:', err.message));
});

const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
