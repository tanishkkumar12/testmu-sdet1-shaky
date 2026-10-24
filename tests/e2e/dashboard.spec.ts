import { test, expect } from '../../src/fixtures/base-test';

test.describe('TestMu AI - Quality Dashboard Tests', () => {
  test.beforeEach(async ({ apiClient, page }) => {
    await apiClient.resetServerState();
    // Simulate active session
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'valid-token-admin');
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user_email', 'admin@testmu.ai');
    });
  });

  test('TC-DASH-001: Metric widgets render accurate data and calculations', async ({ dashboardPage }) => {
    await dashboardPage.goto();

    await expect(dashboardPage.totalRunsValue).toHaveText('4');
    await expect(dashboardPage.passRateValue).toHaveText('50.0%');
    await expect(dashboardPage.flakyTestsWidget).toBeVisible();
    await expect(dashboardPage.avgDurationWidget).toBeVisible();
  });

  test('TC-DASH-002: Status dropdown filter dynamically filters table rows', async ({ dashboardPage }) => {
    await dashboardPage.goto();

    // Filter to passed
    await dashboardPage.filterByStatus('passed');
    expect(await dashboardPage.getRowCount()).toBe(2);

    // Filter to failed
    await dashboardPage.filterByStatus('failed');
    expect(await dashboardPage.getRowCount()).toBe(1);

    // Filter back to all
    await dashboardPage.filterByStatus('all');
    expect(await dashboardPage.getRowCount()).toBe(4);
  });

  test('TC-DASH-003: Real-time search matches title, ID, or author', async ({ dashboardPage }) => {
    await dashboardPage.goto();

    await dashboardPage.searchRuns('Billing');
    expect(await dashboardPage.getRowCount()).toBe(1);
    await expect(dashboardPage.tableRows.first()).toContainText('TR-102');

    await dashboardPage.searchRuns('nonexistent query 123');
    expect(await dashboardPage.getRowCount()).toBe(0);
  });

  test('TC-DASH-004: Two-way column sorting reorders duration column', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();

    // Ascending sort
    await dashboardPage.sortByColumn('durationSec');
    const firstRowDurationAsc = await page.locator('#runs-table-body tr:first-child td:nth-child(4)').textContent();
    expect(firstRowDurationAsc).toBe('42s');

    // Descending sort
    await dashboardPage.sortByColumn('durationSec');
    const firstRowDurationDesc = await page.locator('#runs-table-body tr:first-child td:nth-child(4)').textContent();
    expect(firstRowDurationDesc).toBe('184s');
  });

  test('TC-DASH-006: Viewer role masks admin CTA buttons and actions column', async ({ page }) => {
    // Switch role to viewer in storage
    await page.evaluate(() => {
      localStorage.setItem('user_role', 'viewer');
      localStorage.setItem('auth_token', 'valid-token-viewer');
    });
    await page.goto('/dashboard');

    await expect(page.locator('#btn-create-run')).toBeHidden();
    await expect(page.locator('#actions-header')).toBeHidden();
    await expect(page.locator('.btn-delete-run')).toHaveCount(0);
  });

  test('TC-DASH-007: Mobile viewport collapses sidebar into hamburger toggle', async ({ dashboardPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await dashboardPage.goto();

    await expect(dashboardPage.hamburgerButton).toBeVisible();
    await expect(dashboardPage.sidebar).not.toHaveClass(/open/);

    await dashboardPage.toggleMobileSidebar();
    await expect(dashboardPage.sidebar).toHaveClass(/open/);
  });
});
