const express = require('express');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const EVENT_BUS_URL = 'http://localhost:4005';

const posts = {};

app.get('/posts', (req, res) => {
    res.send(Object.values(posts));
});

app.post('/posts', (req, res) => {
    const id = randomBytes(4).toString('hex');

    const { title } = req.body;
    posts[id] = { id, title };

    res.status(201).send(posts[id]);

    axios.post(`${EVENT_BUS_URL}/events`, {
        type: 'PostCreated',
        data: posts[id],
    });
});

const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
