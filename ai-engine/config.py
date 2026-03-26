"""Configuration for LlamaIndex + HuggingFace setup"""
import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/classy")

# FastAPI
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", 8000))
API_RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"

# Data paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
COURSES_DIR = os.path.join(DATA_DIR, "courses")
INDICES_DIR = os.path.join(os.path.dirname(__file__), "indices")

# Ensure directories exist
os.makedirs(COURSES_DIR, exist_ok=True)
os.makedirs(INDICES_DIR, exist_ok=True)
