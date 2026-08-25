const { test, expect } = require('@playwright/test');

async function openEndgame(page, viewport={width:1920,height:1080}) {
  await page.setViewportSize(viewport);
  await page.goto('http://127.0.0.1:8765/', {waitUntil:'networkidle'});
  await page.waitForFunction(() => window.ISREndgameAdjudicationR1 && window.ISREndgameTopologyR2 && window.ISRAug22Workspaces);
  await page.locator('[data-peer-workspace="ANALYSIS"]').click();
  await page.evaluate(() => window.showAtlasPanel('endgame'));
  await page.waitForSelector('#endgame.eg-r1');
  await page.waitForFunction(() => document.querySelector('#egMermaidHost')?.dataset.graphSource === 'structured-adjudication-topology-r2' && document.querySelector('#egMermaidHost')?.dataset.topologyEngine === 'mermaid-block-grid');
  await page.waitForTimeout(150);
}

test('overview is a fixed eight-row evidence matrix', async ({page}) => {
  await openEndgame(page);
  await expect(page.locator('#endgame .eg-r2-map-note')).toContainText('Each row is one original Iranian victory condition');
  await expect(page.locator('#egMermaidHost .eg-r2-canvas svg')).toHaveCount(1);
  const originals=page.locator('#egMermaidHost [data-stage-kind="ORIGINAL_CONDITION"]');
  await expect(originals).toHaveCount(8);
  await expect(page.locator('#egMermaidHost .eg-r2-node-dim')).toHaveCount(0);
  const origGeometry=await originals.evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,w:b.width,h:b.height}}));
  const xs=origGeometry.map(g=>g.x),ys=origGeometry.map(g=>Math.round(g.y)).sort((a,b)=>a-b);
  expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(80);
  expect(new Set(ys).size).toBe(8);
  for(let i=1;i<ys.length;i++)expect(ys[i]-ys[i-1]).toBeGreaterThan(18);
  const sanctions=await page.locator('#egMermaidHost [data-claim-id="sanctions"]').evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return b.x+b.width/2}));
  expect(Math.max(...sanctions)-Math.min(...sanctions)).toBeGreaterThan(700);
  const host=await page.locator('#egMermaidHost').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));
  expect(host.sw).toBeGreaterThan(host.cw*1.5);
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-overview-1920x1080.png',fullPage:true});
});

test('claim selection highlights one row while retaining context', async ({page}) => {
  await openEndgame(page);
  await page.locator('#endgame .eg-ledger[data-claim-id="sanctions"]').click();
  await expect(page.locator('#egMermaidHost .eg-r2-node-active[data-claim-id="sanctions"]')).toHaveCount(5,{timeout:10000});
  const dimCount=await page.locator('#egMermaidHost .eg-r2-node-dim').count();
  expect(dimCount).toBeGreaterThan(15);
  await expect(page.locator('#egWhyStatus .eg-status')).toContainText('CUT OFF / DENIED');
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-sanctions-focus.png',fullPage:true});
  await page.locator('#endgame .eg-graph-controls button').filter({hasText:'Show all'}).click();
  await expect(page.locator('#egMermaidHost .eg-r2-node-dim')).toHaveCount(0,{timeout:10000});
});

test('Hormuz terminates in a true three-way composite fork', async ({page}) => {
  await openEndgame(page);
  await page.locator('#endgame .eg-ledger[data-claim-id="hormuz"]').click();
  const legal=page.locator('#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="legal"]');
  const operational=page.locator('#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="operational"]');
  const fees=page.locator('#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="fees"]');
  await expect(legal).toHaveCount(1,{timeout:10000});await expect(operational).toHaveCount(1);await expect(fees).toHaveCount(1);
  await expect(legal).toHaveAttribute('aria-label',/LEGAL \/ RECOGNIZED SOVEREIGNTY OR CONTROL/);
  await expect(operational).toHaveAttribute('aria-label',/DE FACTO OPERATIONAL ROUTING \/ GATEKEEPING/);
  await expect(fees).toHaveAttribute('aria-label',/MONETIZABLE FEES \/ ECONOMIC RENT AUTHORITY/);
  const dims=await page.locator('#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="legal"],#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="operational"],#egMermaidHost [data-claim-id="hormuz"][data-stage-kind="fees"]').evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}}));
  expect(Math.max(...dims.map(d=>d.x))-Math.min(...dims.map(d=>d.x))).toBeLessThan(80);
  expect(new Set(dims.map(d=>Math.round(d.y))).size).toBe(3);
  await expect(page.locator('#egWhyStatus .eg-dimension')).toHaveCount(3);
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-hormuz-1920x1080.png',fullPage:true});
});

test('mobile preserves a horizontally navigable evidence matrix', async ({page}) => {
  await openEndgame(page,{width:390,height:844});
  const grid=await page.locator('#endgame .eg-main').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(grid.trim().split(/\s+/).length).toBeLessThanOrEqual(1);
  const host=await page.locator('#egMermaidHost').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));
  expect(host.sw).toBeGreaterThan(host.cw*2);
  await expect(page.locator('#egMermaidHost [data-stage-kind="ORIGINAL_CONDITION"]')).toHaveCount(8);
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-mobile-390x844.png',fullPage:true});
});
