import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures';

// Auth tests use NO storageState — tests the actual login flow
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication Flow', () => {
  test('should display login page with form elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('text=Welcome back').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display register page with form elements', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('should login as buyer and redirect to explore', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('input[type="email"]', TEST_USERS.buyer.email);
    await page.fill('input[type="password"]', TEST_USERS.buyer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(explore|dashboard)/, { timeout: 30000 });
    await expect(page).toHaveURL(/\/explore/);
  });

  test('should login as admin and redirect to admin', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('input[type="email"]', TEST_USERS.admin.email);
    await page.fill('input[type="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 30000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should redirect unauthenticated user from protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/(login|explore|$)/);
  });

  test('should display forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate from login to register', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await page.locator('a:has-text("Join now"), a:has-text("Join Now")').first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should navigate from login to forgot password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
    await page.locator('text=Forgot password?').first().click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
