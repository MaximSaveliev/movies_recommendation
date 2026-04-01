from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.database import Base


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(String, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
