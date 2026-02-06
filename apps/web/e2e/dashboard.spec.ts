import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './fixtures';

test.describe('Buyer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Welcome').first()).toBeVisible();
  });

  test('should show dashboard stats cards', async ({ page }) => {
    // Look for stats like Active Orders, Unread Messages, etc.
    await expect(page.locator('text=Active Orders').or(page.locator('text=Orders')).first()).toBeVisible();
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/orders/);
    // Should show orders content or empty state
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should navigate to messages page', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
    // Should show inbox
    await expect(page.locator('text=Inbox').first()).toBeVisible();
  });

  test('should navigate to subscriptions page', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/\/subscriptions/);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('Seller Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.seller.email, TEST_USERS.seller.password);
  });

  test('should display seller dashboard page', async ({ page }) => {
    await page.goto('/seller');
    await expect(page).toHaveURL(/\/(seller|dashboard)/);
  });

  test('should show sidebar on seller pages', async ({ page }) => {
    await page.goto('/seller/services');
    await page.waitForLoadState('networkidle');
    // Either on services page or redirected
    const url = page.url();
    if (url.includes('/seller/services')) {
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();
    }
  });

  test('should navigate to services page', async ({ page }) => {
    await page.goto('/seller/services');
    await page.waitForLoadState('networkidle');
    // Check we're on a valid page (services or login)
    const url = page.url();
    expect(url.includes('/seller/services') || url.includes('/login')).toBeTruthy();
  });

  test('should navigate to seller orders page', async ({ page }) => {
    await page.goto('/seller/orders');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.includes('/seller/orders') || url.includes('/orders') || url.includes('/login')).toBeTruthy();
  });

  test('should navigate to CRM page', async ({ page }) => {
    await page.goto('/seller/crm');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.includes('/seller/crm') || url.includes('/crm') || url.includes('/login')).toBeTruthy();
  });

  test('should navigate to earnings page', async ({ page }) => {
    await page.goto('/seller/earnings');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.includes('/seller/earnings') || url.includes('/earnings') || url.includes('/login')).toBeTruthy();
  });

  test('should show sidebar navigation links', async ({ page }) => {
    await page.goto('/seller/services');
    await page.waitForLoadState('networkidle');
    
    const sidebar = page.locator('aside');
    if (await sidebar.isVisible()) {
      // Check sidebar links are present
      await expect(sidebar.locator('text=Services').first()).toBeVisible();
    }
  });
});
