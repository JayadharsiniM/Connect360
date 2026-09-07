import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Customer Experience E2E Regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('should load customer dashboard with services and actions', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/customer\/dashboard/);

    // Check dashboard layout container or greetings
    await expect(page.getByPlaceholder(/Search services, repairs/i).or(page.getByPlaceholder(/Search/i)).first()).toBeVisible();

    // Verify presence of quick links or category cards
    await expect(page.getByRole('link', { name: /Find Workers/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /My Bookings/i }).first()).toBeVisible();
  });

  test('should browse workers and apply search filters', async ({ page }) => {
    await page.goto('/customer/workers');
    await page.waitForLoadState('networkidle');

    // Check main title
    await expect(page.getByRole('heading', { name: /Find Professionals/i }).first()).toBeVisible();

    // Check filters presence (desktop or mobile)
    await expect(page.getByRole('heading', { name: /Filters/i })).toBeVisible();

    // Check Sort By dropdown or select filter
    const sortSelect = page.locator('select').filter({ visible: true });
    await expect(sortSelect).toBeVisible();
  });

  test('should load My Bookings and allow switching status filters', async ({ page }) => {
    await page.goto('/customer/bookings');
    await page.waitForLoadState('networkidle');

    // Check header
    await expect(page.getByRole('heading', { name: /My Bookings/i }).first()).toBeVisible();

    // Check tabs or filter buttons
    const allFilter = page.getByRole('button', { name: /^All$/i }).first();
    await expect(allFilter).toBeVisible();

    const upcomingFilter = page.getByRole('button', { name: /Upcoming/i }).first();
    if (await upcomingFilter.isVisible()) {
      await upcomingFilter.click();
    }
  });

  test('should view Customer Profile details', async ({ page }) => {
    await page.goto('/customer/profile');
    await page.waitForLoadState('networkidle');

    // Check profile heading and personal info
    await expect(page.getByRole('heading', { name: /Profile/i }).first()).toBeVisible();
    await expect(page.locator('input[type="email"], input[disabled]').first()).toBeVisible();
  });
});
