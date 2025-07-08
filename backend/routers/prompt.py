# backend/routers/prompt.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging

from sqlmodel import Session, select

from database import get_session
from models import Mcp, User 
from auth_utils import get_current_db_user
# Remove LLM/Langchain imports if no longer needed here
# from llm_services import get_creative_llm
# from langchain_core.prompts import ChatPromptTemplate
# from langchain_core.output_parsers import StrOutputParser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(
    prefix="/prompt",
    tags=["Prompt Handling"],
)

# --- Pydantic Models --- 
class PromptInitiateRequest(BaseModel):
    prompt: str

class PromptInitiateResponse(BaseModel):
    mcp_id: int
    # Optionally return basic info if needed by next step
    mcp_name: str
    goal: str

# --- Endpoint (Simplified) --- 
@router.post("/initiate", response_model=PromptInitiateResponse, status_code=status.HTTP_201_CREATED)
async def initiate_mcp_from_prompt(
    request: PromptInitiateRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user)
):
    """Takes an initial user prompt, creates a basic MCP record, and returns its ID."""
    
    logger.info(f"Received prompt initiation request from user ID: {user.id}. Prompt: '{request.prompt[:100]}...'")

    # Generate name from first part of prompt, add ellipsis if truncated
    mcp_name = request.prompt[:30].strip()
    if len(request.prompt) > 30:
        mcp_name += "..."
    # Ensure name is not empty
    if not mcp_name:
        mcp_name = "Untitled MCP" 
        
    mcp_goal = request.prompt # Use the raw prompt as the initial goal
    mcp_domain = "General" # Default domain
    mcp_roles = "User, AI" # Default roles

    # Create New MCP Record
    new_mcp = Mcp(
        name=mcp_name, 
        domain=mcp_domain,
        goal=mcp_goal, 
        roles=mcp_roles,
        owner_id=user.id,
        # definition_json starts as null
    )

    # Save to DB
    try:
        session.add(new_mcp)
        session.commit()
        session.refresh(new_mcp)
        logger.info(f"Created basic MCP with ID: {new_mcp.id} for user {user.id}.")
        return PromptInitiateResponse(
            mcp_id=new_mcp.id,
            mcp_name=new_mcp.name,
            goal=new_mcp.goal
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error saving new basic MCP: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create MCP record: {e}"
        ) 