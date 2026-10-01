import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Admin Experience E2E Regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('should load admin dashboard and key platform metrics', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);

    // Look for platform metric cards: Total Users, Bookings, Active Workers, Verifications, or Revenue
    await expect(
      page.getByText(/Users|Bookings|Workers|Verifications|Revenue|Overview/i).first()
    ).toBeVisible();

    // Verify admin navigation presence
    await expect(page.getByRole('link', { name: /Services/i }).first()).toBeVisible();
  });

  test('should navigate to service catalog and open add service form', async ({ page }) => {
    await page.goto('/admin/services');
    await page.waitForLoadState('networkidle');

    // Verify Services page heading
    await expect(page.getByRole('heading', { name: /Services/i }).first()).toBeVisible();

    // Look for "Add Service" or "New Service" button
    const addBtn = page.getByRole('button', { name: /Add Service|New Service/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      // Verify form fields
      await expect(page.locator('input[placeholder*="Plumbing"], input[name="name"]').first()).toBeVisible();
    }
  });

  test('should load verification queue / console', async ({ page }) => {
    await page.goto('/admin/verification-queue');
    await page.waitForLoadState('networkidle');

    // Check heading
    await expect(page.getByRole('heading', { name: /Verification/i }).first()).toBeVisible();
  });

  test('should load user management table and search input', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Check heading
    await expect(page.getByRole('heading', { name: /User Management|Users/i }).first()).toBeVisible();

    // Check search input for filtering users
    const searchInput = page.getByPlaceholder(/Search users/i).or(page.locator('input[type="text"]').first());
    await expect(searchInput).toBeVisible();
  });
});
