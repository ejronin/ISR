const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

async function openAtlas(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('http://127.0.0.1:8765/', {waitUntil:'networkidle'});
  await page.waitForSelector('.isr-workspace-nav');
  await page.waitForFunction(() => window.ISREndgameAdjudicationR1 && window.ISRAug22Workspaces);
  await page.waitForTimeout(120);
}

test('desktop shell and timeline visual scales', async ({page}) => {
  await openAtlas(page, {width:1920,height:1080});
  const navButtons = page.locator('.isr-workspace-nav [data-peer-workspace]');
  await expect(navButtons).toHaveCount(5);
  const boxes = [];
  for (let i=0;i<5;i++) boxes.push(await navButtons.nth(i).boundingBox());
  expect(Math.max(...boxes.map(b=>b.y)) - Math.min(...boxes.map(b=>b.y))).toBeLessThan(4);
  expect(Math.max(...boxes.map(b=>b.height))).toBeLessThanOrEqual(34);
  await expect(page.locator('.kpis')).toBeHidden();
  await expect(page.locator('.isr-chronology-context')).toContainText('108 current chronology · 98 locked historical');
  await expect(page.locator('[data-global-evidence-search="true"]:visible')).toHaveCount(1);

  await page.locator('[data-peer-workspace="TIMELINE"]').click();
  await page.waitForSelector('.isr-timeline-map-slot');
  const mapBox = await page.locator('.isr-timeline-map-slot').boundingBox();
  expect(mapBox.height).toBeGreaterThan(500);
  const scaleButtons = page.locator('.isr-visual-zoom [data-visual-zoom]');
  await expect(scaleButtons).toHaveCount(7);
  const widths = {};
  for (const scale of ['FIT','8×','16×','32×']) {
    await page.locator(`.isr-visual-zoom [data-visual-zoom="${scale}"]`).click();
    await page.waitForTimeout(80);
    widths[scale] = await page.locator('.isr-ruler').evaluate(el => el.getBoundingClientRect().width);
  }
  expect(widths['8×']).toBeGreaterThan(widths['FIT'] * 4);
  expect(widths['16×']).toBeGreaterThan(widths['8×']);
  expect(widths['32×']).toBeGreaterThan(widths['16×']);
  await page.locator('.isr-timeline-reset').click();
  await expect(page.locator('.isr-visual-zoom [data-visual-zoom="FIT"]')).toHaveClass(/active/);
  await page.screenshot({path:'qa-artifacts/timeline-1920x1080.png',fullPage:true});
});

test('1366 timeline and 32x remain usable', async ({page}) => {
  await openAtlas(page, {width:1366,height:768});
  await page.locator('[data-peer-workspace="TIMELINE"]').click();
  const boxes = [];
  const navButtons = page.locator('.isr-workspace-nav [data-peer-workspace]');
  for (let i=0;i<5;i++) boxes.push(await navButtons.nth(i).boundingBox());
  expect(Math.max(...boxes.map(b=>b.y)) - Math.min(...boxes.map(b=>b.y))).toBeLessThan(4);
  const mapBox = await page.locator('.isr-timeline-map-slot').boundingBox();
  expect(mapBox.height).toBeGreaterThan(380);
  await page.locator('.isr-visual-zoom [data-visual-zoom="32×"]').click();
  const scroll = await page.locator('.isr-ruler-wrap').evaluate(el => ({sw:el.scrollWidth,cw:el.clientWidth}));
  expect(scroll.sw).toBeGreaterThan(scroll.cw * 10);
  await page.screenshot({path:'qa-artifacts/timeline-1366x768-32x.png',fullPage:true});
});

test('Endgame adjudication, MoU expiry and Hormuz split', async ({page}) => {
  await openAtlas(page, {width:1920,height:1080});
  await page.locator('[data-peer-workspace="ANALYSIS"]').click();
  await page.evaluate(() => window.showAtlasPanel('endgame'));
  await page.waitForSelector('#endgame.eg-r1');
  await expect(page.locator('#endgame .eg-ledger')).toHaveCount(8);
  await page.locator('#endgame .eg-ledger[data-claim-id="sanctions"]').click();
  await expect(page.locator('#egWhyStatus .eg-status')).toContainText('CUT OFF / DENIED');
  await expect(page.locator('#endgame .eg-mou-expired')).toContainText('EXPIRED / NON-CONTROLLING');
  await page.locator('#endgame .eg-ledger[data-claim-id="hormuz"]').click();
  await expect(page.locator('#egWhyStatus .eg-dimension')).toHaveCount(3);
  await expect(page.locator('#egWhyStatus')).toContainText('LEGAL / RECOGNIZED SOVEREIGNTY OR CONTROL');
  await expect(page.locator('#egWhyStatus')).toContainText('DE FACTO OPERATIONAL ROUTING / GATEKEEPING');
  await expect(page.locator('#egWhyStatus')).toContainText('MONETIZABLE FEES / ECONOMIC RENT AUTHORITY');
  await expect(page.locator('#egWhyStatus')).toContainText('PROCEEDS UNDER IRAN DEMAND');
  await page.screenshot({path:'qa-artifacts/endgame-1920x1080.png',fullPage:true});
});

test('source context and mobile stacking', async ({page}) => {
  await openAtlas(page, {width:390,height:844});
  await page.locator('[data-peer-workspace="SOURCES"]').click();
  await page.waitForSelector('.isr-outlet-card');
  const reuters = page.locator('.isr-outlet-card').filter({hasText:'Reuters'}).first();
  await expect(reuters).toContainText('Provenance:');
  await expect(reuters).toContainText('GROUND NEWS · CENTER · VERY HIGH FACTUALITY');
  const unrated = page.locator('.isr-outlet-card').filter({hasText:'Xinhua'}).first();
  if (await unrated.count()) await expect(unrated).toContainText('NO INDEPENDENT POLITICAL-BIAS RATING LOCATED');
  await page.locator('[data-peer-workspace="ANALYSIS"]').click();
  await page.evaluate(() => window.showAtlasPanel('endgame'));
  await page.waitForSelector('#endgame.eg-r1');
  const main = await page.locator('#endgame .eg-main').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(main.trim().split(/\s+/).length).toBeLessThanOrEqual(1);
  await page.screenshot({path:'qa-artifacts/mobile-390x844-endgame.png',fullPage:true});
});
