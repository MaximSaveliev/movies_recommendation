from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.movie import MovieOut


class BookmarkCreate(BaseModel):
    movie_id: str
    kind: Literal["favorite", "watch_later"]


class BookmarkOut(BaseModel):
    id: int
    movie_id: str
    kind: str
    created_at: datetime
    movie: MovieOut

    class Config:
        from_attributes = True


class BookmarkStatus(BaseModel):
    favorite: bool
    watch_later: bool
