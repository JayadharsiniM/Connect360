import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Role-Aware AI Assistant E2E Regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('should render floating assistant trigger and open chat panel', async ({ page }) => {
    // Find the floating button
    const assistantButton = page.locator('button[aria-label="Open AI assistant"]');
    await expect(assistantButton).toBeVisible();

    // Open chat panel
    await assistantButton.click();

    // Check header
    await expect(page.getByText('Connect360 Assistant')).toBeVisible();
    await expect(page.getByText(/Customer help/i)).toBeVisible();

    // Check suggestions or initial greeting
    await expect(page.locator('input[placeholder="Ask anything..."]')).toBeVisible();

    // Close chat panel
    const closeButton = page.locator('button[aria-label="Close assistant"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Confirm closed
    await expect(page.locator('input[placeholder="Ask anything..."]')).not.toBeVisible();
  });

  test('should send message and receive assistant response', async ({ page }) => {
    // Open chat panel
    await page.locator('button[aria-label="Open AI assistant"]').click();

    // Click a suggestion or type in input
    const suggestion = page.getByRole('button', { name: /What services do you offer?/i });
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    } else {
      const input = page.locator('input[placeholder="Ask anything..."]');
      await input.fill('What services do you offer?');
      await page.locator('button[aria-label="Send"]').click();
    }

    // Verify user message appears in chat
    await expect(page.getByText('What services do you offer?')).toBeVisible();

    // Wait for assistant reply (either rule-based fallback or Bedrock AI response)
    // Response should appear within 15 seconds
    const botMessages = page.locator('.whitespace-pre-line');
    await expect(botMessages.nth(1)).toBeVisible({ timeout: 15000 });
  });
});
