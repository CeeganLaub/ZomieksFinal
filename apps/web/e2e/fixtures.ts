import { test as base, expect } from '@playwright/test';

// Test users from database seed
export const TEST_USERS = {
  admin: {
    email: 'admin@kiekz.co.za',
    password: 'Password123',
  },
  seller: {
    email: 'john@example.com',
    password: 'Password123',
  },
  buyer: {
    email: 'buyer@example.com',
    password: 'Password123',
  },
};

// Custom fixtures for authenticated users
export const test = base.extend<{
  authenticatedPage: typeof base;
}>({});

export { expect };

// Helper to login
export async function login(page: any, email: string, password: string) {
  await page.goto('/login');
  // Wait for login form to be ready
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard with increased timeout
  await page.waitForURL(/\/(dashboard|seller)/, { timeout: 30000 });
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
}

// Helper to logout
export async function logout(page: any) {
  // Click profile dropdown
  await page.locator('button:has([class*="rounded-lg"])').first().click();
  // Click sign out
  await page.click('text=Sign Out');
  await page.waitForURL('/');
}
