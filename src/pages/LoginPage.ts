import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('#btn-login');
    this.errorMessage = page.locator('#alert-error');
    this.successMessage = page.locator('#alert-success');
    this.forgotPasswordLink = page.locator('#btn-forgot-password');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/login');
  }

  async login(email: string, pass: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
    return (await this.errorMessage.textContent()) || '';
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
