'use strict';
(function buildEndgameView() {
  const DATA_URL = './data/endgame-so-far.json?v=20260823';
  const panel = document.getElementById('endgame');
  if (!panel) return;

  const esc = value => String(value == null ? '' : value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');

  let model = null;

  function cutoff() {
    return window.AtlasState?.get?.().timeCutoff || '2026-08-22';
  }
  function isVisibleDate(date) {
    if (!date) return true;
    return String(date).slice(0,10) <= cutoff();
  }
  function sourceMap() {
    return new Map((model?.sources || []).map(source => [source.id, source]));
  }
  function sourceLinks(ids) {
    const sources = sourceMap();
    return `<div class="eg-sources">${(ids || []).map(id => {
      const s = sources.get(id);
      if (!s || !isVisibleDate(s.date)) return '';
      return `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.note || '')}">${esc(s.outlet)} · ${esc(s.date)}</a>`;
    }).join('')}</div>`;
  }
  function visible(items) {
    return (items || []).filter(item => isVisibleDate(item.date));
  }
  function hiddenCount(items) {
    return (items || []).filter(item => item.date && !isVisibleDate(item.date)).length;
  }
  function sectionHead(n, title) {
    return `<div class="eg-section-head"><span class="eg-num">${n}</span><h3>${esc(title)}</h3></div>`;
  }
  function flowNodes(items, extraClass) {
    return `<div class="eg-flow">${visible(items).map(item => `
      <article class="eg-node ${extraClass || ''}">
        <div class="eg-meta"><span class="eg-date">${esc(item.date)}</span>${item.phase ? `<span class="eg-phase">${esc(item.phase)}</span>` : ''}</div>
        <h4>${esc(item.headline || item.label)}</h4>
        ${item.action ? `<p><b>Applied:</b> ${esc(item.action)}</p>` : ''}
        ${item.intended_effect ? `<p><b>Intended effect:</b> ${esc(item.intended_effect)}</p>` : ''}
        ${item.evidence_for ? `<p><b>Evidence it is working:</b> ${esc(item.evidence_for)}</p>` : ''}
        ${item.counter_evidence ? `<p><b>Counter-evidence:</b> ${esc(item.counter_evidence)}</p>` : ''}
        ${item.meaning ? `<p>${esc(item.meaning)}</p>` : ''}
        ${sourceLinks(item.source_ids)}
      </article>`).join('')}</div>`;
  }
  function evidenceLane(title, items, cls) {
    return `<div class="eg-lane ${cls}">
      <div class="eg-lane-title">${esc(title)}</div>
      ${visible(items).map(item => `<article class="eg-evidence">
        <div class="eg-meta"><span class="eg-date">${esc(item.date)}</span><span class="eg-phase">${esc(item.type)}</span></div>
        <h4>${esc(item.headline)}</h4><p>${esc(item.detail)}</p>${sourceLinks(item.source_ids)}
      </article>`).join('')}
    </div>`;
  }
  function renderLedger() {
    return `<div class="eg-ledger-list">${(model.victory_ledger || []).map(item => `
      <article class="eg-ledger">
        <div class="eg-ledger-top"><h4>${esc(item.condition)}</h4><span class="eg-status" data-state="${esc(item.status)}">${esc(item.status)}</span></div>
        <div class="eg-origin">${esc(item.origin)}</div>
        <p>${esc(item.assessment)}</p>${sourceLinks(item.source_ids)}
      </article>`).join('')}</div>`;
  }
  function renderContraction() {
    const rows = visible(model.rhetorical_contraction);
    return `<div class="eg-contraction">${rows.map((item, index) => `
      <div class="eg-step"><div class="eg-step-index">${index + 1}</div><div class="eg-step-body">
        <div class="eg-meta"><span class="eg-date">${esc(item.date)}</span></div>
        <b>${esc(item.label)}</b><span>${esc(item.claim)}</span>${sourceLinks(item.source_ids)}
      </div></div>`).join('')}</div>`;
  }
  function renderTest() {
    const t = model.endgame_test || {};
    const card = (title, values) => `<div class="eg-test-card"><h4>${esc(title)}</h4><ul>${(values || []).map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>`;
    return `<div class="eg-test">${card('Observed reality', t.observed)}${card('What does NOT logically follow', t.does_not_follow)}${card('What would validate the original claim', t.would_validate)}</div>`;
  }
  function renderSources() {
    const rows = visible(model.sources);
    return `<div class="eg-source-index">${rows.map(s => `<div class="eg-source-row">
      <div class="eg-source-meta">${esc(s.date)} · ${esc(s.outlet)} · ${esc(s.role)}</div>
      <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>
      <div class="eg-source-note">${esc(s.note)}</div>
    </div>`).join('')}</div>`;
  }
  function renderLive() {
    return `<div class="eg-live">${(model.live_discriminators || []).map(item => `<div class="eg-live-card">
      <b>${esc(item.label)} · ${esc(item.status)}</b><p>${esc(item.question)}</p>
    </div>`).join('')}</div>`;
  }

  function render() {
    if (!model) return;
    const currentCutoff = cutoff();
    const totalHidden = hiddenCount(model.original_claims) + hiddenCount(model.strain_evidence) + hiddenCount(model.counter_evidence) + hiddenCount(model.rhetorical_contraction);
    const ledgerBad = (model.victory_ledger || []).filter(x => /NOT ACHIEVED|MOVING OPPOSITE|NOT ESTABLISHED|NOT SHOWN/.test(x.status)).length;
    panel.innerHTML = `
      <div class="eg-hero">
        <div class="eg-eyebrow">Outcome audit · claim ≠ condition satisfied</div>
        <h2>${esc(model.meta.title)}</h2>
        <p>${esc(model.meta.subtitle)}</p>
        <div class="eg-lock"><b>Analytical lock:</b> ${esc(model.meta.analytical_lock)}</div>
      </div>
      <div class="eg-cutoff"><span>⏱</span><div><b>Evidence cutoff: ${esc(currentCutoff)}</b><br>
        This view obeys the Atlas cutoff. Evidence published after the selected date is suppressed.${totalHidden ? ` <b>${totalHidden} later analytical nodes are currently hidden.</b>` : ''}
      </div></div>
      <div class="eg-kpis">
        <div class="eg-kpi original"><strong>Original victory standard</strong><span>Substantive and outcome-oriented: reparations, assets, withdrawal, blockade/sanctions relief, Axis protection, Hormuz gain.</span></div>
        <div class="eg-kpi pressure"><strong>Pressure state</strong><span>Iranian export/revenue and foreign-exchange constraints are now openly acknowledged.</span></div>
        <div class="eg-kpi leverage"><strong>Counter-pressure state</strong><span>Hormuz denial remains real and costly; coercion is not one-way.</span></div>
        <div class="eg-kpi audit"><strong>Victory ledger</strong><span>${ledgerBad} original conditions are currently not achieved, moving opposite, or not established; final bargain remains decisive.</span></div>
      </div>

      <section class="eg-section">${sectionHead(1,'Original war framing and victory standard')}
        ${flowNodes(model.original_claims,'eg-claim')}
        <div class="eg-warning"><strong>Do not move the goalposts:</strong> “Iran survived” is not the May victory condition. The contemporaneous Iranian case demanded a decisive settlement that converted battlefield endurance into concrete political, economic and maritime gains.</div>
      </section>

      <section class="eg-section">${sectionHead(2,'Pressure system builds')}
        ${flowNodes(model.pressure_system,'eg-pressure')}
        <div class="eg-result"><strong>Pressure thesis:</strong> kinetic attrition + maritime denial + revenue loss + partner sanctions + commercial adaptation are intended to make continued resistance more expensive than a settlement. The page separately preserves evidence that Iran can still impose large reciprocal costs.</div>
      </section>

      <section class="eg-section">${sectionHead(3,'Did pressure create observable strain?')}
        <div class="eg-evidence-grid">
          ${evidenceLane('Evidence pressure is biting', model.strain_evidence, 'positive')}
          ${evidenceLane('Counter-evidence · pressure is not one-way', model.counter_evidence, 'counter')}
        </div>
        <div class="eg-result"><strong>Interim finding:</strong> pressure is demonstrably degrading Iranian economic endurance, but has not yet proved political capitulation. Hormuz remains a real Iranian coercive asset.</div>
      </section>

      <section class="eg-section">${sectionHead(4,'Original victory-condition ledger')}
        ${renderLedger()}
        <div class="eg-warning"><strong>Accounting rule:</strong> returning something removed by coercive pressure is not automatically a net wartime gain. Score relief as victory only after accounting for what Iran gives up to obtain it and whether the final position is durably better than the pre-pressure baseline.</div>
      </section>

      <section class="eg-section">${sectionHead(5,'Rhetorical contraction / walk-back')}
        ${renderContraction()}
        <div class="eg-warning"><strong>The conversation shifted:</strong> coercive dominance → existential resistance → victor dictates terms → substantive settlement victory → institutionalized Hormuz gain → “power and dignity” while seeking an end. That is a narrower argument. A fallback narrative after pressure is not the same thing as satisfying the original victory conditions.</div>
      </section>

      <section class="eg-section">${sectionHead(6,'Endgame test')}
        ${renderTest()}
      </section>

      <div class="eg-bottom"><b>Current bottom line</b><p>
        Iran has survived and has imposed severe reciprocal costs through Hormuz. Both facts matter. Neither fact was the original victory condition.
        The strongest contemporaneous Iranian victory standard was concrete: compensation/assets, U.S. withdrawal, blockade and sanctions relief, protection of regional allies, preserved red lines, and a durable Hormuz gain.
        The public record so far shows serious Iranian leverage alongside growing Iranian economic constraint, while several original conditions remain unmet, reversed, or unresolved.
        Whether Tehran can logically call the end state a victory therefore depends on the final transaction — not on survival, disruption, or the existence of negotiations alone.
      </p></div>

      <section class="eg-section">${sectionHead(7,'Live endgame discriminators')}${renderLive()}</section>
      <section class="eg-section">${sectionHead(8,'Source trail · Reuters + Iranian record')}${renderSources()}
        ${totalHidden ? `<div class="eg-hidden-note">Later sources exist but are hidden by the current Atlas cutoff.</div>` : ''}
      </section>
    `;
  }

  fetch(DATA_URL, {cache:'no-store'})
    .then(response => { if (!response.ok) throw new Error(`endgame data ${response.status}`); return response.json(); })
    .then(json => { model = json; render(); })
    .catch(error => {
      console.error('Endgame view failed to load', error);
      panel.innerHTML = '<div class="callout red"><strong>ENDGAME view unavailable.</strong><br>The local analytical package could not be loaded.</div>';
    });

  window.AtlasState?.subscribe?.((state, source) => {
    if (!model || source === 'navigation') return;
    render();
  });
}());
