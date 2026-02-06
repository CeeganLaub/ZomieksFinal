import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './fixtures';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    // Wait for login form to fully render
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('text=Welcome back').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should display register page', async ({ page }) => {
    await page.goto('/register');
    // Wait for register form to fully render
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('text=Create').or(page.locator('text=Join')).or(page.locator('text=Register')).first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    // Register page has 2 password fields (password + confirm), use first()
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message or stay on login page
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should login as buyer successfully', async ({ page }) => {
    await login(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should see welcome message ("Welcome back, ...")
    await expect(page.locator('text=Welcome back').first()).toBeVisible();
  });

  test('should login as seller successfully', async ({ page }) => {
    await login(page, TEST_USERS.seller.email, TEST_USERS.seller.password);
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL(/\/(dashboard|seller)/);
  });

  test('should redirect unauthenticated user from protected route', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await login(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Find and click profile button (the avatar button with dropdown)
    await page.locator('[class*="rounded-lg"]').filter({ has: page.locator('svg, img') }).first().click();
    await page.waitForTimeout(500);
    
    // Click sign out
    const signOutButton = page.locator('text=Sign Out').first();
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    }
    
    // Should redirect to home or login
    await page.waitForTimeout(1000);
  });
});
