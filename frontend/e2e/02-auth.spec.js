import { test, expect } from '@playwright/test';
import { loginAs, logout, DEMO_USERS } from './helpers/auth';

test.describe('Authentication & Authorization E2E Regression', () => {
  test('should enforce route protection for unauthenticated users', async ({ page }) => {
    // Attempt visiting customer dashboard without logging in
    await page.goto('/customer/dashboard');
    await page.waitForURL(new RegExp('/(login)?$'), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    // Attempt visiting worker dashboard
    await page.goto('/worker/dashboard');
    await page.waitForURL(new RegExp('/(login)?$'), { timeout: 10000 });

    // Attempt visiting admin dashboard
    await page.goto('/admin/dashboard');
    await page.waitForURL(new RegExp('/(login)?$'), { timeout: 10000 });
  });

  test('should validate registration form fields and password match', async ({ page }) => {
    await page.goto('/register');

    // Select "Offer services" (worker role)
    await page.getByRole('button', { name: /Offer services/i }).click();
    await expect(page.getByText(/Join Connect360 as a worker/i)).toBeVisible();

    // Switch back to "Hire professionals" (customer role)
    await page.getByRole('button', { name: /Hire professionals/i }).click();
    await expect(page.getByText(/Join Connect360 as a customer/i)).toBeVisible();

    // Test mismatched passwords
    await page.locator('input[name="fullName"]').fill('Test Customer');
    await page.locator('input[name="email"]').fill('testcustomer@example.com');
    await page.locator('input[name="password"]').fill('Password@123');
    await page.locator('input[name="confirmPassword"]').fill('Password@Different');

    await page.getByRole('button', { name: /Create Account/i }).click();
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
  });

  test('should sign in successfully as Customer and access customer dashboard', async ({ page }) => {
    await loginAs(page, 'customer');

    // Verify redirected to customer dashboard
    await expect(page).toHaveURL(/.*\/customer\/dashboard/);
    await expect(page.locator('h1, h2, p').getByText(/Demo Customer/i).first()).toBeVisible();

    // Verify customer navigation items are available
    await expect(page.getByRole('link', { name: /Find Workers/i }).first()).toBeVisible();
  });

  test('should sign in successfully as Worker and access worker dashboard', async ({ page }) => {
    await loginAs(page, 'worker');

    // Verify redirected to worker dashboard
    await expect(page).toHaveURL(/.*\/worker\/dashboard/);

    // Verify worker navigation items are available
    await expect(page.getByRole('link', { name: /Availability|Schedule/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Verification/i }).first()).toBeVisible();
  });

  test('should sign in successfully as Admin and access admin dashboard', async ({ page }) => {
    await loginAs(page, 'admin');

    // Verify redirected to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);

    // Verify admin navigation items are available
    await expect(page.getByRole('link', { name: /Services/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Verification/i }).first()).toBeVisible();
  });
});
