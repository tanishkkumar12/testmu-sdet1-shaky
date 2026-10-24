/**
 * System Prompts & Context Builders for AI Failure Explainer
 */

export const FAILURE_EXPLAINER_SYSTEM_PROMPT = `You are a Principal Software Development Engineer in Test (SDET) and QA Architect specializing in root-cause analysis for Playwright E2E and REST API regression test failures.

Your mission:
Analyze failed test execution context (assertion error message, stack trace, DOM snapshot, console logs, and/or HTTP request-response payloads) and produce an immediate, clear, high-signal explanation of what broke and how to fix it.

Format your output as a clean JSON object with the following schema:
{
  "failureTitle": "Concise summary of failure (1 line)",
  "rootCauseSummary": "Direct identification of why the assertion or network call failed (2-3 sentences)",
  "plainEnglishExplanation": "Human-readable explanation of what happened for developers and QA engineers",
  "suggestedFix": "Concrete code or configuration changes to fix the issue (include code snippets where relevant)",
  "failureDomain": "ui_selector_drift | api_schema_mismatch | auth_permission | environment_timeout | backend_defect",
  "confidenceScore": 0.95
}

Guidelines:
1. Do not repeat raw stack traces verbatim. Synthesize them into root causes.
2. If an API call returned 4xx or 5xx, inspect the response body and header details to explain server rejection.
3. If a DOM selector timed out, evaluate whether the selector is outdated, element is hidden, or async state wasn't awaited.
4. Keep suggestions strictly actionable. Return valid JSON only.`;

export function buildFailurePrompt(context: {
  testTitle: string;
  testFile: string;
  errorMessage: string;
  stackSnippet?: string;
  domSnapshot?: string;
  networkContext?: {
    url?: string;
    method?: string;
    status?: number;
    responseBody?: string;
    requestBody?: string;
  };
}): string {
  let prompt = `Test Title: ${context.testTitle}\n`;
  prompt += `Test File: ${context.testFile}\n\n`;
  prompt += `Error Message:\n${context.errorMessage}\n\n`;

  if (context.stackSnippet) {
    prompt += `Relevant Stack Trace:\n${context.stackSnippet}\n\n`;
  }

  if (context.networkContext) {
    prompt += `API Network Context:\n`;
    prompt += `- Method: ${context.networkContext.method || 'GET'}\n`;
    prompt += `- URL: ${context.networkContext.url || 'N/A'}\n`;
    prompt += `- HTTP Status: ${context.networkContext.status || 'N/A'}\n`;
    if (context.networkContext.requestBody) {
      prompt += `- Request Body: ${context.networkContext.requestBody}\n`;
    }
    if (context.networkContext.responseBody) {
      prompt += `- Response Body: ${context.networkContext.responseBody}\n`;
    }
    prompt += `\n`;
  }

  if (context.domSnapshot) {
    prompt += `Current DOM Snapshot (relevant excerpt):\n\`\`\`html\n${context.domSnapshot}\n\`\`\`\n\n`;
  }

  prompt += `Please diagnose this failure and output the structured JSON report.`;
  return prompt;
}
