import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly userEmailBadge: Locator;
  readonly roleBadge: Locator;
  readonly logoutButton: Locator;
  readonly sidebar: Locator;
  readonly hamburgerButton: Locator;
  
  // Metric Widgets
  readonly totalRunsWidget: Locator;
  readonly totalRunsValue: Locator;
  readonly passRateWidget: Locator;
  readonly passRateValue: Locator;
  readonly flakyTestsWidget: Locator;
  readonly avgDurationWidget: Locator;

  // Toolbar & Table
  readonly statusFilter: Locator;
  readonly searchInput: Locator;
  readonly createRunButton: Locator;
  readonly testRunsTable: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.userEmailBadge = page.locator('#user-display-email');
    this.roleBadge = page.locator('#user-role-badge');
    this.logoutButton = page.locator('#btn-logout');
    this.sidebar = page.locator('#sidebar-nav');
    this.hamburgerButton = page.locator('#hamburger-toggle');

    this.totalRunsWidget = page.locator('[data-testid="widget-total-runs"]');
    this.totalRunsValue = page.locator('#val-total-runs');
    this.passRateWidget = page.locator('[data-testid="widget-pass-rate"]');
    this.passRateValue = page.locator('#val-pass-rate');
    this.flakyTestsWidget = page.locator('[data-testid="widget-flaky-tests"]');
    this.avgDurationWidget = page.locator('[data-testid="widget-avg-duration"]');

    this.statusFilter = page.locator('[data-testid="filter-status"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.createRunButton = page.locator('[data-testid="btn-create-run"]');
    this.testRunsTable = page.locator('[data-testid="test-runs-table"]');
    this.tableRows = page.locator('#runs-table-body tr');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/dashboard');
  }

  async filterByStatus(status: 'all' | 'passed' | 'failed' | 'running'): Promise<void> {
    await this.statusFilter.selectOption(status);
  }

  async searchRuns(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async getRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  async sortByColumn(columnKey: string): Promise<void> {
    await this.page.locator(`th[data-sort="${columnKey}"]`).click();
  }

  async toggleMobileSidebar(): Promise<void> {
    await this.hamburgerButton.click();
  }
}
