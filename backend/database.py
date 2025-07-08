import os
from sqlmodel import create_engine, SQLModel, Session
from dotenv import load_dotenv
import logging

# Import models here so SQLModel knows about them
import models # Change relative import to absolute

load_dotenv() # Load environment variables from .env file

# Configure logging
logger = logging.getLogger(__name__)

# Retrieve database connection details
DATABASE_URL = os.getenv("DATABASE_URL") # Prioritize DATABASE_URL

# Fallback to individual components if DATABASE_URL is not set
if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER", "devuser")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "devpassword")
    DB_HOST = os.getenv("DB_HOST", "localhost") 
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "intellimcp_dev")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Enterprise-grade database engine configuration
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Disable SQL logging in production
    pool_size=20,  # Increased pool size for enterprise load
    max_overflow=30,  # Allow more connections during peak
    pool_pre_ping=True,  # Test connections before use
    pool_recycle=3600,  # Recycle connections every hour
    pool_timeout=30,  # Timeout for getting connection from pool
    connect_args={
        "connect_timeout": 10,
        "application_name": "IntelliMCP_Backend",
        "options": "-c statement_timeout=30000"  # 30 second query timeout
    }
)

def create_db_and_tables():
    """Initializes the database by creating all tables defined by SQLModel models
       if they don't already exist."""
    logger.info(f"Connecting to PostgreSQL database")
    logger.info("Initializing database: Creating tables (if they don't exist)...")
    try:
        SQLModel.metadata.create_all(engine) # Create tables only if they don't exist
        logger.info("Database initialization complete.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def get_session():
    """Dependency function to get a database session for API endpoints."""
    with Session(engine) as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            session.rollback()
            raise
        finally:
            session.close()

# You might want to call create_db_and_tables() on application startup.
# This can be done using FastAPI's startup events in main.py. 