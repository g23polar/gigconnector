from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    GOOGLE_CLIENT_ID: str | None = None
    SPOTIFY_CLIENT_ID: str | None = None
    SPOTIFY_CLIENT_SECRET: str | None = None
    SPOTIFY_REDIRECT_URI: str | None = None
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 30
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"


settings = Settings()
