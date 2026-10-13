from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router as api_router
from app.rag.ingestion import ingest_knowledge_base

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dist_ops_rca")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ingest synthetic dataset into Vector Store
    logger.info("Initializing Distribution Operations AI RCA Platform...")
    try:
        res = ingest_knowledge_base()
        logger.info(f"Knowledge Vector Store initialized successfully: {res}")
    except Exception as e:
        logger.error(f"Failed to auto-ingest knowledge store on startup: {e}")
    yield
    # Teardown logic
    logger.info("Shutting down Distribution Operations AI RCA Platform...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise AI Root Cause Analysis (RCA) Copilot for Distribution Network Operations (SAP -> EAI -> Acumax -> Pick/Pack/Ship/Truck Close)",
    lifespan=lifespan
)

# Enable CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_prefix": settings.API_V1_PREFIX,
        "status": "OPERATIONAL"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
