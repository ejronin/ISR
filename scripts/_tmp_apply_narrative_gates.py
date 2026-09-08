from pathlib import Path

path = Path('js/public-app.js')
source = path.read_text(encoding='utf-8')

if 'FINAL_NARRATIVE_GATES' in source:
    raise SystemExit('FINAL_NARRATIVE_GATES already present; refusing duplicate insertion')

block = r'''
  const FINAL_NARRATIVE_GATES = Object.freeze({
    war90: Object.freeze({
      title: 'War in 90 Seconds',
      disclaimer: "These milestones are selected to explain the conflict's progression. They are not a ranking of strategic importance.",
      milestones: Object.freeze([
        Object.freeze({
          title: 'Opening strikes — Feb. 28',
          text: 'U.S. and Israeli forces struck Iran. Iran retaliated against Israel and bases hosting U.S. forces.',
          changed: 'The conflict moved from prewar confrontation into direct interstate war.'
        }),
        Object.freeze({
          title: 'The conflict becomes sustained and regional',
          text: 'Missile, drone, maritime and related-theater exchanges turned the opening strike cycle into a prolonged military confrontation.',
          changed: 'The war was no longer a single strike-and-retaliation episode.'
        }),
        Object.freeze({
          title: 'Hormuz becomes a central pressure point',
          text: 'Iran used the Strait as leverage through mines, routing restrictions and control or fee claims, while the United States and regional states contested unilateral Iranian control.',
          changed: 'Maritime access and economic coercion became a major front of the conflict.'
        }),
        Object.freeze({
          title: 'June interim bargain — Jun. 17–18',
          text: 'The June MOU created an interim ceasefire and a 60-day path toward a final deal, including safe-passage, blockade-relief, nuclear and economic provisions.',
          changed: 'The conflict temporarily moved into a negotiated operating framework.'
        }),
        Object.freeze({
          title: 'The MOU breaks down — Jul. 7',
          text: 'After vessel attacks and renewed hostilities, U.S. strikes and an oil-relief reversal followed, and Washington treated the MOU as over. Iran later described it as suspended.',
          changed: 'The interim bargain stopped controlling either side.'
        }),
        Object.freeze({
          title: 'Pressure widens',
          text: 'Sanctions, blockade pressure and regional security arrangements tightened while Iran continued to retain military and maritime options.',
          changed: 'The contest increasingly combined military pressure with economic isolation and regional alignment.'
        }),
        Object.freeze({
          title: "Iran's original Hormuz position narrows",
          text: "Iran's bargaining position shifted into mediated, shared and regional mechanisms without securing recognized unilateral control of the Strait. Permanent terms remained unresolved.",
          changed: "The practical negotiating framework narrowed relative to Iran's earlier maximal Hormuz claims."
        }),
        Object.freeze({
          title: 'Current phase — Sep. 5–6',
          text: 'Direct U.S.–Iran maritime exchanges resumed even as diplomatic channels remained active and economic pressure on Iran deepened.',
          changed: 'Kinetic escalation and negotiation were occurring at the same time.'
        })
      ])
    }),
    objectives: Object.freeze({
      title: 'What each side wanted',
      actors: Object.freeze([
        Object.freeze({
          key: 'us-coalition',
          title: 'United States / coalition',
          stages: Object.freeze([
            Object.freeze({
              key: 'original-public-benchmark',
              title: 'Original public benchmark',
              text: "Across prewar policy and objectives publicly formalized during the opening and early wartime period, U.S. goals included denying Iran a nuclear weapon; degrading missile, naval and proxy-support capabilities; restoring usable navigation through Hormuz; and applying economic pressure to narrow Tehran's options."
            }),
            Object.freeze({
              key: 'record-shows',
              title: 'What the record shows',
              text: "Atlas assesses substantial but incomplete degradation of Iran's offensive power projection, partial progress on usable Hormuz navigation and substantial active economic pressure. The nuclear objective remains open."
            }),
            Object.freeze({
              key: 'current-position',
              title: 'Current position',
              text: 'Washington continues military and economic pressure while negotiations remain active. Atlas does not treat the original objective set as fully achieved.'
            })
          ])
        }),
        Object.freeze({
          key: 'iran',
          title: 'Iran',
          stages: Object.freeze([
            Object.freeze({
              key: 'original-public-benchmark',
              title: 'Original public benchmark',
              text: "Iran's April–May victory terms demanded reparations, restored assets, an end to the U.S. blockade, broad sanctions relief, U.S. regional withdrawal, protection for aligned forces and permanent Iranian Hormuz authority."
            }),
            Object.freeze({
              key: 'record-shows',
              title: 'What the record shows',
              text: 'Most of those maximal terms are not controlling outcomes. Iran retains missiles, maritime leverage and bargaining power, but it entered a new maritime process without first securing the full earlier economic package, and its unilateral Hormuz position has narrowed in practice.'
            }),
            Object.freeze({
              key: 'current-position',
              title: 'Current position',
              text: 'By August Iran publicly shifted toward ending the war while preserving “power and dignity” and accepted a phased joint Oman maritime framework while permanent terms remained unresolved. That later position does not erase the original benchmark.'
            })
          ])
        })
      ])
    }),
    usEntry: Object.freeze({
      title: 'Why the U.S. said it entered the war',
      intro: 'The public record contains several distinct U.S. rationales and later campaign objectives. Atlas keeps them separate because they do not have the same evidentiary status.',
      items: Object.freeze([
        Object.freeze({
          key: 'intelligence-predicate',
          title: 'Intelligence predicate',
          text: 'The public record does not support the narrower claim that U.S. intelligence showed Iran planned to attack U.S. forces first before Feb. 28.'
        }),
        Object.freeze({
          key: 'expected-retaliation',
          title: 'Expected-retaliation rationale',
          text: 'Washington said Israel was expected to strike, Iran was expected to retaliate against U.S. forces, and U.S. participation could reduce expected American casualties. Expected retaliation after an Israeli strike is not evidence of an Iranian plan to strike the United States first.'
        }),
        Object.freeze({
          key: 'strategic-regional',
          title: 'Strategic and regional rationales',
          text: 'Washington also cited preventing Iran from obtaining a nuclear weapon and confronting Iranian missile, naval and proxy threats. Existing capability and threat history do not by themselves establish an imminent Feb. 28 first strike or imminent nuclear weapon completion.'
        }),
        Object.freeze({
          key: 'campaign-objectives',
          title: 'Wartime campaign objectives',
          text: 'Subsequent U.S. statements defined campaign objectives around denying Iran a nuclear weapon and degrading its missile, naval and proxy-support capabilities.'
        }),
        Object.freeze({
          key: 'diplomatic-record',
          title: 'Diplomatic record',
          text: 'No final agreement existed before the war, but the public record shows progress in Feb. 26 talks and expectations of further talks. It does not establish that diplomacy had been exhausted.'
        }),
        Object.freeze({
          key: 'atlas-assessment',
          title: 'Atlas assessment',
          text: "These are separate propositions with different evidentiary support. Atlas does not collapse them into one proven cause or adjudicate the war's ultimate legality, morality, wisdom or desirability."
        })
      ])
    }),
    hormuz: Object.freeze({
      title: 'Hormuz trajectory',
      stages: Object.freeze([
        Object.freeze({
          key: 'then',
          title: 'Then',
          text: 'Iran presented control and management of Hormuz, compulsory fees and broad sovereignty claims as strategic gains it intended to preserve.'
        }),
        Object.freeze({
          key: 'development',
          title: 'Development',
          text: 'The June MOU required safe commercial passage, removal of obstacles and demining, with a 60-day interim no-charge period. Future administration and maritime services were left to later talks with Oman and other Gulf littoral states. After the MOU broke down, U.S. blockade and mine-clearance pressure continued while shipping adapted through alternative routes.'
        }),
        Object.freeze({
          key: 'now',
          title: 'Now',
          text: 'The Strait is physically traversable but commercially contested. Iran retains leverage, but recognized exclusive control is not established. A reported negotiating formula under which compulsory tolls would be dropped while charges described as legitimate maritime-service fees could remain was still a proposal, not an agreement, at the evidence cutoff.'
        })
      ])
    })
  });

  function narrativeNode(documentObject, tagName, className, text) {
    const node = documentObject.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function buildFinalNarrativeGates(documentObject, ia) {
    const wrapper = narrativeNode(documentObject, 'div', 'narrative-gates');
    wrapper.dataset.narrativeGates = 'approved';

    const war = FINAL_NARRATIVE_GATES.war90;
    const warSection = narrativeNode(documentObject, 'section', 'content-section narrative-gate');
    warSection.dataset.warIn90Seconds = 'approved';
    warSection.dataset.narrativeGate = 'war-90';
    warSection.append(narrativeNode(documentObject, 'h2', '', war.title));
    warSection.append(narrativeNode(documentObject, 'p', 'section-note', war.disclaimer));
    const sequence = narrativeNode(documentObject, 'div', 'story-sequence');
    war.milestones.forEach((milestone, index) => {
      const step = narrativeNode(documentObject, 'article', 'story-step');
      step.dataset.warMilestone = String(index + 1);
      step.append(narrativeNode(documentObject, 'h3', '', milestone.title));
      step.append(narrativeNode(documentObject, 'p', '', milestone.text));
      const changed = narrativeNode(documentObject, 'p', 'record-status');
      changed.append(narrativeNode(documentObject, 'strong', '', 'What changed: '));
      changed.append(documentObject.createTextNode(milestone.changed));
      step.append(changed);
      sequence.append(step);
    });
    warSection.append(sequence);
    const warFooter = narrativeNode(documentObject, 'p', 'section-note');
    warFooter.append(documentObject.createTextNode(`${war.disclaimer} Open the `));
    const timelineLink = narrativeNode(documentObject, 'a', 'inline-route-link', 'full Timeline');
    timelineLink.href = ia.routeHref('timeline.war');
    warFooter.append(timelineLink, documentObject.createTextNode(' for the complete dated record.'));
    warSection.append(warFooter);
    wrapper.append(warSection);

    const objectiveSection = narrativeNode(documentObject, 'section', 'content-section narrative-gate');
    objectiveSection.dataset.objectiveOrientation = 'approved';
    objectiveSection.dataset.narrativeGate = 'objectives';
    objectiveSection.append(narrativeNode(documentObject, 'h2', '', FINAL_NARRATIVE_GATES.objectives.title));
    const objectiveGrid = narrativeNode(documentObject, 'div', 'record-list two-column-list');
    FINAL_NARRATIVE_GATES.objectives.actors.forEach(actor => {
      const card = narrativeNode(documentObject, 'article', 'record-card evidence-card');
      card.dataset.objectiveActor = actor.key;
      card.append(narrativeNode(documentObject, 'h3', '', actor.title));
      actor.stages.forEach(stage => {
        const stageNode = narrativeNode(documentObject, 'div', 'narrative-stage');
        stageNode.dataset.objectiveStage = stage.key;
        stageNode.append(narrativeNode(documentObject, 'h4', '', stage.title));
        stageNode.append(narrativeNode(documentObject, 'p', '', stage.text));
        card.append(stageNode);
      });
      objectiveGrid.append(card);
    });
    objectiveSection.append(objectiveGrid);
    wrapper.append(objectiveSection);

    const rationaleSection = narrativeNode(documentObject, 'section', 'content-section narrative-gate');
    rationaleSection.dataset.usWarRationale = 'approved';
    rationaleSection.dataset.narrativeGate = 'us-entry';
    rationaleSection.append(narrativeNode(documentObject, 'h2', '', FINAL_NARRATIVE_GATES.usEntry.title));
    rationaleSection.append(narrativeNode(documentObject, 'p', 'section-note', FINAL_NARRATIVE_GATES.usEntry.intro));
    const rationaleGrid = narrativeNode(documentObject, 'div', 'record-list two-column-list');
    FINAL_NARRATIVE_GATES.usEntry.items.forEach(item => {
      const card = narrativeNode(documentObject, 'article', 'record-card evidence-card');
      card.dataset.rationaleKind = item.key;
      card.append(narrativeNode(documentObject, 'h3', '', item.title));
      card.append(narrativeNode(documentObject, 'p', '', item.text));
      rationaleGrid.append(card);
    });
    rationaleSection.append(rationaleGrid);
    wrapper.append(rationaleSection);

    const hormuzSection = narrativeNode(documentObject, 'section', 'content-section narrative-gate');
    hormuzSection.dataset.hormuzTrajectory = 'approved';
    hormuzSection.dataset.narrativeGate = 'hormuz-trajectory';
    hormuzSection.append(narrativeNode(documentObject, 'h2', '', FINAL_NARRATIVE_GATES.hormuz.title));
    const hormuzGrid = narrativeNode(documentObject, 'div', 'story-grid');
    FINAL_NARRATIVE_GATES.hormuz.stages.forEach(stage => {
      const card = narrativeNode(documentObject, 'article', 'record-card evidence-card');
      card.dataset.hormuzStage = stage.key;
      card.append(narrativeNode(documentObject, 'h3', '', stage.title));
      card.append(narrativeNode(documentObject, 'p', '', stage.text));
      hormuzGrid.append(card);
    });
    hormuzSection.append(hormuzGrid);
    wrapper.append(hormuzSection);

    return wrapper;
  }

  function installFinalNarrativeGates(rootElement, documentObject, windowObject, state, ia) {
    if (rootElement.__atlasNarrativeGateHandler && windowObject && windowObject.removeEventListener) {
      windowObject.removeEventListener('hashchange', rootElement.__atlasNarrativeGateHandler);
    }
    const apply = () => {
      if (!state || state.routeKey !== 'start.overview') return;
      const article = rootElement.querySelector('.overview-page');
      if (!article || article.querySelector('[data-narrative-gates]')) return;
      const gates = buildFinalNarrativeGates(documentObject, ia);
      const anchor = article.querySelector('.evidence-clock-bar') || article.querySelector('[data-current-state-summary]') || article.querySelector('.page-intro');
      if (anchor) anchor.after(gates); else article.append(gates);
    };
    const onHashChange = () => apply();
    if (windowObject && windowObject.addEventListener) windowObject.addEventListener('hashchange', onHashChange);
    rootElement.__atlasNarrativeGateHandler = onHashChange;
    apply();
  }
'''

marker = '\n  function now() {\n'
if source.count(marker) != 1:
    raise SystemExit(f'expected one insertion marker, found {source.count(marker)}')
source = source.replace(marker, '\n' + block + marker, 1)

mount = """    const controller = ia.mount({\n      rootElement,\n      routeRuntime,\n      state,\n      documentObject,\n      windowObject\n    });\n"""
replacement = mount + "    installFinalNarrativeGates(rootElement, documentObject, windowObject, state, ia);\n"
if source.count(mount) != 1:
    raise SystemExit(f'expected one mount marker, found {source.count(mount)}')
source = source.replace(mount, replacement, 1)

path.write_text(source, encoding='utf-8', newline='\n')
print('patched js/public-app.js with cleared narrative gates')
