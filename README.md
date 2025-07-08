# IntelliMCP Studio

A no-code, AI-guided platform that helps users create, test, and deploy Model Context Protocols (MCPs) tailored to their domain.

## Local Development Setup

Follow these steps to set up and run the project locally for development and testing.

### Prerequisites

Ensure you have the following software installed on your system:

1.  **Git:** For cloning the repository. ([Download Git](https://git-scm.com/downloads))
2.  **Node.js:** Required for the Next.js frontend (LTS version recommended). ([Download Node.js](https://nodejs.org/))
3.  **Python:** Required for the FastAPI backend (Python 3.9+ recommended). ([Download Python](https://www.python.org/downloads/))
4.  **Docker Desktop:** To run the PostgreSQL database container easily. ([Download Docker Desktop](https://www.docker.com/products/docker-desktop/))

### Setup Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/mchawda/mcpmaker.git
    cd mcpmaker
    ```

2.  **Start PostgreSQL Database:**
    *   Make sure Docker Desktop is running.
    *   In the project root (`mcpmaker`), run:
        ```bash
        docker compose up -d
        ```
    *   This uses the configuration in `docker-compose.yml` (User: `devuser`, Password: `devpassword`, DB: `intellimcp_dev`, Port: `5432`).

3.  **Set Up Backend (FastAPI):**
    *   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    *   Create and activate a Python virtual environment:
        ```bash
        # Create venv
        python3 -m venv venv
        # Activate venv (macOS/Linux)
        source venv/bin/activate
        # Or activate venv (Windows PowerShell)
        # .\venv\Scripts\activate
        ```
    *   Install dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    *   Create a `.env` file in the `backend` directory (`backend/.env`). Add the following content, replacing placeholders with your **DEVELOPMENT** keys:
        ```env
        # backend/.env

        # -- Database (matches docker-compose.yml) --
        DB_USER=devuser
        DB_PASSWORD=devpassword
        DB_HOST=localhost
        DB_PORT=5432
        DB_NAME=intellimcp_dev
        # DATABASE_URL= # Alternatively, use the full URL if needed

        # -- Authentication (Use DEVELOPMENT Keys) --
        CLERK_SECRET_KEY=sk_test_YOUR_DEV_SECRET_KEY

        # -- AI Services --
        OPENAI_API_KEY=sk-YOUR_OPENAI_KEY

        # -- Vector Store (Leave unset for local Chroma) --
        # CHROMA_HOST=
        # CHROMA_PORT=
        ```
    *   **(Optional but Recommended):** Add local Chroma data to `.gitignore` if not already done. From the project root (`mcpmaker`), run:
        ```bash
        echo "backend/chroma_data/" >> .gitignore
        ```
    *   **Run Backend Server:** (Keep this terminal open)
        ```bash
        # Ensure venv is active and you are in the backend/ directory
        uvicorn main:app --host 127.0.0.1 --port 8080
        ```

4.  **Set Up Frontend (Next.js):**
    *   Open a **new terminal window**.
    *   Navigate to the project root directory:
        ```bash
        cd /path/to/your/mcpmaker
        ```
    *   Navigate into the frontend directory:
        ```bash
        cd frontend
        ```
    *   Install dependencies:
        ```bash
        npm install
        # or yarn install
        ```
    *   Create a `.env.local` file in the `frontend` directory (`frontend/.env.local`). Add the following content, replacing placeholders with your **DEVELOPMENT** keys:
        ```env
        # frontend/.env.local

        # Clerk Keys (Use DEVELOPMENT Keys)
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_DEV_PUBLISHABLE_KEY
        CLERK_SECRET_KEY=sk_test_YOUR_DEV_SECRET_KEY

        # Backend URL for Local Development
        NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8080
        ```
    *   **Run Frontend Dev Server:** (Keep this terminal open)
        ```bash
        npm run dev
        # or yarn dev
        ```

5.  **Access Application:**
    *   Open your web browser and navigate to `http://localhost:3000`.

## Production Deployment Notes

Refer to `DESIGN_DECISIONS.md` for detailed notes on productionizing, including:
*   Hosting choices (Vercel, Render, Supabase suggested).
*   Environment variable configuration for production.
*   Secrets management (moving keys out of `.env` files).
*   Tightening backend CORS settings.
*   Using database migrations (Alembic).
*   Running the backend with Gunicorn. 