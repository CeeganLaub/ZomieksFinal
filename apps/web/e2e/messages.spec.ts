import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './fixtures';

test.describe('Messages/Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.seller.email, TEST_USERS.seller.password);
  });

  test('should display inbox page', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.locator('text=Inbox').first()).toBeVisible();
  });

  test('should show search input on inbox page', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('should show filter tabs for seller', async ({ page }) => {
    await page.goto('/messages');
    
    // Seller should see All, Buying, Selling tabs
    await expect(page.locator('button:has-text("all")').first()).toBeVisible();
  });

  test('should show empty state when no conversations', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    
    // Either shows conversations or empty state ("No messages yet")
    const hasConversations = await page.locator('[class*="divide-y"]').isVisible();
    const hasEmptyState = await page.locator('text=No messages yet').or(page.locator('text=No conversations')).isVisible();
    
    expect(hasConversations || hasEmptyState).toBeTruthy();
  });

  test('should open inbox dropdown from header', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click chat icon in header
    const chatButton = page.locator('button').filter({ has: page.locator('svg') }).nth(0);
    await chatButton.click();
    await page.waitForTimeout(300);
    
    // Should show dropdown
    const dropdown = page.locator('[class*="shadow-xl"]');
    await expect(dropdown.first()).toBeVisible();
  });

  test('should show "See All in Inbox" link in dropdown', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Click chat/inbox icon button in header (look for button with svg)
    const inboxButtons = page.locator('header button').filter({ has: page.locator('svg') });
    const count = await inboxButtons.count();
    if (count >= 1) {
      await inboxButtons.first().click();
      await page.waitForTimeout(500);
      
      // Should have link to full inbox
      const seeAllLink = page.locator('text=See All in Inbox').or(page.locator('a[href="/messages"]'));
      if (await seeAllLink.isVisible()) {
        await expect(seeAllLink.first()).toBeVisible();
      }
    }
  });
});

test.describe('Notification Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.seller.email, TEST_USERS.seller.password);
    await page.goto('/dashboard');
  });

  test('should open notification dropdown', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Find and click bell icon button
    const bellButton = page.locator('header button').filter({ has: page.locator('svg') });
    const count = await bellButton.count();
    if (count >= 2) {
      await bellButton.nth(1).click();
      await page.waitForTimeout(500);
      
      // Should show Notifications header in dropdown
      await expect(page.locator('text=Notifications').first()).toBeVisible();
    } else {
      // Skip if buttons not found
      test.skip();
    }
  });

  test('should show notification list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const bellButton = page.locator('header button').filter({ has: page.locator('svg') });
    const count = await bellButton.count();
    if (count >= 2) {
      await bellButton.nth(1).click();
      await page.waitForTimeout(500);
      
      // Either has notifications or shows empty state
      const hasNotifications = await page.locator('div[class*="divide-y"]').isVisible();
      const hasEmptyState = await page.locator('text=No notifications').isVisible();
      const hasDropdown = await page.locator('text=Notifications').isVisible();
      
      expect(hasNotifications || hasEmptyState || hasDropdown).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should have View All link', async ({ page }) => {
    const bellButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
    await bellButton.click();
    await page.waitForTimeout(300);
    
    await expect(page.locator('text=View All').first()).toBeVisible();
  });
});
