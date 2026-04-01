import uuid

from app.config import settings
from app.redis_client import client


def create_session(user_id: int) -> str:
    session_id = str(uuid.uuid4())
    client.setex(f"session:{session_id}", settings.session_ttl_seconds, str(user_id))
    return session_id


def get_user_id_from_session(session_id: str) -> int | None:
    value = client.get(f"session:{session_id}")
    return int(value) if value else None


def delete_session(session_id: str) -> None:
    client.delete(f"session:{session_id}")
