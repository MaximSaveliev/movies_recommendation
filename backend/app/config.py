from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    session_ttl_seconds: int = 604800
    imdb_api_base_url: str
    model_path: str = "model.pkl"
    gcs_bucket: str = ""
    allowed_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
