const express = require('express');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

const EVENT_BUS_URL = 'http://localhost:4005';

const comments = {};
/*
EXAMPLE DATA STRUCTURE:
{
  "postId1": [
    { "id": "commentId1", "content": "This is a comment." },
    { "id": "commentId2", "content": "This is another comment." }
  ],
  "postId2": [
    { "id": "commentId3", "content": "This is a comment for post 2." }
  ]
}
*/

app.get('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;

  const postComments = comments[postId] || [];

  res.send(postComments);
});

app.post('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!comments[postId]) {
    comments[postId] = [];
  }

  const comment = {
    id: randomBytes(4).toString('hex'),
    content,
  };

  comments[postId].push(comment);
  res.status(201).send(comment);

  fetch(`${EVENT_BUS_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'CommentCreated',
      data: { ...comment, postId },
    }),
  }).catch((err) => console.error('Failed to publish CommentCreated:', err.message));
});

const server = app.listen(4000, () => {
    console.log('Server is running on port 4000');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
