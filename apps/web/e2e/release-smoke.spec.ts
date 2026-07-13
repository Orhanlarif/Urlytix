import { expect, test } from '@playwright/test';

const labels = {
  name: /Name|İsim/,
  email: /Email/,
  password: /Password|Şifre/,
  signUp: /Sign Up|Kayıt Ol/,
  logIn: /Log In|Giriş [Yy]ap/i,
  workspace: /Select workspace|Workspace seç/,
  targetUrl: /Target URL|Hedef URL/,
  title: /Title|Başlık/,
  createLink: /Create Short Link|Kısa [Ll]ink [Oo]luştur/i,
  testLink: /Test Link|Test Et|Linki test et/i,
  analytics: /Analytics|Analitik/,
  recentClicks: /Recent clicks|Son tıklamalar/i,
};

test('register, login, default workspace, link redirect, and analytics smoke', async ({
  context,
  page,
}) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `playwright-${unique}@urlytix.test`;
  const password = 'ReleaseGate123!';
  const linkTitle = `Release smoke ${unique}`;
  const destination = 'https://example.com/urlytix-release-smoke';

  await page.goto('/analytics');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fanalytics$/);

  await page.goto('/register');
  await expect(
    page.getByRole('heading', { name: /Create account|Hesap oluştur/i }),
  ).toBeVisible();
  await page.getByLabel(labels.name).fill('Release Gate');
  await page.getByLabel(labels.email).fill(email);
  await page.getByLabel(labels.password).fill(password);
  await Promise.all([
    page.waitForURL(/\/dashboard$/),
    page.getByRole('button', { name: labels.signUp }).click(),
  ]);
  await expect(page.getByRole('button', { name: labels.workspace })).toContainText(
    /Workspace|workspace/i,
  );

  await context.clearCookies();
  await page.goto('/login');
  await page.getByLabel(labels.email).fill(email);
  await page.getByLabel(labels.password).fill(password);
  await page.getByRole('button', { name: labels.logIn }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/links');
  await page.getByLabel(labels.targetUrl).fill(destination);
  await page.getByLabel(labels.title).fill(linkTitle);
  await page
    .getByPlaceholder(/my-portfolio|arif-portfolio/i)
    .fill(`release-${unique}`.slice(0, 32));
  await page.getByRole('button', { name: labels.createLink }).click();

  const testLink = page.getByRole('link', { name: labels.testLink });
  await expect(testLink).toBeVisible();
  const shortUrl = await testLink.getAttribute('href');
  expect(shortUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/[A-Za-z0-9_-]+$/);
  expect(shortUrl).not.toContain('/api/r/');

  const redirect = await page.request.get(shortUrl!, { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers().location).toBe(destination);

  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: labels.analytics })).toBeVisible();
  await expect(page.getByText(linkTitle).first()).toBeVisible();
  await expect(page.getByText(labels.recentClicks)).toBeVisible();
});
