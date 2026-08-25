const { test, expect } = require('@playwright/test');

async function openEndgame(page, viewport={width:1920,height:1080}) {
  await page.setViewportSize(viewport);
  await page.goto('http://127.0.0.1:8765/', {waitUntil:'networkidle'});
  await page.waitForFunction(() => window.ISREndgameAdjudicationR1 && window.ISREndgameTopologyR2 && window.ISRAug22Workspaces);
  await page.locator('[data-peer-workspace="ANALYSIS"]').click();
  await page.evaluate(() => window.showAtlasPanel('endgame'));
  await page.waitForSelector('#endgame.eg-r1');
  await page.waitForFunction(() => document.querySelector('#egMermaidHost')?.dataset.graphSource === 'structured-adjudication-topology-r2' && document.querySelector('#egMermaidHost')?.dataset.topologyEngine === 'mermaid-block-grid');
  await page.waitForTimeout(180);
}
async function metrics(page){return page.locator('#egMermaidHost').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight,left:el.scrollLeft,top:el.scrollTop}))}

test('overview is a fixed eight-row evidence matrix', async ({page}) => {
  await openEndgame(page);
  await expect(page.locator('#endgame .eg-r2-map-note')).toContainText('Each row is one original Iranian victory condition');
  await expect(page.locator('#egMermaidHost .eg-r2-canvas svg')).toHaveCount(1);
  await expect(page.locator('#egMermaidHost [data-stage-kind="ORIGINAL_CONDITION"]')).toHaveCount(8);
  await expect(page.locator('#egMermaidHost .eg-r2-node-dim')).toHaveCount(0);
  const text=await page.locator('#egMermaidHost svg').textContent();
  expect(text).toContain('ORIGINAL CONDITION');
  expect(text).toContain('CURRENT DISPOSITION');
  expect(text).toContain('THREE SEPARATE HORMUZ TESTS');
  const m=await metrics(page);
  expect(m.sw).toBeGreaterThan(m.cw*1.5);
  expect(m.sh).toBeGreaterThan(m.ch);
  expect(m.left).toBeLessThan(5);
  await page.locator('#endgame .eg-main').screenshot({path:'qa-artifacts/endgame-topology-r2-overview-1920x1080.png'});
});

test('claim selection highlights one row and moves to current disposition', async ({page}) => {
  await openEndgame(page);
  await page.locator('#endgame .eg-ledger[data-claim-id="sanctions"]').click();
  await expect(page.locator('#egMermaidHost .eg-r2-node-active[data-claim-id="sanctions"]')).toHaveCount(5,{timeout:10000});
  const dimCount=await page.locator('#egMermaidHost .eg-r2-node-dim').count();
  expect(dimCount).toBeGreaterThan(15);
  await expect(page.locator('#egWhyStatus .eg-status')).toContainText('CUT OFF / DENIED');
  await page.waitForTimeout(120);
  const m=await metrics(page);
  expect(m.left).toBeGreaterThan(m.sw-m.cw-30);
  await page.locator('#endgame .eg-main').screenshot({path:'qa-artifacts/endgame-topology-r2-sanctions-focus.png'});
  await page.locator('#endgame .eg-graph-controls button').filter({hasText:'Show all'}).click();
  await expect(page.locator('#egMermaidHost .eg-r2-node-dim')).toHaveCount(0,{timeout:10000});
  await page.waitForTimeout(120);
  expect((await metrics(page)).left).toBeLessThan(5);
});

test('Hormuz exposes legal operational and fee outcomes at the terminal edge', async ({page}) => {
  await openEndgame(page);
  await page.locator('#endgame .eg-ledger[data-claim-id="hormuz"]').click();
  const legal=page.locator('#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="legal"]');
  const operational=page.locator('#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="operational"]');
  const fees=page.locator('#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="fees"]');
  await expect(legal).toHaveCount(1,{timeout:10000});await expect(operational).toHaveCount(1);await expect(fees).toHaveCount(1);
  await expect(legal).toHaveAttribute('aria-label',/LEGAL \/ RECOGNIZED SOVEREIGNTY OR CONTROL/);
  await expect(operational).toHaveAttribute('aria-label',/DE FACTO OPERATIONAL ROUTING \/ GATEKEEPING/);
  await expect(fees).toHaveAttribute('aria-label',/MONETIZABLE FEES \/ ECONOMIC RENT AUTHORITY/);
  await expect(page.locator('#egWhyStatus .eg-dimension')).toHaveCount(3);
  await page.waitForTimeout(120);
  const m=await metrics(page);
  expect(m.left).toBeGreaterThan(m.sw-m.cw-30);
  await page.locator('#endgame .eg-main').screenshot({path:'qa-artifacts/endgame-topology-r2-hormuz-1920x1080.png'});
});

test('mobile preserves a horizontally navigable evidence matrix', async ({page}) => {
  await openEndgame(page,{width:390,height:844});
  const grid=await page.locator('#endgame .eg-main').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(grid.trim().split(/\s+/).length).toBeLessThanOrEqual(1);
  const m=await metrics(page);
  expect(m.sw).toBeGreaterThan(m.cw*2);
  await expect(page.locator('#egMermaidHost [data-stage-kind="ORIGINAL_CONDITION"]')).toHaveCount(8);
  await page.locator('#endgame .eg-graph-panel').screenshot({path:'qa-artifacts/endgame-topology-r2-mobile-390x844.png'});
});
