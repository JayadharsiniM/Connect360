import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Responsive Navigation E2E Regression', () => {
  test('should display bottom navigation on mobile viewport and navigate between pages', async ({ page }) => {
    // Set mobile viewport (iPhone SE dimensions)
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAs(page, 'customer');

    // Bottom navigation bar should be visible on mobile
    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();

    // Check mobile nav links
    const searchLink = bottomNav.getByRole('link', { name: /Search/i });
    await expect(searchLink).toBeVisible();
    await searchLink.click();

    // Verify redirected to workers search
    await expect(page).toHaveURL(/.*\/customer\/workers/);

    // Click bookings from bottom nav
    const bookingsLink = bottomNav.getByRole('link', { name: /Bookings/i });
    await expect(bookingsLink).toBeVisible();
    await bookingsLink.click();

    // Verify redirected to bookings
    await expect(page).toHaveURL(/.*\/customer\/bookings/);
  });

  test('should hide bottom navigation and display desktop navigation on large viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    await loginAs(page, 'customer');

    // Bottom nav must NOT be visible on desktop
    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeHidden();

    // Desktop sidebar or header should be visible
    await expect(page.locator('aside, header').first()).toBeVisible();
  });
});
