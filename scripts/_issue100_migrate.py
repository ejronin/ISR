#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_required(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing expected text for {label}')
    return text.replace(old, new)


def grep_files(token):
    result = subprocess.run(['git', 'grep', '-Il', token], cwd=ROOT, text=True, capture_output=True)
    if result.returncode not in (0, 1):
        raise SystemExit(result.stderr)
    return [line for line in result.stdout.splitlines() if line]


# Release vocabulary: one page-registry authority plus signed reader support.
for token, replacement in [
    ('reader_projection', 'reader_support'),
    ('readerProjection', 'readerSupport'),
    ('READER_LAYER_VERSION', 'READER_SUPPORT_VERSION'),
    ('2.4-authoritative-reader-registry', '2.5-authoritative-reader-direct'),
]:
    for path in grep_files(token):
        text = read(path)
        text = text.replace(token, replacement)
        write(path, text)

for path in ['config/public-runtime-inventory.json', 'scripts/validate_public_runtime_inventory.py']:
    text = read(path)
    text = text.replace('reader projection support', 'reader projection support module')
    text = text.replace('non-authoritative reader projection support', 'non-authoritative reader support module')
    write(path, text)

# Convert the reader layer from a mount/wrapper authority into a pure support module.
path = 'src/public-reader-layer.js'
layer = read(path)
layer = layer.replace('/* ATLAS PUBLIC READER LAYER', '/* ATLAS PUBLIC READER SUPPORT')
layer = layer.replace(' * Reader-first projection and presentation behavior for the public Atlas.\n * This layer deliberately operates downstream of the evidence/canonical model.\n * It may simplify or reorganize presentation, but it must not manufacture facts.\n',
''' * Reader-first projection helpers for the authoritative public page registry.\n * This module has no route lifecycle or mount authority. It receives a staged\n * route owned by the registry and projects reader-safe semantics before the\n * route can be promoted. It may not manufacture facts.\n''')
layer = layer.replace('function installAtlasPublicReaderLayer(root)', 'function installAtlasPublicReaderSupport(root)')
layer = layer.replace("  if (base.READER_SUPPORT_VERSION) return;\n", '')
layer = replace_required(layer, "  const VERSION = 'atlas-reader-v1.1';", "  const VERSION = 'atlas-reader-support-v1.2';", 'reader support version')
layer = layer.replace('removeInternalChrome', 'enforcePublicBoundary')
# Footer is now emitted reader-safe by the sole registry authority, not repaired here.
layer = re.sub(r"\n  function simplifyFooter\(rootElement, model, routeKey\) \{.*?\n  \}\n", '\n', layer, count=1, flags=re.S)
layer = layer.replace('    simplifyFooter(rootElement, context.model, routeKey);\n', '')
# Remove the old base.mount wrapper and export only support functions.
pattern = re.compile(r"\n  function makeContext\(options\) \{.*?\n\}\(typeof globalThis !== 'undefined' \? globalThis : this\)\);\s*$", re.S)
replacement = r'''
  function projectShell(rootElement, context) {
    if (!rootElement || !context || !context.route) throw new Error('Reader support requires a staged shell and route context.');
    applyReaderLayer(rootElement, {}, context);
    return rootElement;
  }

  const api = Object.freeze({
    READER_SUPPORT_VERSION: VERSION,
    projectShell,
    readerFacilityStatus: facilityStatus,
    readerPublicAdjudication: publicAdjudication,
    readerIntentReviewNote: intentReviewNote
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtlasPublicReaderSupport = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
'''
layer, count = pattern.subn(replacement, layer, count=1)
if count != 1:
    raise SystemExit('failed to retire reader-layer mount wrapper')
write(path, layer)

# Make the registry itself own shell construction, route rendering, projection,
# validation, promotion and fail-closed lifecycle. Base PAGE_OWNERS are render
# primitives only and can never become the visible fallback.
path = 'src/public-reader-registry.js'
registry = read(path)
registry = registry.replace(
''' * Sole visible page authority. Base rendering and reader projection run inside
 * a connected off-screen staging host. Public Product finalization runs on that
 * staged reader output before it is validated and promoted.
''',
''' * Sole visible page and route authority. The registry directly constructs the
 * public shell, invokes base page builders as non-authoritative render primitives,
 * applies reader support while the route is still staged, finalizes Public Product
 * semantics, validates the result, and only then promotes it. No alternate base
 * application is ever mounted underneath the reader.
''')
registry = replace_required(registry,
"  const projection = root.AtlasPublicIA || (typeof require === 'function' ? require('./public-reader-layer.js') : null);\n  if (!projection || typeof projection.mount !== 'function') return null;",
"  const base = root.AtlasPublicIA || (typeof require === 'function' ? require('./public-ia.js') : null);\n  const readerSupport = root.AtlasPublicReaderSupport || (typeof require === 'function' ? require('./public-reader-layer.js') : null);\n  if (!base || typeof base.parseRoute !== 'function' || !readerSupport || typeof readerSupport.projectShell !== 'function') return null;",
'registry dependencies')
registry = registry.replace('projection.routeHref', 'base.routeHref')
registry = registry.replace('projection.modelData', 'base.modelData')
registry = registry.replace('projection.recordArray', 'base.recordArray')
registry = registry.replace('projection.EvidenceDrawer', 'base.EvidenceDrawer')
registry = registry.replace('function validateFinalizedStage(stage, projectionRuntime)', 'function validateFinalizedStage(stage, readerSupportRuntime)')
registry = registry.replace('projectionRuntime.READER_SUPPORT_VERSION', 'readerSupportRuntime.READER_SUPPORT_VERSION')

mount_pattern = re.compile(r"  function mount\(options\) \{.*?\n  \}\n\n  return Object\.freeze", re.S)
new_mount = r'''  function mount(options) {
    const settings=options||{},doc=settings.documentObject||root.document,win=settings.windowObject||root,rootElement=settings.rootElement,routeRuntime=settings.routeRuntime,state=settings.state||{};
    const baseRuntime=settings.baseRuntime||base,readerSupportRuntime=settings.readerSupportRuntime||readerSupport;
    invariant(doc&&rootElement&&routeRuntime&&typeof routeRuntime.forRoute==='function','READER_REGISTRY_INVALID','Reader registry requires a document, root element, and guarded route runtime.');
    invariant(baseRuntime&&typeof baseRuntime.parseRoute==='function'&&baseRuntime.AppShell&&baseRuntime.PublicNavigation&&baseRuntime.PAGE_OWNERS,'READER_BASE_SUPPORT_UNAVAILABLE','Reader render primitives are unavailable.');
    invariant(readerSupportRuntime&&typeof readerSupportRuntime.projectShell==='function'&&readerSupportRuntime.READER_SUPPORT_VERSION,'READER_SUPPORT_UNAVAILABLE','Reader projection support is unavailable.');
    rootElement.__atlasRouteController?.destroy?.();
    let destroyed=false,previousRouteKey=null,currentServices=null;
    const stageRoute=(focusHeading,propagateFailure=false)=>{
      invariant(!destroyed,'READER_REGISTRY_DESTROYED','Reader registry is no longer active.');
      const previousTitle=doc.title,previousVisible=Array.from(rootElement.children||[]).filter(n=>!n.dataset?.atlasReaderStaging),hasQualified=rootElement.dataset?.status==='ready'&&previousVisible.length>0,stagedState={...state},stage=createStagingHost(doc,rootElement,win);
      try {
        const route=baseRuntime.parseRoute(win.location&&win.location.hash),access=routeRuntime.forRoute(route),context={documentObject:doc,windowObject:win,model:access.model,services:access.services,state:stagedState,route};
        currentServices=access.services;
        if(!route.canonical&&win.history&&win.location)win.history.replaceState(null,'',baseRuntime.routeHref(route.key,route.params));
        const shell=baseRuntime.AppShell.create(doc);stage.replaceChildren(shell.app);
        shell.primaryHost.replaceChildren(baseRuntime.PublicNavigation.renderPrimary(doc,route));
        shell.mobileHost.replaceChildren(baseRuntime.PublicNavigation.renderMobile(doc,route));
        shell.aside.replaceChildren(baseRuntime.PublicNavigation.renderSecondary(doc,route));
        const owner=baseRuntime.PAGE_OWNERS[route.owner];invariant(typeof owner==='function','READER_PAGE_OWNER_MISSING',`Reader page owner is unavailable: ${route.owner}`);
        const page=owner(context);shell.main.replaceChildren(page);
        shell.footer.replaceChildren();add(shell.footer,'span','',`Evidence current through ${access.model?.release?.current_osint_cutoff_display||access.model?.release?.current_osint_cutoff||'the current review cutoff'}. `);
        const archive=add(shell.footer,'a','','Archive');archive.href=baseRuntime.routeHref('evidence.archive');
        stagedState.routeKey=route.key;stagedState.pageOwner=route.owner;stagedState.primarySection=route.primaryLabel;stagedState.secondaryPage=route.label;doc.title=`${route.title} · Iran War Evidence Atlas`;
        readerSupportRuntime.projectShell(shell.app,context);
        finalizePublicProduct(stage,route,routeRuntime,doc);
        const finalized=validateFinalizedStage(stage,readerSupportRuntime);finalized.app.dataset.readerAuthority=VERSION;
        previousVisible.forEach(quiesceMaps);rootElement.replaceChildren(finalized.app);retireVisibleNodes(doc,rootElement,previousVisible);stage.remove();
        rootElement.className='atlas-ready';rootElement.dataset.status='ready';rootElement.setAttribute('aria-busy','false');copyRouteState(state,stagedState);delete state.readerError;
        if(focusHeading&&previousRouteKey&&previousRouteKey!==route.key)finalized.heading.focus?.();previousRouteKey=route.key;return route;
      } catch(error) {
        stage.remove();doc.title=previousTitle;
        const failure=error instanceof ReaderRegistryError?error:new ReaderRegistryError(error?.code||'READER_FINALIZATION_FAILED','Reader rendering or finalization failed.',error);
        if(hasQualified){emitRouteFailure(win,state,failure);if(propagateFailure)throw failure;return null;} throw failure;
      }
    };
    const onHashChange=()=>stageRoute(true,false);win?.addEventListener?.('hashchange',onHashChange);let initialRoute;
    try{initialRoute=stageRoute(false,false);}catch(error){win?.removeEventListener?.('hashchange',onHashChange);throw error;}
    const controller=Object.freeze({render:()=>stageRoute(false,true),current:()=>baseRuntime.parseRoute(win.location&&win.location.hash),services:()=>currentServices,destroy:()=>{destroyed=true;win?.removeEventListener?.('hashchange',onHashChange);},initialRoute});
    rootElement.__atlasRouteController=controller;return controller;
  }

  return Object.freeze'''
registry, count = mount_pattern.subn(new_mount, registry, count=1)
if count != 1:
    raise SystemExit('failed to replace registry mount')
registry = registry.replace('Object.freeze({...projection,mount,READER_REGISTRY_VERSION:VERSION,ReaderRegistryError,validateFinalizedStage})', 'Object.freeze({...base,mount,READER_REGISTRY_VERSION:VERSION,ReaderRegistryError,validateFinalizedStage})')
write(path, registry)

# Update the reader-support contract test without weakening semantic checks.
path = 'tests/public-reader-layer.test.js'
test = read(path)
test = test.replace("assert.equal(reader.READER_SUPPORT_VERSION, 'atlas-reader-v1.1');", "assert.equal(reader.READER_SUPPORT_VERSION, 'atlas-reader-support-v1.2');")
test = test.replace('// The reader is a pair of signed source modules, not text spliced into the\n// base registry, base stylesheet or entrypoint during release assembly.', '// Reader support is a signed dependency of one authoritative page registry; it has no mount or route lifecycle authority.')
test = test.replace("assert.match(releaseCore, /2\\.4-authoritative-reader-registry/);", "assert.match(releaseCore, /2\\.5-authoritative-reader-direct/);")
insert = """
assert.doesNotMatch(readerSource, /function\\s+mount\\s*\\(/, 'reader support must not own a mount lifecycle');
assert.doesNotMatch(readerSource, /base\\.mount\\s*\\(/, 'reader support must not wrap the superseded base mount');
assert.doesNotMatch(readerSource, /root\\.AtlasPublicIA\\s*=\\s*api/, 'reader support must not replace the authoritative IA global');
assert.match(readerSource, /root\\.AtlasPublicReaderSupport\\s*=\\s*api/, 'reader support must publish only its support namespace');
"""
test = test.replace("assert.doesNotMatch(readerCss, /technical-record-metadata[\\s\\S]*display\\s*:\\s*none/i, 'internal fields must be removed structurally, not hidden by CSS');\n", "assert.doesNotMatch(readerCss, /technical-record-metadata[\\s\\S]*display\\s*:\\s*none/i, 'internal fields must be removed structurally, not hidden by CSS');\n" + insert)
write(path, test)

# Behavior-based registry test for the direct authority. Keep the R2 failure and
# map-retirement contracts while proving support cannot mount a fallback app.
registry_test = r'''\'use strict\';
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

function environment(title='Qualified'){const listeners=new Map(),body=new Node('body');const documentObject={title,body,documentElement:body,createElement:t=>new Node(t)};return{documentObject,windowObject:{innerWidth:1440,location:{hash:'#/test'},history:{replaceState(){}},addEventListener(t,f){listeners.set(t,f);},removeEventListener(t,f){if(listeners.get(t)===f)listeners.delete(t);}}};}
function baseRuntime({includeHeading=true}={}){const nav=doc=>new Node('nav');return{parseRoute(){return{key:'test.route',owner:'TestPage',canonical:true,primaryLabel:'Test',label:'Test',title:'Test'};},routeHref(){return '#/test';},AppShell:{create(doc){const app=new Node('div');app.dataset.kind='app';const primaryHost=new Node(),mobileHost=new Node(),aside=new Node(),main=new Node(),footer=new Node();app.append(primaryHost,mobileHost,aside,main,footer);return{app,primaryHost,mobileHost,aside,main,footer};}},PublicNavigation:{renderPrimary:nav,renderMobile:nav,renderSecondary:nav},PAGE_OWNERS:{TestPage(){const article=new Node('article');article.dataset.kind='page';const intro=new Node('div');intro.dataset.kind='intro';article.append(intro);if(includeHeading)article.append(new Node('h1'));return article;}},modelData(){return null;},recordArray(){return[];},EvidenceDrawer:{create(){return new Node('details');}}};}
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
'''
write('tests/public-reader-registry.test.js', registry_test)

# Public/runtime inventory must describe one route authority and one support module.
for path in ['config/public-runtime-inventory.json', 'scripts/validate_public_runtime_inventory.py']:
    text = read(path)
    text = text.replace('authoritative visible reader registry and route lifecycle', 'authoritative reader-first page registry and route lifecycle')
    text = text.replace('non-authoritative reader projection support module', 'non-authoritative reader support module')
    write(path, text)

print('issue100 migration transform: PASS')
