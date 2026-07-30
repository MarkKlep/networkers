# Blog microservices

A small event-driven microservices exercise: five independent services that talk to each other over HTTP.

![Architecture diagram](.ś/architecture-diagram.svg)ś

## Services

| Service | Stack | Port | Role |
|---|---|---|---|
| [`posts`](./posts) | Express (Node) | 3000 | Owns posts (`{ id, title }`); publishes `PostCreated` |
| [`comments`](./comments) | Express (Node) | 4000 | Owns comments per post; publishes `CommentCreated` |
| [`event-bus`](./event-bus) | Express (Node) | 4005 | Receives every event and rebroadcasts it to subscribers |
| [`query`](./query) | FastAPI (Python) | 4002 | Builds the combined read-model (posts + embedded comments) from events |
| [`client`](./client) | React (CRA) | 3001 | Writes to `posts`/`comments`, reads from `query` |

`posts` and `comments` never call each other directly — they only own their own data and publish events. `query` is the only service that returns posts with comments embedded, built entirely by listening to the event bus.

See the root [`CLAUDE.md`](../CLAUDE.md) for setup/run commands per service and more detail on the eventual-consistency tradeoffs this pattern implies.
