# Design Decisions for IntelliMCP Studio

This document records the key design and implementation choices made during the development of IntelliMCP Studio.

## Frontend

*   Initialized using `create-next-app` with TypeScript, Tailwind CSS, ESLint, App Router, and `src/` directory.
*   Project directory: `frontend`.
*   UI Component Library: ShadCN/UI initialized (base color: Slate).
*   Added `Button` component from ShadCN/UI for initial testing.
*   Created folder structure within `frontend/src/app/` for core features: `auth`, `dashboard`, `mcp/[mcpId]/edit`, `mcp/[mcpId]/ingest`.
*   Created `frontend/src/components/common` for shared components (e.g., `AnimatedBackground`, `Footer`).
*   **Homepage Redesign (Inspired by lovable.dev):**
    *   Added interactive animated particle background using `tsParticles` (`frontend/src/components/common/AnimatedBackground.tsx`) with links and hover repel effect.
    *   Updated root layout (`layout.tsx`) header:
        *   Displays app title "Intelli MCP".
        *   Conditionally shows Sign In/Sign Up buttons or Clerk `UserButton` and a "Dashboard" link for signed-in users.
        *   Uses black background.
    *   Updated homepage (`page.tsx`):
        *   Displays main title ("Lets Build Your MCP") with gradient text effect and icon.
        *   Features a central prompt input area (`Textarea`).
        *   Includes suggestion chips below the prompt area (e.g., "Legal Document Analyzer").
        *   Suggestion chips populate the main prompt area on click.
        *   Removed initial "Attach" and "Public" buttons from prompt area to align with current workflow.
*   **Middleware:** Refactored `src/middleware.ts` multiple times to resolve Clerk detection issues, settling on using `clerkMiddleware()` without custom handler logic, relying on matcher config.
*   Added a standard site `Footer` component (`frontend/src/components/common/Footer.tsx`) to the main layout.

## Backend

*   Framework: Python FastAPI.
*   Configured CORS middleware (`CORSMiddleware`) allowing specific frontend origins (`http://localhost:3000`, `http://127.0.0.1:3000`). Temporarily used `"*"` during debugging, reverted for security.
*   Added SQLModel and psycopg2-binary for PostgreSQL interaction.
*   Created `database.py` for engine creation and session management (using environment variables via `.env`).
*   Organized API logic into routers: `ingestion.py`, `mcp.py`, `context.py`, `generation.py`, `ai_assistance.py`, `validation.py`, `prompt.py`.
*   **Stability:** Removed `--reload` flag from `uvicorn` command during testing to improve server stability, suspecting it might have been causing issues. Fixed several `f-string` and LangChain prompt template errors that were likely causing crashes.

## Databases

*   Setup PostgreSQL using Docker (`docker-compose.yml`) for local development (DB: `intellimcp_dev`, User: `devuser`). Data persisted in `postgres_data` volume.
*   Defined `User` and `Mcp` models in `backend/models.py` using SQLModel.
*   **Schema Evolution:**
    *   Added `definition_json` (JSONB) field to `Mcp` model to store structured protocol definition.
    *   Defined Pydantic models (`McpDefinition`, `McpExampleItem`) in `models.py` to represent the structure within `definition_json`.
    *   Modified `create_db_and_tables` in `database.py` to temporarily `drop_all` tables during development to apply schema changes, then removed `drop_all` once schema stabilized to prevent data loss on restart. **Note:** Production requires a proper migration tool (e.g., Alembic).

## AI Layer

*   Created `backend/llm_services.py` to centralize initialization of `OpenAIEmbeddings` (`text-embedding-3-small`) and `ChatOpenAI` (`gpt-4o`) clients (using `lru_cache`). Reads `OPENAI_API_KEY` from `.env`.
*   Different LLM configurations (temperature) defined in `llm_services` for different tasks (generation, creative, testing).
*   Relevant routers use FastAPI `Depends` to inject LLM/embedding clients.
*   Utilized LangChain `ChatPromptTemplate`, `PromptTemplate`, `JsonOutputParser`, and `StrOutputParser` for LLM interactions. Refined prompt templating multiple times to handle escaping issues with format instructions.

## Deployment

*   **Note:** Production deployment requires:
    *   Configuring frontend `NEXT_PUBLIC_BACKEND_API_URL` environment variable.
    *   Tightening backend CORS `origins` list to deployed frontend URL(s).
    *   Managing secrets (`CLERK_SECRET_KEY`, `DB_PASSWORD`, `OPENAI_API_KEY`) via secure environment variables in the hosting platform, not `.env` files.
    *   Using a database migration tool (e.g., Alembic) instead of `drop_all`/`create_all`.

## Authentication (Module 1)

*   Chosen Provider: Clerk.
*   Installed `@clerk/nextjs` SDK in the frontend.
*   Wrapped `RootLayout` with `ClerkProvider`.
*   Created standard sign-in (`/sign-in`) and sign-up (`/sign-up`) pages using Clerk components.
*   Added `<UserButton>` and "Dashboard" link to the layout header for signed-in users.
*   Configured environment variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) in respective `.env`/`.env.local` files. Corrected `NEXT_PUBLIC_` prefix usage.
*   Refactored backend authentication (`auth_utils.py`):
    *   Removed complex `authenticate_request` logic due to SDK inconsistencies/errors.
    *   Implemented simpler JWT validation using `PyJWT` and Clerk JWKS (needs proper JWKS verification/caching for production).
    *   Created `get_current_db_user` dependency to centralize finding the DB `User` record from the Clerk ID (sub claim) and creating the DB record if it doesn't exist. This ensures user record exists before endpoints needing it are executed.

## Workflow & Core Logic

*   **Initial Flow (Homepage -> Edit):**
    *   Homepage (`/`) takes user prompt.
    *   `POST /prompt/initiate`: Creates a basic `Mcp` record (ID, name, goal=prompt, default domain/roles, owner_id from `get_current_db_user`). Returns `mcp_id`.
    *   Frontend redirects to `/mcp/{mcpId}/ingest`.
*   **Context Ingestion (Module 3 - Implemented):**
    *   Frontend Ingestion Page (`/mcp/[mcpId]/ingest`): Provides UI for file upload (PDF, DOCX, TXT) and URL input.
    *   Backend Endpoints (`POST /ingest/upload/file/{mcp_id}`, `POST /ingest/upload/url`): Receive context, require authentication (`get_current_db_user`), load/split text, generate embeddings, store chunks in ChromaDB (`mcp_context_documents` collection) with metadata including `mcp_id` and `user_id`. Added loop for `add_texts` to improve stability.
    *   User proceeds to edit page via button.
*   **MCP Generation (Module 4 - Structured):**
    *   Edit Page (`/mcp/[mcpId]/edit`): If `definition_json` is null, shows "Generate Initial Definition" button.
    *   Button triggers `POST /generate/mcp/{mcp_id}`.
    *   Backend endpoint retrieves MCP goal, retrieves context from ChromaDB filtering by `mcp_id` and `user_id`, uses LLM with `JsonOutputParser` to generate structured `McpDefinition` (System Prompt, Schemas, Constraints, Examples).
    *   Saves the result to the `definition_json` field in the `Mcp` database record.
    *   Returns the generated JSON to the frontend.
*   **MCP Customisation (Module 5 - Structured UI):**
    *   Edit Page (`/mcp/[mcpId]/edit`): Fetches MCP data including `definition_json` using `GET /mcp/{mcpId}`.
    *   Replaced Monaco editor with individual ShadCN `<Textarea>` components for `system_prompt`, `input_schema_description`, `output_schema_description`, `constraints` (newline-separated).
    *   Implemented dynamic UI for `examples` field using Input/Output text area pairs with Add/Remove buttons.
    *   `handleSaveChanges` collects data from structured fields, reconstructs the JSON object, and sends it to `PUT /mcp/{mcpId}`. Backend updates the `definition_json` field.
    *   Added redirect to `/dashboard` after successful save.
*   **AI Assistance (Refactored for Structured Data):**
    *   Backend endpoints (`/ai/...`) updated to accept structured data fields as input.
    *   Frontend handlers (`handleSuggestImprovements`, `handleCheckConstraints`, `handleRephrase`, `handleExpand`, `handleGenerateComponent`) updated to send relevant structured data and update specific state fields upon response.
    *   `Suggest`, `Check Constraints` (checks system prompt vs constraints list), `Generate Field`, `Rephrase`/`Expand` (targets selected field via dropdown) are functional.
*   **Validation & Testing (Module 6 - Basic Test Run):**
    *   Backend (`POST /validate/test_run/{mcp_id}`): Loads `definition_json`, extracts `system_prompt`, runs LLM with user input + system prompt, returns LLM output and prompt used. Uses `get_current_db_user`.
    *   Frontend Edit Page: Includes UI section to input text, trigger test run, and display LLM output/prompt used.
*   **Export (Module 7 - Structured):**
    *   Backend (`GET /mcp/{mcpId}/export/markdown`): Formats the data from `definition_json` into a human-readable Markdown file.
    *   Backend (`GET /mcp/{mcpId}/export/json`): Returns the raw `definition_json` data as a downloadable file.
    *   Frontend Edit Page: Includes "Export Markdown" and "Export JSON" buttons.
*   **Dashboard (Module 8 - Basic):**
    *   Backend (`GET /mcp`): Lists MCPs for the authenticated user (`get_current_db_user`).
    *   Frontend (`/dashboard`): Fetches and displays MCP list in a table, allows clicking row to edit, includes delete button, includes "Create New" button linking to homepage (`/`).

## Backend MCP Management (Router: /mcp)

*   Router (`/mcp`) uses `get_current_db_user` dependency for ownership checks and data retrieval/modification based on the authenticated user's internal DB ID.
*   Endpoints implement standard CRUD operations (`GET /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`) for MCPs owned by the user, operating on the `definition_json` field where applicable. 