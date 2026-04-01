import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.recommender import train


def main():
    db = SessionLocal()
    try:
        train(db)
        print("Done")
    finally:
        db.close()


if __name__ == "__main__":
    main()
