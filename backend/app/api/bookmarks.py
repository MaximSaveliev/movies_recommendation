from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models.bookmark import Bookmark
from app.models.movie import Movie
from app.models.user import User
from app.schemas.bookmark import BookmarkCreate, BookmarkOut, BookmarkStatus

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.get("", response_model=list[BookmarkOut])
def list_bookmarks(
    kind: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Bookmark).filter(Bookmark.user_id == current_user.id)
    if kind:
        query = query.filter(Bookmark.kind == kind)
    bookmarks = query.order_by(Bookmark.created_at.desc()).all()
    return [
        {**b.__dict__, "movie": db.query(Movie).filter(Movie.id == b.movie_id).first()}
        for b in bookmarks
    ]


@router.get("/{movie_id}/status", response_model=BookmarkStatus)
def bookmark_status(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.movie_id == movie_id,
    ).all()
    kinds = {b.kind for b in existing}
    return BookmarkStatus(
        favorite="favorite" in kinds,
        watch_later="watch_later" in kinds,
    )


@router.post("", response_model=BookmarkOut, status_code=201)
def add_bookmark(
    payload: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.query(Movie).filter(Movie.id == payload.movie_id).first():
        raise HTTPException(status_code=404, detail="Movie not found")

    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.movie_id == payload.movie_id,
        Bookmark.kind == payload.kind,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already bookmarked")

    bookmark = Bookmark(user_id=current_user.id, movie_id=payload.movie_id, kind=payload.kind)
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    movie = db.query(Movie).filter(Movie.id == payload.movie_id).first()
    return {**bookmark.__dict__, "movie": movie}


@router.delete("/{movie_id}")
def remove_bookmark(
    movie_id: str,
    kind: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.movie_id == movie_id,
        Bookmark.kind == kind,
    ).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bookmark)
    db.commit()
    return {"detail": "Removed"}
