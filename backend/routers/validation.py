from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging
import re # Import regex module

from sqlmodel import Session, select

from database import get_session
from models import Mcp, User
from auth_utils import get_current_db_user

# LangChain components
# from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import SystemMessage, HumanMessage

# Import service functions
from llm_services import get_test_llm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(
    prefix="/validate",
    tags=["MCP Validation & Testing"],
    dependencies=[Depends(get_current_db_user)] # Apply auth to all routes
)

# Pydantic model for the test request
class TestRunRequest(BaseModel):
    user_input: str

# Pydantic model for the test response
class TestRunResponse(BaseModel):
    llm_output: str
    system_prompt_used: str # For transparency

@router.post("/test_run/{mcp_id}", response_model=TestRunResponse)
async def test_mcp_run(
    mcp_id: int,
    request: TestRunRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user),
    llm = Depends(get_test_llm)
):
    """Runs a test scenario using the MCP's defined system prompt and user input."""
    # 1. Fetch MCP record, checking ownership using the user object
    mcp_record = session.exec(select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)).first()
    if not mcp_record:
        raise HTTPException(status_code=404, detail=f"MCP with ID {mcp_id} not found or not owned by user.")
    
    # 2. Extract System Prompt from definition_json
    if not mcp_record.definition_json or 'system_prompt' not in mcp_record.definition_json:
        raise HTTPException(status_code=400, detail="MCP definition or system prompt is missing.")
        
    system_prompt = mcp_record.definition_json.get('system_prompt')
    if not system_prompt: # Double check if it's empty string
         raise HTTPException(status_code=400, detail="System prompt within MCP definition is empty.")

    logger.info(f"Running test for MCP ID: {mcp_id} (Owner: {user.id}) using system prompt (length {len(system_prompt)}). Input: '{request.user_input[:50]}...'")

    # 3. Construct messages for LLM
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=request.user_input),
    ]

    # 4. Invoke LLM (uses injected llm)
    try:
        logger.info("Invoking LLM for test run...")
        response = await llm.ainvoke(messages)
        llm_output = response.content
        logger.info("LLM test run successful.")
        
        return TestRunResponse(
            llm_output=llm_output,
            system_prompt_used=system_prompt # Return the prompt used for clarity
        )

    except Exception as e:
        logger.error(f"Error during LLM test run invocation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute test run: {e}"
        )

# TODO: Add endpoints for other validation types (completeness check, hallucination check?) 