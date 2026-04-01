import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.movie import MovieOut, SearchQuery
from app.services.recommender import recommend_by_query

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=list[MovieOut])
def search(payload: SearchQuery, db: Session = Depends(get_db)):
    results = recommend_by_query(payload.query, db, top_n=payload.limit)
    if payload.shuffle:
        random.shuffle(results)
    return results
