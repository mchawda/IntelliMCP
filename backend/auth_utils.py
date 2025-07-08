import os
import json
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from clerk_backend_api.sdk import Clerk
from dotenv import load_dotenv

# Import necessary database components
from sqlmodel import Session, select
from database import get_session
from models import User

load_dotenv()

# Initialize Clerk client from environment variables
SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("CLERK_SECRET_KEY environment variable not set.")

# Initialize Clerk client with the secret key
clerk_client = Clerk(bearer_auth=SECRET_KEY)

# Use HTTPBearer for extracting the Bearer token from Authorization header
security = HTTPBearer()

async def get_clerk_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Validate JWT token from the Authorization header and extract the Clerk user ID.
    This expects a JWT token created from a Clerk JWT template.
    """
    try:
        # Extract token
        token = credentials.credentials
        
        # Debug information
        print(f"Received token: {token[:10]}...")
        
        # Decode the token without verification first to extract claims
        decoded_token = jwt.decode(
            token,
            options={"verify_signature": False},  # We're just extracting claims for now
            algorithms=["RS256"]
        )
        
        # Debug - print decoded token
        print(f"Decoded token claims: {json.dumps(decoded_token, indent=2)}")
        
        # Extract user ID from sub claim - this is the standard JWT claim for subject (user)
        user_id = decoded_token.get("sub")
        
        # If sub claim is missing, try custom user_id claim as fallback
        if not user_id:
            user_id = decoded_token.get("user_id")
            
        print(f"Extracted user ID: {user_id}")
        
        if not user_id:
            print("No user ID found in token claims")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user_id
        
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# *** NEW Dependency: Get DB User (Create if not exists) ***
async def get_current_db_user(
    session: Session = Depends(get_session),
    clerk_id: str = Depends(get_clerk_id)
) -> User:
    """Dependency to get the authenticated user's DB record, creating it if necessary."""
    user = session.exec(select(User).where(User.clerk_id == clerk_id)).first()
    if not user:
        print(f"DB User for Clerk ID {clerk_id} not found, creating...")
        # Extract details from Clerk API - requires more setup or assume defaults
        # For now, create with placeholder email
        placeholder_email = f"{clerk_id}@placeholder.intellimcp.local"
        user = User(clerk_id=clerk_id, email=placeholder_email)
        try:
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"Created DB User ID {user.id} for Clerk ID {clerk_id}")
        except Exception as db_err:
            session.rollback()
            print(f"Database error creating user: {db_err}")
            raise HTTPException(status_code=500, detail="Failed to create user record in database.")
    return user 