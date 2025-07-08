from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Query
from pydantic import BaseModel, HttpUrl
import shutil
import os
import tempfile
import logging
from uuid import uuid4
from typing import Optional, List

# Import auth dependency
from auth_utils import get_current_db_user
from models import User

# LangChain components
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    WebBaseLoader,
)

# Import the vector store dependency
from vector_store_services import get_vector_store_dependency

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(
    prefix="/ingest",
    tags=["Context Ingestion"],
    dependencies=[Depends(get_current_db_user)]
)

# Pydantic model for URL ingestion request
class UrlIngestionRequest(BaseModel):
    url: HttpUrl
    mcp_id: int

# New Pydantic model for listing sources
class IngestedSource(BaseModel):
    source: str

@router.post("/upload/file/{mcp_id}", status_code=status.HTTP_201_CREATED)
async def ingest_file(
    mcp_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_db_user),
    vector_store: Chroma = Depends(get_vector_store_dependency) # Inject vector store
):
    """Receives a file for a specific MCP, associates it with the user and MCP, 
       processes it, and stores embeddings in ChromaDB."""
    
    allowed_content_types = {
        "application/pdf": PyPDFLoader,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": Docx2txtLoader,
        "text/plain": TextLoader,
    }
    
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {list(allowed_content_types.keys())}"
        )
        
    logger.info(f"User {user.id} uploading file for MCP {mcp_id}: {file.filename}")

    # Use a temporary directory for safe file handling
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        # 1. Save file temporarily
        try:
            logger.info(f"Saving file temporarily to: {temp_file_path}")
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
             logger.error(f"Error saving temporary file: {e}")
             raise HTTPException(status_code=500, detail="Error saving uploaded file.")
        finally:
            await file.close()

        # 2. Load document using LangChain
        try:
            Loader = allowed_content_types[file.content_type]
            logger.info(f"Loading document using {Loader.__name__}")
            loader = Loader(temp_file_path)
            documents = loader.load()
            if not documents:
                 logger.warning(f"No content loaded from file: {file.filename}")
                 # Decide how to handle empty files - skip or raise error?
                 # For now, let's skip and return a specific message
                 return {
                    "filename": file.filename,
                    "message": "File received, but no content could be extracted."
                 } 
        except Exception as e:
            logger.error(f"Error loading document: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing document: {e}")

        # 3. Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(documents)
        logger.info(f"Split document into {len(chunks)} chunks.")

        # --- Vector Store Interaction (Simplified) --- 
        try:
            # Prepare metadata
            metadatas = []
            for chunk in chunks:
                 metadatas.append({
                     "source": file.filename,
                     "user_id": user.id,
                     "mcp_id": mcp_id 
                 })

            # Use the injected vector store
            logger.info(f"Adding {len(chunks)} chunks individually with metadata to Chroma.")
            for i, chunk in enumerate(chunks):
                chunk_id = str(uuid4())
                # Use add_texts from the injected vector store
                vector_store.add_texts(texts=[chunk.page_content], metadatas=[metadatas[i]], ids=[chunk_id])
            
            logger.info("Document chunks added to vector store.")

        except Exception as e:
            logger.error(f"Error interacting with vector store: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error storing document embeddings: {e}")

    # Return success 
    return {
        "filename": file.filename,
        "mcp_id": mcp_id,
        "message": f"File processed and {len(chunks)} chunks stored successfully for MCP {mcp_id}.",
    }

@router.post("/upload/url", status_code=status.HTTP_201_CREATED)
async def ingest_url(
    request: UrlIngestionRequest,
    user: User = Depends(get_current_db_user),
    vector_store: Chroma = Depends(get_vector_store_dependency) # Inject vector store
):
    """Receives a URL for a specific MCP, associates it, processes, and stores embeddings."""
    url_to_ingest = str(request.url)
    mcp_id = request.mcp_id
    logger.info(f"User {user.id} ingesting URL for MCP {mcp_id}: {url_to_ingest}")

    try:
        # 1. Load content from URL
        # WebBaseLoader might require additional dependencies like `bs4`
        # Consider adding error handling for network issues, invalid URLs, etc.
        loader = WebBaseLoader(url_to_ingest)
        documents = loader.load()
        if not documents:
            logger.warning(f"No content loaded from URL: {url_to_ingest}")
            return {"url": url_to_ingest, "message": "URL fetched, but no content could be extracted."}

        # 2. Split documents into chunks (same splitter as file upload)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(documents)
        logger.info(f"Split URL content into {len(chunks)} chunks.")

        # 3. Add metadata
        metadatas = []
        for chunk in chunks:
             metadatas.append({
                 "source": url_to_ingest,
                 "user_id": user.id,
                 "mcp_id": mcp_id
             })

        # 4. Add Chunks using injected vector store
        logger.info(f"Adding {len(chunks)} URL chunks individually with metadata to Chroma.")
        for i, chunk in enumerate(chunks):
            chunk_id = str(uuid4())
            vector_store.add_texts(texts=[chunk.page_content], metadatas=[metadatas[i]], ids=[chunk_id])
            
        logger.info(f"URL content chunks added to vector store for MCP {mcp_id}.")

    except ImportError as ie:
         logger.error(f"Missing dependency for WebBaseLoader (likely beautifulsoup4): {ie}")
         raise HTTPException(status_code=500, detail="Server configuration error: Missing dependency for URL loading.")
    except Exception as e:
        logger.error(f"Error processing URL {url_to_ingest}: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing URL: {e}")

    return {
        "url": url_to_ingest,
        "mcp_id": mcp_id,
        "message": f"URL content processed and {len(chunks)} chunks stored successfully for MCP {mcp_id}.",
    }

@router.get("/sources/{mcp_id}", response_model=List[IngestedSource])
async def list_ingested_sources(
    mcp_id: int,
    user: User = Depends(get_current_db_user),
    vector_store: Chroma = Depends(get_vector_store_dependency) # Inject vector store
):
    """Lists the unique source identifiers (filenames/URLs) ingested for a specific MCP."""
    
    logger.info(f"Fetching ingested sources for MCP {mcp_id} by user {user.id}")
    
    try:
        # Use the injected vector store
        results = vector_store.get(
            where={"$and": [{"mcp_id": mcp_id}, {"user_id": user.id}]},
            include=["metadatas"] 
        )
        
        # Extract unique source names from metadata
        sources = set() # Use a set to automatically handle duplicates
        if results and results["metadatas"]:
            for metadata in results["metadatas"]:
                if metadata and 'source' in metadata:
                    sources.add(metadata['source'])
        
        logger.info(f"Found {len(sources)} unique sources for MCP {mcp_id}")
        # Convert set to list of objects for Pydantic validation
        return [IngestedSource(source=src) for src in sorted(list(sources))]
        
    except Exception as e:
        logger.error(f"Error fetching sources for MCP {mcp_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve ingested sources.")

# TODO: Add endpoint to list ingested sources for a given MCP ID 