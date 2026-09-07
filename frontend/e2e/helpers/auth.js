import { expect } from '@playwright/test';

export const DEMO_USERS = {
  customer: {
    email: 'democustomer@connect360.com',
    password: 'Demo@1234',
    role: 'customer',
    dashboardUrl: '/customer/dashboard',
  },
  worker: {
    email: 'demoworker@connect360.com',
    password: 'Demo@1234',
    role: 'worker',
    dashboardUrl: '/worker/dashboard',
  },
  admin: {
    email: 'demoadmin@connect360.com',
    password: 'Demo@1234',
    role: 'admin',
    dashboardUrl: '/admin/dashboard',
  },
};

/**
 * Log in via the web UI using the standard login form.
 */
export async function loginAs(page, roleKey = 'customer') {
  const credentials = DEMO_USERS[roleKey];
  if (!credentials) {
    throw new Error(`Unknown role key: ${roleKey}`);
  }

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill in email and password
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[placeholder="Enter your password"]');
  const submitButton = page.locator('button[type="submit"]');

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);
  await submitButton.click();

  // Wait for redirect to role dashboard (or role specific path)
  await page.waitForURL(new RegExp(`/${credentials.role}/`), { timeout: 15000 });
}

/**
 * Perform logout using either the desktop or mobile logout control.
 */
export async function logout(page) {
  // Check if desktop logout button is visible, otherwise check mobile menu
  const desktopLogout = page.locator('button[title="Logout"]');
  if (await desktopLogout.isVisible({ timeout: 2000 }).catch(() => false)) {
    await desktopLogout.click();
  } else {
    // Look for sidebar logout or mobile menu
    const logoutBtn = page.locator('button:has-text("Log Out"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutBtn.click();
    }
  }

  // Expect redirection to login or landing page
  await page.waitForURL(new RegExp('/(login)?$'), { timeout: 10000 });
}
