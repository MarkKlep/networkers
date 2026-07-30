const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Every other service's /events endpoint. Add a URL here whenever a new
// service needs to receive broadcasts.
const SUBSCRIBERS = [
  'http://localhost:3000/events', // posts (consumes CommentCreated)
];

app.post('/events', (req, res) => {
  const event = req.body;

  console.log('Received event:', event.type);

  SUBSCRIBERS.forEach((url) => {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Subscriber ${url} rejected event with status ${res.status}`);
        }
      })
      .catch((err) => {
        console.error(`Failed to forward event to ${url}:`, err.message);
      });
  });

  res.send({ status: 'OK' });
});

const server = app.listen(4005, () => {
  console.log('Event bus is running on port 4005');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
