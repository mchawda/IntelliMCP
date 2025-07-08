import os
import chromadb
from chromadb.config import Settings
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings # Assuming this is your embedding function source
import logging

logger = logging.getLogger(__name__)

# Configuration
CHROMA_PERSIST_DIR = "./chroma_data"
COLLECTION_NAME = "mcp_context_documents"
CHROMA_HOST = os.getenv("CHROMA_HOST", None)
CHROMA_PORT = os.getenv("CHROMA_PORT", "8000")

# Initialize embeddings (ensure API key is available)
# Consider making the embedding model configurable via env var too
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

chroma_client = None

def get_chroma_client():
    """Initializes and returns a ChromaDB client based on environment variables."""
    global chroma_client
    if chroma_client:
        return chroma_client

    if CHROMA_HOST:
        logger.info(f"Connecting to remote ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}")
        try:
            # Settings for HTTP client connection
            client_settings = Settings(
                chroma_api_impl="rest",
                chroma_server_host=CHROMA_HOST,
                chroma_server_http_port=CHROMA_PORT
                # Add SSL settings if needed: chroma_server_ssl_enabled=True
            )
            chroma_client = chromadb.Client(client_settings)
        except Exception as e:
            logger.error(f"Failed to connect to remote ChromaDB: {e}", exc_info=True)
            raise RuntimeError(f"Could not connect to ChromaDB server at {CHROMA_HOST}:{CHROMA_PORT}") from e
    else:
        logger.info(f"Using local persistent ChromaDB at {CHROMA_PERSIST_DIR}")
        # Settings for local persistent client
        client_settings = Settings(persist_directory=CHROMA_PERSIST_DIR)
        chroma_client = chromadb.Client(client_settings)
        # Ensure collection exists for local client?
        # try:
        #     chroma_client.get_or_create_collection(COLLECTION_NAME) 
        # except Exception as e:
        #     logger.warning(f"Could not ensure local collection exists: {e}")
            
    return chroma_client

def get_vector_store() -> Chroma:
    """Provides a Langchain Chroma vector store instance."""
    client = get_chroma_client()
    vector_store = Chroma(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR if not CHROMA_HOST else None # Only set persist_dir for local
    )
    return vector_store

# --- FastAPI Dependency --- 
async def get_vector_store_dependency() -> Chroma:
    # This allows injecting the vector store into FastAPI endpoints
    # Note: Initialization happens once on startup due to global client cache
    try:
        return get_vector_store()
    except Exception as e:
        # If client failed to init, this will raise an error
        logger.error(f"Vector store dependency failed: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail="Vector store service unavailable.") 