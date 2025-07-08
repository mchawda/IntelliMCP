from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import logging
from typing import Optional, List, Dict, Any
import re
import json

from auth_utils import get_current_db_user
from models import User, McpDefinition, McpExampleItem

# LangChain components
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

# Import service functions
from llm_services import get_creative_llm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(
    prefix="/ai",
    tags=["AI Assistance"],
    dependencies=[Depends(get_current_db_user)]
)

# --- Pydantic Models (Updated for Structured Data) --- 

# Updated Request for Suggest Improvements
class SuggestImprovementsRequest(BaseModel):
    system_prompt: Optional[str] = None
    input_schema_description: Optional[str] = None
    output_schema_description: Optional[str] = None
    constraints: Optional[List[str]] = None
    examples: Optional[List[Dict[str, str]]] = None
    mcp_goal: Optional[str] = None
    mcp_domain: Optional[str] = None

class SuggestImprovementsResponse(BaseModel):
    suggestions: str

# Request for Check Constraints (Updated)
class CheckConstraintsRequest(BaseModel):
    content_to_check: str 
    constraints_list: List[str] 

class CheckConstraintsResponse(BaseModel):
    feedback: str
    violations_found: bool

# Request for Rephrase/Expand (Targets a specific field)
class TextFieldContextRequest(BaseModel):
    field_name: str
    selected_text: str
    full_definition: Optional[Dict[str, Any]] = None 

class RephraseTextResponse(BaseModel):
    rephrased_text: str

class ExpandTextResponse(BaseModel):
    expanded_text: str

# Request for Generate Component (Generates content for a specific field)
class GenerateComponentRequest(BaseModel):
    field_to_generate: str
    current_definition: Optional[Dict[str, Any]] = None 
    mcp_goal: Optional[str] = None
    mcp_domain: Optional[str] = None

class GenerateComponentResponse(BaseModel):
    generated_data: Any 

# Define structure for examples if generating them as JSON
class ExampleItem(BaseModel):
    input: str = Field(description="Example user input.")
    output: str = Field(description="Example AI output.")

class ExampleList(BaseModel):
    examples: List[ExampleItem] = Field(description="List of input/output examples.")

# --- Endpoint Implementations (Refactored) --- 

@router.post("/suggest_improvements", response_model=SuggestImprovementsResponse)
async def suggest_improvements(
    request: SuggestImprovementsRequest,
    user: User = Depends(get_current_db_user),
    llm = Depends(get_creative_llm)
):
    logger.info(f"Received request for AI suggestions from user {user.id}.")

    # Construct the input context from provided fields
    mcp_context = f"Goal: {request.mcp_goal or 'N/A'}\nDomain: {request.mcp_domain or 'N/A'}\n"
    if request.system_prompt: mcp_context += f"\nSystem Prompt:\n```\n{request.system_prompt}\n```\n"
    if request.input_schema_description: mcp_context += f"\nInput Schema Desc: {request.input_schema_description}\n"
    if request.output_schema_description: mcp_context += f"\nOutput Schema Desc: {request.output_schema_description}\n"
    
    # Format constraints separately before adding to f-string
    if request.constraints:
        constraints_str = "\n- ".join(request.constraints)
        mcp_context += f"\nConstraints:\n- {constraints_str}\n"
        
    if request.examples: mcp_context += f"\nExamples Count: {len(request.examples)}\n"
    
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are an expert reviewer of Model Context Protocols (MCPs). Analyze the provided MCP definition components. Provide actionable suggestions for improvement, focusing on clarity, completeness, potential ambiguities, enforceability of constraints, and overall effectiveness based on the goal and domain. Format suggestions as a bulleted list."),
        ("human", "Please review the following MCP definition and provide suggestions for improvement.\n\n{mcp_definition_context}\n\nSuggestions:")
    ])

    chain = prompt_template | llm | StrOutputParser()

    try:
        logger.info("Invoking LLM for suggestions on structured data...")
        suggestions = await chain.ainvoke({"mcp_definition_context": mcp_context})
        logger.info("Suggestions generated successfully.")
        return SuggestImprovementsResponse(suggestions=suggestions)
    except Exception as e:
        logger.error(f"Error during suggestion generation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {e}")

@router.post("/check_constraints", response_model=CheckConstraintsResponse)
async def check_constraints(
    request: CheckConstraintsRequest,
    user: User = Depends(get_current_db_user),
    llm = Depends(get_creative_llm)
):
    logger.info(f"Received request for AI constraint check from user {user.id}.")

    if not request.constraints_list:
         return CheckConstraintsResponse(feedback="No constraints provided in the definition to check against.", violations_found=False)

    constraints_str = "\n".join([f"- {c}" for c in request.constraints_list])
    
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are an expert evaluator for Model Context Protocols (MCPs). Your task is to determine if the provided Content violates any of the specified constraints. List any violations found, referencing the specific constraint and the violating part of the content. If no violations are found, state that clearly."),
        ("human", "Please check if the following Content violates any of the rules listed in the Constraints.\n\n**Constraints:**\n```\n{constraints}\n```\n\n**Content to Check:**\n```\n{content_to_check}\n```\n\n**Evaluation Feedback (list violations or state none found):**")
    ])

    chain = prompt_template | llm | StrOutputParser()

    try:
        logger.info("Invoking LLM for constraint check...")
        feedback = await chain.ainvoke({
            "content_to_check": request.content_to_check,
            "constraints": constraints_str
        })
        logger.info("Constraint check completed.")
        violations_found = "violation" in feedback.lower() and "no violation" not in feedback.lower()
        return CheckConstraintsResponse(feedback=feedback, violations_found=violations_found)
    except Exception as e:
        logger.error(f"Error during constraint check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to check constraints: {e}")

@router.post("/rephrase", response_model=RephraseTextResponse)
async def rephrase_text(
    request: TextFieldContextRequest,
    user: User = Depends(get_current_db_user),
    llm = Depends(get_creative_llm)
):
    logger.info(f"Received request to rephrase field '{request.field_name}' from user {user.id}.")
    
    # Prepare context string (ensure no unescaped braces)
    context_str = "Full MCP Definition Context (excluding target field):\n"
    if request.full_definition:
        for key, value in request.full_definition.items():
            if key != request.field_name:
                 context_str += f"  {key}: {json.dumps(value, indent=2)[:200].replace('{','{{').replace('}','}}')}...\n" # Escape braces
    else:
        context_str = "No additional context provided."
        
    # Use PromptTemplate with partial_variables for context
    system_prompt = PromptTemplate(template="You are an expert editor... Use the provided context...", input_variables=[])
    human_prompt = PromptTemplate(
        template=f"{context_str}\n\n**Text to Rephrase ({request.field_name}):**\n```\n{{selected_text}}\n```\n\n**Rephrased Text:**",
        input_variables=["selected_text"],
        partial_variables={}
    )
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate(prompt=system_prompt),
        HumanMessagePromptTemplate(prompt=human_prompt)
    ])

    chain = prompt | llm | StrOutputParser()

    try:
        logger.info(f"Invoking LLM for rephrasing '{request.field_name}'...")
        rephrased_text = await chain.ainvoke({"selected_text": request.selected_text})
        logger.info("Rephrasing successful.")
        cleaned_rephrased = rephrased_text.strip().strip("`")
        return RephraseTextResponse(rephrased_text=cleaned_rephrased)
    except Exception as e:
        logger.error(f"Error during rephrasing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to rephrase text: {e}")

@router.post("/expand", response_model=ExpandTextResponse)
async def expand_text(
    request: TextFieldContextRequest,
    user: User = Depends(get_current_db_user),
    llm = Depends(get_creative_llm)
):
    logger.info(f"Received request to expand field '{request.field_name}' from user {user.id}.")

    # Prepare context string (ensure no unescaped braces)
    context_str = "Full MCP Definition Context (excluding target field):\n"
    if request.full_definition:
        for key, value in request.full_definition.items():
            if key != request.field_name:
                 context_str += f"  {key}: {json.dumps(value, indent=2)[:200].replace('{','{{').replace('}','}}')}...\n" # Escape braces
    else:
        context_str = "No additional context provided."

    # Use PromptTemplate with partial_variables for context
    system_prompt = PromptTemplate(template="You are an expert writer... Use the provided context...", input_variables=[])
    human_prompt = PromptTemplate(
        template=f"{context_str}\n\n**Text to Expand ({request.field_name}):**\n```\n{{selected_text}}\n```\n\n**Expanded Text (incorporating the original selection seamlessly):**",
        input_variables=["selected_text"],
        partial_variables={}
    )
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate(prompt=system_prompt),
        HumanMessagePromptTemplate(prompt=human_prompt)
    ])

    chain = prompt | llm | StrOutputParser()

    try:
        logger.info(f"Invoking LLM for expanding '{request.field_name}'...")
        expanded_text = await chain.ainvoke({"selected_text": request.selected_text})
        logger.info("Expansion successful.")
        cleaned_expanded = expanded_text.strip().strip("`")
        return ExpandTextResponse(expanded_text=cleaned_expanded)
    except Exception as e:
        logger.error(f"Error during expansion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to expand text: {e}")

@router.post("/generate_component", response_model=GenerateComponentResponse)
async def generate_component(
    request: GenerateComponentRequest,
    user: User = Depends(get_current_db_user),
    llm = Depends(get_creative_llm)
):
    logger.info(f"Received request to generate component '{request.field_to_generate}' from user {user.id}.")

    # Prepare context from the current definition
    context_str = "Current MCP Definition Context:\n"
    if request.current_definition:
        for key, value in request.current_definition.items():
            # Avoid including the field we are trying to generate in the context, if it exists
            if key != request.field_to_generate:
                 # Summarize lists/long strings
                 if isinstance(value, list):
                     context_str += f"  {key}: (List of {len(value)} items)\n"
                 elif isinstance(value, str) and len(value) > 100:
                     context_str += f"  {key}: {value[:100]}...\n"
                 else:
                     context_str += f"  {key}: {value}\n" 
    else:
        context_str = "No current definition context provided."
        
    context_str += f"\nGoal: {request.mcp_goal or 'N/A'}\nDomain: {request.mcp_domain or 'N/A'}\n"

    # --- Prompt and Parsing Logic based on field_to_generate --- 
    target_field = request.field_to_generate
    parser: Any = StrOutputParser() # Default to string output
    output_format_instructions = ""
    final_human_prompt = ""

    system_prompt_base = f"You are an expert assistant helping create Model Context Protocols (MCPs). Generate ONLY the content for the specified component (\'{target_field}\'), using the provided context. Be concise and accurate."

    if target_field in ["system_prompt", "input_schema_description", "output_schema_description"]:
        final_human_prompt = f"{context_str}\n\nPlease generate ONLY the text content for the **{target_field}** component."
        parser = StrOutputParser()
    elif target_field == "constraints":
        system_prompt_base += " Output the constraints as a JSON list of strings."
        parser = JsonOutputParser(pydantic_object=List[str]) # Expect a list of strings
        output_format_instructions = parser.get_format_instructions()
        final_human_prompt = f"{context_str}\n{output_format_instructions}\n\nPlease generate a JSON list of strings for the **{target_field}** component."
    elif target_field == "examples":
        system_prompt_base += " Output the examples as a JSON list of objects, each with 'input' and 'output' keys."
        parser = JsonOutputParser(pydantic_object=ExampleList) # Expect a list of ExampleItem objects
        output_format_instructions = parser.get_format_instructions()
        final_human_prompt = f"{context_str}\n{output_format_instructions}\n\nPlease generate a JSON list of input/output examples for the **{target_field}** component."
    else:
        raise HTTPException(status_code=400, detail=f"Invalid field_to_generate specified: {target_field}")

    # Create the final prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt_base),
        ("human", final_human_prompt)
    ])

    chain = prompt | llm | parser

    try:
        logger.info(f"Invoking LLM for {target_field} generation...")
        generated_data = await chain.ainvoke({}) # No specific variables needed in the prompt itself anymore
        logger.info(f"{target_field} generated successfully.")
        
        # Handle potential string wrapping if parser is StrOutputParser
        if isinstance(generated_data, str):
            generated_data = generated_data.strip().strip("`")
            
        # If we generated examples, extract the list from the parsed object
        if target_field == "examples" and isinstance(generated_data, dict) and 'examples' in generated_data:
             generated_data = generated_data['examples']
            
        return GenerateComponentResponse(generated_data=generated_data)

    except Exception as e:
        logger.error(f"Error during component generation for {target_field}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate component '{target_field}': {e}") 