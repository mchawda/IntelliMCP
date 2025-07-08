"""
Vector Store Services for IntelliMCP Studio
Centralizes ChromaDB client configuration for both development and production environments.
"""

import os
from functools import lru_cache
import chromadb
from chromadb.config import Settings
import logging

# Import LangChain components for the dependency function
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_vector_store():
    """
    Get or create ChromaDB client with environment-based configuration.
    
    In production: Connects to remote ChromaDB server via HTTP
    In development: Uses local persistent storage
    
    Returns:
        chromadb.Client: Configured ChromaDB client instance
    """
    chroma_host = os.getenv("CHROMA_HOST")
    chroma_port = os.getenv("CHROMA_PORT", "8000")
    
    if chroma_host:
        # Production: Connect to remote ChromaDB server
        logger.info(f"Connecting to remote ChromaDB at {chroma_host}:{chroma_port}")
        try:
            client = chromadb.HttpClient(
                host=chroma_host,
                port=int(chroma_port),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=False  # Disable reset in production
                )
            )
            # Test connection
            client.heartbeat()
            logger.info("Successfully connected to remote ChromaDB")
            return client
        except Exception as e:
            logger.error(f"Failed to connect to remote ChromaDB: {e}")
            raise
    else:
        # Development: Use local persistent storage
        local_path = os.getenv("CHROMA_LOCAL_PATH", "./chroma_data")
        logger.info(f"Using local ChromaDB at {local_path}")
        
        return chromadb.PersistentClient(
            path=local_path,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True  # Allow reset in development
            )
        )

def get_vector_store_dependency():
    """
    FastAPI dependency function that returns a LangChain Chroma vectorstore instance.
    
    Returns:
        Chroma: LangChain Chroma vectorstore instance for dependency injection
    """
    try:
        # Get the ChromaDB client
        client = get_vector_store()
        
        # Initialize OpenAI embeddings
        embeddings = OpenAIEmbeddings()
        
        # Create LangChain Chroma vectorstore
        vectorstore = Chroma(
            client=client,
            collection_name="intellimcp_documents",
            embedding_function=embeddings
        )
        
        return vectorstore
    except Exception as e:
        logger.error(f"Failed to create vector store dependency: {e}")
        raise

def get_or_create_collection(collection_name: str, embedding_function=None):
    """
    Get or create a ChromaDB collection with the specified name.
    
    Args:
        collection_name: Name of the collection
        embedding_function: Optional embedding function for the collection
        
    Returns:
        chromadb.Collection: The collection instance
    """
    client = get_vector_store()
    
    try:
        # Try to get existing collection
        collection = client.get_collection(
            name=collection_name,
            embedding_function=embedding_function
        )
        logger.info(f"Retrieved existing collection: {collection_name}")
    except Exception:
        # Create new collection if it doesn't exist
        collection = client.create_collection(
            name=collection_name,
            embedding_function=embedding_function
        )
        logger.info(f"Created new collection: {collection_name}")
    
    return collection

def health_check():
    """
    Perform a health check on the vector store connection.
    
    Returns:
        dict: Health status information
    """
    try:
        client = get_vector_store()
        client.heartbeat()
        
        # Get collection count as additional health metric
        collections = client.list_collections()
        
        return {
            "status": "healthy",
            "type": "remote" if os.getenv("CHROMA_HOST") else "local",
            "collections_count": len(collections)
        }
    except Exception as e:
        logger.error(f"Vector store health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        } 