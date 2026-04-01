import asyncio
import logging

from sqlalchemy.orm import Session

from app.models.movie import Movie
from app.services.imdb import fetch_title_detail, fetch_titles

logger = logging.getLogger(__name__)


def _parse_movie(data: dict) -> Movie:
    return Movie(
        id=data["id"],
        title=data.get("primaryTitle", ""),
        original_title=data.get("originalTitle"),
        image_url=(data.get("primaryImage") or {}).get("url"),
        start_year=data.get("startYear"),
        runtime_seconds=data.get("runtimeSeconds"),
        genres=data.get("genres", []),
        aggregate_rating=(data.get("rating") or {}).get("aggregateRating"),
        vote_count=(data.get("rating") or {}).get("voteCount"),
        plot=data.get("plot"),
        directors=[p["displayName"] for p in data.get("directors", [])],
        writers=[p["displayName"] for p in data.get("writers", [])],
        stars=[p["displayName"] for p in data.get("stars", [])],
        countries=[c["name"] for c in data.get("originCountries", [])],
        languages=[l["name"] for l in data.get("spokenLanguages", [])],
        keywords=[i["name"] for i in data.get("interests", [])],
    )


async def collect_movies(db: Session, start_year: int = 2020, end_year: int = 2026, max_movies: int = 10000) -> int:
    """Fetch movies from IMDB API and store in DB. Stops after max_movies new entries. Returns count added."""
    existing_ids = {row[0] for row in db.query(Movie.id).all()}
    new_count = 0
    page_token: str | None = None
    page_num = 1

    while new_count < max_movies:
        try:
            result = await fetch_titles(start_year, end_year, page_token)
        except Exception as exc:
            logger.error("Failed to fetch page %d: %s", page_num, exc)
            break

        titles = result.get("titles", [])
        if not titles:
            break

        new_ids = [t["id"] for t in titles if t["id"] not in existing_ids]

        for imdb_id in new_ids:
            if new_count >= max_movies:
                break
            try:
                detail = await fetch_title_detail(imdb_id)
                movie = _parse_movie(detail)
                db.add(movie)
                existing_ids.add(imdb_id)
                new_count += 1
                await asyncio.sleep(0.1)
            except Exception as exc:
                logger.warning("Skipping %s: %s", imdb_id, exc)

        db.commit()
        logger.info("Page %d done, total new: %d / %d", page_num, new_count, max_movies)

        page_token = result.get("nextPageToken")
        if not page_token:
            break
        page_num += 1

    return new_count
