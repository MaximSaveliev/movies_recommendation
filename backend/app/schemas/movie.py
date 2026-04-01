from typing import Optional

from pydantic import BaseModel


class MovieOut(BaseModel):
    id: str
    title: str
    original_title: Optional[str] = None
    image_url: Optional[str] = None
    start_year: Optional[int] = None
    runtime_seconds: Optional[int] = None
    genres: Optional[list[str]] = None
    aggregate_rating: Optional[float] = None
    vote_count: Optional[int] = None
    plot: Optional[str] = None
    directors: Optional[list[str]] = None
    writers: Optional[list[str]] = None
    stars: Optional[list[str]] = None
    countries: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    keywords: Optional[list[str]] = None

    class Config:
        from_attributes = True


class MovieList(BaseModel):
    movies: list[MovieOut]
    total: int
    page: int
    limit: int


class SearchQuery(BaseModel):
    query: str
    limit: int = 20
    shuffle: bool = False
