import { test, expect } from '../../src/fixtures/base-test';

test.describe('TestMu AI - Authentication & Session Tests', () => {
  test.beforeEach(async ({ apiClient }) => {
    // Reset state before each test run for test isolation
    await apiClient.resetServerState();
  });

  test('TC-AUTH-001: Valid admin login redirects to dashboard with admin role badge', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('admin@testmu.ai', 'AdminPass123!');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('#user-role-badge')).toHaveText('admin');
    await expect(page.locator('#user-display-email')).toHaveText('admin@testmu.ai');
  });

  test('TC-AUTH-002: Valid viewer login redirects with viewer badge and restricted controls', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('engineer@testmu.ai', 'EngineerPass123!');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('#user-role-badge')).toHaveText('viewer');
    await expect(page.locator('#btn-create-run')).toBeHidden();
  });

  test('TC-AUTH-003: Invalid credentials displays error alert without creating session', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('admin@testmu.ai', 'WrongPassword123!');

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('Invalid email or password');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AUTH-005: Forgot password workflow displays generic success preventing enumeration', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('#reset-email', 'nonexistent-user@example.com');
    await page.click('#btn-submit-reset');

    const alert = page.locator('#alert-success');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('If an account exists with this email, password recovery instructions have been sent.');
  });

  test('TC-AUTH-006: Brute-force lockout triggers after 5 failed login attempts', async ({ loginPage }) => {
    await loginPage.goto();

    // Trigger 5 consecutive failed attempts
    for (let i = 1; i <= 5; i++) {
      await loginPage.login('admin@testmu.ai', `BadPassAttempt${i}`);
    }

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('Account is temporarily locked due to multiple failed login attempts');
  });

  test('TC-AUTH-007: Unauthenticated visit to dashboard redirects back to login', async ({ page }) => {
    // Navigate without setting localStorage auth token
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
