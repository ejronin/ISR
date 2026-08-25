const { test, expect } = require('@playwright/test');

async function openEndgame(page, viewport={width:1920,height:1080}) {
  await page.setViewportSize(viewport);
  await page.goto('http://127.0.0.1:8765/', {waitUntil:'networkidle'});
  await page.waitForFunction(() => window.ISREndgameAdjudicationR1 && window.ISREndgameTopologyR2 && window.ISRAug22Workspaces);
  await page.locator('[data-peer-workspace="ANALYSIS"]').click();
  await page.evaluate(() => window.showAtlasPanel('endgame'));
  await page.waitForSelector('#endgame.eg-r1');
  await page.waitForFunction(() => document.querySelector('#egMermaidHost')?.dataset.graphSource === 'structured-adjudication-topology-r2');
  await page.waitForTimeout(120);
}
async function waitR2(page){
  await page.waitForFunction(() => document.querySelector('#egMermaidHost')?.dataset.graphSource === 'structured-adjudication-topology-r2' && document.querySelector('#egMermaidHost .eg-r2-canvas svg'));
  await page.waitForTimeout(80);
}

test('overview is eight readable horizontal swimlanes', async ({page}) => {
  await openEndgame(page);
  await expect(page.locator('#endgame .eg-r2-map-note')).toContainText('Each swimlane is one original Iranian victory condition');
  await expect(page.locator('#egMermaidHost .eg-r2-canvas svg')).toHaveCount(1);
  const clusters=page.locator('#egMermaidHost g.cluster[data-claim-id]');
  await expect(clusters).toHaveCount(8);
  await expect(page.locator('#egMermaidHost .eg-r2-cluster-dim')).toHaveCount(0);
  const geometry=await clusters.evaluateAll(gs=>gs.map(g=>{const b=g.getBoundingClientRect();return {id:g.dataset.claimId,x:b.x,y:b.y,w:b.width,h:b.height}}));
  expect(geometry.filter(g=>g.w>g.h*2).length).toBeGreaterThanOrEqual(7);
  const ys=geometry.map(g=>Math.round(g.y)).sort((a,b)=>a-b);
  expect(new Set(ys).size).toBe(8);
  for(let i=1;i<ys.length;i++)expect(ys[i]-ys[i-1]).toBeGreaterThan(20);
  const nodeSpread=await page.locator('#egMermaidHost g.node[data-claim-id="sanctions"]').evaluateAll(ns=>{const xs=ns.map(n=>{const b=n.getBoundingClientRect();return b.x+b.width/2});return Math.max(...xs)-Math.min(...xs)});
  expect(nodeSpread).toBeGreaterThan(500);
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-overview-1920x1080.png',fullPage:true});
});

test('claim selection focuses a lane without destroying the full topology', async ({page}) => {
  await openEndgame(page);
  await page.locator('#endgame .eg-ledger[data-claim-id="sanctions"]').click();
  await waitR2(page);
  await expect(page.locator('#egMermaidHost g.cluster.eg-r2-cluster-active[data-claim-id="sanctions"]')).toHaveCount(1);
  await expect(page.locator('#egMermaidHost g.cluster.eg-r2-cluster-dim')).toHaveCount(7);
  await expect(page.locator('#egWhyStatus .eg-status')).toContainText('CUT OFF / DENIED');
  const host=await page.locator('#egMermaidHost').evaluate(el=>({top:el.scrollTop,height:el.clientHeight,scrollHeight:el.scrollHeight}));
  expect(host.scrollHeight).toBeGreaterThan(host.height);
  expect(host.top).toBeGreaterThanOrEqual(0);
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-sanctions-focus.png',fullPage:true});
  await page.locator('#endgame .eg-graph-controls button').filter({hasText:'Show all'}).click();
  await waitR2(page);
  await expect(page.locator('#egMermaidHost .eg-r2-cluster-dim')).toHaveCount(0);
});

test('Hormuz visibly forks into legal operational and fee outcomes', async ({page}) => {
  await openEndgame(page);
  await page.locator('#endgame .eg-ledger[data-claim-id="hormuz"]').click();
  await waitR2(page);
  await expect(page.locator('#egMermaidHost g.node[data-claim-id="hormuz"][data-stage-kind="legal"]')).toHaveCount(1);
  await expect(page.locator('#egMermaidHost g.node[data-claim-id="hormuz"][data-stage-kind="operational"]')).toHaveCount(1);
  await expect(page.locator('#egMermaidHost g.node[data-claim-id="hormuz"][data-stage-kind="fees"]')).toHaveCount(1);
  const texts=await page.locator('#egMermaidHost g.node[data-claim-id="hormuz"]').allTextContents();
  expect(texts.join(' ')).toContain('LEGAL / RECOGNIZED SOVEREIGNTY OR CONTROL');
  expect(texts.join(' ')).toContain('DE FACTO OPERATIONAL ROUTING / GATEKEEPING');
  expect(texts.join(' ')).toContain('MONETIZABLE FEES / ECONOMIC RENT AUTHORITY');
  expect(texts.join(' ')).toContain('PROCEEDS UNDER IRAN DEMAND');
  const dims=await page.locator('#egMermaidHost g.node[data-claim-id="hormuz"][data-stage-kind="legal"],#egMermaidHost g.node[data-claim-id="hormuz"][data-stage-kind="operational"],#egMermaidHost g.node[data-claim-id="hormuz"][data-stage-kind="fees"]').evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y}}));
  expect(new Set(dims.map(d=>Math.round(d.y))).size).toBe(3);
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-hormuz-1920x1080.png',fullPage:true});
});

test('mobile keeps the map scrollable and the ledger stacked', async ({page}) => {
  await openEndgame(page,{width:390,height:844});
  const grid=await page.locator('#endgame .eg-main').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(grid.trim().split(/\s+/).length).toBeLessThanOrEqual(1);
  const host=await page.locator('#egMermaidHost').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}));
  expect(host.sw).toBeGreaterThan(host.cw*2);
  expect(host.sh).toBeGreaterThan(host.ch);
  await page.screenshot({path:'qa-artifacts/endgame-topology-r2-mobile-390x844.png',fullPage:true});
});
