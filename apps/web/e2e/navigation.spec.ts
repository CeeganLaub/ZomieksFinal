import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authDir = path.resolve(__dirname, '../playwright/.auth');

test.describe('Public Navigation', () => {
  // No auth needed for public pages
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should display header with Zomieks logo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Zomieks').first()).toBeVisible();
  });

  test('should have Explore link in header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Explore' }).first()).toBeVisible();
  });

  test('should navigate to explore/services page', async ({ page }) => {
    await page.goto('/');
    await page.locator('text=Explore').first().click();
    await expect(page).toHaveURL(/\/(services|explore)/);
  });

  test('should show Sign In and Join buttons when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Sign In').first()).toBeVisible();
    await expect(page.locator('text=Join Free').first()).toBeVisible();
  });

  test('should navigate to login from Sign In', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to register from Join Free', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Join Free');
    await expect(page).toHaveURL(/\/register/);
  });

  test('should load /services public page', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/services/);
  });

  test('should load /courses public page', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/courses/);
  });
});

test.describe('Authenticated Navigation', () => {
  test.use({ storageState: path.join(authDir, 'seller.json') });

  test('should show profile avatar button when logged in', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const avatarButton = page.locator('header button').filter({ has: page.locator('svg, img, [class*="rounded"]') }).first();
    await expect(avatarButton).toBeVisible();
  });

  test('should navigate to dashboard from nav', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to seller dashboard', async ({ page }) => {
    await page.goto('/seller');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller/);
  });

  test('should navigate to orders from nav', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/orders/);
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/settings/);
  });
});
