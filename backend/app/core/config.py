from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str
    mongodb_db_name: str = "karachi_blood_response"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    env: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
