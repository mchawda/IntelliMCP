from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import logging
from typing import List, Dict, Any
from datetime import datetime
import json

from sqlmodel import Session, select

from database import get_session
from models import Mcp, User, McpDefinition
from auth_utils import get_current_db_user

# LangChain components for generation
# Use PromptTemplate for better control over formatting instructions
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# Import context retrieval functions/models - NOW uses service
from langchain_community.vectorstores import Chroma # Keep Chroma for type hint
# from routers.context import CHROMA_PERSIST_DIR, COLLECTION_NAME # No longer needed
from vector_store_services import get_vector_store_dependency # Import new dependency

# Import service functions
from llm_services import get_openai_embeddings, get_generation_llm # Keep embeddings for now if used elsewhere

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(
    prefix="/generate",
    tags=["MCP Generation"],
    dependencies=[Depends(get_current_db_user)] # Apply auth to all routes
)

# --- Pydantic Models for Structured Output ---
# Pydantic model for the response (returning the JSON object)
class GenerationJsonResponse(BaseModel):
    definition_json: McpDefinition

@router.post("/mcp/{mcp_id}", response_model=GenerationJsonResponse)
async def generate_mcp_json(
    mcp_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user),
    # Remove direct embedding injection if store handles it
    # embeddings = Depends(get_openai_embeddings), 
    llm = Depends(get_generation_llm),
    vector_store: Chroma = Depends(get_vector_store_dependency) # Inject vector store
):
    """Generates the MCP definition as JSON based on goal and retrieved context."""

    # 1. Fetch MCP record, checking ownership using the user object
    mcp_record = session.exec(select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)).first()
    if not mcp_record:
        raise HTTPException(status_code=404, detail=f"MCP with ID {mcp_id} not found or not owned by user.")

    logger.info(f"Generating JSON definition for MCP ID: {mcp_id} (Owner: {user.id}), Goal: {mcp_record.goal[:50]}...")

    # 2. Retrieve relevant context using injected vector store
    context_query = f"Context relevant to: {mcp_record.goal}"
    retrieved_chunks_str = "No relevant context found for this specific MCP."
    try:
        # Construct filter
        filter_dict = {
            "$and": [
                {"mcp_id": mcp_id},
                {"user_id": user.id}
            ]
        }
        # Use the injected vector store for search
        results = vector_store.similarity_search(
            query=context_query, 
            k=5, 
            where=filter_dict 
        )
        if results:
            retrieved_chunks_str = "\n\n---\n\n".join([doc.page_content for doc in results])
            logger.info(f"Retrieved {len(results)} context chunks specific to MCP {mcp_id}.")
        else:
             logger.info(f"No relevant context documents found specifically for MCP {mcp_id}.")
            
    except Exception as e:
        logger.error(f"Error retrieving context for MCP {mcp_id}: {e}", exc_info=True)

    # 3. Initialize JSON Output Parser (using the imported McpDefinition)
    parser = JsonOutputParser(pydantic_object=McpDefinition)
    format_instructions = parser.get_format_instructions()

    # 4. Define Prompt Templates using PromptTemplate and partial_variables
    system_template_str = (
        f"You are an expert assistant creating structured Model Context Protocols (MCPs) in JSON format. "
        f"Your sole output MUST be a single, valid JSON object adhering EXACTLY to the following schema. "
        f"Do NOT include any other text, explanations, or markdown formatting outside of the JSON object. "
        f"Do NOT include the input parameters (like mcp_name, mcp_goal) in the output JSON itself.\n\n"
        f"JSON Schema:\n{{format_instructions}}\n"
    )
    
    system_template = PromptTemplate(
        template=system_template_str,
        input_variables=[],
        partial_variables={"format_instructions": format_instructions} 
    )
    
    human_template_str = (
        f"Based on the following details, generate the MCP JSON object:\n\n"
        f"**MCP Name:** {{mcp_name}}\n"
        f"**Domain:** {{mcp_domain}}\n"
        f"**Primary Goal:** {{mcp_goal}}\n"
        f"**Key Roles:** {{mcp_roles}}\n\n"
        f"**Relevant Context:**\n---\n{{retrieved_context}}\n---\n\n"
        f"Respond ONLY with the valid JSON object matching the schema provided in the system prompt:"
    )

    human_template = PromptTemplate(
        template=human_template_str,
        input_variables=["mcp_name", "mcp_domain", "mcp_goal", "mcp_roles", "retrieved_context"]
    )

    # Combine into a ChatPromptTemplate
    chat_prompt_template = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate(prompt=system_template),
        HumanMessagePromptTemplate(prompt=human_template)
    ])

    # 5. Create LangChain (LCEL) Chain
    chain = chat_prompt_template | llm | parser

    # 6. Invoke Chain and Save Result
    try:
        logger.info("Invoking LLM for structured MCP generation...")
        input_dict = {
            "mcp_name": mcp_record.name,
            "mcp_domain": mcp_record.domain,
            "mcp_goal": mcp_record.goal,
            "mcp_roles": mcp_record.roles,
            # Pass context directly - escaping is handled by PromptTemplate now
            "retrieved_context": retrieved_chunks_str 
        }
        generated_json_dict = await chain.ainvoke(input_dict)
        logger.info("LLM invocation successful, received structured data.")
        
        # Save the generated JSON to the database record
        mcp_record.definition_json = generated_json_dict 
        mcp_record.updated_at = datetime.utcnow()
        session.add(mcp_record)
        session.commit()
        session.refresh(mcp_record)
        logger.info(f"Saved JSON definition to MCP ID: {mcp_id}")

        return GenerationJsonResponse(definition_json=McpDefinition(**generated_json_dict))

    except Exception as e:
        session.rollback()
        logger.error(f"Error during structured MCP generation or saving: {e}", exc_info=True) 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate or save MCP JSON definition: {e}"
        )

# TODO: Add endpoint for regenerating, or updating specific parts? 