# Prompt Engineering for Test Generation (`prompts.md`)

This document records the exact prompts utilized to generate comprehensive test cases for the three core modules of the TestMu AI platform: **Login**, **Dashboard**, and **REST API**.

In accordance with the assessment requirements, every iteration is documented transparently, including the initial prompt, honest reflection on why the initial attempt was insufficient, and the refined prompt that produced production-ready test matrices.

---

## Module 1: Login

### Initial Prompt (V1 - Naive)
```text
Act as a QA tester. Write test cases for a login page of TestMu AI.
Cover:
- Valid login
- Invalid credentials
- Forgot password
- Session expiry
- Brute-force lockout
Give them in Gherkin and JSON format.
```

### What Didn't Work First Time (3 to 5 Lines)
> The initial prompt generated superficial happy-path and standard negative scenarios, but lacked real architectural boundaries. It didn't define the lockout threshold (how many attempts, cooldown duration), missed session expiry state verification (cookie revocation vs local storage invalidation), and failed to specify security assertions like preventing username enumeration in password reset responses. Furthermore, the JSON output was unstructured and lacked machine-readable metadata such as test priorities, preconditions, and failure domains.

### Refined Prompt (V2 - Production-Grade)
```text
Role: You are a Principal Quality Engineer and Application Security Specialist for TestMu AI (an enterprise web-based test management platform).

Context:
We are testing the Authentication & Session subsystem.
- Architecture: Frontend SPA communicating with JSON REST API (`/api/v1/auth/*`).
- Security specs:
  1. Brute-force protection locks the account after 5 consecutive failed attempts within a 10-minute window for 15 minutes, returning HTTP 429 / lockout notification.
  2. Forgot Password must return an identical generic 200 OK message ("If an account exists, instructions have been sent") regardless of whether the email exists, preventing account enumeration.
  3. Session Expiry: Inactive or revoked tokens must immediately invalidate client access and redirect protected routes back to `/login` with an expiration flash notice.
  4. Role personas: Admin (`admin@testmu.ai`), Member/Viewer (`engineer@testmu.ai`).

Task:
Generate a rigorous test specification covering:
1. Valid login with correct credentials and redirect verification.
2. Invalid credentials (wrong password, unregistered email, malformed email format).
3. Forgot password workflow and email enumeration prevention.
4. Session expiry and unauthorized protected route access attempt.
5. Brute-force lockout triggering after 5 failed attempts and subsequent verification.

Output Requirements:
Provide:
1. Gherkin Feature file with clear Scenario and Scenario Outline blocks with Background and Tags (@smoke, @security, @regression).
2. A typed JSON test matrix where each item has: `id`, `title`, `priority` (P0/P1/P2), `type` (Functional/Security/Session), `preconditions`, `inputs`, `expectedResult`, `securityConsiderations`.
```

---

## Module 2: Dashboard

### Initial Prompt (V1 - Naive)
```text
Write tests for the TestMu AI Dashboard.
It has metric widgets, filters, sorting, responsive design, and permissions.
Output in Gherkin and JSON.
```

### What Didn't Work First Time (3 to 5 Lines)
> The first prompt resulted in generic UI smoke checks ("assert widget is visible") without validating data integrity or underlying business logic. It ignored race conditions when rapid filter changes occur, missed numerical consistency between metric widgets (e.g., Total Runs vs sum of individual statuses), and didn't define the Role-Based Access Control (RBAC) visibility matrix between Admin and Viewer roles. It also gave vague responsive checks without exact viewport breakpoint boundaries (e.g. mobile 375x667 vs desktop 1280x720).

### Refined Prompt (V2 - Production-Grade)
```text
Role: You are a Senior SDET specializing in Frontend Architecture and Data Integrity Testing.

Context:
TestMu AI's Quality Dashboard displays live test management metrics:
- Metric Widgets: Total Test Runs, Passing Rate (percentage calculation), Flaky Tests Detected count, and Average Duration (seconds).
- Test Runs Table: Columns (Run ID, Suite Name, Status [passed, failed, running], Duration, Author, Actions).
- Controls: Status dropdown filter (`all`, `passed`, `failed`, `running`), real-time search input, and column headers with two-way sorting (asc/desc).
- RBAC Matrix:
  * Admin: Can see "+ New Test Run" CTA button and row-level "Delete" actions.
  * Viewer: Read-only access; "+ New Test Run" button and "Delete" actions MUST NOT exist in DOM.
- Responsive Breakpoints:
  * Desktop (>= 1024px): Full sidebar visible.
  * Mobile (<= 768px): Sidebar collapsed behind hamburger menu drawer toggle.

Task:
Generate complete test cases validating:
1. Widget loading and mathematical data accuracy (ensuring widgets reflect table row calculations).
2. Filter & Sort behavior, including combined multi-criteria filtering and ascending/descending order on numerical and textual columns.
3. Responsive layout behavior under mobile (375x667) and desktop (1280x720) viewports.
4. Permission-based element visibility verifying strict isolation between Admin and Viewer users.

Output Requirements:
1. Gherkin Feature specifications tagged with @ui, @rbac, @responsive, @regression.
2. A structured JSON test matrix including `id`, `title`, `component`, `role`, `viewport`, `steps`, `expectedBehavior`.
```

---

## Module 3: REST API

### Initial Prompt (V1 - Naive)
```text
Write API tests for TestMu AI REST API.
Endpoints are for test runs and auth.
Test auth tokens, CRUD, 4xx/5xx errors, rate limits, schema validation.
```

### What Didn't Work First Time (3 to 5 Lines)
> The initial prompt yielded basic status code checks (`assert status == 200`) without verifying JSON schema definitions, header contracts, or error payload schemas (RFC 7807 Problem Details). It missed token tampering variations (expired token vs malformed signature vs absent header), failed to specify rate limiting response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`), and did not include edge-case schema validation for boundary values, empty payloads, and unexpected keys.

### Refined Prompt (V2 - Production-Grade)
```text
Role: You are a Principal API Quality Engineer and Backend Security Architect.

Context:
The TestMu AI platform exposes REST API v1 endpoints for CI/CD test orchestration:
- Base: `/api/v1`
- Auth: `POST /auth/login` (generates Bearer token), `POST /auth/forgot-password`.
- Protected CRUD Resource: `/test-runs` (GET list, POST create, GET /:id, PUT /:id, DELETE /:id).
  * DELETE requires Admin role; Viewer gets 403 Forbidden.
- Rate Limiting: 20 requests per minute per IP on public/API routes; returns HTTP 429 with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers.
- Error Handling: Follows RFC 7807 Problem Details specification (`type`, `title`, `status`, `detail`, `invalidParams`).
- Server Resilience: Simulated unhandled error endpoint `/chaos/server-error` returning HTTP 500.

Task:
Generate exhaustive API test cases covering:
1. Auth Token Validation: Valid Bearer token, missing header, expired token, malformed signature.
2. CRUD Operations on `/test-runs`: Create with valid schema, retrieve list, query filtering (`?status=passed`), retrieve single resource, update resource, and RBAC-controlled deletion.
3. Error Handling (4xx/5xx): 400 on malformed JSON / missing mandatory fields, 404 for non-existent IDs, 403 on forbidden actions, 500 on server failure.
4. Rate Limiting: Triggering 429 and asserting standard rate limiting headers and cooldown window.
5. Strict Schema Validation: Ensuring response body adheres to expected types, required fields, and format constraints.

Output Requirements:
1. Executable Gherkin API feature file using standard REST steps.
2. JSON test matrix including `id`, `endpoint`, `httpMethod`, `authType`, `payload`, `expectedStatus`, `headerAssertions`, `schemaAssertions`.
```
