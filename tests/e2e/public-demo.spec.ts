import { expect, test } from '@playwright/test';

const creative = '废土小镇里，一个旧清洁机器人守护红裙人偶';

test('public judge demo completes without external API or cloud writes', async ({ page }, testInfo) => {
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && !local) {
      forbiddenRequests.push(request.url());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Public judge demo' })).toBeVisible();
  await page.getByPlaceholder('例如：雨夜街头，一个女孩回头...').fill(creative);
  await page.getByRole('button', { name: /先做创意体检/ }).click();
  await expect(page.getByRole('heading', { name: /创意体检报告/ })).toBeVisible();
  await page.getByRole('button', { name: /查看重构版本/ }).click();
  await page.getByRole('radio').nth(2).click();
  await page.getByRole('button', { name: /用此版本生成执行包/ }).click();
  await expect(page.getByRole('heading', { name: /导演执行包/ })).toBeVisible();

  if (testInfo.project.name === 'mobile-chrome') {
    await page.getByRole('button', { name: /Execute/ }).click();
  }
  const provenance = page.getByRole('region', { name: '镜头 1 生成存证' });
  await expect(provenance.getByText('Fixture', { exact: true }).first()).toBeVisible();
  await provenance.getByRole('button', { name: '运行离线契约演示' }).click();
  await expect(provenance.getByText('Fixture contract verified')).toBeVisible();
  expect(forbiddenRequests).toEqual([]);
});
