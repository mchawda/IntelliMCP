**Modular Cursor Prompts to Build Enterprise-Grade MCPMaker**

---

### 🔄 PHASE 1: Codebase Foundation & Cleanup

#### **Prompt 1.1 — Setup Project Architecture & Tooling**

```prompt
Create a modular folder structure for an enterprise-grade Next.js + TypeScript application called MCPMaker. Include the following top-level directories: /features, /ui, /lib, /services, /agents, /components, /types, /pages. Set up ESLint, Prettier, Tailwind, and TypeScript config files. Add Husky for pre-commit formatting and linting.
```

#### **Prompt 1.2 — Environment Config & Secret Management**

```prompt
Add .env support using dotenv for storing secrets like OPENAI_API_KEY, VECTOR_DB_URL, and MCP_VALIDATOR_URL. Implement a config utility in /lib/config.ts that reads from environment variables with fallback defaults.
```

---

### 🏢 PHASE 2: Modular Feature Development

#### **Prompt 2.1 — Use Case Wizard Module**

```prompt
Create a multi-step wizard component under /features/useCaseWizard that guides the user through selecting an MCP use case. Each step should capture: domain, goal, user role, key input fields, and constraints. Use React context or Zustand to store state across steps.
```

#### **Prompt 2.2 — Context Ingestor Module**

```prompt
Build a context ingestion module in /features/contextIngestor. Users should be able to upload PDFs, paste text, or enter URLs. Use LangChain or LlamaIndex to extract embeddings and return structured context objects. Store and retrieve vectors using Chroma or FAISS.
```

#### **Prompt 2.3 — MCP Generator Agent**

```prompt
In /agents/mcpBuilderAgent.ts, build a LangChain agent that accepts domain, user role, context, constraints, and returns a full MCP schema including: system_prompt, user_guidance, input/output format, constraints, and references.
```

#### **Prompt 2.4 — Validation & Testing Suite**

```prompt
Implement a validation engine in /features/validationSuite that takes an MCP JSON object and scores it for completeness, hallucination risk, and domain alignment using GPT-4. Add a test interface that lets users preview input/output behavior.
```

#### **Prompt 2.5 — Exporter Module**

```prompt
Create a module in /features/exporter that allows exporting an MCP in JSON, YAML, Markdown, and PDF. Provide UI options to send to Notion, copy to clipboard, or download file.
```

---

### 🌟 PHASE 3: UI/UX Enhancements

#### **Prompt 3.1 — Framer-like Design Polish**

```prompt
Refactor UI using ShadCN + Tailwind. Apply Framer Motion to step transitions in the wizard. Create a clean and minimal dashboard page at /pages/dashboard that lists user MCPs with preview and edit options.
```

#### **Prompt 3.2 — JSON Schema Editor**

```prompt
Integrate Monaco or CodeMirror editor in /components/SchemaEditor.tsx. Support MCP JSON schema editing with syntax highlighting, auto-complete, and inline validation.
```

---

### 📋 PHASE 4: Enterprise Features

#### **Prompt 4.1 — Team Collaboration**

```prompt
Add support for teams in /features/teams. Allow users to invite others by email, assign roles, and collaborate on MCPs in shared workspaces. Use Clerk/Auth0 for authentication and RBAC.
```

#### **Prompt 4.2 — Version Control**

```prompt
Create a version history module in /features/versionControl. Each save/fork should timestamp the MCP state and allow rollback, diff view, and changelog comments.
```

#### **Prompt 4.3 — Marketplace Integration (Future)**

```prompt
Design /pages/marketplace to showcase publicly shared MCPs. Allow tagging, search, and one-click fork to personal workspace. Include view/download buttons and metadata fields.
```

---

Each module can be tested, committed, and deployed independently to support continuous iteration.
