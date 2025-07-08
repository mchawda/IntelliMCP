import os
import logging
from functools import lru_cache

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure API key is loaded
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    logger.error("OPENAI_API_KEY environment variable not set. LLM services will fail.")
    # Optionally raise an immediate error: raise ValueError("OPENAI_API_KEY not set")

# Use lru_cache to initialize clients only once
@lru_cache()
def get_openai_embeddings() -> OpenAIEmbeddings:
    """Initializes and returns the OpenAI Embeddings client."""
    if not API_KEY:
         raise ValueError("OpenAI API Key not configured.")
    try:
        logger.info("Initializing OpenAI Embeddings...")
        return OpenAIEmbeddings(model="text-embedding-3-small")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI Embeddings: {e}")
        raise RuntimeError(f"Embedding service initialization failed: {e}")

@lru_cache()
def get_chat_openai(model_name: str = "gpt-4o", temperature: float = 0.7) -> ChatOpenAI:
    """Initializes and returns a ChatOpenAI client with specified model and temperature."""
    if not API_KEY:
         raise ValueError("OpenAI API Key not configured.")
    try:
        logger.info(f"Initializing ChatOpenAI (Model: {model_name}, Temp: {temperature})...")
        return ChatOpenAI(model=model_name, temperature=temperature)
    except Exception as e:
        logger.error(f"Failed to initialize ChatOpenAI ({model_name}): {e}")
        raise RuntimeError(f"Chat model ({model_name}) initialization failed: {e}")

# Example specific clients used in routers (could be defined here or requested with args)
def get_test_llm() -> ChatOpenAI:
    """Gets the LLM client configured for validation testing."""
    return get_chat_openai(model_name="gpt-4o", temperature=0.7)

def get_creative_llm() -> ChatOpenAI:
    """Gets the LLM client configured for creative tasks like suggestions."""
    return get_chat_openai(model_name="gpt-4o", temperature=0.5)

def get_generation_llm() -> ChatOpenAI:
    """Gets the LLM client configured for MCP generation."""
    return get_chat_openai(model_name="gpt-4o", temperature=0.2) 