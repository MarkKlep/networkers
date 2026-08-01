import json
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Optional

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

# SQLite, one file per service: this service owns its own data and nothing
# else touches this file directly. A fresh connection per request (rather
# than one shared connection) sidesteps sqlite3's thread-safety rules -
# FastAPI runs these sync `def` handlers in a thread pool, and SQLite
# connections are cheap enough that this is simpler than serializing access
# to a single shared one.
#
# Lives in data/ (like referrals/data/) so docker-compose can mount just
# that directory as a volume - without it, the file sits in the container's
# writable layer and is lost the moment the container is recreated.
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "data.sqlite"


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                type TEXT NOT NULL,
                createdAt TEXT,
                authorId TEXT,
                authorName TEXT,
                authorPicture TEXT
            );
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                postId TEXT NOT NULL,
                content TEXT NOT NULL,
                flaggedTerms TEXT NOT NULL DEFAULT '[]',
                authorId TEXT,
                authorName TEXT,
                authorPicture TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments (postId);
            """
        )

        # CREATE TABLE IF NOT EXISTS is a no-op on a database that already
        # exists from before Google sign-in was added - the author columns
        # above never land on it, and every insert/select referencing them
        # would crash the service on boot. Add anything missing explicitly.
        for table, column in [
            ("posts", "authorId"),
            ("posts", "authorName"),
            ("posts", "authorPicture"),
            ("comments", "authorId"),
            ("comments", "authorName"),
            ("comments", "authorPicture"),
        ]:
            existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
            if column not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} TEXT")


init_db()


# The same employer is written inconsistently ("Google", "Google LLC",
# "Google, Inc."), so a search for one has to find the others. This mirrors
# normalize() in referrals/index.js: the two services stay independent and
# each owns its own copy rather than sharing a library, but they must agree
# on what counts as the same company or the two halves of a company page
# would disagree with each other.
LEGAL_SUFFIXES = re.compile(
    r"\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|bv|ag|sa|plc|pvt|group|holdings)\b"
)
PUNCTUATION = re.compile(r"[.,/#!$%^&*;:{}=\-_`~()'\"]")


def normalize(value: str) -> str:
    value = (value or "").lower()
    value = PUNCTUATION.sub(" ", value)
    value = LEGAL_SUFFIXES.sub(" ", value)
    return " ".join(value.split())


class Event(BaseModel):
    type: str
    data: dict[str, Any]


def load_posts() -> list[dict[str, Any]]:
    """Every post, comments embedded, in creation order - the shape the
    client has always received, now assembled from two tables instead of
    kept in memory."""
    with get_connection() as conn:
        post_rows = conn.execute("SELECT * FROM posts ORDER BY rowid ASC").fetchall()
        comment_rows = conn.execute(
            "SELECT * FROM comments ORDER BY rowid ASC"
        ).fetchall()

    comments_by_post: dict[str, list[dict[str, Any]]] = {}
    for row in comment_rows:
        comments_by_post.setdefault(row["postId"], []).append(
            {
                "id": row["id"],
                "content": row["content"],
                "flaggedTerms": json.loads(row["flaggedTerms"]),
                "authorId": row["authorId"],
                "authorName": row["authorName"],
                "authorPicture": row["authorPicture"],
            }
        )

    return [
        {
            "id": row["id"],
            "title": row["title"],
            "company": row["company"],
            "type": row["type"],
            "createdAt": row["createdAt"],
            "authorId": row["authorId"],
            "authorName": row["authorName"],
            "authorPicture": row["authorPicture"],
            "comments": comments_by_post.get(row["id"], []),
        }
        for row in post_rows
    ]


@app.get("/posts")
def get_posts(company: Optional[str] = None):
    """All posts, or just those about one company when ?company= is given."""
    everything = load_posts()

    if not company:
        return everything

    wanted = normalize(company)
    if not wanted:
        return []

    return [post for post in everything if wanted in normalize(post["company"])]


@app.get("/companies")
def get_companies():
    """Companies people have posted about, busiest first."""
    with get_connection() as conn:
        rows = conn.execute("SELECT company FROM posts").fetchall()

    counts: dict[str, dict[str, Any]] = {}
    for row in rows:
        company = (row["company"] or "").strip()
        if not company:
            continue

        key = normalize(company)
        if key in counts:
            counts[key]["posts"] += 1
        else:
            counts[key] = {"company": company, "posts": 1}

    return sorted(counts.values(), key=lambda entry: entry["posts"], reverse=True)


@app.post("/events")
def handle_event(event: Event):
    with get_connection() as conn:
        if event.type == "PostCreated":
            conn.execute(
                """
                INSERT OR REPLACE INTO posts
                    (id, title, company, type, createdAt, authorId, authorName, authorPicture)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.data["id"],
                    event.data["title"],
                    event.data.get("company", ""),
                    event.data.get("type", "referral"),
                    event.data.get("createdAt"),
                    event.data.get("authorId"),
                    event.data.get("authorName"),
                    event.data.get("authorPicture"),
                ),
            )

        if event.type == "CommentCreated":
            conn.execute(
                """
                INSERT OR REPLACE INTO comments
                    (id, postId, content, flaggedTerms, authorId, authorName, authorPicture)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.data["id"],
                    event.data["postId"],
                    event.data["content"],
                    json.dumps(event.data.get("flaggedTerms", [])),
                    event.data.get("authorId"),
                    event.data.get("authorName"),
                    event.data.get("authorPicture"),
                ),
            )

        if event.type == "CommentModerated":
            conn.execute(
                "UPDATE comments SET flaggedTerms = ? WHERE id = ?",
                (json.dumps(event.data.get("flaggedTerms", [])), event.data["id"]),
            )

    return {}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=4002)
