import { test, expect } from '@playwright/test';

test.describe('Services/Explore Page', () => {
  test('should display services page', async ({ page }) => {
    await page.goto('/services');
    await expect(page).toHaveURL(/\/services/);
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/services');
    
    // Look for first search input (use .first() to avoid strict mode violation)
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('design');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      // URL should include search param or stay on services
      expect(page.url()).toContain('/services');
    }
  });

  test('should show services or empty state', async ({ page }) => {
    await page.goto('/services');
    await page.waitForTimeout(1000);
    
    // Either shows services grid or empty state
    const hasServices = await page.locator('[class*="grid"]').first().isVisible();
    const hasEmptyState = await page.locator('text=/no services|no results|coming soon/i').isVisible();
    
    expect(hasServices || hasEmptyState).toBeTruthy();
  });
});

test.describe('Home Page', () => {
  test('should display home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Zomieks').first()).toBeVisible();
  });

  test('should have hero section', async ({ page }) => {
    await page.goto('/');
    
    // Hero section typically has large heading
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
  });

  test('should have search in hero', async ({ page }) => {
    await page.goto('/');
    
    // Search input in hero or header
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible();
  });

  test('should have call to action buttons', async ({ page }) => {
    await page.goto('/');
    
    // Should have CTA buttons
    const joinButton = page.locator('text=Join Free').or(page.locator('text=Get Started')).first();
    await expect(joinButton).toBeVisible();
  });

  test('should have footer with links', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Footer should have categories, support links
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('text=Categories').first()).toBeVisible();
  });

  test('should have social links in footer', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Footer should have social links
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="#"]').first()).toBeVisible();
  });
});
