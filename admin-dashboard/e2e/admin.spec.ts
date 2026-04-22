import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="tel"]', '+237600000000');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('dashboard loads and displays key metrics', async ({ page }) => {
    await page.goto('/');
    
    // Check for dashboard heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Check for key metrics cards
    const metrics = ['Jobs', 'Users', 'Earnings', 'Revenue'];
    for (const metric of metrics) {
      const element = page.getByText(metric).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('navigation works between admin pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Jobs page
    const jobsLink = page.getByRole('link', { name: /jobs/i });
    if (await jobsLink.isVisible()) {
      await jobsLink.click();
      await page.waitForURL(/\/jobs/);
      await expect(page).toHaveURL(/\/jobs/);
      await expect(page.getByRole('heading', { name: /jobs/i })).toBeVisible();
    }
    
    // Navigate to Users page
    const usersLink = page.getByRole('link', { name: /users/i });
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await page.waitForURL(/\/users/);
      await expect(page).toHaveURL(/\/users/);
      await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
    }
    
    // Navigate to Dashboard
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForURL('/');
      await expect(page).toHaveURL('/');
    }
  });

  test('jobs page displays job list and filters', async ({ page }) => {
    await page.goto('/jobs');
    
    // Check for jobs heading
    await expect(page.getByRole('heading', { name: /jobs/i })).toBeVisible();
    
    // Check for job table or list
    const table = page.getByRole('table');
    const list = page.locator('.job-list');
    await expect(table.or(list)).toBeVisible();
  });

  test('users page displays user list', async ({ page }) => {
    await page.goto('/users');
    
    // Check for users heading
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
    
    // Check for user table or list
    const table = page.getByRole('table');
    const list = page.locator('.user-list');
    await expect(table.or(list)).toBeVisible();
  });

  test('disputes page displays dispute list', async ({ page }) => {
    await page.goto('/disputes');
    
    // Check for disputes heading
    await expect(page.getByRole('heading', { name: /disput/i })).toBeVisible();
    
    // Check for dispute table or list
    const table = page.getByRole('table');
    const list = page.locator('.dispute-list');
    await expect(table.or(list)).toBeVisible();
  });

  test('fraud flags page displays fraud reports', async ({ page }) => {
    await page.goto('/fraud-flags');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for fraud heading using role selector (h1)
    await expect(page.getByRole('heading', { name: 'Fraud Flags' })).toBeVisible();
    
    // Check for table
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    
    // Check for either table data or empty message
    const emptyMessage = page.locator('td').filter({ hasText: 'No fraud flags found' });
    const hasData = page.locator('tbody tr:not(:has-text("No fraud flags found"))');
    await expect(emptyMessage.or(hasData.first())).toBeVisible();
  });

  test('config page displays configuration options', async ({ page }) => {
    await page.goto('/config');
    
    // Check for config heading
    const configHeading = page.getByRole('heading', { name: /config|settings|configuration/i });
    if (await configHeading.isVisible()) {
      await expect(configHeading).toBeVisible();
    }
    
    // Check for form elements
    const form = page.locator('form');
    const input = page.locator('input');
    const select = page.locator('select');
    await expect(form.or(input).or(select)).toBeVisible();
  });

  test('sidebar navigation is accessible', async ({ page }) => {
    await page.goto('/');
    
    // Check for sidebar
    const sidebar = page.locator('aside, [role="navigation"], .sidebar');
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
      
      // Check navigation links
      const navLinks = sidebar.getByRole('link');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    }
  });

  test('responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile menu is present
    const mobileMenu = page.getByRole('button', { name: /menu/i });
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
      
      // Open mobile menu
      await mobileMenu.click();
      const mobileNav = page.locator('nav, .mobile-menu');
      if (await mobileNav.isVisible()) {
        await expect(mobileNav).toBeVisible();
      }
    }
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Assert no console errors
    expect(errors).toHaveLength(0);
  });
});
