from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB # Import JSONB for PostgreSQL
from typing import Optional, Dict, Any, List # Import List
from datetime import datetime
# Import Pydantic BaseModel/Field for nested models
from pydantic import BaseModel as PydanticBaseModel, Field as PydanticField

# Using SQLModel allows defining the table schema and data model in one class

class UserBase(SQLModel):
    # Core fields expected when creating or reading a user
    clerk_id: str = Field(index=True, unique=True, description="Clerk User ID")
    email: str = Field(index=True, unique=True)
    first_name: Optional[str] = Field(default=None)
    last_name: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False,
                               sa_column_kwargs={"onupdate": datetime.utcnow})
    # Add other user-specific fields here, e.g., profile_picture_url, preferences, etc.

class User(UserBase, table=True):
    # Database table specific fields
    id: Optional[int] = Field(default=None, primary_key=True)

# --- Define other models below as needed --- 

# Model Control Protocol (MCP) Definition
class McpBase(SQLModel):
    name: str = Field(index=True)
    domain: str
    goal: str
    roles: str # Storing comma-separated roles, or consider a JSONB field/related table later
    constraints: Optional[str] = None # Keep this for now, might merge into JSON later
    # Add other fields as needed, e.g., evaluation_criteria

# --- Pydantic Models for Structured MCP Definition --- 
# Define structure for examples 
class McpExampleItem(PydanticBaseModel):
    input: str = PydanticField(description="Example user input.")
    output: str = PydanticField(description="Example AI output.")

# Define the core MCP Definition structure
class McpDefinition(PydanticBaseModel):
    system_prompt: str = PydanticField(description="The core system prompt for the AI model.")
    input_schema_description: str = PydanticField(description="Description of the expected input format or structure.")
    output_schema_description: str = PydanticField(description="Description of the desired output format or structure.")
    constraints: List[str] = PydanticField(description="A list of key constraints or guardrails the AI must follow.")
    examples: List[McpExampleItem] = PydanticField(description="A list of few-shot examples (input/output pairs).", default=[])

# --- SQLModel Database Models --- 

class Mcp(McpBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False,
                               sa_column_kwargs={"onupdate": datetime.utcnow})
    owner_id: int = Field(foreign_key="user.id", index=True) # Link to the User model
    
    # Field to store the generated MCP content (markdown or legacy)
    generated_content: Optional[str] = None
    
    # Use the Pydantic model for type hinting, but store as JSONB
    definition_json: Optional[McpDefinition] = Field(default=None, sa_column=Column(JSONB))

    # We might add relationships later if needed, e.g.:
    # owner: Optional["User"] = Relationship(back_populates="mcps")

# Example: MCP Model (Placeholder)
# class Mcp(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     name: str = Field(index=True)
#     description: Optional[str] = None
#     domain: str
#     definition: str # Could be JSON/YAML stored as text or JSONB
#     created_at: datetime = Field(default_factory=datetime.utcnow)
#     updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
#     owner_id: int = Field(foreign_key="user.id") # Link to the User model 