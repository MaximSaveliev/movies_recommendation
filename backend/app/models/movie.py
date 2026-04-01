from sqlalchemy import Column, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY

from app.database import Base


class Movie(Base):
    __tablename__ = "movies"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    original_title = Column(String)
    image_url = Column(String)
    start_year = Column(Integer)
    runtime_seconds = Column(Integer)
    genres = Column(ARRAY(String))
    aggregate_rating = Column(Float)
    vote_count = Column(Integer)
    plot = Column(Text)
    directors = Column(ARRAY(String))
    writers = Column(ARRAY(String))
    stars = Column(ARRAY(String))
    countries = Column(ARRAY(String))
    languages = Column(ARRAY(String))
    keywords = Column(ARRAY(String))
