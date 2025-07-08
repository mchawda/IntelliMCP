from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging
from typing import List, Dict, Any
from functools import lru_cache

from langchain_community.vectorstores import Chroma
from auth_utils import get_clerk_id
from llm_services import get_openai_embeddings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(
    prefix="/context",
    tags=["Context Retrieval"],
    dependencies=[Depends(get_clerk_id)] # Apply auth to all routes in this router
)

# ChromaDB persistence directory and collection name (should match ingestion)
CHROMA_PERSIST_DIR = "./chroma_data"
COLLECTION_NAME = "mcp_context_documents"

# Cache the vector store instance to avoid recreating it on every request
@lru_cache(maxsize=1)
def get_vector_store(embeddings):
    """Get cached vector store instance."""
    return Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_PERSIST_DIR,
        embedding_function=embeddings
    )

# Pydantic model for the retrieval request
class RetrievalRequest(BaseModel):
    query: str
    k: int = 4 # Number of results to retrieve

# Pydantic model for the response (structure of a retrieved chunk)
class RetrievedChunk(BaseModel):
    page_content: str
    metadata: Dict[str, Any]
    score: float # Similarity score

@router.post("/retrieve", response_model=List[RetrievedChunk])
async def retrieve_context(
    request: RetrievalRequest, 
    embeddings = Depends(get_openai_embeddings) # Inject embeddings
):
    """Retrieves relevant context chunks from the vector store based on a query."""
    
    logger.info(f"Received retrieval request for query: '{request.query}' (k={request.k})")

    try:
        # Use cached vector store instance
        vector_store = get_vector_store(embeddings)

        # Perform similarity search with score
        results_with_scores = vector_store.similarity_search_with_score(
            query=request.query,
            k=request.k
        )
        
        # Format results
        formatted_results: List[RetrievedChunk] = []
        for doc, score in results_with_scores:
            formatted_results.append(
                RetrievedChunk(
                    page_content=doc.page_content,
                    metadata=doc.metadata,
                    score=score # Chroma returns distance score, lower is better
                )
            )
            
        logger.info(f"Retrieved {len(formatted_results)} chunks.")
        return formatted_results

    except RuntimeError as e:
        # Catch potential initialization error from get_openai_embeddings
        logger.error(f"Embedding service error: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Error during context retrieval: {e}")
        # Consider more specific error handling (e.g., collection not found?)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve context: {e}"
        ) 