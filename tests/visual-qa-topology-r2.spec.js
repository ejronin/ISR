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
async function data(page){return page.evaluate(async()=>fetch('./data/endgame-adjudication-v1.json?v=qa-r2',{cache:'no-store'}).then(r=>r.json()))}
async function labelBoxes(page,labels){
  return page.locator('#egMermaidHost svg').evaluate((svg,labels)=>{
    const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toUpperCase();
    const all=[...svg.querySelectorAll('foreignObject,text')];
    return labels.map(label=>{
      const want=norm(label).slice(0,52);
      const hits=all.filter(el=>norm(el.textContent).includes(want));
      const ranked=hits.map(el=>{const b=el.getBoundingClientRect();return {el,b,area:b.width*b.height}}).filter(x=>x.b.width&&x.b.height).sort((a,b)=>a.area-b.area);
      if(!ranked.length)return {label,missing:true};
      const b=ranked[0].b;return {label,x:b.x+b.width/2,y:b.y+b.height/2,w:b.width,h:b.height};
    });
  },labels);
}

test('overview is a fixed eight-row evidence matrix', async ({page}) => {
  await openEndgame(page);
  await expect(page.locator('#endgame .eg-r2-map-note')).toContainText('Each row is one original Iranian victory condition');
  await expect(page.locator('#egMermaidHost .eg-r2-canvas svg')).toHaveCount(1);
  const originals=page.locator('#egMermaidHost [data-stage-kind="ORIGINAL_CONDITION"]');
  await expect(originals).toHaveCount(8);
  await expect(page.locator('#egMermaidHost .eg-r2-node-dim')).toHaveCount(0);
  await page.locator('#endgame .eg-main').screenshot({path:'qa-artifacts/endgame-topology-r2-overview-1920x1080.png'});
  const m=await data(page), origGeometry=await labelBoxes(page,m.claims.map(c=>c.short_label));
  expect(origGeometry.some(g=>g.missing)).toBeFalsy();
  const xs=origGeometry.map(g=>g.x),ys=origGeometry.map(g=>Math.round(g.y)).sort((a,b)=>a-b);
  expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(100);
  expect(new Set(ys).size).toBe(8);
  for(let i=1;i<ys.length;i++)expect(ys[i]-ys[i-1]).toBeGreaterThan(18);
  const sanctions=m.claims.find(c=>c.id==='sanctions');
  const terminal=m.terminal_state_labels[sanctions.current_disposition.state];
  const sanctionsLabels=[sanctions.short_label,...sanctions.path.slice(1).map(s=>s.label.replace(/^June MoU\s*/i,'').replace(/^Later Iranian evidence:\s*/i,'')),terminal];
  const sanGeometry=await labelBoxes(page,sanctionsLabels);
  expect(sanGeometry.some(g=>g.missing)).toBeFalsy();
  expect(Math.max(...sanGeometry.map(g=>g.x))-Math.min(...sanGeometry.map(g=>g.x))).toBeGreaterThan(700);
  const host=await page.locator('#egMermaidHost').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));
  expect(host.sw).toBeGreaterThan(host.cw*1.5);
});

test('claim selection highlights one row while retaining context', async ({page}) => {
  await openEndgame(page);
  await page.locator('#endgame .eg-ledger[data-claim-id="sanctions"]').click();
  await expect(page.locator('#egMermaidHost .eg-r2-node-active[data-claim-id="sanctions"]')).toHaveCount(5,{timeout:10000});
  const dimCount=await page.locator('#egMermaidHost .eg-r2-node-dim').count();
  expect(dimCount).toBeGreaterThan(15);
  await expect(page.locator('#egWhyStatus .eg-status')).toContainText('CUT OFF / DENIED');
  await page.locator('#endgame .eg-main').screenshot({path:'qa-artifacts/endgame-topology-r2-sanctions-focus.png'});
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
  await page.locator('#endgame .eg-main').screenshot({path:'qa-artifacts/endgame-topology-r2-hormuz-1920x1080.png'});
  const m=await data(page),h=m.claims.find(c=>c.id==='hormuz'),dims=await labelBoxes(page,h.dimensions.map(d=>d.label));
  expect(dims.some(g=>g.missing)).toBeFalsy();
  expect(Math.max(...dims.map(d=>d.x))-Math.min(...dims.map(d=>d.x))).toBeLessThan(110);
  expect(new Set(dims.map(d=>Math.round(d.y))).size).toBe(3);
  await expect(page.locator('#egWhyStatus .eg-dimension')).toHaveCount(3);
});

test('mobile preserves a horizontally navigable evidence matrix', async ({page}) => {
  await openEndgame(page,{width:390,height:844});
  const grid=await page.locator('#endgame .eg-main').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(grid.trim().split(/\s+/).length).toBeLessThanOrEqual(1);
  const host=await page.locator('#egMermaidHost').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));
  expect(host.sw).toBeGreaterThan(host.cw*2);
  await expect(page.locator('#egMermaidHost [data-stage-kind="ORIGINAL_CONDITION"]')).toHaveCount(8);
  await page.locator('#endgame .eg-graph-panel').screenshot({path:'qa-artifacts/endgame-topology-r2-mobile-390x844.png'});
});
