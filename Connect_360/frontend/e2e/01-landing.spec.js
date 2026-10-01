import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display brand, headline, and core navigation', async ({ page }) => {
    // Check main brand logo/link
    await expect(page.locator('header').getByRole('link', { name: 'Connect360' })).toBeVisible();

    // Check main hero heading
    await expect(
      page.getByRole('heading', { name: /Find trusted professionals for every task/i })
    ).toBeVisible();

    // Check navigation buttons in header
    const loginLink = page.locator('header').getByRole('link', { name: /Log In/i });
    const signUpLink = page.locator('header').getByRole('link', { name: /Sign Up/i });
    await expect(loginLink).toBeVisible();
    await expect(signUpLink).toBeVisible();
  });

  test('should display popular services section and how it works steps', async ({ page }) => {
    // Check Popular Services section
    await expect(page.getByRole('heading', { name: /Popular Services/i })).toBeVisible();
    await expect(page.getByText('Home Renovation')).toBeVisible();
    await expect(page.getByText('Plumbing').filter({ visible: true }).first()).toBeVisible();

    // Check How it Works section
    await expect(page.getByRole('heading', { name: /How Connect360 Works/i })).toBeVisible();
    await expect(page.getByText('Describe Your Task')).toBeVisible();
    await expect(page.getByText('Get Matched')).toBeVisible();
    await expect(page.getByText('Get It Done')).toBeVisible();
  });

  test('should navigate to Login page when clicking Log In', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: /Log In/i }).click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should navigate to Register page when clicking Sign Up', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: /Sign Up/i }).first().click();
    await page.waitForURL('**/register');
    await expect(page.getByRole('heading', { name: /Create account/i })).toBeVisible();
    await expect(page.locator('input[placeholder="John Doe"]')).toBeVisible();
  });
});
