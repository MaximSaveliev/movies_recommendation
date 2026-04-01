from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.movie import Movie
from app.schemas.movie import MovieList, MovieOut
from app.services.recommender import recommend_similar

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("", response_model=MovieList)
def list_movies(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.query(Movie).count()
    movies = db.query(Movie).offset(offset).limit(limit).all()
    return MovieList(movies=movies, total=total, page=page, limit=limit)


@router.get("/{movie_id}/similar", response_model=list[MovieOut])
def get_similar(movie_id: str, db: Session = Depends(get_db)):
    return recommend_similar(movie_id, db)


@router.get("/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: str, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie
