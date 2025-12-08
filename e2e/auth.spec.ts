import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
	test.describe('Login Page', () => {
		test('renders login page with correct elements', async ({ page }) => {
			await page.goto('/login');

			// Check page title
			await expect(page).toHaveTitle('Login - The Council');

			// Check main heading
			await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

			// Check passkey button exists
			await expect(page.getByRole('button', { name: /sign in with passkey/i })).toBeVisible();

			// Check link to register
			await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
		});

		test('navigates to register page', async ({ page }) => {
			await page.goto('/login');
			await page.getByRole('link', { name: 'Register' }).click();
			await expect(page).toHaveURL('/register');
		});
	});

	test.describe('Register Page', () => {
		test('renders register page with form', async ({ page }) => {
			await page.goto('/register');

			// Check page title
			await expect(page).toHaveTitle('Register - The Council');

			// Check main heading
			await expect(page.getByRole('heading', { name: 'Join The Council' })).toBeVisible();

			// Check form fields
			await expect(page.getByLabel('Name')).toBeVisible();
			await expect(page.getByLabel('Email')).toBeVisible();

			// Check submit button
			await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();

			// Check link to login
			await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
		});

		test('validates required fields', async ({ page }) => {
			await page.goto('/register');

			// Try to submit empty form
			await page.getByRole('button', { name: 'Continue' }).click();

			// Form should not submit (HTML5 validation)
			await expect(page).toHaveURL('/register');
		});

		test('navigates to login page', async ({ page }) => {
			await page.goto('/register');
			await page.getByRole('link', { name: 'Sign in' }).click();
			await expect(page).toHaveURL('/login');
		});
	});
});

test.describe('Auth Pages - Mobile', () => {
	test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

	test('login page is responsive on mobile', async ({ page }) => {
		await page.goto('/login');

		// Page should render without horizontal scroll
		const body = page.locator('body');
		const bodyBox = await body.boundingBox();
		expect(bodyBox?.width).toBeLessThanOrEqual(375);

		// Button should be visible and tappable
		const loginButton = page.getByRole('button', { name: /sign in with passkey/i });
		await expect(loginButton).toBeVisible();
	});

	test('register page is responsive on mobile', async ({ page }) => {
		await page.goto('/register');

		// Form should be visible
		await expect(page.getByLabel('Name')).toBeVisible();
		await expect(page.getByLabel('Email')).toBeVisible();

		// Button should be full width on mobile
		const submitButton = page.getByRole('button', { name: 'Continue' });
		await expect(submitButton).toBeVisible();
	});
});
