import logging
import os

import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from app.config import settings
from app.models.movie import Movie

logger = logging.getLogger(__name__)

_EMBEDDING_MODEL = "all-MiniLM-L6-v2"
_model_cache: dict = {}


def _upload_to_gcs(local_path: str) -> None:
    if not settings.gcs_bucket_name:
        return
    from google.cloud import storage
    client = storage.Client()
    client.bucket(settings.gcs_bucket_name).blob("model.pkl").upload_from_filename(local_path)
    logger.info("Model uploaded to gs://%s/model.pkl", settings.gcs_bucket_name)


def _download_from_gcs(local_path: str) -> bool:
    if not settings.gcs_bucket_name:
        return False
    from google.cloud import storage
    client = storage.Client()
    blob = client.bucket(settings.gcs_bucket_name).blob("model.pkl")
    if not blob.exists():
        return False
    blob.download_to_filename(local_path)
    logger.info("Model downloaded from gs://%s/model.pkl", settings.gcs_bucket_name)
    return True


def _build_feature_string(movie: Movie) -> str:
    plot = movie.plot or ""
    parts = [
        movie.title,
        plot,
        plot,
        plot,
        " ".join(movie.genres or []),
        " ".join(movie.keywords or []),
        " ".join(movie.countries or []),
        " ".join(movie.languages or []),
        " ".join(movie.directors or []),
        " ".join(movie.stars or []),
        str(movie.start_year or ""),
    ]
    return " ".join(filter(None, parts))


def train(db: Session) -> None:
    """Encode all movies with Sentence Transformers and persist embeddings to disk."""
    movies = db.query(Movie).all()
    if not movies:
        logger.warning("No movies in DB, skipping training")
        return

    movie_ids = [m.id for m in movies]
    feature_strings = [_build_feature_string(m) for m in movies]

    model = SentenceTransformer(_EMBEDDING_MODEL)
    logger.info("Encoding %d movies...", len(movies))
    embeddings = model.encode(feature_strings, show_progress_bar=True, batch_size=64)

    joblib.dump((embeddings, movie_ids), settings.model_path)
    _model_cache.clear()
    logger.info("Embeddings saved to %s", settings.model_path)
    _upload_to_gcs(settings.model_path)


def _load_model() -> tuple:
    if not _model_cache:
        if not os.path.exists(settings.model_path):
            if not _download_from_gcs(settings.model_path):
                raise FileNotFoundError("Model not trained yet. Run collect_and_train first.")
        embeddings, movie_ids = joblib.load(settings.model_path)
        _model_cache["embeddings"] = embeddings
        _model_cache["ids"] = movie_ids
        _model_cache["encoder"] = SentenceTransformer(_EMBEDDING_MODEL)
    return _model_cache["encoder"], _model_cache["embeddings"], _model_cache["ids"]


def recommend_similar(movie_id: str, db: Session, top_n: int = 12) -> list[Movie]:
    """Return top N movies similar to the given movie, excluding itself."""
    _, embeddings, movie_ids = _load_model()

    if movie_id not in movie_ids:
        return []

    idx = movie_ids.index(movie_id)
    query_vector = embeddings[idx].reshape(1, -1)

    scores = cosine_similarity(query_vector, embeddings).flatten()
    top_indices = np.argsort(scores)[::-1]
    top_ids = [movie_ids[i] for i in top_indices if movie_ids[i] != movie_id and scores[i] > 0][:top_n]

    if not top_ids:
        return []

    movies = db.query(Movie).filter(Movie.id.in_(top_ids)).all()
    id_to_movie = {m.id: m for m in movies}
    return [id_to_movie[mid] for mid in top_ids if mid in id_to_movie]


def recommend_by_query(query: str, db: Session, top_n: int = 20) -> list[Movie]:
    """Return top N movies semantically matching the query."""
    encoder, embeddings, movie_ids = _load_model()

    title_match = db.query(Movie).filter(Movie.title.ilike(f"%{query}%")).first()
    if title_match and title_match.id in movie_ids:
        idx = movie_ids.index(title_match.id)
        query_vector = embeddings[idx].reshape(1, -1)
    else:
        query_vector = encoder.encode([query])

    scores = cosine_similarity(query_vector, embeddings).flatten()
    top_indices = np.argsort(scores)[::-1][:top_n]
    top_ids = [movie_ids[i] for i in top_indices if scores[i] > 0]

    if not top_ids:
        return []

    movies = db.query(Movie).filter(Movie.id.in_(top_ids)).all()
    id_to_movie = {m.id: m for m in movies}
    return [id_to_movie[mid] for mid in top_ids if mid in id_to_movie]
