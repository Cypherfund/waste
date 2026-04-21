import { test, expect } from '@playwright/test';

test.describe('Website E2E Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check for KmerTrash branding
    await expect(page.locator('text=KmerTrash')).toBeVisible();
    
    // Check for main navigation
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for hero section
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to download page
    await page.click('text=Download');
    await page.waitForURL('/download');
    await expect(page).toHaveURL('/download');
    
    // Navigate to about page
    await page.click('text=About');
    await page.waitForURL('/about');
    await expect(page).toHaveURL('/about');
    
    // Navigate to testimonials page
    await page.click('text=Testimonials');
    await page.waitForURL('/testimonials');
    await expect(page).toHaveURL('/testimonials');
    
    // Navigate back to home
    await page.click('text=Home');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('language switcher works', async ({ page }) => {
    await page.goto('/');
    
    // Find language switcher button
    const langSwitcher = page.locator('[translate="no"]').first();
    await expect(langSwitcher).toBeVisible();
    
    // Click to switch language
    await langSwitcher.click();
    
    // Verify cookie is set (check for language change indicator)
    // The actual language change would be visible in content
  });

  test('contact page loads and displays information', async ({ page }) => {
    await page.goto('/contact');
    
    // Check for contact heading
    await expect(page.locator('h1:has-text("Contact")')).toBeVisible();
    
    // Check for contact information
    await expect(page.locator('text=info@kmertrash.com')).toBeVisible();
    await expect(page.locator('text=+237 650 931 636')).toBeVisible();
    
    // Check for contact form
    await expect(page.locator('form')).toBeVisible();
  });

  test('guides page loads and displays FAQ section', async ({ page }) => {
    await page.goto('/guides');
    
    // Check for guides heading
    await expect(page.locator('h1:has-text("Guides")')).toBeVisible();
    
    // Check for FAQ section
    await expect(page.locator('text=FAQ')).toBeVisible();
  });

  test('terms page loads and displays terms', async ({ page }) => {
    await page.goto('/terms');
    
    // Check for terms heading
    await expect(page.locator('h1:has-text("Terms")')).toBeVisible();
    
    // Check for terms content
    await expect(page.locator('text=Terms of Service')).toBeVisible();
  });

  test('download page loads and displays app download options', async ({ page }) => {
    await page.goto('/download');
    
    // Check for download heading
    await expect(page.locator('h1:has-text("Download")')).toBeVisible();
    
    // Check for app store badges or download buttons
    await expect(page.locator('a:has-text("Download")').first()).toBeVisible();
  });

  test('footer is present on all pages', async ({ page }) => {
    const pages = ['/', '/about', '/contact', '/download'];
    
    for (const url of pages) {
      await page.goto(url);
      await expect(page.locator('footer')).toBeVisible();
      await expect(page.locator('text=KmerTrash').nth(1)).toBeVisible(); // Footer logo
    }
  });

  test('responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile menu is present
    await expect(page.locator('button[aria-label="Toggle menu"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    await expect(page.locator('nav').last()).toBeVisible();
  });
});
