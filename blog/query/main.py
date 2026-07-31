from typing import Any

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

posts: dict[str, dict[str, Any]] = {}
# EXAMPLE DATA STRUCTURE:
# {
#   "postId1": {"id": "postId1", "title": "Post Title 1", "comments": []},
#   "postId2": {"id": "postId2", "title": "Post Title 2", "comments": []},
# }


class Event(BaseModel):
    type: str
    data: dict[str, Any]


@app.get("/posts")
def get_posts():
    return list(posts.values())


@app.post("/events")
def handle_event(event: Event):
    if event.type == "PostCreated":
        post_id = event.data["id"]
        posts[post_id] = {
            "id": post_id,
            "title": event.data["title"],
            "comments": [],
        }

    if event.type == "CommentCreated":
        post = posts.get(event.data["postId"])
        if post:
            post["comments"].append(
                {
                    "id": event.data["id"],
                    "content": event.data["content"],
                    "flaggedTerms": event.data.get("flaggedTerms", []),
                }
            )

    if event.type == "CommentModerated":
        post = posts.get(event.data["postId"])
        if post:
            for comment in post["comments"]:
                if comment["id"] == event.data["id"]:
                    comment["flaggedTerms"] = event.data.get("flaggedTerms", [])
                    break

    return {}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=4002)
