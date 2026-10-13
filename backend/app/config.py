import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Distribution Operations AI RCA Copilot"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Data Paths
    DATA_FILE: Path = BASE_DIR / "data" / "synthetic_poc_data.json"
    VECTOR_DB_DIR: Path = BASE_DIR / "data" / "chroma_db"
    
    # Multi-Provider LLM Fallback Router
    LLM_PROVIDER_ORDER: str = os.getenv("LLM_PROVIDER_ORDER", "groq,anthropic,openai,ollama")
    
    # 1. Groq (Free tier available at console.groq.com)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
    
    # 2. Anthropic Claude
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    
    # 3. OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    DEFAULT_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # 4. Local Ollama
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1")

    # Enterprise Live API Integrations (Hybrid Adapter pattern)
    SERVICENOW_API_URL: str = os.getenv("SERVICENOW_API_URL", "")
    SERVICENOW_API_KEY: str = os.getenv("SERVICENOW_API_KEY", "")
    SPLUNK_API_URL: str = os.getenv("SPLUNK_API_URL", "")
    SPLUNK_API_KEY: str = os.getenv("SPLUNK_API_KEY", "")
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def provider_order_list(self) -> List[str]:
        return [p.strip().lower() for p in self.LLM_PROVIDER_ORDER.split(",") if p.strip()]

settings = Settings()
