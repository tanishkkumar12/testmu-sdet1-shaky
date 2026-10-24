# TestMu AI - AI-Native Quality Engineering Framework

[![Playwright Tests](https://img.shields.io/badge/Playwright-1.49.1-2EAD33.svg?logo=playwright)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0-339933.svg?logo=node.js)](https://nodejs.org/)
[![AI-Native SDET](https://img.shields.io/badge/AI--Native-Quality%20Engineering-8A2BE2.svg)](#)

> **Submission for TestMu AI Talent Assessment | SDET-1 Challenge**  
> Candidate: **shaky** (`candidate@testmu-ai.dev`)

---

## 📖 Executive Summary

This repository presents an **AI-native quality engineering platform** engineered specifically for TestMu AI's web-based test management ecosystem. It addresses the team's sprint ticket:

> *"The team is spending too much time writing and fixing regression tests. Figure out where AI can help: test generation, validation, anything that reduces manual effort across Login, Dashboard, and API. Show us something working."*

### Key Highlights
1. **Task 1: Clean Modular Architecture**: Built with TypeScript and Playwright using the Page Object Model (POM), custom fixtures, and a zero-dependency local mock server replicating the TestMu AI platform.
2. **Task 2: Rigorous Prompt Engineering**: Production-ready prompts in [`prompts.md`](./prompts.md) with documented failure analysis and iteration notes, producing both Gherkin specifications and typed JSON test matrices in [`generated-test-cases/`](./generated-test-cases/).
3. **Task 3: Live LLM Failure Explainer (Option A)**: An inline AI engine (`FailureExplainer`) wired directly into the Playwright test lifecycle via a custom reporter (`AIExplainerReporter`). When a test fails, it extracts live DOM snapshots, stack traces, and API responses, querying a real LLM for instant root-cause analysis and actionable code fixes.
4. **Transparent AI Logging**: Full disclosure of AI tools, prompts, outputs, and human oversight in [`ai-usage-log.md`](./ai-usage-log.md).

---

## 🏗️ Repository Architecture

```
testmu-sdet1-shaky/
├── .env.example                     # Environment template (OpenAI/Gemini/Groq keys)
├── .gitignore                       # Git ignore rules
├── package.json                     # Scripts & dependencies
├── tsconfig.json                    # Strict TypeScript configuration
├── playwright.config.ts             # Playwright configuration with custom AI reporter
├── prompts.md                       # Task 2 prompt engineering iteration log
├── ai-usage-log.md                  # Comprehensive AI tool attribution log
├── README.md                        # Documentation & setup guide
├── src/
│   ├── ai/
│   │   ├── llm-client.ts            # Multi-provider LLM client (OpenAI, Gemini, Groq)
│   │   ├── failure-explainer.ts     # Core Option A Failure Explainer engine
│   │   └── prompts.ts               # System instructions & context prompt builders
│   ├── api/
│   │   └── TestMuApiClient.ts       # Typed API client for REST automation
│   ├── fixtures/
│   │   └── base-test.ts             # Custom Playwright test fixture with auto-DOM capture
│   ├── mock-server/
│   │   └── server.ts                # Zero-dependency HTTP mock server (Login, Dashboard, API)
│   ├── pages/
│   │   ├── BasePage.ts              # Base Page Object Model
│   │   ├── LoginPage.ts             # Login & Forgot Password POM
│   │   └── DashboardPage.ts         # Dashboard Telemetry & Table POM
│   └── reporters/
│       └── ai-explainer-reporter.ts # Custom reporter attaching AI diagnoses to HTML/CLI reports
├── tests/
│   ├── e2e/
│   │   ├── login.spec.ts            # E2E Authentication tests (lockout, enumeration, session)
│   │   └── dashboard.spec.ts        # E2E Dashboard tests (metrics, filter/sort, RBAC, mobile)
│   ├── api/
│   │   └── api.spec.ts              # REST API tests (CRUD, RFC 7807, rate limiting, chaos 500)
│   └── failure-explainer/
│       └── failure-explainer.spec.ts# Dedicated live test verifying LLM failure triage
├── generated-test-cases/            # Task 2 generated deliverables
│   ├── login-scenarios.feature
│   ├── login-test-matrix.json
│   ├── dashboard-scenarios.feature
│   ├── dashboard-test-matrix.json
│   ├── api-scenarios.feature
│   └── api-test-matrix.json
└── sample-reports/                  # Task 3 sample LLM outputs
    ├── failure-explainer-output.json
    ├── failure-explainer-output.md
    ├── sample-ui-failure-explanation.json
    └── sample-api-failure-explanation.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: >= 18.x (tested on v24.20.0 LTS)
- **npm**: >= 9.x
- **Git**

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/[yourname]/testmu-sdet1-shaky.git
cd testmu-sdet1-shaky
npm install
npx playwright install chromium
```

### 2. Configure Environment Variables
Copy the example `.env` file:
```bash
cp .env.example .env
```
Edit `.env` to configure your preferred LLM provider:
```env
# Optional: Provide an API key for live online LLM calls
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Or use Google Gemini:
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=AIzaSy...
# GEMINI_MODEL=gemini-1.5-flash
```
> **Note**: If no API key is set, the framework seamlessly utilizes a built-in offline heuristic diagnostic fallback so tests never break.

---

## 🧪 Running the Test Suites

The framework includes a built-in local mock server (`src/mock-server/server.ts`) that launches automatically during Playwright test runs, ensuring 100% deterministic, offline-capable execution.

### Run All Regression Tests
```bash
npm test
```

### Run Specific Test Modules
```bash
# E2E Tests (Login & Dashboard)
npm run test:e2e

# REST API Tests
npm run test:api

# Task 3 AI Failure Explainer Live Test
npm run test:explainer
```

### View Interactive HTML Test Report
```bash
npm run test:report
```
The report includes:
- Standard Playwright execution traces, screenshots, and videos.
- Attached **`ai-failure-explanation.json`** and **`ai-failure-explanation.md`** for every failed test!

---

## 🤖 Task 3: AI Failure Explainer (Option A)

### Why Option A Over Option B?
In our code ([`src/ai/failure-explainer.ts`](./src/ai/failure-explainer.ts)), we document our decision:

1. **Immediate Developer Feedback**: Option A triggers *inline* at the exact moment a failure occurs, outputting the root cause and a proposed code fix directly to the developer's console and HTML test report.
2. **High-Fidelity Context**: At runtime, Playwright has access to live DOM snapshots, network request/response payloads, and exact locator diffs. Option B (post-run log classifier) only analyzes text logs after teardown, missing critical DOM state.
3. **Actionable Remediation**: Rather than simply classifying a test as "flaky", Option A pinpoints the actual race condition, selector drift, or auth header mismatch and writes the code fix.

### Sample Live Output
When a test fails, the custom reporter outputs:
```text
======================================================
🤖 [TestMu AI Failure Explainer] - Delete test run TR-101
------------------------------------------------------
📌 Root Cause: User authenticated with Viewer role attempted a DELETE operation which requires Admin privileges.
💬 Plain English: The test expected HTTP 204 No Content, but received HTTP 403 Forbidden because 'valid-token-viewer' lacks DELETE permissions.
🔧 Suggested Fix: Update apiClient.deleteTestRun('TR-101', ADMIN_TOKEN); or verify RBAC role assignment before initiating delete requests.
🏷️ Domain: auth_permission | Confidence: 95%
======================================================
```
Full structured reports are saved to [`sample-reports/`](./sample-reports/).

---

## 🔮 What I'd Build Next With More Time

Given additional time in an engineering sprint, here is the roadmap to scale this AI-native test framework:

1. **Self-Healing DOM Selectors (`AIHealerFixture`)**:
   - When a locator query (`page.locator(...)`) times out, query the LLM with the previous successful DOM snapshot and current DOM tree.
   - Automatically calculate semantic similarity, generate an updated CSS/XPath selector, self-heal in memory, and issue a Git patch for the Page Object Model.

2. **Vector-Augmented Failure Memory (RAG Test Triage)**:
   - Index historical CI failures, Jira bug tickets, and Slack triage threads into a vector database (e.g., ChromaDB / Pinecone).
   - When a test fails, use semantic retrieval to determine if the failure matches a known active bug, an intermittent infrastructure ticket, or a new regression.

3. **Autonomous Flaky Test Quarantine & Retry Agent**:
   - Combine Option A with Option B: if a failure is diagnosed as `environment_timeout` or `ui_selector_drift`, trigger an automated isolation loop, quarantine the test with `@quarantine` tag in GitHub PR, and open an automated remediation PR with the AI-suggested fix.

4. **Synthetic Test Data Generation from OpenAPI Specs**:
   - Feed OpenAPI 3.0 / Swagger specifications into an LLM generator to synthesize fuzz payloads, boundary value inputs, and valid mock objects automatically on each API version bump.

5. **Visual AI Regression Diffing**:
   - Integrate multi-modal vision models (e.g. Gemini 1.5 Pro / GPT-4o Vision) to visually evaluate full-page screenshots, identifying subtle layout regressions, misaligned tables, and font clipping that pixel-diffing false-positives on.

---

## 📋 Evaluation Checklist

- [x] **Task 1**: Public repo structure initialized, modular Playwright + TS setup, first commit with AI attribution.
- [x] **Task 2**: `prompts.md` with raw V1 & V2 prompts, iteration notes (what didn't work), and generated test cases in Gherkin & JSON format.
- [x] **Task 3**: Real LLM API integration (`src/ai/failure-explainer.ts`), custom Playwright reporter, sample output in `sample-reports/`, and architectural rationale comment.
- [x] **ai-usage-log.md**: Complete audit log of all AI tools used and human verification applied.
- [x] **README.md**: Complete execution instructions and future roadmap.
