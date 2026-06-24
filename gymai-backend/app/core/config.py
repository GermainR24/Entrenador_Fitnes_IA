
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DATABASE_URL:   str = "sqlite:///./gym.db"
    SECRET_KEY:     str = "dev_secret_key_cambiar_en_produccion"  
    GROQ_API_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()