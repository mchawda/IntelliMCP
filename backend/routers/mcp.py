from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any # Import Dict, Any
from datetime import datetime # Import datetime
from fastapi.responses import PlainTextResponse, JSONResponse # May use later for direct download and JSONResponse
import yaml # Import yaml

from database import get_session
from models import Mcp, User # Import Mcp and User models
from auth_utils import get_clerk_id, get_current_db_user # Import clerk ID dependency and new dependency

# Define the router
router = APIRouter(
    prefix="/mcp",
    tags=["MCP Management"],
    # Apply basic clerk_id validation to all routes first if needed
    dependencies=[Depends(get_clerk_id)] 
)

# Pydantic model for request body (should match frontend form data)
class McpCreateRequest(BaseModel):
    mcpName: str
    domain: str
    goal: str
    roles: str

# Pydantic model for update request body
class McpUpdateRequest(BaseModel):
    generated_content: Optional[str] = None # Keep for potential future use or legacy
    constraints: Optional[str] = None     # Keep legacy constraints field for now
    definition_json: Optional[Dict[str, Any]] = None # Add the structured definition
    # Add other editable fields like name, goal, roles if needed later
    name: Optional[str] = None
    domain: Optional[str] = None
    goal: Optional[str] = None
    roles: Optional[str] = None

# Model for export response
class McpExportResponse(BaseModel):
    filename: str
    content: str
    media_type: str = "text/markdown"

@router.post("/create", response_model=Mcp, status_code=status.HTTP_201_CREATED)
async def create_mcp(
    mcp_data: McpCreateRequest,
    session: Session = Depends(get_session),
    clerk_id: str = Depends(get_clerk_id) # Get verified Clerk ID
):
    """Creates a new MCP record associated with the authenticated user."""
    
    # Find the internal user ID based on the Clerk ID
    user = session.exec(select(User).where(User.clerk_id == clerk_id)).first()
    if not user:
        # This case needs careful handling. Should we create the user here?
        # Or rely on a webhook from Clerk to create users?
        # For now, raise an error assuming user should exist.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with Clerk ID {clerk_id} not found in database. Sync needed?"
        )
    
    # Create Mcp instance from request data and owner ID
    new_mcp = Mcp(
        name=mcp_data.mcpName,
        domain=mcp_data.domain,
        goal=mcp_data.goal,
        roles=mcp_data.roles,
        owner_id=user.id # Use the internal user ID found
    )
    
    try:
        session.add(new_mcp)
        session.commit()
        session.refresh(new_mcp)
        print(f"MCP created with ID: {new_mcp.id} for user ID: {user.id}")
        return new_mcp
    except Exception as e:
        session.rollback()
        print(f"Error creating MCP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create MCP in database: {e}"
        )

@router.get("/{mcp_id}", response_model=Mcp)
async def get_mcp_by_id(
    mcp_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user) # Use new dependency
):
    """Fetches a specific MCP by its ID, ensuring ownership."""
    
    # Fetch the MCP, filtering by ID and owner_id
    mcp_record = session.exec(
        select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)
    ).first()
    
    if not mcp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP with ID {mcp_id} not found or you do not have permission to view it."
        )
        
    return mcp_record

@router.put("/{mcp_id}", response_model=Mcp)
async def update_mcp(
    mcp_id: int,
    update_data: McpUpdateRequest, # Use the updated request model
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user) # Use new dependency
):
    """Updates fields of a specific MCP, including the structured definition, ensuring ownership."""
    
    # Fetch the existing MCP record, ensuring it belongs to the user
    mcp_record = session.exec(
        select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)
    ).first()
    
    if not mcp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP with ID {mcp_id} not found or you do not have permission to modify it."
        )
        
    # Update the fields from the request data
    # Use exclude_unset=True to only update fields explicitly provided in the request
    update_data_dict = update_data.model_dump(exclude_unset=True) 
    updated = False
    for key, value in update_data_dict.items():
        # Ensure the key exists on the model and the value is not None (unless explicitly allowed)
        if hasattr(mcp_record, key):
            # Special handling might be needed if some fields shouldn't be None
            setattr(mcp_record, key, value)
            updated = True
            print(f"Updating {key} for MCP ID: {mcp_id}")
        
    if updated:
        mcp_record.updated_at = datetime.utcnow() # Update timestamp if anything changed
    else:
        # No updatable fields provided or matched
        print(f"No valid fields to update for MCP ID: {mcp_id}")
        return mcp_record # Return unchanged record
        
    try:
        session.add(mcp_record)
        session.commit()
        session.refresh(mcp_record)
        print(f"MCP ID: {mcp_id} updated successfully.")
        return mcp_record
    except Exception as e:
        session.rollback()
        print(f"Error updating MCP ID {mcp_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update MCP in database: {e}"
        )

@router.get("/", response_model=List[Mcp])
async def list_user_mcps(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user) # Use new dependency
):
    """Fetches all MCPs owned by the authenticated user."""
    
    # Fetch all MCPs owned by this user
    mcps = session.exec(select(Mcp).where(Mcp.owner_id == user.id)).all()
    
    return mcps

@router.delete("/{mcp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mcp(
    mcp_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user) # Use new dependency
):
    """Deletes a specific MCP, ensuring ownership."""
    
    # Fetch the existing MCP record, ensuring it belongs to the user
    mcp_record = session.exec(
        select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)
    ).first()
    
    if not mcp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP with ID {mcp_id} not found or you do not have permission to delete it."
        )
        
    # Delete the record
    try:
        session.delete(mcp_record)
        session.commit()
        print(f"MCP ID: {mcp_id} deleted successfully.")
        # No content to return on successful DELETE
        return None 
    except Exception as e:
        session.rollback()
        print(f"Error deleting MCP ID {mcp_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete MCP from database: {e}"
        )

@router.get("/{mcp_id}/export/markdown", response_model=McpExportResponse)
async def export_mcp_markdown(
    mcp_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user) # Use new dependency
):
    """Exports a specific MCP's structured definition as a Markdown formatted string."""
    
    # Fetch the MCP record (reusing logic similar to get_mcp_by_id)
    mcp_record = session.exec(
        select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)
    ).first()
    if not mcp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP with ID {mcp_id} not found or you do not have permission to export it."
        )
        
    # Check if the structured definition exists
    if not mcp_record.definition_json:
         return McpExportResponse(
            filename=f"MCP_{mcp_id}_no_definition.md",
            content=f"# MCP: {mcp_record.name}\n\n**Error:** No structured definition (definition_json) found for this MCP."
         )

    # Format content from definition_json as Markdown
    definition = mcp_record.definition_json
    constraints_md = "\n".join([f"- {c}" for c in definition.get('constraints', [])]) if definition.get('constraints') else 'No constraints defined.'
    # Format examples nicely - simple version for now
    examples_md = ""
    if definition.get('examples'):
        for i, ex in enumerate(definition['examples']):
            examples_md += f"**Example {i+1}:**\nInput:\n```\n{ex.get('input', '')}\n```\nOutput:\n```\n{ex.get('output', '')}\n```\n\n"
    else:
        examples_md = 'No examples provided.'

    markdown_content = f"""# MCP: {mcp_record.name}

**ID:** {mcp_record.id}
**Domain:** {mcp_record.domain}
**Primary Goal:** {mcp_record.goal}

## System Prompt

```
{definition.get('system_prompt', 'Not defined.')}
```

## Input Schema / Description

{definition.get('input_schema_description', 'Not defined.')}

## Output Schema / Description

{definition.get('output_schema_description', 'Not defined.')}

## Constraints

{constraints_md}

## Examples

{examples_md}
"""
    
    # Generate filename
    safe_name = "".join(c if c.isalnum() else '_' for c in mcp_record.name)
    filename = f"MCP_{mcp_record.id}_{safe_name}_definition.md"

    return McpExportResponse(filename=filename, content=markdown_content)

    # --- Alternative: Direct File Response --- 
    # headers = {
    #     'Content-Disposition': f'attachment; filename="{filename}"'
    # }
    # return PlainTextResponse(content=markdown_content, media_type='text/markdown', headers=headers)
    # -----------------------------------------

@router.get("/{mcp_id}/export/json", response_class=JSONResponse)
async def export_mcp_json(
    mcp_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user)
):
    """Exports a specific MCP's structured definition as a JSON file."""
    
    # Fetch the MCP record 
    mcp_record = session.exec(
        select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)
    ).first()
    if not mcp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP with ID {mcp_id} not found or you do not have permission."
        )
        
    # Check if the structured definition exists
    if not mcp_record.definition_json:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No structured definition (definition_json) found for MCP {mcp_id}. Generate it first."
         )

    # Prepare filename
    safe_name = "".join(c if c.isalnum() else '_' for c in mcp_record.name)
    filename = f"MCP_{mcp_record.id}_{safe_name}_definition.json"

    # Set headers for file download
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    # Return the definition_json directly with download headers
    return JSONResponse(content=mcp_record.definition_json, headers=headers)

@router.get("/{mcp_id}/export/yaml", response_class=PlainTextResponse)
async def export_mcp_yaml(
    mcp_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_db_user)
):
    """Exports a specific MCP's structured definition as a YAML file."""
    
    # Fetch the MCP record 
    mcp_record = session.exec(
        select(Mcp).where(Mcp.id == mcp_id, Mcp.owner_id == user.id)
    ).first()
    if not mcp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP with ID {mcp_id} not found or you do not have permission."
        )
        
    # Check if the structured definition exists
    if not mcp_record.definition_json:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No structured definition (definition_json) found for MCP {mcp_id}. Generate it first."
         )

    # Prepare filename
    safe_name = "".join(c if c.isalnum() else '_' for c in mcp_record.name)
    filename = f"MCP_{mcp_record.id}_{safe_name}_definition.yaml"

    # Set headers for file download
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    # Convert the definition_json (dict) to YAML string
    try:
        # Use default_flow_style=False for block style, sort_keys=False to preserve order
        yaml_content = yaml.dump(mcp_record.definition_json, default_flow_style=False, sort_keys=False, allow_unicode=True)
    except yaml.YAMLError as e:
         logger.error(f"Error converting definition to YAML for MCP {mcp_id}: {e}", exc_info=True)
         raise HTTPException(status_code=500, detail="Failed to generate YAML content.")
    
    # Return the YAML string as plain text with download headers
    # Use application/x-yaml or text/yaml as media type
    return PlainTextResponse(content=yaml_content, headers=headers, media_type='application/x-yaml')

# TODO: Implement more advanced features like versioning, sharing? 