import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authDir = path.resolve(__dirname, '../playwright/.auth');

test.describe('Buyer Dashboard & Pages', () => {
  test.use({ storageState: path.join(authDir, 'buyer.json') });

  test('should load buyer dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should load orders page', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should load messages page', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('should load subscriptions page', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/subscriptions/);
  });

  test('should load settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should load my-courses page', async ({ page }) => {
    await page.goto('/my-courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/my-courses/);
  });
});

test.describe('Seller Dashboard & Pages', () => {
  test.use({ storageState: path.join(authDir, 'seller.json') });

  test('should load seller dashboard', async ({ page }) => {
    await page.goto('/seller');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller/);
  });

  test('should load seller services page', async ({ page }) => {
    await page.goto('/seller/services');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/services/);
  });

  test('should load seller orders page', async ({ page }) => {
    await page.goto('/seller/orders');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/orders/);
  });

  test('should load seller earnings page', async ({ page }) => {
    await page.goto('/seller/earnings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/earnings/);
  });

  test('should load seller courses page', async ({ page }) => {
    await page.goto('/seller/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/courses/);
  });

  test('should load seller inbox page', async ({ page }) => {
    await page.goto('/seller/inbox');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/inbox/);
  });

  test('should load seller CRM page', async ({ page }) => {
    await page.goto('/seller/crm');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/crm/);
  });

  test('should load seller analytics page', async ({ page }) => {
    await page.goto('/seller/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/analytics/);
  });

  test('should load seller biolink page', async ({ page }) => {
    await page.goto('/seller/biolink');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/biolink/);
  });

  test('should show sidebar navigation on seller pages', async ({ page }) => {
    await page.goto('/seller/services');
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('should navigate to create service page', async ({ page }) => {
    await page.goto('/seller/services/new');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/services\/new/);
  });

  test('should navigate to create course page', async ({ page }) => {
    await page.goto('/seller/courses/new');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/courses\/new/);
  });
});

test.describe('Admin Dashboard & Pages', () => {
  test.use({ storageState: path.join(authDir, 'admin.json') });

  test('should load admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should load admin users page', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test('should load admin services page', async ({ page }) => {
    await page.goto('/admin/services');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/services/);
  });

  test('should load admin analytics page', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/analytics/);
  });

  test('should load admin payouts page', async ({ page }) => {
    await page.goto('/admin/payouts');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/payouts/);
  });

  test('should load admin fees page', async ({ page }) => {
    await page.goto('/admin/fees');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/fees/);
  });

  test('should load admin configuration page', async ({ page }) => {
    await page.goto('/admin/configuration');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/configuration/);
  });

  test('should load admin KYC page', async ({ page }) => {
    await page.goto('/admin/kyc');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/kyc/);
  });

  test('should load admin courses page', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/courses/);
  });

  test('should load admin seller management page', async ({ page }) => {
    await page.goto('/admin/seller-management');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/seller-management/);
  });
});
