# AI Usage Log (`ai-usage-log.md`)

In compliance with the **TestMu AI SDET-1 Assessment Guidelines**, this document transparently logs every AI tool reached for, the specific engineering task it assisted with, what it produced, and the human oversight/validation applied.

---

## Summary Matrix

| Date & Timestamp | AI Tool / Model | Task / Purpose | What it Produced | Engineering / Human Verification Applied |
| :--- | :--- | :--- | :--- | :--- |
| **2026-10-24 01:10** | **Claude 3.5 Sonnet** | Task 1: Scaffolding & Directory Architecture | Suggested modular SDET folder layout (`pages/`, `api/`, `fixtures/`, `reporters/`, `ai/`) | Validated Playwright best practices; customized tsconfig path aliases and native Node test runner setup. |
| **2026-10-24 01:25** | **ChatGPT (GPT-4o)** | Task 2: Prompt Iteration for Login & Dashboard | Drafted V1 prompts; subsequently helped refine to V2 with explicit security/RBAC constraints | Rejected V1 due to lack of lockout thresholds and enumeration resistance; manually specified security RFCs and rate limit headers. |
| **2026-10-24 01:40** | **Claude 3.5 Sonnet** | Task 2: Gherkin & JSON Test Matrix Generation | Generated Gherkin `.feature` specs and typed JSON matrices for Login, Dashboard, and REST API | Reviewed every scenario against TestMu AI web app features; adjusted selector IDs and HTTP status assertions. |
| **2026-10-24 02:00** | **Claude 3.5 Sonnet** | Task 3: Option Selection & Failure Explainer Architecture | Architecture design for Playwright custom Reporter + inline LLM root-cause explainer | Authored comparative evaluation between Option A (Failure Explainer) vs Option B (Flaky Classifier); chose Option A for immediate CI triage value. |
| **2026-10-24 02:15** | **Cursor / GitHub Copilot** | Task 3: Mock Server & Playwright Test Fixtures | Boilerplate generation for zero-dependency Node.js HTTP server and Playwright custom test fixture | Hand-tuned state reset endpoint (`/api/test/reset`), simulated 500 chaos route, and token rate limiting logic. |
| **2026-10-24 02:35** | **GPT-4o-mini / Gemini** | Task 3: Real LLM Inference Verification | Executed real LLM completion calls to analyze failed DOM snippets and 403 API responses | Checked accuracy of suggested TypeScript fixes, root-cause categorization, and schema parsing resilience. |

---

## Detailed Tool Logs

### 1. Claude 3.5 Sonnet (Architecture & Prompt Refinement)
- **Prompt Given**: *"Design a clean, scalable folder structure for an AI-native Playwright TypeScript test framework covering E2E, API, custom reporters, and an integrated LLM failure explainer."*
- **Output Produced**: Recommended separating `src/ai` (LLM clients and prompts) from `src/reporters` and `src/fixtures`, ensuring the LLM logic remains decoupled from browser orchestration.
- **Human Decision / Critique**: Accepted structure. Added a lightweight zero-dependency mock server (`src/mock-server`) so that any engineer evaluating the repo can run tests out-of-the-box without external cloud dependencies.

### 2. ChatGPT (GPT-4o) (Prompt Engineering Exploration)
- **Prompt Given**: *"Review my initial prompt for generating REST API test cases. What flaws make it look naive to a Senior SDET?"*
- **Output Produced**: Identified that naive prompts lack RFC 7807 Problem Details verification, token tampering permutations (expired vs malformed vs missing), and boundary rate-limiting response header checks.
- **Human Decision / Critique**: Incorporated these exact critiques into `prompts.md` under "What didn't work first time" and formulated the V2 prompt.

### 3. Real LLM Call (Task 3 Engine Execution)
- **Mechanism**: Integrated via `LLMClient` in `src/ai/llm-client.ts`, supporting OpenAI (`gpt-4o-mini`), Google Gemini (`gemini-1.5-flash`), Groq, or OpenRouter via native `fetch`.
- **Runtime Execution**: Captured actual test failures (DOM mismatch and 403 Forbidden permission error) and fed them directly to the LLM.
- **Output Produced**: Structured JSON failure diagnoses with `rootCauseSummary`, `plainEnglishExplanation`, `suggestedFix`, and `failureDomain`.
- **Human Decision / Critique**: Ensured fallback handling in case an evaluator runs without an `OPENAI_API_KEY` or `GEMINI_API_KEY`, so tests remain completely resilient and provide clear diagnostic instructions.
