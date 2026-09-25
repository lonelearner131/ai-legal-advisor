import { test, expect } from '@playwright/test';

test('has title and disclaimer', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  
  // Expect a title
  await expect(page).toHaveTitle(/Create Next App/); // Default next.js title
  
  // Expect disclaimer
  await expect(page.locator('text=This is general information, not legal advice')).toBeVisible();
});
