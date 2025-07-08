### Detailed Cursor Prompt to Build the Full IntelliMCP Studio Product

---

**Product Name:** IntelliMCP Studio

**Vision:**
Create a modular, AI-assisted web application that functions as a "BOLT" for Model Context Protocol (MCP) creation, allowing users with minimal technical knowledge to craft, validate, and deploy MCPs for regulatory compliance, cybersecurity, legal, and trade classification.

---

### Application Modules (build sequentially)

#### Module 1: Authentication & User Management

* Technology: Clerk/Auth0 or Supabase Auth
* Functionality: User login, registration, profile management, and secure storage.

#### Module 2: Use Case Selection Wizard

* Technology: Next.js, TailwindCSS, ShadCN/UI
* Functionality: Guided form to help users select and define the MCP use case, capturing domain, roles, and initial parameters.

#### Module 3: Context Ingestion & Extraction Engine

* Technology: LangChain/LlamaIndex, FAISS/Chroma, Python FastAPI
* Functionality: Users upload documents or input URLs; automatic context extraction using RAG embeddings, outputting structured context data.

#### Module 4: MCP Generation Engine

* Technology: GPT-4o/DeepSeek API, LangGraph/AutoGen for orchestration
* Functionality: AI-assisted generation of MCP elements including system prompts, user instructions, input/output schema, constraints.

#### Module 5: MCP Customisation Interface

* Technology: Visual JSON/YAML editor, AI-powered inline editing assistance
* Functionality: Allow users to visually edit MCP definitions, provide syntax highlighting, validation, and AI-assisted enhancements.

#### Module 6: Validation & Testing Module

* Technology: FastAPI backend, GPT-4o inference endpoint
* Functionality: Real-time MCP validation, testing of generated prompts for accuracy, completeness, and absence of hallucinations.

#### Module 7: Output & Export Module

* Technology: FastAPI endpoints, file generation service
* Functionality: Export MCP as JSON, YAML, Markdown, and integration hooks for APIs or marketplace.

#### Module 8: Management Dashboard & User Collaboration

* Technology: PostgreSQL, Next.js frontend
* Functionality: Dashboard for managing MCPs, enabling versioning, collaboration, sharing, and reusability of MCP templates.

---

### Architecture Overview

* **Frontend:** Next.js + TailwindCSS + ShadCN/UI
* **Backend:** Python FastAPI (or Node.js)
* **Databases:** PostgreSQL (for user state), FAISS/Chroma (embedding/context store)
* **AI Layer:** GPT-4o or DeepSeek via API, LangGraph for workflow orchestration
* **Deployment:** Vercel (frontend/UI), AWS/GCP for backend API and AI inference

---

### Development Approach

* Modular build: Create each module as independent, loosely-coupled microservices.
* Use GitHub or GitLab for version control.
* Implement continuous integration and deployment pipelines early.
* Test each module thoroughly before integration.

---

### Implementation Steps in Cursor

For each module, execute these steps in Cursor:

1. Generate initial boilerplate ("Create Next.js app with Tailwind and ShadCN/UI")
2. Develop component/module functionalities separately, testing independently.
3. Integrate each completed module incrementally.
4. Continuously validate UI/UX through rapid prototyping and feedback loops.

---

### Completion Criteria

* Fully functioning IntelliMCP Studio product.
* End-to-end workflows: user signup → MCP creation → validation/testing → export.
* Fully modular architecture allowing easy future expansion and integrations.

---

Provide regular incremental output, code scaffolds, and suggestions for improvements at each stage of the development process within Cursor.
