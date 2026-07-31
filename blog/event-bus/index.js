const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Every other service's /events endpoint, plus which event types it cares
// about. Add an entry here whenever a new service needs to receive
// broadcasts - and list only the types it actually consumes, so a service
// never receives back the very event it just published.
const SUBSCRIBERS = [
  { url: 'http://localhost:4002/events', events: ['PostCreated', 'CommentCreated', 'CommentModerated'] }, // query
  { url: 'http://localhost:4003/events', events: ['CommentCreated'] }, // moderation
];

app.post('/events', (req, res) => {
  const event = req.body;

  console.log('Received event:', event.type);

  SUBSCRIBERS
    .filter((subscriber) => subscriber.events.includes(event.type))
    .forEach((subscriber) => {
      axios.post(subscriber.url, event, {
        headers: { 'Content-Type': 'application/json' }
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
