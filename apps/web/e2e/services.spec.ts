import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authDir = path.resolve(__dirname, '../playwright/.auth');

test.describe('Home Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should display home page with Zomieks branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Zomieks').first()).toBeVisible();
  });

  test('should have hero section with heading', async ({ page }) => {
    await page.goto('/');
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
  });

  test('should have call-to-action buttons', async ({ page }) => {
    await page.goto('/');
    const ctaButton = page.locator('text=Join Free').or(page.locator('text=Get Started')).first();
    await expect(ctaButton).toBeVisible();
  });

  test('should have footer', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should have search in hero or header', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
  });
});

test.describe('Services/Explore Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should load services page', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/services/);
  });

  test('should show services grid or empty state', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Page should show either a grid of services or a "0 services found" / empty state
    const hasGrid = await page.locator('[class*="grid"]').first().isVisible().catch(() => false);
    const hasCount = await page.locator('text=/\\d+ services? found/i').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/no services|no results|coming soon|no gigs/i').isVisible().catch(() => false);
    expect(hasGrid || hasCount || hasEmptyState).toBeTruthy();
  });

  test('should have search functionality on services page', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('design');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/services');
    }
  });
});

test.describe('Courses Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should load courses page', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/courses/);
  });

  test('should show courses content or empty state', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).not.toBeNull();
    expect(pageContent!.length).toBeGreaterThan(100);
  });
});

test.describe('Seller Service Management', () => {
  test.use({ storageState: path.join(authDir, 'seller.json') });

  test('should load create service page with form', async ({ page }) => {
    await page.goto('/seller/services/new');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/services\/new/);
    const hasForm = await page.locator('form, input, textarea, select').first().isVisible();
    expect(hasForm).toBeTruthy();
  });

  test('should load seller services listing', async ({ page }) => {
    await page.goto('/seller/services');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/services/);
  });
});

test.describe('Seller Course Management', () => {
  test.use({ storageState: path.join(authDir, 'seller.json') });

  test('should load create course page', async ({ page }) => {
    await page.goto('/seller/courses/new');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/courses\/new/);
  });

  test('should load seller courses listing', async ({ page }) => {
    await page.goto('/seller/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/seller\/courses/);
  });
});
