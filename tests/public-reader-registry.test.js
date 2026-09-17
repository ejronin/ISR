'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const registry = require('../src/public-reader-registry.js');

assert.equal(registry.READER_REGISTRY_VERSION, 'atlas-reader-registry-v1');

class Node {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.parentNode=null;this.textContent='';this.innerText='';this.isConnected=true;this.className='';}
  setAttribute(n,v){this.attributes[n]=String(v);} _setConnected(v){this.isConnected=Boolean(v);this.children.forEach(c=>c._setConnected(this.isConnected));}
  append(...nodes){nodes.forEach(n=>{if(n.parentNode)n.parentNode.children=n.parentNode.children.filter(c=>c!==n);n.parentNode=this;this.children.push(n);n._setConnected(this.isConnected);});}
  prepend(...nodes){nodes.reverse().forEach(n=>{if(n.parentNode)n.parentNode.children=n.parentNode.children.filter(c=>c!==n);n.parentNode=this;this.children.unshift(n);n._setConnected(this.isConnected);});}
  after(node){if(!this.parentNode)return;const i=this.parentNode.children.indexOf(this);if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(c=>c!==node);node.parentNode=this.parentNode;this.parentNode.children.splice(i+1,0,node);node._setConnected(this.parentNode.isConnected);}
  replaceChildren(...nodes){this.children.forEach(n=>{n.parentNode=null;n._setConnected(false);});this.children=[];this.append(...nodes);}
  replaceWith(node){if(!this.parentNode)return;const p=this.parentNode,i=p.children.indexOf(this);p.children[i]=node;node.parentNode=p;node._setConnected(p.isConnected);this.parentNode=null;this._setConnected(false);}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;this._setConnected(false);}
  querySelector(selector){const pred=selector==='.atlas-app'?n=>n.dataset.kind==='app':selector==='.public-page'?n=>n.dataset.kind==='page':selector==='h1'?n=>n.tagName==='H1':selector==='.page-intro'?n=>n.dataset.kind==='intro':()=>false;const stack=[...this.children];while(stack.length){const n=stack.shift();if(pred(n))return n;stack.push(...n.children);}return null;}
  querySelectorAll(){const out=[],stack=[...this.children];while(stack.length){const n=stack.shift();out.push(n);stack.push(...n.children);}return out;}
  focus(){}
}

function environment(title='Qualified'){const listeners=new Map(),body=new Node('body');const documentObject={title,body,documentElement:body};documentObject.createElement=t=>{const n=new Node(t);n.ownerDocument=documentObject;return n;};body.ownerDocument=documentObject;return{documentObject,windowObject:{innerWidth:1440,location:{hash:'#/test'},history:{replaceState(){}},addEventListener(t,f){listeners.set(t,f);},removeEventListener(t,f){if(listeners.get(t)===f)listeners.delete(t);}}};}
function baseRuntime({includeHeading=true}={}){const nav=doc=>doc.createElement('nav');return{parseRoute(){return{key:'test.route',owner:'TestPage',canonical:true,primaryLabel:'Test',label:'Test',title:'Test'};},routeHref(){return '#/test';},AppShell:{create(doc){const app=doc.createElement('div');app.dataset.kind='app';const primaryHost=doc.createElement('div'),mobileHost=doc.createElement('div'),aside=doc.createElement('aside'),main=doc.createElement('main'),footer=doc.createElement('footer');app.append(primaryHost,mobileHost,aside,main,footer);return{app,primaryHost,mobileHost,aside,main,footer};}},PublicNavigation:{renderPrimary:nav,renderMobile:nav,renderSecondary:nav},PAGE_OWNERS:{TestPage(context){const article=context.documentObject.createElement('article');article.dataset.kind='page';const intro=context.documentObject.createElement('div');intro.dataset.kind='intro';article.append(intro);if(includeHeading)article.append(context.documentObject.createElement('h1'));return article;}},modelData(){return null;},recordArray(){return[];},EvidenceDrawer:{create(){return new Node('details');}}};}
function support({fail=false,onProject}={}){return{READER_SUPPORT_VERSION:'atlas-reader-support-test-v1',projectShell(app){if(onProject)onProject(app);const article=app.querySelector('.public-page');if(article)article.dataset.readerLayer=this.READER_SUPPORT_VERSION;if(fail)throw new Error('support failed');}};}
const routeRuntime={forRoute(){return{model:{release:{current_osint_cutoff:'2026-09-14T12:01:03-04:00'}},services:{}};}};
function qualifiedStage(text,supportVersion='atlas-reader-support-test-v1'){const stage=new Node();stage.innerText=text;stage.textContent=text;const app=new Node();app.dataset.kind='app';const article=new Node('article');article.dataset.kind='page';article.dataset.readerLayer=supportVersion;article.append(new Node('h1'));app.append(article);stage.append(app);return stage;}

{const s=support();assert.doesNotThrow(()=>registry.validateFinalizedStage(qualifiedStage('Source: data/canonical-updates/UPD-20260913-ROOK-LOCKER.json'),s));assert.throws(()=>registry.validateFinalizedStage(qualifiedStage('ROOK internal review note'),s),e=>e&&e.code==='READER_INTERNAL_LEAK');}

// Initial failure must leave the neutral shell; there is no alternate base mount to expose.
{const{documentObject,windowObject}=environment('Loading'),root=new Node('main');documentObject.body.append(root);root.dataset.status='loading';const loading=new Node('section');root.append(loading);assert.throws(()=>registry.mount({rootElement:root,documentObject,windowObject,routeRuntime,state:{},baseRuntime:baseRuntime(),readerSupportRuntime:support({fail:true})}),e=>e&&e.code==='READER_FINALIZATION_FAILED');assert.equal(root.children.length,1);assert.equal(root.children[0],loading);assert.equal(documentObject.title,'Loading');assert.equal(root.dataset.status,'loading');}

// Later failure retains the last qualified page.
{const{documentObject,windowObject}=environment(),root=new Node('main');documentObject.body.append(root);root.dataset.status='ready';const qualified=new Node('section');qualified.dataset.readerAuthority=registry.READER_REGISTRY_VERSION;root.append(qualified);const controller=registry.mount({rootElement:root,documentObject,windowObject,routeRuntime,state:{routeKey:'test.route'},baseRuntime:baseRuntime(),readerSupportRuntime:support({fail:true})});assert(controller);assert.equal(root.children.length,1);assert.equal(root.children[0],qualified);assert.equal(root.dataset.status,'ready');}

// Staging is connected/hidden and validation precedes promotion.
{const{documentObject,windowObject}=environment(),root=new Node('main');documentObject.body.append(root);root.dataset.status='ready';const qualified=new Node('section');root.append(qualified);let staged=null;const s=support({onProject(app){staged=app.parentNode;assert.equal(staged.isConnected,true);assert.equal(staged.attributes['aria-hidden'],'true');assert.equal(staged.style.visibility,'hidden');}});registry.mount({rootElement:root,documentObject,windowObject,routeRuntime,state:{},baseRuntime:baseRuntime({includeHeading:false}),readerSupportRuntime:s});assert.equal(root.children[0],qualified);assert(staged);assert.equal(staged.isConnected,false);}

// Old maps quiesce before replacement and remove only through a connected retirement host.
{const{documentObject,windowObject}=environment(),root=new Node('main');documentObject.body.append(root);root.dataset.status='ready';const qualified=new Node('section'),mapNode=new Node('div');qualified.append(mapNode);root.append(qualified);let stopped=false,removed=false;mapNode._atlasMap={stop(){assert.equal(root.children[0],qualified);assert.equal(qualified.isConnected,true);stopped=true;},remove(){assert(stopped);assert.notEqual(root.children[0],qualified);assert.equal(qualified.parentNode.isConnected,true);removed=true;}};const controller=registry.mount({rootElement:root,documentObject,windowObject,routeRuntime,state:{},baseRuntime:baseRuntime(),readerSupportRuntime:support()});assert(controller);assert(stopped);assert(removed);assert.equal(root.children.length,1);assert.equal(root.children[0].dataset.readerAuthority,registry.READER_REGISTRY_VERSION);assert.equal(qualified.isConnected,false);}

const registrySource=fs.readFileSync(path.join(__dirname,'..','src/public-reader-registry.js'),'utf8');const supportSource=fs.readFileSync(path.join(__dirname,'..','src/public-reader-layer.js'),'utf8');
assert.doesNotMatch(registrySource,/projectionRuntime\.mount|readerSupportRuntime\.mount|baseRuntime\.mount/,'registry must not delegate mount authority');
assert.match(registrySource,/baseRuntime\.PAGE_OWNERS\[route\.owner\]/,'registry must directly invoke route render primitives');
assert.match(registrySource,/readerSupportRuntime\.projectShell/,'reader support must execute before validation/promotion');
assert.doesNotMatch(supportSource,/function\s+mount\s*\(|base\.mount\s*\(/,'reader support must have no mount authority');
for(const file of ['scripts/build_public_release_core.py','js/public-bootstrap.js','js/public-app.js','scripts/validate_public_deployment.py','config/public-runtime-inventory.json']){const body=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert(!body.includes('reader_runtime'));assert(!body.includes('reader_projection'),`${file} still publishes reader_projection as a corrective role`);}
console.log('authoritative reader registry: PASS - direct route authority, support-only projection, fail-closed staging, validation-before-promotion, and connected map retirement verified');
