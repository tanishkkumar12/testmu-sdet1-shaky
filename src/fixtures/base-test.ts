import { test as baseTest, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TestMuApiClient } from '../api/TestMuApiClient';

export type CustomFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  apiClient: TestMuApiClient;
  attachDomSnapshotOnFailure: void;
};

export const test = baseTest.extend<CustomFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  apiClient: async ({ request, baseURL }, use) => {
    await use(new TestMuApiClient(request, baseURL));
  },

  // Auto fixture capturing DOM snapshot if page test fails
  attachDomSnapshotOnFailure: [
    async ({ page }, use, testInfo) => {
      await use();
      if (testInfo.status !== testInfo.expectedStatus && page) {
        try {
          const content = await page.content();
          // Extract a compact excerpt of the body to keep token usage optimal
          const bodySnippet = content.length > 4000 ? content.slice(0, 4000) + '\n<!-- [truncated for token limit] -->' : content;
          await testInfo.attach('dom-snapshot', {
            body: bodySnippet,
            contentType: 'text/html',
          });
        } catch {
          // ignore snapshot errors on teardown
        }
      }
    },
    { auto: true },
  ],
});

export { expect };
