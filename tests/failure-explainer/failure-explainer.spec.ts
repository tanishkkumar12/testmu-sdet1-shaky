import { test, expect } from '../../src/fixtures/base-test';
import { FailureExplainer } from '../../src/ai/failure-explainer';
import { LLMClient } from '../../src/ai/llm-client';
import fs from 'fs';
import path from 'path';

test.describe('Task 3: AI Failure Explainer Integration', () => {
  /**
   * ARCHITECTURAL RATIONALE:
   * We selected Option A (Failure Explainer) because:
   * 1. Inline Actionability: Provides immediate plain-English diagnosis and exact code remediation
   *    at the moment of test failure, cutting down triage loops from hours to seconds.
   * 2. Live Context Fidelity: It accesses dynamic page DOM state, HTTP payloads, and Playwright
   *    trace diffs which are lost once the test run completes.
   * 3. Prevents Flakiness at Source: Rather than just labeling tests as flaky (Option B),
   *    Failure Explainer explains the selector mismatch, race condition, or auth drift to fix it permanently.
   */

  test('TC-AI-001: Failure Explainer diagnoses UI selector failure with DOM snapshot and suggests code fix', async () => {
    const explainer = new FailureExplainer();

    const failureContext = {
      testTitle: 'Login should show welcome banner after submission',
      testFile: 'tests/e2e/login.spec.ts',
      errorMessage: 'Timed out 5000ms waiting for expect(locator).toBeVisible()\nLocator: locator("#welcome-banner")\nExpected: visible\nReceived: hidden',
      stackSnippet: 'at tests/e2e/login.spec.ts:42:25\nat LoginPage.verifyWelcome (src/pages/LoginPage.ts:35:10)',
      domSnapshot: `
        <div class="card">
          <h1>TestMu AI</h1>
          <p class="subtitle">Continuous Quality & Test Intelligence</p>
          <div id="alert-error" class="alert-error" style="display: block;">Invalid email or password</div>
          <form id="login-form">
            <input id="email" value="admin@testmu.ai" />
            <input id="password" type="password" value="wrongpass" />
            <button id="btn-login">Sign In</button>
          </form>
        </div>
      `,
    };

    console.log('[Task 3 Test] Invoking real LLM Failure Explainer...');
    const result = await explainer.explain(failureContext);

    console.log('[Task 3 Test] LLM Output Received:');
    console.log(JSON.stringify(result, null, 2));

    expect(result).toHaveProperty('failureTitle');
    expect(result).toHaveProperty('rootCauseSummary');
    expect(result).toHaveProperty('plainEnglishExplanation');
    expect(result).toHaveProperty('suggestedFix');
    expect(result.confidenceScore).toBeGreaterThan(0.4);

    // Save sample output
    const outputDir = path.resolve(process.cwd(), 'sample-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outputDir, 'sample-ui-failure-explanation.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    );
  });

  test('TC-AI-002: Failure Explainer diagnoses API 403 Forbidden permission mismatch and suggests header/role fix', async () => {
    const explainer = new FailureExplainer();

    const apiFailureContext = {
      testTitle: 'Delete test run TR-101 should return 204 No Content',
      testFile: 'tests/api/api.spec.ts',
      errorMessage: 'expect(received).toBe(expected) // Object.is equality\nExpected: 204\nReceived: 403',
      networkContext: {
        method: 'DELETE',
        url: 'http://localhost:4321/api/v1/test-runs/TR-101',
        status: 403,
        requestBody: '',
        responseBody: JSON.stringify({
          type: 'https://testmu.ai/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Only users with the Admin role are authorized to delete test runs.'
        }),
      },
    };

    const result = await explainer.explain(apiFailureContext);

    expect(result).toHaveProperty('rootCauseSummary');
    expect(result.plainEnglishExplanation.toLowerCase()).toMatch(/admin|forbidden|permission|role|authorization/i);
    expect(result.suggestedFix).toBeDefined();

    const outputDir = path.resolve(process.cwd(), 'sample-reports');
    fs.writeFileSync(
      path.join(outputDir, 'sample-api-failure-explanation.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    );
  });
});
