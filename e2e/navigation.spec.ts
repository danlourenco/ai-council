import { test, expect } from '@playwright/test';

test.describe('Navigation - Desktop', () => {
	// Skip auth-protected routes for now as they require passkey auth
	// These tests focus on public pages

	test('landing page renders correctly', async ({ page }) => {
		await page.goto('/');

		// Should show landing page content or redirect to login
		// (depends on auth state)
		const url = page.url();
		expect(url).toMatch(/\/(login)?$/);
	});

	test('can navigate between login and register', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('link', { name: 'Register' }).click();
		await expect(page).toHaveURL('/register');

		await page.getByRole('link', { name: 'Sign in' }).click();
		await expect(page).toHaveURL('/login');
	});
});

test.describe('Navigation - Mobile Chrome', () => {
	test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

	test('mobile viewport renders auth pages correctly', async ({ page }) => {
		await page.goto('/login');

		// Ensure no horizontal overflow
		const html = page.locator('html');
		const scrollWidth = await html.evaluate((el) => el.scrollWidth);
		const clientWidth = await html.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
	});
});

test.describe('Navigation - Mobile Safari', () => {
	test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12

	test('mobile viewport renders auth pages correctly', async ({ page }) => {
		await page.goto('/register');

		// Form should be usable on mobile
		const nameInput = page.getByLabel('Name');
		await expect(nameInput).toBeVisible();

		// Input should be wide enough to type in
		const inputBox = await nameInput.boundingBox();
		expect(inputBox?.width).toBeGreaterThan(200);
	});
});
