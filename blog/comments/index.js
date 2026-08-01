const express = require('express');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Docker Compose sets this to the container name (http://event-bus:4005);
// running locally with npm falls back to localhost.
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4005';

const comments = {};

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
