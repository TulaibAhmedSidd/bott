import { test, expect } from '@playwright/test';

test.describe('AlgoTrader Pro Dashboard', () => {
  test('should display dashboard tabs and safe strategy controls', async ({ page }) => {
    await page.goto('/');

    // Check Header
    await expect(page.locator('h1')).toContainText('AlgoTrader Pro');

    // Verify Tab Switching
    const safeTab = page.getByRole('button', { name: /Safe Strategies/i });
    const botsTab = page.getByRole('button', { name: /Active Bots/i });
    const customTab = page.getByRole('button', { name: /Custom Config/i });
    const tradesTab = page.getByRole('button', { name: /Trade Ledger/i });

    await expect(safeTab).toBeVisible();
    await expect(botsTab).toBeVisible();

    // Click Custom Config Tab
    await customTab.click();
    await expect(page.getByRole('heading', { name: /Configure Custom Bot/i })).toBeVisible();

    // Click Safe Strategies Tab
    await safeTab.click();
    await expect(page.getByRole('heading', { name: /Filtered Mean Reversion/i })).toBeVisible();
  });
});
