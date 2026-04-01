"""
Run this script once to populate the database with movies and train the recommendation model.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/collect_and_train.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, SessionLocal, engine
from app.services.collector import collect_movies
from app.services.recommender import train


async def main():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Collecting movies from IMDB API (2000–2026)... This may take a while.")
        added = await collect_movies(db, start_year=2000, end_year=2026)
        print(f"Collected {added} new movies.")

        print("Training recommendation model...")
        train(db)
        print("Done! Model saved.")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
