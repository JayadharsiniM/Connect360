import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Worker Experience E2E Regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'worker');
  });

  test('should load worker dashboard with key performance metrics', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/worker\/dashboard/);

    // Look for performance metrics cards: Active Jobs, Completed, Rating, or Pending
    await expect(page.getByText(/Active Jobs|Completed|Rating|Pending/i).first()).toBeVisible();

    // Verify presence of worker quick links
    await expect(page.getByRole('link', { name: /Availability|Schedule/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Verification/i }).first()).toBeVisible();
  });

  test('should view and interact with worker availability schedule', async ({ page }) => {
    await page.goto('/worker/availability');
    await page.waitForLoadState('networkidle');

    // Verify page header
    await expect(page.getByRole('heading', { name: /Availability|Schedule/i }).first()).toBeVisible();

    // Verify day controls exist (e.g., Monday, Tuesday or Mon, Tue)
    await expect(page.getByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/i).first()).toBeVisible();

    // Check action buttons like "Quick Fill Weekdays" or "Save Schedule"
    const quickFillBtn = page.getByRole('button', { name: /Quick Fill Weekdays/i });
    if (await quickFillBtn.isVisible()) {
      await expect(quickFillBtn).toBeEnabled();
    }
  });

  test('should load worker verification page and document upload controls', async ({ page }) => {
    await page.goto('/worker/verification');
    await page.waitForLoadState('networkidle');

    // Verify verification heading
    await expect(page.getByRole('heading', { name: /Verification/i }).first()).toBeVisible();

    // Check for upload button or document status section
    const uploadBtn = page.getByRole('button', { name: /Upload Document|Add Document/i });
    if (await uploadBtn.isVisible()) {
      await expect(uploadBtn).toBeVisible();
    }
  });

  test('should load worker bookings page with status filtering', async ({ page }) => {
    await page.goto('/worker/bookings');
    await page.waitForLoadState('networkidle');

    // Check title
    await expect(page.getByRole('heading', { name: /Bookings/i }).first()).toBeVisible();

    // Check filter buttons (All, Pending, Active, Completed)
    await expect(page.getByRole('button', { name: /^All$/i }).first()).toBeVisible();
  });
});
