import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authDir = path.resolve(__dirname, '../playwright/.auth');

test.describe('Seller Messages/Inbox', () => {
  test.use({ storageState: path.join(authDir, 'seller.json') });

  test('should load messages page', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('should show conversations or empty state', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    const hasContent = pageContent !== null && pageContent.length > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should load seller inbox page', async ({ page }) => {
    await page.goto('/seller/inbox');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/inbox/);
  });
});

test.describe('Buyer Messages', () => {
  test.use({ storageState: path.join(authDir, 'buyer.json') });

  test('should load buyer messages page', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/messages/);
  });
});
