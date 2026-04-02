import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.config import settings
from app.api.bookmarks import router as bookmarks_router
from app.api.movies import router as movies_router
from app.api.search import router as search_router
from app.database import Base, SessionLocal, engine
from app.services.collector import collect_movies
from app.services.recommender import train

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Movies Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(movies_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(bookmarks_router, prefix="/api")

scheduler = AsyncIOScheduler()


async def daily_update():
    """Collect new movies and retrain the model."""
    from datetime import date

    current_year = date.today().year
    db = SessionLocal()
    try:
        added = await collect_movies(db, start_year=current_year, end_year=current_year)
        if added > 0:
            train(db)
            logger.info("Daily update: added %d movies and retrained model", added)
    finally:
        db.close()


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    scheduler.add_job(daily_update, "interval", hours=24)
    scheduler.start()
    logger.info("App started. Database tables created.")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()


@app.get("/health")
def health():
    return {"status": "ok"}
