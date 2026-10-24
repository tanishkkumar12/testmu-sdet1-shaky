import { test, expect } from '../../src/fixtures/base-test';

test.describe('TestMu AI - REST API Test Suite', () => {
  const ADMIN_TOKEN = 'valid-token-admin';
  const VIEWER_TOKEN = 'valid-token-viewer';

  test.beforeEach(async ({ apiClient }) => {
    await apiClient.resetServerState();
  });

  test('TC-API-001: Authorized GET /api/v1/test-runs returns 200 with dataset array', async ({ apiClient }) => {
    const response = await apiClient.listTestRuns(ADMIN_TOKEN);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(4);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('status');
  });

  test('TC-API-002: Unauthorized access without Bearer token returns 401 Problem Details', async ({ apiClient }) => {
    const response = await apiClient.listTestRuns(); // No token passed
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.title).toBe('Unauthorized');
    expect(body.status).toBe(401);
  });

  test('TC-API-003: Full CRUD lifecycle on /api/v1/test-runs', async ({ apiClient }) => {
    // 1. Create (POST)
    const createRes = await apiClient.createTestRun(
      { name: 'Playwright API Integration Test', suite: 'Automation', environment: 'staging' },
      ADMIN_TOKEN
    );
    expect(createRes.status()).toBe(201);
    const createdData = await createRes.json();
    expect(createdData.id).toMatch(/^TR-\d+$/);
    const newId = createdData.id;

    // 2. Read (GET single)
    const getRes = await apiClient.getTestRun(newId, ADMIN_TOKEN);
    expect(getRes.status()).toBe(200);
    const fetchedData = await getRes.json();
    expect(fetchedData.name).toBe('Playwright API Integration Test');

    // 3. Update (PUT)
    const updateRes = await apiClient.updateTestRun(newId, { status: 'passed', durationSec: 77 }, ADMIN_TOKEN);
    expect(updateRes.status()).toBe(200);
    const updatedData = await updateRes.json();
    expect(updatedData.status).toBe('passed');
    expect(updatedData.durationSec).toBe(77);

    // 4. Delete (DELETE)
    const deleteRes = await apiClient.deleteTestRun(newId, ADMIN_TOKEN);
    expect(deleteRes.status()).toBe(204);

    // 5. Verify deletion
    const verifyRes = await apiClient.getTestRun(newId, ADMIN_TOKEN);
    expect(verifyRes.status()).toBe(404);
  });

  test('TC-API-004: POST /api/v1/test-runs schema validation rejects missing mandatory fields', async ({ apiClient }) => {
    const response = await apiClient.createTestRun({ name: 'Incomplete Test Run' }, ADMIN_TOKEN);
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.title).toBe('Schema Validation Error');
    expect(body.invalidParams.length).toBeGreaterThan(0);
  });

  test('TC-API-006: Viewer role cannot DELETE test run (403 Forbidden)', async ({ apiClient }) => {
    const response = await apiClient.deleteTestRun('TR-101', VIEWER_TOKEN);
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.title).toBe('Forbidden');
  });

  test('TC-API-007: Rate limiting threshold triggers 429 with standard headers', async ({ apiClient }) => {
    // Fire rapid requests
    let lastResponse;
    for (let i = 0; i < 22; i++) {
      lastResponse = await apiClient.triggerRateLimitCheck();
    }

    expect(lastResponse?.status()).toBe(429);
    const headers = lastResponse?.headers();
    expect(headers?.['x-ratelimit-limit']).toBe('20');
    expect(headers?.['x-ratelimit-remaining']).toBe('0');
    expect(headers?.['retry-after']).toBe('60');
  });

  test('TC-API-008: 500 Chaos endpoint returns standard internal server error', async ({ apiClient }) => {
    const response = await apiClient.triggerServerError();
    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.status).toBe(500);
    expect(body.title).toBe('Internal Server Error');
  });
});
