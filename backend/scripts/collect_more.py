"""
Collect additional movies and retrain the model.
Already existing movies in DB are skipped automatically.

Usage:
    python scripts/collect_more.py 20000
    python scripts/collect_more.py 50000
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.collector import collect_movies
from app.services.recommender import train


async def main():
    max_movies = int(sys.argv[1]) if len(sys.argv) > 1 else 10000

    db = SessionLocal()
    try:
        print(f"Collecting up to {max_movies} new movies...")
        added = await collect_movies(db, start_year=2000, end_year=2026, max_movies=max_movies)
        print(f"Added {added} new movies.")

        if added > 0:
            print("Retraining model...")
            train(db)
            print("Done!")
        else:
            print("No new movies found, skipping retrain.")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
