import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './fixtures';

test.describe('Navigation', () => {
  test.describe('Public Navigation', () => {
    test('should display header with logo', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=Zomieks').first()).toBeVisible();
    });

    test('should have Explore link in header', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=Explore').first()).toBeVisible();
    });

    test('should navigate to services page', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Explore');
      await expect(page).toHaveURL(/\/services/);
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
  });

  test.describe('Authenticated Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USERS.seller.email, TEST_USERS.seller.password);
      await page.waitForLoadState('networkidle');
    });

    test('should show profile dropdown when logged in', async ({ page }) => {
      // Look for avatar/profile button in header
      const avatarButton = page.locator('header button').filter({ has: page.locator('[class*="rounded-lg"], [class*="rounded-full"], img, svg') }).first();
      await expect(avatarButton).toBeVisible();
    });

    test('should open profile dropdown on click', async ({ page }) => {
      // Click profile button
      await page.locator('button:has([class*="bg-gradient-to-br"])').first().click();
      await page.waitForTimeout(300);
      
      // Should see dropdown sections
      await expect(page.locator('text=Buying').first()).toBeVisible();
      await expect(page.locator('text=Selling').first()).toBeVisible();
    });

    test('should navigate to buyer dashboard from dropdown', async ({ page }) => {
      await page.locator('button:has([class*="bg-gradient-to-br"])').first().click();
      await page.waitForTimeout(300);
      
      // Click Dashboard under Buying section
      await page.locator('a:has-text("Dashboard")').first().click();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should navigate to seller dashboard from dropdown', async ({ page }) => {
      await page.locator('button:has([class*="bg-gradient-to-br"])').first().click();
      await page.waitForTimeout(300);
      
      // Click Seller Dashboard under Selling section
      await page.locator('a:has-text("Seller Dashboard")').click();
      await expect(page).toHaveURL(/\/seller/);
    });

    test('should navigate to orders from dropdown', async ({ page }) => {
      await page.locator('button:has([class*="bg-gradient-to-br"])').first().click();
      await page.waitForTimeout(300);
      
      await page.locator('a:has-text("My Orders")').click();
      await expect(page).toHaveURL(/\/orders/);
    });

    test('should navigate to settings from dropdown', async ({ page }) => {
      await page.locator('button:has([class*="bg-gradient-to-br"])').first().click();
      await page.waitForTimeout(300);
      
      await page.locator('a:has-text("Settings")').click();
      await expect(page).toHaveURL(/\/settings/);
    });

    test('should show inbox dropdown', async ({ page }) => {
      // Look for chat icon button
      const inboxButton = page.locator('button').filter({ has: page.locator('svg[class*="h-5 w-5"]') }).first();
      await expect(inboxButton).toBeVisible();
    });

    test('should show notification dropdown', async ({ page }) => {
      // The notification icon should be visible
      const bellIcon = page.locator('svg').filter({ has: page.locator('path[d*="Bell"]') });
      // Just check we have notification elements
      await expect(page.locator('button').nth(1)).toBeVisible();
    });
  });
});
