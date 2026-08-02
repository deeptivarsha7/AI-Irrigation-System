from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    APP_NAME: str = "AI Irrigation Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str
    OPENWEATHER_API_KEY: str
    OPENWEATHER_BASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.DATABASE_USER,
            password=self.DATABASE_PASSWORD,
            host=self.DATABASE_HOST,
            port=self.DATABASE_PORT,
            database=self.DATABASE_NAME,
        ).render_as_string(hide_password=False)


settings = Settings()