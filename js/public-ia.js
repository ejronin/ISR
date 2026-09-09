(function initAtlasPublicIA(globalObject, factory) {
  'use strict';
  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  globalObject.AtlasPublicIA = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function atlasPublicIAFactory(root) {
  'use strict';

  const DEFAULT_ROUTE_KEY = 'start.overview';
  const MACHINE_TOKEN_PATTERN = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
  const ANY_MACHINE_TOKEN_PATTERN = /\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/g;

  const PRIMARY_SECTIONS = Object.freeze([
    { id: 'start', slug: 'start', label: 'Start Here', modelPage: 'start_here' },
    { id: 'timeline', slug: 'timeline', label: 'Timeline', modelPage: 'timeline' },
    { id: 'military', slug: 'military', label: 'Military Record', modelPage: 'military_record' },
    { id: 'hormuz', slug: 'hormuz', label: 'Hormuz & Economy', modelPage: 'hormuz_economy' },
    { id: 'talks', slug: 'talks', label: 'Talks & Agreements', modelPage: 'diplomacy_mou' },
    { id: 'objectives', slug: 'objectives', label: 'Objectives & Outcomes', modelPage: 'objectives_position_changes' },
    { id: 'evidence', slug: 'evidence', label: 'Claims & Evidence', modelPage: 'claims_sources' }
  ]);

  const ROUTE_DEFINITIONS = Object.freeze([
    { key: 'start.overview', primary: 'start', slug: 'overview', label: 'Overview', title: 'Start Here', owner: 'OverviewPage', dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view', 'gate3.gaps'], related: ['timeline.war', 'military.campaigns', 'hormuz.overview', 'talks.mou', 'objectives.outcomes', 'evidence.claims'] },
    { key: 'start.actors', primary: 'start', slug: 'actors', label: "Who's Involved", title: "Who's Involved", owner: 'ActorsPage', dataKeys: ['current.actors'], related: ['timeline.war', 'evidence.sources'] },

    { key: 'timeline.war', primary: 'timeline', slug: 'war', label: 'War Timeline', title: 'War Timeline', owner: 'TimelinePage', dataKeys: ['current.chronology', 'gate3.daily_coverage'], related: ['timeline.chronology', 'military.campaigns', 'talks.overview'] },
    { key: 'timeline.chronology', primary: 'timeline', slug: 'chronology', label: 'Detailed Chronology', title: 'Detailed Chronology', owner: 'ChronologyPage', dataKeys: ['current.chronology', 'gate3.daily_coverage'], related: ['timeline.war', 'evidence.sources', 'evidence.method'] },

    { key: 'military.campaigns', primary: 'military', slug: 'campaigns', label: 'Campaigns & Strikes', title: 'Campaigns & Strikes', owner: 'CampaignsPage', dataKeys: ['current.chronology', 'reconciliation.strikes', 'forensic.damage_observations', 'forensic.facility_claim_audits', 'ledger.facilities', 'gate3.movements'], related: ['timeline.chronology', 'military.facilities', 'military.imagery'] },
    { key: 'military.facilities', primary: 'military', slug: 'facilities', label: 'Bases & Infrastructure', title: 'Bases & Infrastructure', owner: 'FacilitiesPage', dataKeys: ['ledger.facilities', 'forensic.facility_claim_audits', 'gate3.facilities'], related: ['military.campaigns', 'military.imagery', 'timeline.chronology'] },
    { key: 'military.weapons', primary: 'military', slug: 'weapons', label: 'Air, Missiles & Drones', title: 'Air, Missiles & Drones', owner: 'WeaponsPage', dataKeys: ['ledger.munitions_expenditure', 'ledger.attrition_series', 'current.material_losses', 'analysis.asset_display', 'forensic.loss_envelopes', 'forensic.aviation_reconciliation'], related: ['military.campaigns', 'military.losses'] },
    { key: 'military.losses', primary: 'military', slug: 'losses', label: 'Casualties & Losses', title: 'Casualties & Losses', owner: 'LossesPage', dataKeys: ['current.material_losses', 'forensic.loss_envelopes', 'forensic.leadership_casualties', 'forensic.aviation_reconciliation', 'forensic.pilot_rescue_timeline', 'analysis.asset_display', 'analysis.casualty_corrections', 'gate3.casualties'], related: ['military.weapons', 'evidence.method'] },
    { key: 'military.imagery', primary: 'military', slug: 'imagery', label: 'Damage Imagery', title: 'Damage Imagery', owner: 'ImageryPage', dataKeys: ['current.chronology', 'ledger.bda_overlays', 'ledger.facilities', 'forensic.facility_claim_audits', 'forensic.damage_observations', 'gate3.facilities'], related: ['military.facilities', 'military.campaigns', 'evidence.method'] },

    { key: 'hormuz.overview', primary: 'hormuz', slug: 'overview', label: 'Why Hormuz Matters', title: 'Why Hormuz Matters', owner: 'HormuzOverviewPage', dataKeys: ['analysis.hormuz', 'ledger.shipping', 'gate3.shipping'], related: ['hormuz.shipping', 'hormuz.talks', 'talks.mou'] },
    { key: 'hormuz.shipping', primary: 'hormuz', slug: 'shipping', label: 'Shipping & Trade', title: 'Shipping & Trade', owner: 'ShippingPage', dataKeys: ['ledger.shipping', 'analysis.oil_routes', 'analysis.hormuz', 'current.material_losses', 'gate3.shipping'], related: ['hormuz.overview', 'hormuz.economy', 'hormuz.talks', 'military.losses'] },
    { key: 'hormuz.economy', primary: 'hormuz', slug: 'economy', label: 'Oil & Economic Effects', title: 'Oil & Economic Effects', owner: 'EconomyPage', dataKeys: ['ledger.economics', 'analysis.china_oil_shift', 'analysis.oil_routes', 'gate3.economics'], related: ['hormuz.shipping', 'hormuz.overview'] },
    { key: 'hormuz.talks', primary: 'hormuz', slug: 'talks', label: 'Current Hormuz Talks', title: 'Current Hormuz Talks', owner: 'HormuzNegotiationsPage', dataKeys: ['current.chronology', 'analysis.hormuz'], related: ['talks.mou', 'talks.overview', 'hormuz.shipping'] },

    { key: 'talks.overview', primary: 'talks', slug: 'overview', label: 'Talks & Agreements', title: 'Talks & Agreements', owner: 'DiplomacyPage', dataKeys: ['ledger.agreements', 'ledger.diplomacy', 'gate3.agreements', 'gate3.diplomacy'], related: ['talks.mou', 'talks.nuclear', 'talks.regional'] },
    { key: 'talks.mou', primary: 'talks', slug: 'june-mou', label: 'June MOU', title: 'June MOU', owner: 'MouPage', dataKeys: ['analysis.hormuz', 'analysis.endgame_public_view'], related: ['hormuz.talks', 'talks.nuclear', 'objectives.outcomes'] },
    { key: 'talks.nuclear', primary: 'talks', slug: 'nuclear', label: 'Nuclear Talks', title: 'Nuclear Talks', owner: 'NuclearPage', dataKeys: ['analysis.iran_messaging', 'analysis.endgame_public_view'], related: ['talks.overview', 'talks.mou', 'objectives.positions'] },
    { key: 'talks.regional', primary: 'talks', slug: 'regional', label: 'Regional Diplomacy', title: 'Regional Diplomacy', owner: 'RegionalDiplomacyPage', dataKeys: ['ledger.agreements', 'gate3.agreements'], related: ['talks.overview', 'hormuz.talks', 'start.actors'] },

    { key: 'objectives.outcomes', primary: 'objectives', slug: 'outcomes', label: 'Objectives & Outcomes', title: 'Objectives & Outcomes', owner: 'ObjectivesPage', dataKeys: ['analysis.iran_outcomes', 'analysis.endgame_us_objectives', 'analysis.endgame_objective_corrections'], related: ['objectives.positions', 'objectives.iran', 'talks.mou'] },
    { key: 'objectives.positions', primary: 'objectives', slug: 'positions', label: 'Position Changes', title: 'Position Changes', owner: 'PositionChangesPage', dataKeys: ['analysis.endgame_us_objectives', 'analysis.iran_messaging'], related: ['objectives.outcomes', 'objectives.iran', 'timeline.chronology'] },
    { key: 'objectives.iran', primary: 'objectives', slug: 'iran-position', label: "How Iran's Position Changed", title: "How Iran's Position Changed", owner: 'IranMessagingPage', dataKeys: ['analysis.iran_messaging'], related: ['objectives.positions', 'talks.overview', 'evidence.information'] },

    { key: 'evidence.claims', primary: 'evidence', slug: 'claims', label: 'Claim Checks', title: 'Claim Checks', owner: 'ClaimChecksPage', dataKeys: ['current.claims'], related: ['evidence.information', 'evidence.sources', 'timeline.chronology'] },
    { key: 'evidence.information', primary: 'evidence', slug: 'information', label: 'Lie Ledger', title: 'Lie Ledger', owner: 'InformationEnvironmentPage', dataKeys: ['analysis.information_war_claims', 'analysis.influence_networks', 'gate3.lie_ledger', 'gate3.narrative_families', 'gate3.information_chains', 'gate3.source_reliability'], related: ['evidence.claims', 'objectives.iran', 'evidence.method'] },
    { key: 'evidence.sources', primary: 'evidence', slug: 'sources', label: 'Sources', title: 'Sources', owner: 'SourcesPage', dataKeys: ['current.sources'], related: ['evidence.method', 'evidence.claims'] },
    { key: 'evidence.method', primary: 'evidence', slug: 'method', label: 'How We Check the Evidence', title: 'How We Check the Evidence', owner: 'MethodPage', dataKeys: ['current.sources'], related: ['evidence.sources', 'evidence.claims', 'evidence.archive'] },
    { key: 'evidence.archive', primary: 'evidence', slug: 'archive', label: 'Archive', title: 'Archive', owner: 'ArchivePage', dataKeys: ['archive.snapshot_index'], related: ['evidence.method', 'start.overview'] }
  ]);

  const PRIMARY_BY_ID = new Map(PRIMARY_SECTIONS.map(section => [section.id, section]));
  const ROUTES = new Map(ROUTE_DEFINITIONS.map(route => {
    const primary = PRIMARY_BY_ID.get(route.primary);
    return [route.key, Object.freeze({ ...route, primaryLabel: primary.label, primarySlug: primary.slug, modelPage: primary.modelPage, path: `/${primary.slug}/${route.slug}` })];
  }));
  const ROUTE_BY_PATH = new Map(Array.from(ROUTES.values()).map(route => [route.path, route]));

  const DATASET_LABELS = Object.freeze({
    'current.chronology': 'Current chronology',
    'current.sources': 'Source catalog',
    'ledger.domain_assessments': 'Current situation assessments',
    'ledger.unresolved': 'Unresolved questions',
    'ledger.daily_coverage': 'Daily coverage record',
    'ledger.map_links': 'Mapped record links',
    'ledger.facilities': 'Bases and infrastructure',
    'ledger.casualties': 'Casualty records',
    'ledger.material_losses': 'Material-loss records',
    'ledger.munitions_expenditure': 'Munitions expenditure',
    'ledger.attrition_series': 'Attrition series',
    'ledger.bda_overlays': 'Damage-imagery records',
    'ledger.agreements': 'Agreements',
    'ledger.diplomacy': 'Diplomatic record',
    'ledger.shipping': 'Shipping record',
    'ledger.economics': 'Economic record',
    'ledger.source_role_map': 'Source roles',
    'ledger.revision_history': 'Revision history',
    'reconciliation.strikes': 'Reconciled strike record',
    'reconciliation.material_losses': 'Reconciled material losses',
    'current.material_losses': 'Current canonical material-loss records',
    'current.claims': 'Current canonical claim records',
    'reconciliation.coverage_audit': 'Coverage audit',
    'forensic.loss_envelopes': 'Loss ranges and accounting',
    'forensic.leadership_casualties': 'Senior-leadership casualty detail',
    'forensic.aviation_reconciliation': 'Aviation reconciliation',
    'forensic.pilot_rescue_timeline': 'Pilot-rescue chronology',
    'forensic.facility_claim_audits': 'Facility claim checks',
    'forensic.damage_observations': 'Physical damage observations',
    'forensic.public_assessments': 'Public assessments',
    'forensic.claim_evolution': 'Claim evolution',
    'analysis.casualty_corrections': 'Current casualty display',
    'analysis.asset_display': 'Iranian asset display',
    'analysis.hormuz': 'Hormuz record',
    'analysis.oil_routes': 'Oil-route record',
    'analysis.china_oil_shift': 'China oil-sourcing shift',
    'analysis.endgame_public_view': 'Agreement and outcome record',
    'analysis.endgame_current_aug25': 'Agreement status update',
    'analysis.endgame_current_aug26': 'Current agreement update',
    'analysis.iran_outcomes': 'Iran outcome assessments',
    'analysis.endgame_us_objectives': 'Stated objectives',
    'analysis.endgame_objective_corrections': 'Objective assessment corrections',
    'analysis.outcome_evidence_links': 'Outcome evidence links',
    'analysis.iran_messaging': 'Iran position-change record',
    'analysis.information_war_claims': 'Information-war claim checks',
    'analysis.influence_networks': 'Influence networks',
    'analysis.source_context': 'Source context',
    'analysis.media_bias_provider': 'Source-rating context',
    'archive.snapshot_index': 'Archived public editions',
    'gate3.casualties': 'Event-level casualty record',
    'gate3.agreements': 'Current agreements',
    'gate3.diplomacy': 'Current diplomatic record',
    'gate3.facilities': 'Current facility assessments',
    'gate3.movements': 'Force-posture movements',
    'gate3.shipping': 'Current shipping record',
    'gate3.economics': 'Current economic record',
    'gate3.gaps': 'Open evidence questions',
    'gate3.lie_ledger': 'Lie Ledger claim records',
    'gate3.narrative_families': 'Narrative-family reconstruction queue',
    'gate3.information_chains': 'Information chains',
    'gate3.daily_coverage': 'Validated daily chronology coverage',
    'gate3.source_reliability': 'Descriptive source history'
  });

  const DISPLAY_TERMS = Object.freeze({
    STRONGLY_SUPPORTED: 'Strongly supported',
    SUPPORTED: 'Supported',
    VERIFIED: 'Verified',
    CONFIRMED: 'Confirmed',
    PARTIALLY_SUPPORTED: 'Partially supported',
    UNVERIFIED: 'Unverified',
    FALSE: 'False',
    DISPROVEN: 'False',
    SUBSTANTIALLY_TRUE: 'Substantially true',
    UNSUPPORTED: 'Unsupported',
    DISPUTED: 'Disputed',
    INSUFFICIENT: 'Insufficient',
    MIXED: 'Mixed',
    MISLEADING: 'Misleading',
    UNKNOWN: 'Unknown',
    UNRESOLVED: 'Unresolved',
    HIGH: 'High',
    MODERATE: 'Moderate',
    LOW: 'Low',
    DISPUTED_BY_IRAN: 'Disputed by Iran',
    DISPUTED_BY_UNITED_STATES: 'Disputed by the United States',
    NOT_DISPUTED_IN_REVIEWED_RECORD: 'No dispute recorded in the reviewed record',
    FROZEN_HISTORICAL_LEDGER: 'Historical record',
    APPEND_ONLY_CURRENT_OVERLAY: 'Current update',
    ACCEPTED_HISTORICAL_RECONCILIATION: 'Historical reconciliation',
    CANONICAL_LEDGER_DATA: 'Current record',
    APPROVED_ANALYTICAL_DATA: 'Analysis',
    APPROVED_FORENSIC_DATA: 'Forensic record',
    HISTORICAL_REFERENCE_DATA: 'Historical reference',
    DATE_ONLY: 'Date only'
  });

  const AFFILIATED_ACTORS = Object.freeze([
    { id: 'iran', aliases: ['iran'], canonicalName: 'Iran', affiliationType: 'state', parentState: 'Iran', flag: '🇮🇷', subtitle: 'State actor' },
    { id: 'united-states', aliases: ['united states', 'u.s.', 'us'], canonicalName: 'United States', affiliationType: 'state', parentState: 'United States', flag: '🇺🇸', subtitle: 'State actor' },
    { id: 'syria', aliases: ['syria'], canonicalName: 'Syria', affiliationType: 'state', parentState: 'Syria', flag: '🇸🇾', subtitle: 'State actor' },
    { id: 'iraq', aliases: ['iraq', 'republic of iraq'], canonicalName: 'Iraq', affiliationType: 'state', parentState: 'Iraq', flag: '🇮🇶', subtitle: 'State actor' },
    { id: 'israel', aliases: ['israel'], canonicalName: 'Israel', affiliationType: 'state', parentState: 'Israel', flag: '🇮🇱', subtitle: 'State actor' },
    { id: 'oman', aliases: ['oman'], canonicalName: 'Oman', affiliationType: 'state', parentState: 'Oman', flag: '🇴🇲', subtitle: 'State actor and mediator' },
    { id: 'qatar', aliases: ['qatar'], canonicalName: 'Qatar', affiliationType: 'state', parentState: 'Qatar', flag: '🇶🇦', subtitle: 'State actor and mediator' },
    { id: 'pakistan', aliases: ['pakistan'], canonicalName: 'Pakistan', affiliationType: 'state', parentState: 'Pakistan', flag: '🇵🇰', subtitle: 'State actor and mediator' },
    { id: 'saudi-arabia', aliases: ['saudi arabia'], canonicalName: 'Saudi Arabia', affiliationType: 'state', parentState: 'Saudi Arabia', flag: '🇸🇦', subtitle: 'State actor' },
    { id: 'china', aliases: ['china'], canonicalName: 'China', affiliationType: 'state', parentState: 'China', flag: '🇨🇳', subtitle: 'State actor' },
    { id: 'russia', aliases: ['russia'], canonicalName: 'Russia', affiliationType: 'state', parentState: 'Russia', flag: '🇷🇺', subtitle: 'State actor' },
    { id: 'united-kingdom', aliases: ['united kingdom'], canonicalName: 'United Kingdom', affiliationType: 'state', parentState: 'United Kingdom', flag: '🇬🇧', subtitle: 'State actor' },
    { id: 'france', aliases: ['france'], canonicalName: 'France', affiliationType: 'state', parentState: 'France', flag: '🇫🇷', subtitle: 'State actor' },
    { id: 'australia', aliases: ['australia'], canonicalName: 'Australia', affiliationType: 'state', parentState: 'Australia', flag: '🇦🇺', subtitle: 'State actor' },
    { id: 'bulgaria', aliases: ['bulgaria'], canonicalName: 'Bulgaria', affiliationType: 'state', parentState: 'Bulgaria', flag: '🇧🇬', subtitle: 'State actor' },
    { id: 'india', aliases: ['india'], canonicalName: 'India', affiliationType: 'state', parentState: 'India', flag: '🇮🇳', subtitle: 'State actor' },
    { id: 'japan', aliases: ['japan'], canonicalName: 'Japan', affiliationType: 'state', parentState: 'Japan', flag: '🇯🇵', subtitle: 'State actor' },
    { id: 'kuwait', aliases: ['kuwait'], canonicalName: 'Kuwait', affiliationType: 'state', parentState: 'Kuwait', flag: '🇰🇼', subtitle: 'State actor' },
    { id: 'lebanon', aliases: ['lebanon'], canonicalName: 'Lebanon', affiliationType: 'state', parentState: 'Lebanon', flag: '🇱🇧', subtitle: 'State actor' },
    { id: 'turkiye', aliases: ['türkiye', 'turkiye'], canonicalName: 'Türkiye', affiliationType: 'state', parentState: 'Türkiye', flag: '🇹🇷', subtitle: 'State actor' },
    { id: 'united-arab-emirates', aliases: ['united arab emirates'], canonicalName: 'United Arab Emirates', affiliationType: 'state', parentState: 'United Arab Emirates', flag: '🇦🇪', subtitle: 'State actor' },
    { id: 'iranian-government', aliases: ['iranian government'], canonicalName: 'Iranian government', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state institution' },
    { id: 'iranian-parliament', aliases: ['iranian parliament'], canonicalName: 'Iranian parliament', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state institution' },
    { id: 'irgc', aliases: ['irgc', 'islamic revolutionary guard corps'], canonicalName: 'IRGC', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state institution' },
    { id: 'irgc-navy', aliases: ['irgc navy'], canonicalName: 'IRGC Navy', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state institution' },
    { id: 'iranian-foreign-ministry', aliases: ['foreign ministry', 'iranian foreign ministry'], canonicalName: 'Iranian Foreign Ministry', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state institution' },
    { id: 'iranian-armed-forces', aliases: ['iranian armed forces'], canonicalName: 'Iranian Armed Forces', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state institution' },
    { id: 'central-bank-of-iran', aliases: ['central bank of iran'], canonicalName: 'Central Bank of Iran', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state institution' },
    { id: 'iranian-state-television', aliases: ['iranian state television'], canonicalName: 'Iranian state television', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state media institution' },
    { id: 'persian-gulf-strait-authority', aliases: ['persian gulf strait authority'], canonicalName: 'Persian Gulf Strait Authority', affiliationType: 'state-institution', parentState: 'Iran', flag: '🇮🇷', subtitle: 'Iranian state authority' },
    { id: 'syrian-government', aliases: ['syrian government'], canonicalName: 'Syrian government', affiliationType: 'state-institution', parentState: 'Syria', flag: '🇸🇾', subtitle: 'Syrian state institution' },
    { id: 'centcom', aliases: ['centcom', 'u.s. central command'], canonicalName: 'CENTCOM', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States military command' },
    { id: 'us-department-of-defense', aliases: ['u.s. department of defense'], canonicalName: 'U.S. Department of Defense', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States state institution' },
    { id: 'us-congress', aliases: ['u.s. congress'], canonicalName: 'U.S. Congress', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States state institution' },
    { id: 'us-secret-service', aliases: ['u.s. secret service'], canonicalName: 'U.S. Secret Service', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States state institution' },
    { id: 'usafcent', aliases: ['usafcent'], canonicalName: 'USAFCENT', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States military command' },
    { id: 'marine-expeditionary-unit', aliases: ['marine expeditionary unit'], canonicalName: 'Marine Expeditionary Unit', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States military unit' },
    { id: 'uss-abraham-lincoln', aliases: ['uss abraham lincoln'], canonicalName: 'USS Abraham Lincoln', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States naval vessel' },
    { id: 'uss-abraham-lincoln-csg', aliases: ['uss abraham lincoln carrier strike group'], canonicalName: 'USS Abraham Lincoln Carrier Strike Group', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States naval formation' },
    { id: 'uss-boxer-arg', aliases: ['uss boxer amphibious ready group'], canonicalName: 'USS Boxer Amphibious Ready Group', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States naval formation' },
    { id: 'uss-george-hw-bush', aliases: ['uss george h.w. bush'], canonicalName: 'USS George H.W. Bush', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States naval vessel' },
    { id: 'uss-george-washington', aliases: ['uss george washington'], canonicalName: 'USS George Washington', affiliationType: 'state-institution', parentState: 'United States', flag: '🇺🇸', subtitle: 'United States naval vessel' },
    { id: 'ukmto', aliases: ['ukmto'], canonicalName: 'UKMTO', affiliationType: 'state-institution', parentState: 'United Kingdom', flag: '🇬🇧', subtitle: 'United Kingdom maritime security institution' },
    { id: 'hezbollah', aliases: ['hezbollah'], canonicalName: 'Hezbollah', affiliationType: 'non-state', parentState: null, flag: '', subtitle: 'Lebanese non-state armed organization' },
    { id: 'houthis', aliases: ['houthis', 'houthis / ansar allah', 'ansar allah', 'yemen houthis'], canonicalName: 'Houthis / Ansar Allah', affiliationType: 'non-state', parentState: null, flag: '', subtitle: 'Yemeni armed movement' },
    { id: 'united-nations', aliases: ['united nations', 'united nations security council'], canonicalName: 'United Nations', affiliationType: 'international', parentState: null, flag: '', subtitle: 'International organization' },
    { id: 'iaea', aliases: ['iaea', 'international atomic energy agency'], canonicalName: 'IAEA', affiliationType: 'international', parentState: null, flag: '', subtitle: 'International organization' },
    { id: 'nato-saceur', aliases: ['nato saceur'], canonicalName: 'NATO SACEUR', affiliationType: 'international', parentState: null, flag: '', subtitle: 'International military command' },
    { id: 'opec', aliases: ['opec'], canonicalName: 'OPEC', affiliationType: 'international', parentState: null, flag: '', subtitle: 'International organization' },
    { id: 'world-bank', aliases: ['world bank'], canonicalName: 'World Bank', affiliationType: 'international', parentState: null, flag: '', subtitle: 'International organization' },
    { id: 'adnoc', aliases: ['adnoc'], canonicalName: 'ADNOC', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'Organization as recorded' },
    { id: 'bahri', aliases: ['bahri'], canonicalName: 'Bahri', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'Organization as recorded' },
    { id: 'cosco', aliases: ['cosco'], canonicalName: 'COSCO', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'Organization as recorded' },
    { id: 'china-merchants-energy-shipping', aliases: ['china merchants energy shipping'], canonicalName: 'China Merchants Energy Shipping', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'Organization as recorded' },
    { id: 'kpler', aliases: ['kpler'], canonicalName: 'Kpler', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'Organization as recorded' },
    { id: 'qatarenergy', aliases: ['qatarenergy'], canonicalName: 'QatarEnergy', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'Organization as recorded' },
    { id: 'reuters', aliases: ['reuters'], canonicalName: 'Reuters', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'News organization' },
    { id: 'windward', aliases: ['windward'], canonicalName: 'Windward', affiliationType: 'organization', parentState: null, flag: '', subtitle: 'Organization as recorded' },
    { id: 'commercial-shipping', aliases: ['commercial shipping'], canonicalName: 'Commercial shipping', affiliationType: 'civilian', parentState: null, flag: '', subtitle: 'Civilian maritime activity' }
  ]);

  const PERSON_PROFILES = Object.freeze([
    { aliases: ['mohammad baqer qalibaf', 'mohammad bagher qalibaf'], canonicalName: 'Mohammad Baqer Qalibaf', role: 'Parliament speaker', affiliationId: 'iranian-parliament' },
    { aliases: ['abbas araghchi'], canonicalName: 'Abbas Araghchi', role: 'Foreign minister', affiliationId: 'iranian-foreign-ministry' },
    { aliases: ['badr albusaidi'], canonicalName: 'Badr Albusaidi', role: 'Foreign minister', affiliationId: 'oman' },
    { aliases: ['masoud pezeshkian'], canonicalName: 'Masoud Pezeshkian', role: 'President', affiliationId: 'iran' },
    { aliases: ['ali abdollahi'], canonicalName: 'Ali Abdollahi', role: 'Armed Forces chief', affiliationId: 'iranian-armed-forces' },
    { aliases: ['hossein mohebi'], canonicalName: 'Hossein Mohebi', role: 'Spokesperson', affiliationId: 'irgc' },
    { aliases: ['alireza tangsiri'], canonicalName: 'Alireza Tangsiri', role: 'IRGC Navy commander', affiliationId: 'irgc-navy' },
    { aliases: ['mohammad eslami'], canonicalName: 'Mohammad Eslami', role: 'Nuclear chief', affiliationId: 'iran' }
  ]);

  const STATE_FLAG_CODES = Object.freeze({
    Australia: 'au', Bahrain: 'bh', Bangladesh: 'bd', Bulgaria: 'bg', China: 'cn', Djibouti: 'dj', Egypt: 'eg',
    France: 'fr', India: 'in', Iran: 'ir', Iraq: 'iq', Israel: 'il', Japan: 'jp', Jordan: 'jo', Kuwait: 'kw',
    Lebanon: 'lb', Nigeria: 'ng', Oman: 'om', Pakistan: 'pk', Qatar: 'qa', Russia: 'ru', 'Saudi Arabia': 'sa',
    Somalia: 'so', Sudan: 'sd', Syria: 'sy', 'Türkiye': 'tr', 'United Arab Emirates': 'ae',
    'United Kingdom': 'gb', 'United States': 'us', Yemen: 'ye'
  });

  function stateFlagCode(parentState, affiliationType) {
    return ['state', 'state-institution'].includes(affiliationType) ? STATE_FLAG_CODES[parentState] || null : null;
  }

  const AFFILIATION_BY_ID = new Map(AFFILIATED_ACTORS.map(actor => [actor.id, actor]));

  function invariant(condition, message) {
    if (!condition) throw new Error(message);
  }

  function element(documentObject, tag, className, text) {
    const node = documentObject.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function append(parent, tag, className, text) {
    const node = element(parent.ownerDocument || parent, tag, className, text);
    parent.append(node);
    return node;
  }

  function displayTerm(value, fallback = 'Unknown') {
    if (value === null || value === undefined || value === '') return fallback;
    const raw = String(value).trim();
    if (DISPLAY_TERMS[raw]) return DISPLAY_TERMS[raw];
    return publicNarrative(raw, fallback);
  }

  function publicNarrative(value, fallback = '') {
    if (value === null || value === undefined) return fallback;
    const raw = String(value).replace(/\uFFFD/g, '—').trim();
    if (!raw) return fallback;
    return raw
      .replace(/No machine-readable footprint\/damage polygons were supplied\. Do not create polygons or percentages from prose\./gi, 'The evidence record does not include a precise imagery footprint or damage polygon, so no polygon or damage percentage is inferred.')
      .replace(/the integration package does not contain machine-readable imagery\/footprints/gi, 'the evidence record does not include a precise imagery footprint')
      .replace(/no machine-readable damage footprint supplied/gi, 'the record does not supply a precise damage footprint')
      .replace(/no machine-readable footprint\/damage polygon supplied/gi, 'no precise imagery footprint or damage polygon is available')
      .replace(/>=\s*(\d[\d,.]*)/g, 'at least $1')
      .replace(/>\s*(\d[\d,.]*)/g, 'more than $1')
      .replace(MACHINE_TOKEN_PATTERN, token => DISPLAY_TERMS[token] || machineTokenLabel(token))
      .replace(ANY_MACHINE_TOKEN_PATTERN, token => machineTokenLabel(token));
  }

  function machineTokenLabel(token) {
    const normalized = String(token).replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function plainLabel(value, fallback = 'Unknown') {
    if (value === null || value === undefined || value === '') return fallback;
    const raw = String(value).trim();
    if (!raw) return fallback;
    const expanded = raw
      .replace(/\bU\.S\.?\b/gi, 'U.S.')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return expanded
      .split(/(\s*[·—/|]\s*)/)
      .map(part => /[·—/|]/.test(part)
        ? part
        : part.replace(/\b[A-Z][A-Z\d-]{2,}\b/g, word => {
            if (['U.S.', 'IRGC', 'IAEA', 'MOU', 'NATO', 'AIS', 'GDP', 'LNG', 'UAS', 'UNSC'].includes(word)) return word;
            return word.charAt(0) + word.slice(1).toLowerCase();
          }))
      .join('');
  }

  function readableDate(value) {
    if (!value) return 'Date not established';
    const matched = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return publicNarrative(value, String(value));
    const date = new Date(`${matched[1]}-${matched[2]}-${matched[3]}T12:00:00Z`);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return 'Unknown';
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('en-US') : 'Unknown';
  }

  function routeHref(routeKey, params) {
    const route = ROUTES.get(routeKey) || ROUTES.get(DEFAULT_ROUTE_KEY);
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && String(value) !== '') query.set(key, String(value));
    });
    return `#${route.path}${query.toString() ? `?${query}` : ''}`;
  }

  function parseRoute(hashValue) {
    const raw = String(hashValue || '').replace(/^#/, '');
    const [pathPart, queryPart = ''] = raw.split('?');
    const route = ROUTE_BY_PATH.get(pathPart) || ROUTES.get(DEFAULT_ROUTE_KEY);
    return {
      ...route,
      params: Object.fromEntries(new URLSearchParams(queryPart)),
      canonical: ROUTE_BY_PATH.has(pathPart),
      href: routeHref(route.key, Object.fromEntries(new URLSearchParams(queryPart)))
    };
  }

  function routesForPrimary(primaryId) {
    return Array.from(ROUTES.values()).filter(route => route.primary === primaryId);
  }

  function modelData(model, key) {
    if (key === 'current.chronology') return model.chronology;
    if (key === 'current.sources') return model.sources.records;
    return model.datasets[key] && model.datasets[key].payload;
  }

  function recordArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    for (const key of ['records', 'strikes', 'facilities', 'claims', 'overlays', 'series', 'routes', 'outcomes', 'assessments', 'revisions', 'requests', 'profiles', 'branches', 'clauses', 'decisions', 'networks', 'domains', 'items', 'coverage']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    return [];
  }

  function mergeCurrentRecords(basePayload, updatePayload, identityKeys) {
    const keys = asArray(identityKeys);
    const merged = new Map();
    const identity = (record, index) => keys.map(key => record && record[key]).find(Boolean) || `record-${index}`;
    recordArray(basePayload).forEach((record, index) => merged.set(identity(record, index), record));
    recordArray(updatePayload).forEach((record, index) => {
      const key = identity(record, index);
      merged.set(key, { ...(merged.get(key) || {}), ...record });
    });
    return Array.from(merged.values());
  }

  function validateRegistry(model) {
    invariant(ROUTES.size === 25, `Expected 25 public routes; found ${ROUTES.size}`);
    invariant(ROUTE_BY_PATH.size === ROUTES.size, 'Public route paths must be unique');
    for (const route of ROUTES.values()) {
      invariant(PAGE_OWNERS[route.owner], `Missing page owner: ${route.owner}`);
      const mapping = model.page_data[route.modelPage];
      invariant(mapping && Array.isArray(mapping.dataset_keys), `Missing current model mapping: ${route.modelPage}`);
      for (const key of route.dataKeys) {
        invariant(!key.startsWith('legacy.'), `Current route ${route.key} maps legacy data`);
        invariant(mapping.dataset_keys.includes(key), `Current route ${route.key} uses unmapped data: ${key}`);
        invariant(key.startsWith('current.') || model.datasets[key], `Current route ${route.key} data is unavailable: ${key}`);
      }
    }
    return true;
  }

  function normalizedActorInput(value) {
    if (value && typeof value === 'object') {
      return {
        name: String(value.canonicalName || value.name || value.label || 'Unknown').trim(),
        actorId: value.actorId || value.actor_id || null,
        entityType: value.entityType || null,
        role: value.role || value.title || null,
        affiliation: value.affiliation || value.affiliationId || null
      };
    }
    return { name: String(value || 'Unknown').trim(), actorId: null, entityType: null, role: null, affiliation: null };
  }

  function findModelActor(value, modelActors) {
    const actorRecords = Array.isArray(modelActors) ? modelActors : [];
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return { actor: null, exact: false };
    const exact = actorRecords.find(actor =>
      String(actor.actor_id || '').toLowerCase() === normalized ||
      String(actor.canonical_name || '').toLowerCase() === normalized ||
      (actor.aliases || []).includes(normalized)
    );
    if (exact) return { actor: exact, exact: true };
    const qualified = actorRecords.find(actor => (actor.aliases || []).some(alias => normalized.startsWith(`${alias} (`)));
    return { actor: qualified || null, exact: false };
  }

  function findAffiliation(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return { actor: null, exact: false };
    const byId = AFFILIATION_BY_ID.get(normalized);
    if (byId) return { actor: byId, exact: true };
    const exact = AFFILIATED_ACTORS.find(actor => actor.aliases.includes(normalized));
    if (exact) return { actor: exact, exact: true };
    const qualified = AFFILIATED_ACTORS.find(actor => actor.aliases.some(alias => normalized.startsWith(`${alias} (`)));
    return { actor: qualified || null, exact: false };
  }

  const ActorIdentity = Object.freeze({
    configure(model) { return this.createResolver(model); },
    resolve(value, modelActors) {
      const input = normalizedActorInput(value);
      const modelLookup = findModelActor(input.actorId || input.name, modelActors);
      if (modelLookup.actor) {
        const actor = modelLookup.actor;
        const canonicalName = publicNarrative(modelLookup.exact ? actor.canonical_name : input.name, 'Unknown actor');
        const entityType = actor.entity_type || 'unresolved';
        const affiliationName = entityType === 'person' ? actor.affiliation || null : actor.canonical_name;
        return {
          actorId: actor.actor_id || null,
          canonicalName,
          label: canonicalName,
          entityType,
          role: actor.role || null,
          affiliation: affiliationName,
          affiliationId: actor.affiliation_id || (entityType === 'person' ? null : actor.actor_id),
          affiliationType: actor.affiliation_type || 'unknown',
          parentState: actor.parent_state || null,
          flagCode: stateFlagCode(actor.parent_state, actor.affiliation_type),
          subtitle: actor.subtitle || (entityType === 'person' ? 'Affiliation unresolved' : 'Identity as recorded; affiliation unresolved')
        };
      }
      const normalizedName = input.name.toLowerCase();
      const profile = PERSON_PROFILES.find(person => person.aliases.includes(normalizedName));
      const entityType = input.entityType === 'person' || profile
        ? 'person'
        : input.entityType === 'entity'
          ? 'entity'
          : null;
      const affiliationLookup = findAffiliation(input.affiliation || profile && profile.affiliationId || (entityType === 'person' ? null : input.name));
      const affiliation = affiliationLookup.actor;
      const resolvedEntityType = entityType || (affiliation ? 'entity' : 'unresolved');
      const canonicalName = publicNarrative(
        profile && profile.canonicalName || (resolvedEntityType === 'person' ? input.name : affiliation && affiliationLookup.exact ? affiliation.canonicalName : input.name),
        'Unknown actor'
      );
      const role = publicNarrative(input.role || profile && profile.role, '') || null;
      const affiliationName = affiliation ? affiliation.canonicalName : null;
      const subtitle = resolvedEntityType === 'person'
        ? [role, affiliationName].filter(Boolean).join(' · ') || 'Affiliation unresolved'
        : affiliation
          ? affiliation.subtitle
          : 'Identity as recorded; affiliation unresolved';
      return {
        actorId: input.actorId || affiliation && affiliation.id || null,
        canonicalName,
        label: canonicalName,
        entityType: resolvedEntityType,
        role,
        affiliation: affiliationName,
        affiliationId: affiliation ? affiliation.id : null,
        affiliationType: affiliation ? affiliation.affiliationType : 'unknown',
        parentState: affiliation ? affiliation.parentState : null,
        flagCode: affiliation ? stateFlagCode(affiliation.parentState, affiliation.affiliationType) : null,
        subtitle
      };
    },
    create(documentObject, value, options, resolver) {
      const actor = (resolver || this).resolve(value);
      const wrapper = element(documentObject, 'span', 'actor-identity');
      wrapper.dataset.actorName = actor.canonicalName;
      wrapper.dataset.actorEntityType = actor.entityType;
      wrapper.dataset.actorKind = actor.affiliationType;
      wrapper.dataset.actorAffiliationType = actor.affiliationType;
      if (actor.affiliation) wrapper.dataset.actorAffiliation = actor.affiliation;
      if (actor.parentState) wrapper.dataset.actorParentState = actor.parentState;
      if (actor.role) wrapper.dataset.actorRole = actor.role;
      if (actor.flagCode && resolver && resolver.flagFor) {
        const asset = resolver.flagFor(actor.flagCode);
        if (asset) {
          const flag = append(wrapper, 'img', 'actor-flag');
          flag.src = asset.path;
          flag.alt = `${actor.parentState} flag`;
          flag.width = 24;
          flag.height = 18;
          flag.decoding = 'async';
        }
      }
      append(wrapper, 'span', 'actor-name', actor.canonicalName);
      if (options && options.subtitle) append(wrapper, 'span', 'actor-subtitle', actor.subtitle);
      return wrapper;
    },
    createResolver(model, stateFlagResolver) {
      const publicActors = model && model.datasets && model.datasets['current.actors'];
      const records = [
        ...(publicActors && Array.isArray(publicActors.payload) ? publicActors.payload : []),
        ...(model && model.entities && Array.isArray(model.entities.actors) ? model.entities.actors : [])
      ];
      const modelActors = Array.from(new Map(records.map(item => item && item.record ? item.record : item).filter(Boolean).map(actor => [actor.actor_id || actor.canonical_name, actor])).values());
      const resolver = {
        size: modelActors.length,
        resolve(value) { return ActorIdentity.resolve(value, modelActors); },
        flagFor(code) { return stateFlagResolver && stateFlagResolver.resolve(code); },
        create(documentObject, value, options) { return ActorIdentity.create(documentObject, value, options, resolver); }
      };
      return Object.freeze(resolver);
    }
  });

  const EvidenceStatus = Object.freeze({
    viewModel(value) {
      const rawSupport = value && value.support;
      const support = rawSupport === null || rawSupport === undefined || rawSupport === ''
        ? 'Unknown'
        : DISPLAY_TERMS[rawSupport] || plainLabel(rawSupport, 'Evidence status recorded');
      const dispute = value && value.dispute ? DISPLAY_TERMS[value.dispute] || plainLabel(value.dispute, 'Dispute status recorded') : null;
      return { support, dispute };
    },
    create(documentObject, value) {
      const view = this.viewModel(value || {});
      const wrapper = element(documentObject, 'div', 'evidence-status');
      wrapper.dataset.component = 'EvidenceStatus';
      wrapper.setAttribute('role', 'group');
      wrapper.setAttribute('aria-label', 'Evidence status');
      const support = append(wrapper, 'span', 'evidence-support', view.support);
      support.setAttribute('aria-label', `Evidence support: ${view.support}`);
      if (view.dispute) {
        const dispute = append(wrapper, 'span', 'dispute-posture', view.dispute);
        dispute.setAttribute('aria-label', `Dispute posture: ${view.dispute}`);
      }
      return wrapper;
    }
  });

  function firstText() {
    for (const value of arguments) if (typeof value === 'string' && value.trim()) return value.trim();
    return null;
  }

  function firstSemanticText() {
    for (const value of arguments) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (Array.isArray(value)) {
        const values = value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
        if (values.length) return values.join('; ');
      }
    }
    return null;
  }

  function eventTemporalValues(item) {
    const record = item && item.event && typeof item.event === 'object' ? item.event : item || {};
    const timeline = item && item.timeline && typeof item.timeline === 'object' ? item.timeline : {};
    const date = firstText(record.event_date, record.date, item && item.event_date, item && item.date, timeline.date);
    const time = firstText(record.event_time, record.time, item && item.event_time, item && item.time, timeline.time);
    const knownBy = firstText(record.known_at, record.first_reported, record.first_verified_at, record.first_verified, item && item.known_at, item && item.first_reported, item && item.first_verified, timeline.known_at, timeline.first_reported, timeline.first_verified);
    const revisionKnownAt = [];
    const revisions = [item && item.revisions, record.revisions, timeline.revisions]
      .filter(Array.isArray)
      .flat();
    const knownByTime = knownBy ? Date.parse(knownBy) : Number.NaN;
    for (const revision of revisions) {
      const learned = revision && firstText(revision.known_at);
      if (!learned || learned === knownBy || revisionKnownAt.includes(learned)) continue;
      const learnedTime = Date.parse(learned);
      if (Number.isFinite(knownByTime) && Number.isFinite(learnedTime) && learnedTime <= knownByTime) continue;
      revisionKnownAt.push(learned);
    }
    return {
      occurred: firstText(record.occurred_at, record.timestamp, item && item.occurred_at, item && item.timestamp) || (date && time ? `${date} ${time}` : date),
      knownBy,
      revisionKnownAt
    };
  }

  function eventEvidenceValues(item) {
    const record = item && item.event && typeof item.event === 'object' ? item.event : item || {};
    const evidence = record.evidence_status && typeof record.evidence_status === 'object'
      ? record.evidence_status
      : item && item.evidence_status && typeof item.evidence_status === 'object' ? item.evidence_status : {};
    const explicitSupport = firstSemanticText(record.evidence_support, item && item.evidence_support, evidence.support);
    const status = firstSemanticText(
      typeof record.evidence_status === 'string' ? record.evidence_status : null,
      typeof item.evidence_status === 'string' ? item.evidence_status : null,
      evidence.status,
      evidence.classification
    );
    const disputeStatus = firstSemanticText(
      record.dispute_status,
      record.dispute_posture,
      item && item.dispute_status,
      item && item.dispute_posture,
      evidence.dispute,
      evidence.dispute_status,
      evidence.dispute_posture
    );
    const disputedBy = firstSemanticText(record.disputed_by, item && item.disputed_by, evidence.disputed_by);
    return {
      support: explicitSupport || status,
      explicitSupport,
      status,
      dispute: disputeStatus || disputedBy,
      disputeStatus,
      disputedBy,
      unresolved: firstSemanticText(record.unresolved_evidence, record.unresolved, record.evidence_gap, item && item.unresolved_evidence, item && item.unresolved, item && item.evidence_gap)
    };
  }

  function formatEvidenceClock(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return publicNarrative(value, 'Time unresolved');
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }).formatToParts(parsed);
    const part = type => parts.find(item => item.type === type)?.value || '';
    const months = { Jan: 'Jan.', Feb: 'Feb.', Mar: 'Mar.', Apr: 'Apr.', May: 'May', Jun: 'Jun.', Jul: 'Jul.', Aug: 'Aug.', Sep: 'Sep.', Oct: 'Oct.', Nov: 'Nov.', Dec: 'Dec.' };
    return `${months[part('month')] || part('month')} ${part('day')}, ${part('year')} · ${part('hour')}:${part('minute')} ${part('dayPeriod')} ET`;
  }

  function propositionStatusLabel(value) {
    const raw = String(value || '').toUpperCase();
    const labels = {
      SUBSTANTIALLY_TRUE: 'Substantially true',
      SUPPORTED: 'Substantially true',
      DISPROVEN: 'False',
      FALSE: 'False',
      UNSUPPORTED: 'Unsupported',
      DISPUTED: 'Disputed',
      UNRESOLVED: 'Unresolved'
    };
    return labels[raw] || plainLabel(value, 'Unresolved');
  }

  function deceptionDisplay(record) {
    const score = Number(record && record.deception_score);
    if (!Number.isInteger(score)) return 'Not separately scored';
    if (score === 0) return '0 — No evidence of knowing deception';
    const encoded = firstText(record.deception_label, record.deception_classification, record.deception_status);
    return encoded ? `${score} — ${publicNarrative(encoded)}` : `${score} — Basis recorded below`;
  }

  function objectiveChangeLabel(value) {
    const raw = typeof value === 'string'
      ? value
      : firstText(value && value.public_classification, value && value.classification, value && value.type, value && value.movement, value && value.status);
    if (!raw) return 'Objective revision';
    const upper = raw.toUpperCase();
    if (upper.includes('WALKBACK') && !/(CANDIDATE|POSSIBLE|IF_ADOPTED)/.test(upper)) return 'Walkback';
    if (upper.includes('BARGAINING')) return 'Bargaining position';
    if (upper.includes('PUBLIC_REFRAMING') || upper.includes('REFRAMING')) return 'Public reframing';
    if (upper.includes('NARROWED_OBJECTIVE') || upper.includes('NARROWED')) return 'Narrowed objective';
    if (upper.includes('OBJECTIVE_REVISION')) return 'Objective revision';
    return plainLabel(raw, 'Objective revision');
  }

  function lossQuantityLabel(record) {
    if (!record || record.quantity === null || record.quantity === undefined || record.quantity === '') return 'Quantity: unknown';
    return `Quantity: ${formatQuantity(record)}`;
  }

  function materialAssetClass(record) {
    if (record && record.military_platform === true) return 'Military';
    if (record && record.military_platform === false) return 'Commercial / civilian';
    return 'Asset class unresolved';
  }

  function explicitInstitutionalKnowledge(record) {
    const value = firstText(record && record.reasonable_institutional_knowledge, record && record.institutional_knowledge_status);
    if (record && record.reasonable_institutional_knowledge === true) return true;
    return value ? /^(ESTABLISHED|YES|SUPPORTED)$/i.test(value) : false;
  }

  function deceptionConclusion(record) {
    const individual = String(record && record.individual_deception_status || '').toUpperCase();
    const institutional = String(record && record.institutional_deception_status || '').toUpperCase();
    if (individual === 'ESTABLISHED') return 'Atlas assesses this as a lie: the claim was false, and evidence establishes that the speaker knew it was false when presenting it as true.';
    if (institutional === 'ESTABLISHED') return 'Atlas assesses that knowing falsehood entered the institutional information chain. The evidence does not establish which individual originated it.';
    return null;
  }

  function claimPublicSentence(record) {
    if (record && record.claim_id === 'LL-IRAN-SIX-VESSEL-SUCCESS-20260905') return 'IRGC claim: six vessel successes. Verified loss count not established.';
    const actor = publicNarrative(record && record.actor, 'The recorded actor');
    const proposition = publicNarrative(record && (record.proposition || record.claim), 'the recorded proposition');
    const status = propositionStatusLabel(record && record.truth_adjudication);
    const conclusion = deceptionConclusion(record || {});
    if (conclusion) return conclusion;
    if (status === 'False' && explicitInstitutionalKnowledge(record || {})) return 'The claim was false and concerned information ordinarily within the actor’s direct institutional knowledge.';
    if (status === 'False') return 'That claim was false.';
    if (status === 'Substantially true') return 'The central proposition is materially supported.';
    if (status === 'Unsupported') return 'The available evidence does not provide sufficient support for the proposition.';
    if (status === 'Disputed') return 'Material credible evidence contests the proposition, but the evidence does not justify classifying it true or false.';
    if (status === 'Unresolved') return 'Atlas cannot determine the proposition’s truth status from the available evidence.';
    return `${actor} claimed ${proposition} Current proposition status: ${status}.`;
  }

  function evidenceLayerRows(item, references) {
    const record = item && item.event && typeof item.event === 'object' ? item.event : item || {};
    const rows = [];
    const observation = firstSemanticText(record.observed_fact, record.observation, item && item.observation);
    const actorClaim = firstSemanticText(record.actor_claim, record.claim, item && item.actor_claim, item && item.claim);
    const corroboration = firstSemanticText(record.independent_corroboration, record.corroboration, item && item.independent_corroboration, item && item.corroboration);
    const assessment = firstSemanticText(record.atlas_assessment, record.assessment, record.adjudication_basis, record.adjudication_note, record.strongest_supported_conclusion, item && item.atlas_assessment, item && item.assessment);
    const unresolved = firstSemanticText(record.unresolved_evidence, record.unresolved, record.evidence_gap, item && item.unresolved_evidence, item && item.unresolved, item && item.evidence_gap);
    const competing = firstSemanticText(record.competing_explanations, record.alternatives, item && item.competing_explanations, item && item.alternatives);
    const limits = [firstSemanticText(record.confidence, item && item.confidence), firstSemanticText(record.limitations, record.limits, record.what_this_does_not_prove, item && item.limitations, item && item.limits)].filter(Boolean).join(' · ');
    if (observation) rows.push(['Observation', observation]);
    if (actorClaim) rows.push(['Actor claim', actorClaim]);
    if (references.length) rows.push(['Source reporting', `${references.length.toLocaleString()} cited source record${references.length === 1 ? '' : 's'} are listed below. Source reporting is not the same thing as independent establishment.`]);
    if (corroboration) rows.push(['Independent corroboration', corroboration]);
    if (assessment) rows.push(['Atlas assessment', assessment]);
    if (unresolved) rows.push(['Unresolved', unresolved]);
    if (competing) rows.push(['Competing explanation', competing]);
    if (limits) rows.push(['Confidence & limits', limits]);
    return rows;
  }

  function addEvidenceRoleGuide(host) {
    const guide = append(host, 'details', 'evidence-role-guide');
    append(guide, 'summary', '', 'Evidence role definitions');
    const list = append(guide, 'dl', 'evidence-role-definitions');
    [
      ['Observation', 'Directly observed or documented. It does not automatically establish attribution, cause, intent, or wider operational effect.'],
      ['Actor claim', 'A statement made by an involved or interested actor. A claim remains a claim unless separately established.'],
      ['Source reporting', 'What a cited source reports, including attributed information. Reporting is not automatic independent establishment.'],
      ['Independent corroboration', 'A separate evidentiary path that materially supports the proposition. Repetition of the same originating claim is not multiple confirmations.'],
      ['Atlas assessment', 'A reasoned analytical conclusion kept separate from source reporting and actor statements.'],
      ['Unresolved', 'Available evidence does not settle the point. Unresolved does not mean false, unsupported, zero, or disproven.'],
      ['Competing explanation', 'A materially plausible alternative explanation that has not been ruled out.'],
      ['Confidence & limits', 'The strength and limitations of the assessment. Atlas does not invent percentages when the record does not contain them.']
    ].forEach(([term, definition]) => { append(list, 'dt', '', term); append(list, 'dd', '', definition); });
    return guide;
  }

  function addEvidenceClocks(article, context) {
  const release = context.model && context.model.release || {};
  if (!release.gate2_evidence_cutoff || !release.current_osint_cutoff) return;
  const intro = article.querySelector('.page-intro');
  if (!intro) return;
  const clocks = element(context.documentObject, 'section', 'evidence-clocks evidence-clock-bar');
  clocks.dataset.component = 'EvidenceClocks';
  clocks.setAttribute('aria-label', 'Evidence cutoffs');
  const addClock = (host, className, label, value, shortExplanation, helpLabel, helpText) => {
    const item = append(host, 'article', `evidence-clock-item ${className}`);
    const summary = append(item, 'div', 'evidence-clock-summary');
    append(summary, 'strong', '', label);
    const time = append(summary, 'time', '', formatEvidenceClock(value)); time.dateTime = value;
    const help = append(item, 'details', 'evidence-clock-help'); append(help, 'summary', '', helpLabel); append(help, 'p', '', shortExplanation); append(help, 'p', '', helpText);
    return item;
  };
  const frozenArgs = ['frozen-evidence-clock', 'Frozen review cutoff', release.gate2_evidence_cutoff, 'Historical evaluation uses only evidence available by this time.', 'Why frozen?', "This is the fixed evidence boundary used for the historical Gate 2 review. Evidence incorporated later can strengthen or revise the current Atlas record, but it does not rewrite what was available for the frozen evaluation."];
  const currentArgs = ['current-evidence-clock', 'Current evidence cutoff', release.current_osint_cutoff, 'Current Atlas evidence includes material incorporated through this time.', 'How current works', 'This cutoff advances when new evidence is incorporated. It does not reopen or retroactively alter a frozen historical evaluation.'];
  const desktop = append(clocks, 'div', 'evidence-clock-desktop');
  addClock(desktop, ...frozenArgs); addClock(desktop, ...currentArgs);
  const mobile = append(clocks, 'details', 'evidence-clock-mobile');
  const mobileSummary = append(mobile, 'summary', 'evidence-clock-mobile-summary');
  append(mobileSummary, 'span', 'evidence-clock-mobile-text', `Evidence through ${formatEvidenceClock(release.current_osint_cutoff)} · Historical review ${formatEvidenceClock(release.gate2_evidence_cutoff)}`);
  append(mobileSummary, 'span', 'evidence-clock-mobile-action', 'Details');
  const mobileBody = append(mobile, 'div', 'evidence-clock-mobile-body');
  addClock(mobileBody, ...currentArgs); addClock(mobileBody, ...frozenArgs);
  const startState = context.route.key === 'start.overview' ? article.querySelector('[data-current-state-summary]') : null;
  (startState || intro).after(clocks);
}

  function appendDefinition(list, term, value) {
    if (value === null || value === undefined || value === '' || Array.isArray(value) && !value.length) return;
    append(list, 'dt', '', term);
    append(list, 'dd', '', Array.isArray(value) ? value.filter(Boolean).join('; ') : value);
  }

  function appendSourceLink(documentObject, parent, resolved) {
    const selected = resolved && resolved.selected;
    const record = selected && selected.record || {};
    const item = append(parent, 'li');
    const label = publicNarrative(record.title || record.publisher, resolved && resolved.sourceId || 'Source');
    if (record.url) {
      const link = append(item, 'a', '', label);
      link.href = record.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else append(item, 'span', '', label);
    const metadata = [
      publicNarrative(record.publisher),
      record.publicationDate,
      publicNarrative(record.role),
      publicNarrative(selected && selected.packageLabel)
    ].filter(Boolean);
    if (metadata.length) append(item, 'small', '', ` — ${metadata.join(' · ')}`);
    if (record.supports) append(item, 'small', '', ` ${publicNarrative(record.supports, '')}`);
    if (record.context) append(item, 'div', 'source-context', publicNarrative(record.context, ''));
    return item;
  }

  function appendSourceResolution(documentObject, parent, resolved) {
    if (!resolved || resolved.status === 'missing-source' || resolved.status === 'missing-variant') {
      append(parent, 'p', 'source-resolution-note', `${resolved && resolved.sourceId || 'Source'} — source version could not be resolved.`);
      return;
    }
    if (resolved.status === 'resolved') {
      const list = append(parent, 'ul', 'source-link-list');
      appendSourceLink(documentObject, list, resolved);
      return;
    }
    const details = append(parent, 'details', 'source-variants shared-source-variants');
    details.dataset.phase5SourceVariants = resolved.sourceId;
    append(details, 'summary', '', `Preserved source versions (${resolved.variants.length})`);
    append(details, 'p', 'source-variant-note', 'This source appears differently in preserved evidence packages, so Atlas keeps each version rather than silently choosing one.');
    const list = append(details, 'ul', 'source-link-list source-variant-list');
    resolved.variants.forEach(variant => appendSourceLink(documentObject, list, { sourceId: resolved.sourceId, selected: variant }));
  }

  const EvidenceDrawer = Object.freeze({
    create(context, item, options) {
      const documentObject = context.documentObject;
      const services = context.services;
      invariant(services && services.sourceResolver && services.actorIdentity && services.locationResolver, 'Shared evidence services are unavailable');
      const directReferences = item && (item.source_references || item.source_refs) || [];
      const listedIds = item && (item.source_ids || item.sources) || [];
      const references = [
        ...directReferences.map(reference => typeof reference === 'string' ? { source_id: reference } : reference),
        ...(Array.isArray(listedIds) ? listedIds : []).filter(value => typeof value === 'string' && !directReferences.some(reference => (typeof reference === 'string' ? reference : reference.source_id) === value)).map(sourceId => ({ source_id: sourceId }))
      ].filter((reference, index, rows) => reference && reference.source_id && rows.findIndex(row => row.source_id === reference.source_id && row.variant_key === reference.variant_key) === index);
      const relatedRecords = options && options.relatedRecords || [];
      const localSources = options && options.localSources || {};
      const details = element(documentObject, 'details', 'evidence-drawer');
      details.dataset.component = 'SharedEvidenceDrawer';
      append(details, 'summary', '', references.length || relatedRecords.length
        ? `Evidence (${references.length + relatedRecords.length})`
        : 'Evidence');
      const body = append(details, 'div', 'evidence-drawer-body');
      const layerRows = evidenceLayerRows(item, references);
      if (layerRows.length) { const layers = append(body, 'dl', 'evidence-layer-list'); layerRows.forEach(([term, value]) => { append(layers, 'dt', '', term); append(layers, 'dd', '', publicNarrative(value)); }); }
      addEvidenceRoleGuide(body);
      if (options && options.technicalId) {
        const metadata = append(body, 'dl', 'evidence-facts technical-record-metadata');
        appendDefinition(metadata, options.technicalIdLabel || 'Stable record ID', options.technicalId);
      }
      if (item && item.event_id) {
        const record = item.event && typeof item.event === 'object' ? item.event : item;
        const temporal = eventTemporalValues(item);
        const status = eventEvidenceValues(item);
        const actorValues = item.actor_ids || record.actor_ids || record.actors || [];
        const locationValues = item.location_ids || record.location_ids || [];
        const facts = append(body, 'dl', 'evidence-facts');
        appendDefinition(facts, 'Event ID', item.event_id);
        appendDefinition(facts, 'Event summary', firstText(record.summary, record.observed_fact, record.headline, item.summary));
        appendDefinition(facts, 'Event time', temporal.occurred);
        appendDefinition(facts, 'Known at the time', temporal.knownBy);
        appendDefinition(facts, 'Added later', temporal.revisionKnownAt);
        appendDefinition(facts, 'Actors', (Array.isArray(actorValues) ? actorValues : [actorValues]).map(value => services.actorIdentity.resolve(value).label));
        appendDefinition(facts, 'Locations', (Array.isArray(locationValues) ? locationValues : [locationValues]).map(value => {
          const location = services.locationResolver.resolve(value);
          return location ? location.label : typeof value === 'string' ? value : null;
        }));
        appendDefinition(facts, 'Evidence support', status.explicitSupport && (DISPLAY_TERMS[status.explicitSupport] || plainLabel(status.explicitSupport, 'Evidence support recorded')));
        appendDefinition(facts, 'Evidence status', status.status && (DISPLAY_TERMS[status.status] || plainLabel(status.status, 'Evidence status recorded')));
        appendDefinition(facts, 'Dispute status', status.disputeStatus && (DISPLAY_TERMS[status.disputeStatus] || plainLabel(status.disputeStatus, 'Dispute status recorded')));
        appendDefinition(facts, 'Disputed by', status.disputedBy && (DISPLAY_TERMS[status.disputedBy] || plainLabel(status.disputedBy, 'Recorded disputing party')));
        appendDefinition(facts, 'Unresolved evidence', status.unresolved);
      }
      if (!references.length && !relatedRecords.length) {
        append(body, 'p', '', 'No source links are attached to this summarized view.');
        return details;
      }
      if (references.length) {
        append(body, 'h4', '', 'Source reporting');
        references.forEach(reference => {
          let resolved = services.sourceResolver.resolveReference(reference);
          if (resolved.status === 'missing-source' && localSources[reference.source_id]) {
            resolved = services.sourceResolver.resolveLocal(reference.source_id, localSources[reference.source_id]);
          }
          appendSourceResolution(documentObject, body, resolved);
        });
      }
      if (relatedRecords.length) {
        append(body, 'h4', '', 'Related records');
        const list = append(body, 'ul', 'source-link-list record-reference-list');
        relatedRecords.forEach(recordId => {
          const itemNode = append(list, 'li');
          const link = append(itemNode, 'a', '', recordId);
          link.href = routeHref('timeline.chronology', { event: recordId });
        });
      }
      return details;
    }
  });

  function relationCandidates(record) {
    const nested = record && record.event && typeof record.event === 'object' ? record.event : {};
    return [record && record.facility_ref, record && record.facility_id, record && record.location_ref, record && record.map_ref, nested.facility_ref, nested.location_ref]
      .flatMap(value => Array.isArray(value) ? value : [value]).filter(Boolean);
  }

  function validMapPoint(point) {
    return Array.isArray(point) && point.length >= 2
      && point[0] !== null && point[0] !== undefined && point[0] !== ''
      && point[1] !== null && point[1] !== undefined && point[1] !== ''
      && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
      && Number(point[0]) >= -90 && Number(point[0]) <= 90
      && Number(point[1]) >= -180 && Number(point[1]) <= 180;
  }

  function pointFromRecord(record, locationResolver, relatedRecords) {
    if (!record || typeof record !== 'object') return null;
    const nested = record.event && typeof record.event === 'object' ? record.event : {};
    const rawIds = record.location_ids || nested.location_ids || (record.location_id ? [record.location_id] : nested.location_id ? [nested.location_id] : []);
    const ids = (Array.isArray(rawIds) ? rawIds : [rawIds]).filter(Boolean);
    let canonicalReferenceResolved = false;
    for (const id of ids) {
      const location = locationResolver && locationResolver.resolve(id);
      if (!location) continue;
      canonicalReferenceResolved = true;
      if (!validMapPoint([location.latitude, location.longitude])) continue;
      return {
        lat: location.latitude,
        lon: location.longitude,
        label: publicNarrative(location.label, record.event_id || 'Mapped record'),
        precision: plainLabel(location.precision, 'Recorded location')
      };
    }
    if (canonicalReferenceResolved) return null;
    const relations = relationCandidates(record);
    if (relations.length && Array.isArray(relatedRecords)) {
      const related = relatedRecords.find(item => {
        const identities = [item && item.location_id, item && item.facility_id, item && item.id, ...(Array.isArray(item && item.legacy_ids) ? item.legacy_ids : [])];
        return relations.some(reference => identities.includes(reference));
      });
      if (related) {
        const resolved = pointFromRecord(related, locationResolver, []);
        if (resolved) return { ...resolved, label: publicNarrative(record.name || record.title || related.name, resolved.label) };
      }
    }
    const candidates = [record, record.location, record.coordinate, nested.location, record.locations && record.locations[0]];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const latValue = candidate.latitude === undefined ? candidate.lat : candidate.latitude;
      const lonValue = candidate.longitude === undefined ? candidate.lon : candidate.longitude;
      if (latValue === null || latValue === undefined || latValue === '' || lonValue === null || lonValue === undefined || lonValue === '') continue;
      const lat = Number(latValue);
      const lon = Number(lonValue);
      if (!validMapPoint([lat, lon])) continue;
      return {
        lat,
        lon,
        label: publicNarrative(record.name || record.facility_name || candidate.name || record.event_id || record.id, 'Mapped record'),
        precision: plainLabel(candidate.precision || record.coordinate_precision || record.geographic_precision || record.location && record.location.precision, 'Recorded location')
      };
    }
    return null;
  }

  function routeAuthority(route) {
    const authority = route && (route.authority_class || route.route_authority || route.geometry_authority);
    return ['DOCUMENTED_TRACK', 'DOCUMENTED_CORRIDOR', 'SCHEMATIC_REFERENCE_ROUTE'].includes(authority) ? authority : null;
  }

  function routeGeometry(route) {
    if (!route || !routeAuthority(route)) return [];
    const coordinates = route.geometry && route.geometry.type === 'LineString' ? route.geometry.coordinates.map(point => [point[1], point[0]]) : route.coords;
    return asArray(coordinates).map(point => [Number(point && point[0]), Number(point && point[1])]).filter(validMapPoint);
  }

  function pointAlongPolyline(coordinates, fraction) {
    const points = asArray(coordinates);
    if (!points.length) return null;
    if (points.length === 1) return points[0].slice();
    const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
    const total = lengths.reduce((sum, value) => sum + value, 0);
    if (!total) return points[0].slice();
    let target = Math.max(0, Math.min(1, Number(fraction) || 0)) * total;
    for (let index = 0; index < lengths.length; index += 1) {
      if (target > lengths[index]) { target -= lengths[index]; continue; }
      const ratio = lengths[index] ? target / lengths[index] : 0;
      return [
        points[index][0] + (points[index + 1][0] - points[index][0]) * ratio,
        points[index][1] + (points[index + 1][1] - points[index][1]) * ratio
      ];
    }
    return points[points.length - 1].slice();
  }

  function normalizeBounds(value) {
    if (!value) return null;
    if (Array.isArray(value) && value.length === 2 && value.every(point => Array.isArray(point) && point.length >= 2)) {
      const bounds = value.map(point => [Number(point[0]), Number(point[1])]);
      return bounds.every(validMapPoint) ? bounds : null;
    }
    if (typeof value === 'object') {
      const south = Number(value.south === undefined ? value.min_lat : value.south);
      const west = Number(value.west === undefined ? value.min_lon : value.west);
      const north = Number(value.north === undefined ? value.max_lat : value.north);
      const east = Number(value.east === undefined ? value.max_lon : value.east);
      if ([south, west, north, east].every(Number.isFinite) && validMapPoint([south, west]) && validMapPoint([north, east])) return [[south, west], [north, east]];
    }
    return null;
  }

  function normalizeFootprint(value) {
    if (!value) return null;
    let coordinates = value;
    let geoJsonOrder = false;
    if (value.type === 'Polygon') { coordinates = value.coordinates && value.coordinates[0]; geoJsonOrder = true; }
    if (!Array.isArray(coordinates) || coordinates.length < 3) return null;
    const result = coordinates.map(point => geoJsonOrder ? [Number(point && point[1]), Number(point && point[0])] : [Number(point && point[0]), Number(point && point[1])]);
    return result.every(validMapPoint) ? result : null;
  }

  function safeImageUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) return value;
    const authorized = root.ATLAS_AUTHORIZED_MEDIA && root.ATLAS_AUTHORIZED_MEDIA[value];
    return authorized || null;
  }

  function imageryPayloads(record) {
    if (!record || typeof record !== 'object') return [];
    const nested = record.imagery || record.bda || record.event && (record.event.imagery || record.event.bda);
    if (nested) return asArray(Array.isArray(nested) ? nested : [nested]).filter(value => value && typeof value === 'object').map(value => ({ ...value, evidence_record: record }));
    const imageryShape = record.damage_imagery_source_ids || record.image_url || record.thumbnail_url || record.image_bounds || record.georeferenced_bounds || record.footprint || record.corners || record.imagery_type || record.observation_id && record.observation;
    return imageryShape ? [record] : [];
  }

  function imageryDescriptor(record, locationResolver, relatedRecords) {
    const evidenceRecord = record && record.evidence_record || record;
    const bounds = normalizeBounds(record && (record.georeferenced_bounds || record.image_bounds || record.bounds));
    const footprintValue = record && (record.footprint || record.corners || (record.geometry && record.geometry.type === 'Polygon' ? record.geometry : null));
    const footprint = normalizeFootprint(footprintValue);
    const imageUrl = safeImageUrl(record && (record.image_url || record.thumbnail_url || record.asset_path));
    const point = pointFromRecord(evidenceRecord, locationResolver, relatedRecords);
    const reliability = String(record && (record.geolocation_precision || record.geographic_precision || record.precision || record.coordinate_precision || record.coordinate && record.coordinate.precision) || '').toLowerCase();
    const reliable = record && record.geolocation_reliable !== false && !/(unknown|unresolved|unreliable)/.test(reliability);
    const tier = bounds && imageUrl && reliable ? 'A' : footprint && reliable ? 'B' : point ? 'C' : 'D';
    return Object.freeze({ record, evidenceRecord, bounds, footprint, imageUrl, point, tier });
  }

  function mapTitle(record, fallback) {
    const nested = record && record.event || {};
    return publicNarrative(record && (record.name || record.title || record.facility_name || record.target || record.label) || nested.title || nested.summary, fallback || 'Recorded evidence');
  }

  function mapDate(record) {
    const nested = record && record.event || {};
    const value = record && (record.date || record.capture_date || record.publication_date || record.imagery_date) || record && record.timeline && record.timeline.date || nested.date;
    return value ? readableDate(value) : '';
  }

  function evidenceEnvelope(record) {
    const nested = record && record.event || {};
    return {
      source_ids: [record && record.source_ids, record && record.sources, record && record.damage_imagery_source_ids, nested.source_ids].flatMap(value => asArray(value)).filter(value => typeof value === 'string')
    };
  }

  function routeSources(route) {
    const localSources = {};
    const sourceIds = [];
    asArray(route && route.sources).forEach((source, index) => {
      if (!Array.isArray(source) || !source[0]) return;
      const sourceId = `${route.id || 'ROUTE'}-SOURCE-${index + 1}`;
      sourceIds.push(sourceId);
      localSources[sourceId] = { title: source[0], url: source[1] || null, publisher: 'Route evidence source' };
    });
    return { sourceIds, localSources };
  }

  function routeViewport(routeKey) {
    if (String(routeKey).startsWith('hormuz.')) return [[22.4, 50.8], [28.9, 60.8]];
    if (String(routeKey).startsWith('military.')) return [[22.5, 42.0], [40.5, 67.5]];
    if (String(routeKey).startsWith('timeline.')) return [[11.0, 32.0], [40.5, 67.5]];
    return [[11.0, 32.0], [40.5, 67.5]];
  }

  function geometryPoints(geometry) {
    if (!geometry || typeof geometry !== 'object') return [];
    const points = [];
    const visit = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
        const point = [Number(value[1]), Number(value[0])];
        if (validMapPoint(point)) points.push(point);
        return;
      }
      value.forEach(visit);
    };
    visit(geometry.coordinates);
    return points;
  }

  function deriveMapViewport(pointRecords, routes, imagery, countryFeatures, fallback) {
    const coordinates = [];
    asArray(pointRecords).forEach(item => {
      const point = item && item.point ? [item.point.lat, item.point.lon] : item;
      if (validMapPoint(point)) coordinates.push(point.map(Number));
    });
    asArray(routes).forEach(route => routeGeometry(route).forEach(point => coordinates.push(point)));
    asArray(imagery).forEach(item => {
      if (item && item.bounds) item.bounds.forEach(point => { if (validMapPoint(point)) coordinates.push(point.map(Number)); });
      if (item && item.footprint) item.footprint.forEach(point => { if (validMapPoint(point)) coordinates.push(point.map(Number)); });
      if (item && item.point && validMapPoint([item.point.lat, item.point.lon])) coordinates.push([item.point.lat, item.point.lon]);
    });
    asArray(countryFeatures).forEach(feature => geometryPoints(feature && feature.geometry).forEach(point => coordinates.push(point)));
    if (!coordinates.length) return Object.freeze({ bounds: fallback, derived: false, coordinateCount: 0 });
    const latitudes = coordinates.map(point => point[0]);
    const longitudes = coordinates.map(point => point[1]);
    let south = Math.min(...latitudes); let north = Math.max(...latitudes);
    let west = Math.min(...longitudes); let east = Math.max(...longitudes);
    if (south === north) { south = Math.max(-90, south - .75); north = Math.min(90, north + .75); }
    if (west === east) { west = Math.max(-180, west - .75); east = Math.min(180, east + .75); }
    return Object.freeze({ bounds: Object.freeze([[south, west], [north, east]].map(point => Object.freeze(point))), derived: true, coordinateCount: coordinates.length });
  }

  function countryKey(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'türkiye' || normalized === 'turkiye') return 'turkey';
    if (normalized.startsWith('yemen')) return 'yemen';
    return normalized;
  }

  const MapView = Object.freeze({
    pointFromRecord,
    pointAlongPolyline,
    routeGeometry,
    imageryDescriptor,
    deriveMapViewport,
    create(context, options) {
      const documentObject = context.documentObject;
      const section = element(documentObject, 'section', 'context-map');
      section.dataset.component = 'MapView';
      section.dataset.mapScope = options && options.scope || 'context';
      append(section, 'h2', '', options && options.title || 'Geographic context');
      const records = asArray(options && options.records);
      const relatedRecords = asArray(options && options.relatedRecords);
      const routes = asArray(options && options.routes).filter(route => routeGeometry(route).length > 1);
      const imagery = records.flatMap(record => imageryPayloads(record).map(payload => imageryDescriptor(payload, context.services.locationResolver, relatedRecords)));
      const imageryRecords = new Set(imagery.map(item => item.evidenceRecord));
      const points = records.filter(record => !imageryRecords.has(record)).map(record => ({ record, point: pointFromRecord(record, context.services.locationResolver, relatedRecords) })).filter(item => item.point);
      imagery.filter(item => item.point && ['C'].includes(item.tier)).forEach(item => points.push({ record: item.evidenceRecord, point: item.point, imagery: item }));
      const groups = new Map();
      points.forEach(item => {
        const key = `${item.point.lat.toFixed(6)},${item.point.lon.toFixed(6)}`;
        if (!groups.has(key)) groups.set(key, { point: item.point, items: [] });
        groups.get(key).items.push(item);
      });
      const geography = root.ATLAS_REFERENCE_GEOGRAPHY;
      const countryNames = asArray(options && options.countryNames).map(countryKey).filter(Boolean);
      const selectedCountryFeatures = geography && geography.type === 'FeatureCollection'
        ? geography.features.filter(feature => feature.properties && feature.properties.layer === 'regional_50m' && countryNames.includes(countryKey(feature.properties.name)))
        : [];
      const routeKey = context.route && context.route.key || '';
      const fallbackViewport = options && options.fallbackViewport || routeViewport(routeKey);
      const viewportInfo = options && options.viewportOverride ? Object.freeze({ bounds: normalizeBounds(options.viewportOverride) || fallbackViewport, derived: false, coordinateCount: points.length }) : deriveMapViewport(points, routes, imagery, selectedCountryFeatures, fallbackViewport);
      const viewport = viewportInfo.bounds;
      section.dataset.mapExtentSource = viewportInfo.derived ? 'visible-records' : 'deterministic-fallback';
      section.dataset.mapBounds = JSON.stringify(viewport);
      section.dataset.mapRouteModes = Array.from(new Set(routes.map(route => String(route.mode || '').toLowerCase()).filter(Boolean))).sort().join(',');
      if (countryNames.length) section.dataset.mapCountries = countryNames.join(',');
      append(section, 'p', '', options && options.description || (groups.size
        ? `${groups.size.toLocaleString()} source-linked locations are shown. Geographic precision follows the underlying record.`
        : 'No source-supported point coordinates are available for these records. Reference geography remains available for context.'));
      if (options && options.contextNote) append(section, 'p', 'map-context-note', options.contextNote);

      const mapHost = append(section, 'div', 'atlas-leaflet-map');
      mapHost.setAttribute('role', 'region');
      mapHost.setAttribute('aria-label', `${options && options.title || 'Evidence map'}; ${groups.size} mapped locations`);
      mapHost.tabIndex = 0;
      const cardHost = append(section, 'div', 'map-selection-card');
      cardHost.hidden = true;
      cardHost.setAttribute('aria-live', 'polite');
      const imageryLayers = new Map();
      const renderEvidenceCard = (record, extra) => {
        cardHost.replaceChildren();
        cardHost.hidden = false;
        const card = append(cardHost, 'article', 'map-card');
        append(card, 'p', 'card-kicker', extra && extra.kicker || 'Mapped evidence');
        append(card, 'h3', '', mapTitle(record, extra && extra.title));
        const date = mapDate(record);
        if (date) append(card, 'p', 'record-status', date);
        const nested = record && record.event || {};
        const summary = publicNarrative(record && (record.summary || record.observation || record.note || record.limitations || record.assessment) || nested.summary, extra && extra.text || 'This location is supplied by the current evidence record.');
        append(card, 'p', '', summary);
        if (extra && extra.meta) append(card, 'p', 'map-card-meta', extra.meta);
        const envelope = evidenceEnvelope(extra && extra.evidenceRecord || record);
        if (envelope.source_ids.length) card.append(EvidenceDrawer.create(context, envelope, { relatedRecords: relatedRecordsFrom(extra && extra.evidenceRecord || record) }));
        const close = append(card, 'button', 'map-card-close', 'Close map card');
        close.type = 'button';
        close.addEventListener('click', () => { cardHost.hidden = true; cardHost.replaceChildren(); mapHost.focus(); });
      };
      const L = root.L;
      if (L && geography && geography.type === 'FeatureCollection') {
        const map = L.map(mapHost, { attributionControl: false, scrollWheelZoom: false, zoomControl: true, minZoom: 1, maxZoom: 10, worldCopyJump: false });
        ['reference', 'routes', 'imagery', 'evidence', 'labels'].forEach((name, index) => {
          map.createPane(`atlas-${name}`);
          map.getPane(`atlas-${name}`).style.zIndex = String(210 + index * 80);
        });
        const hormuzOnly = viewport[0][0] >= 22.4 && viewport[1][0] <= 28.9 && viewport[0][1] >= 50.8 && viewport[1][1] <= 60.8;
        const detailLayer = hormuzOnly ? 'hormuz_10m' : 'regional_50m';
        const features = geography.features.filter(feature => feature.properties && feature.properties.layer === detailLayer);
        L.geoJSON({ type: 'FeatureCollection', features }, {
          pane: 'atlas-reference', interactive: false,
          style: { color: '#587082', weight: detailLayer === 'hormuz_10m' ? 1.2 : .8, fillColor: '#172732', fillOpacity: .92 }
        }).addTo(map);
        if (selectedCountryFeatures.length) {
          L.geoJSON({ type: 'FeatureCollection', features: selectedCountryFeatures }, {
            pane: 'atlas-evidence', interactive: false,
            style: { color: '#f0c875', weight: 1.8, fillColor: '#8f6f2e', fillOpacity: .28, dashArray: '5 4' }
          }).addTo(map);
        }
        routes.forEach(route => {
          const coordinates = routeGeometry(route);
          const authority = routeAuthority(route);
          const mode = String(route.mode || 'transport').toLowerCase();
          const maritime = mode === 'maritime';
          const pipeline = mode === 'pipeline';
          const line = L.polyline(coordinates, {
            pane: 'atlas-routes', color: maritime ? '#7fcbe8' : pipeline ? '#e9b96e' : '#c6a8ee', weight: pipeline ? 5 : 4, opacity: .92,
            dashArray: maritime ? null : pipeline ? '13 8' : '3 7', lineCap: pipeline ? 'butt' : 'round'
          }).addTo(map);
          const lineElement = line.getElement && line.getElement();
          if (lineElement) { lineElement.dataset.routeMode = mode; lineElement.dataset.routeId = route.id || ''; }
          line.on('click', () => {
            const sources = routeSources(route);
            cardHost.replaceChildren(); cardHost.hidden = false;
            const card = append(cardHost, 'article', 'map-card');
            append(card, 'p', 'card-kicker', authority === 'SCHEMATIC_REFERENCE_ROUTE' ? 'Schematic reference route' : authority === 'DOCUMENTED_TRACK' ? 'Documented track' : 'Documented corridor');
            append(card, 'h3', '', publicNarrative(route.name, 'Transport route'));
            append(card, 'p', '', publicNarrative(route.note, 'The stored route geometry is shown in sequence.'));
            append(card, 'p', 'map-card-meta', maritime ? 'Schematic · not live vessel tracking.' : pipeline ? 'Schematic · not a surveyed pipeline alignment or targeting-quality geometry.' : 'Schematic · not exact rail alignment, live movement, or targeting-quality geometry.');
            if (sources.sourceIds.length) card.append(EvidenceDrawer.create(context, { source_ids: sources.sourceIds }, { localSources: sources.localSources }));
            const close = append(card, 'button', 'map-card-close', 'Close map card'); close.type = 'button'; close.addEventListener('click', () => { cardHost.hidden = true; cardHost.replaceChildren(); mapHost.focus(); });
          });
          const flowPoint = pointAlongPolyline(coordinates, .58);
          if (flowPoint) L.marker(flowPoint, { pane: 'atlas-routes', interactive: false, icon: L.divIcon({ className: `route-flow-marker route-flow-${mode}`, html: `<span aria-hidden="true">${maritime ? '›' : pipeline ? '◆' : 'Ⅱ'}</span>`, iconSize: [24, 24] }) }).addTo(map);
        });
        let selectedOverlay = null;
        imagery.forEach((item, index) => {
          const title = mapTitle(item.evidenceRecord, item.point && item.point.label || `Imagery record ${index + 1}`);
          if (item.tier === 'A') {
            const overlay = L.imageOverlay(item.imageUrl, item.bounds, { pane: 'atlas-imagery', opacity: .56, alt: `${title} imagery overlay`, interactive: true }).addTo(map);
            imageryLayers.set(item, overlay);
            overlay.on('click', () => { if (selectedOverlay && selectedOverlay !== overlay) selectedOverlay.setOpacity(.36); selectedOverlay = overlay; overlay.setOpacity(.72); renderEvidenceCard(item.evidenceRecord, { kicker: 'Georeferenced imagery', meta: 'The evidence record supplies reliable image bounds.', evidenceRecord: item.evidenceRecord }); });
          } else if (item.tier === 'B') {
            const footprintLayer = L.polygon(item.footprint, { pane: 'atlas-imagery', color: '#e9c983', weight: 2, fillOpacity: .18 }).addTo(map);
            imageryLayers.set(item, footprintLayer);
            footprintLayer.on('click', () => renderEvidenceCard(item.evidenceRecord, { kicker: 'Imagery footprint', meta: 'The evidence record supplies a footprint; the preview is not stretched into a false rectangle.', evidenceRecord: item.evidenceRecord }));
          }
        });
        const keyboardMarkers = [];
        groups.forEach(group => {
          const count = group.items.length;
          const label = count > 1 ? `${count} records at ${group.point.label}` : group.point.label;
          const marker = L.marker([group.point.lat, group.point.lon], {
            pane: 'atlas-evidence', keyboard: true, title: label,
            icon: L.divIcon({ className: `evidence-map-marker${count > 1 ? ' marker-cluster' : ''}`, html: `<span aria-hidden="true">${count > 1 ? count : '•'}</span>`, iconSize: [count > 1 ? 34 : 26, count > 1 ? 34 : 26] })
          }).addTo(map);
          keyboardMarkers.push(marker);
          marker.on('click', () => {
            if (count === 1) {
              const item = group.items[0];
              const imageryMeta = item.imagery ? 'Precise image footprint unavailable; the imagery card is anchored to the supported location.' : `${group.point.precision}.`;
              renderEvidenceCard(item.record, { kicker: item.imagery ? 'Location-linked imagery' : 'Mapped evidence', title: item.point.label, meta: imageryMeta, evidenceRecord: item.record });
              return;
            }
            cardHost.replaceChildren(); cardHost.hidden = false;
            const card = append(cardHost, 'article', 'map-card');
            append(card, 'p', 'card-kicker', 'Shared recorded location');
            append(card, 'h3', '', `${count} records at ${group.point.label}`);
            const list = append(card, 'ul', 'map-card-records');
            group.items.forEach(item => {
              const row = append(list, 'li');
              const button = append(row, 'button', 'map-record-button', mapTitle(item.record, item.point.label));
              button.type = 'button'; button.addEventListener('click', () => renderEvidenceCard(item.record, { kicker: item.imagery ? 'Location-linked imagery' : 'Mapped evidence', title: item.point.label, evidenceRecord: item.record }));
            });
          });
        });
        const fitVisibleGeography = () => map.fitBounds(viewport, { padding: options && options.padding || [20, 20], maxZoom: options && options.maxZoom || 7, animate: false });
        fitVisibleGeography();
        map._atlasDataBounds = viewport;
        map._atlasExtentSource = viewportInfo.derived ? 'visible-records' : 'deterministic-fallback';
        keyboardMarkers.forEach(marker => {
          const markerElement = marker.getElement();
          if (!markerElement) return;
          markerElement.addEventListener('keydown', event => {
            if (event.key !== ' ' && event.code !== 'Space' && event.key !== 'Spacebar') return;
            event.preventDefault(); marker.fire('click');
          }, true);
        });
        const routeHeavy = routes.length > 1;
        const campaignReferenceNames = new Set(['Iran', 'Iraq', 'Saudi Arabia', 'Israel / Palestinian territories', 'United Arab Emirates', 'Oman', 'Red Sea', 'Persian Gulf', 'Strait of Hormuz']);
        const routeReferenceNames = new Set(['Iran', 'Saudi Arabia', 'Red Sea', 'Persian Gulf']);
        const allowedReferenceNames = options && options.referenceLabelNames
          ? new Set(asArray(options.referenceLabelNames))
          : routeHeavy ? routeReferenceNames : routeKey === 'military.campaigns' ? campaignReferenceNames : null;
        const windowWidth = Number(context.windowObject && context.windowObject.innerWidth || 1440);
        const compactLabelMode = windowWidth <= 390;
        const referenceLabels = asArray(geography.metadata && geography.metadata.labels)
          .filter(label => !allowedReferenceNames || allowedReferenceNames.has(label.label))
          .map(label => ({ ...label, priority: compactLabelMode ? (label.kind === 'water' ? 0 : 1) : (label.kind === 'water' ? 1 : 2) }));
        const suppliedContextLabels = asArray(options && options.contextLabels);
        const derivedContextLabels = (suppliedContextLabels.length ? suppliedContextLabels : routeHeavy ? routeContextLabels(routes, true) : [])
          .map(label => ({ ...label, priority: compactLabelMode ? 2 : Number(label.priority ?? 0) }));
        const visibleLabels = [...referenceLabels, ...derivedContextLabels]
          .filter((label, index, labels) => label && Number.isFinite(Number(label.lat)) && Number.isFinite(Number(label.lon)) && labels.findIndex(candidate => candidate && candidate.label === label.label && Number(candidate.lat) === Number(label.lat) && Number(candidate.lon) === Number(label.lon)) === index)
          .filter(label => label.lat >= viewport[0][0] && label.lat <= viewport[1][0] && label.lon >= viewport[0][1] && label.lon <= viewport[1][1])
          .sort((left, right) => Number(left.priority ?? 2) - Number(right.priority ?? 2));
        const automaticLabelLimit = routeHeavy ? (windowWidth <= 390 ? 12 : windowWidth <= 768 ? 12 : 14) : routeKey === 'military.campaigns' ? (windowWidth <= 390 ? 10 : windowWidth <= 768 ? 10 : 10) : Number.POSITIVE_INFINITY;
        const configuredLabelLimit = Number(options && options.labelLimit);
        const labelLimit = Number.isFinite(configuredLabelLimit) && configuredLabelLimit > 0 ? configuredLabelLimit : automaticLabelLimit;
        const renderedLabels = visibleLabels.slice(0, labelLimit);
        section.dataset.mapLabelPolicy = routeHeavy ? 'route-endpoints-prioritized' : routeKey === 'military.campaigns' ? 'theater-context-prioritized' : 'viewport-reference';
        section.dataset.mapLabelCount = String(renderedLabels.length);
        const labelMarkers = [];
        renderedLabels.forEach(label => {
          const marker = L.marker([label.lat, label.lon], { pane: 'atlas-labels', interactive: false, icon: L.divIcon({ className: `reference-map-label ${label.kind || ''}`, html: `<span>${String(label.label).replace(/[<>&]/g, '')}</span>`, iconSize: null }) }).addTo(map);
          labelMarkers.push(marker);
        });
        const declutterReferenceLabels = () => {
          const nodes = labelMarkers.map(marker => marker.getElement()).filter(Boolean);
          nodes.forEach(node => { node.style.display = ''; });
          if (windowWidth > 768) { section.dataset.mapVisibleLabelCount = String(nodes.length); return; }
          const kept = [];
          const hostRect = mapHost.getBoundingClientRect();
          const maxVisible = windowWidth <= 390 ? (routeHeavy ? 6 : 7) : (routeHeavy ? 9 : 10);
          nodes.forEach(node => {
            const span = node.querySelector('span') || node;
            const rect = span.getBoundingClientRect();
            const clipped = rect.left < hostRect.left + 4 || rect.right > hostRect.right - 4 || rect.top < hostRect.top + 4 || rect.bottom > hostRect.bottom - 4;
            if (clipped) { node.style.display = 'none'; return; }
            const box = { left: rect.left - 4, right: rect.right + 4, top: rect.top - 3, bottom: rect.bottom + 3 };
            const collides = kept.some(prior => !(box.right <= prior.left || box.left >= prior.right || box.bottom <= prior.top || box.top >= prior.bottom));
            if (collides || kept.length >= maxVisible) node.style.display = 'none';
            else kept.push(box);
          });
          section.dataset.mapVisibleLabelCount = String(kept.length);
        };
        map.on('zoomend moveend', declutterReferenceLabels);
        mapHost.addEventListener('keydown', event => { if (event.key === 'Escape' && !cardHost.hidden) { event.preventDefault(); cardHost.hidden = true; cardHost.replaceChildren(); } });
        if (root.requestAnimationFrame) root.requestAnimationFrame(() => {
          if (!section.isConnected || !map._mapPane) return;
          map.invalidateSize(false); fitVisibleGeography(); declutterReferenceLabels();
        });
        section._atlasMap = map;
      } else {
        append(mapHost, 'p', 'empty-state', 'The authorized local reference geography is unavailable. Textual locations remain below.');
      }
      const routeControls = routes.length ? append(section, 'div', 'map-route-controls') : null;
      if (routeControls) routes.forEach(route => {
        const button = append(routeControls, 'button', 'map-route-button', publicNarrative(route.name, 'Transport route'));
        button.type = 'button'; button.dataset.routeId = route.id || ''; button.dataset.routeMode = String(route.mode || '').toLowerCase();
        button.addEventListener('click', () => {
          const sources = routeSources(route);
          cardHost.replaceChildren(); cardHost.hidden = false;
          const card = append(cardHost, 'article', 'map-card');
          append(card, 'p', 'card-kicker', routeAuthority(route) === 'SCHEMATIC_REFERENCE_ROUTE' ? 'Schematic reference route' : plainLabel(routeAuthority(route), 'Documented route'));
          append(card, 'h3', '', publicNarrative(route.name, 'Transport route'));
          append(card, 'p', '', publicNarrative(route.note));
          const mode = String(route.mode || '').toLowerCase();
          append(card, 'p', 'map-card-meta', mode === 'maritime' ? 'Schematic · not live vessel tracking.' : mode === 'pipeline' ? 'Schematic · not a surveyed pipeline alignment or targeting-quality geometry.' : 'Schematic · not exact rail alignment, live movement, or targeting-quality geometry.');
          if (sources.sourceIds.length) card.append(EvidenceDrawer.create(context, { source_ids: sources.sourceIds }, { localSources: sources.localSources }));
        });
      });
      const imageryControls = imagery.length ? append(section, 'div', 'map-imagery-controls') : null;
      if (imageryControls) {
        append(imageryControls, 'p', 'map-control-label', imagery.length > 1 ? 'Imagery and damage records shown' : 'Imagery or damage record');
        imagery.forEach(item => {
          const imageryType = item.evidenceRecord.observation_id ? 'Physical damage observation' : publicNarrative(item.record.imagery_type, 'Imagery evidence');
          const date = mapDate(item.evidenceRecord);
          const owner = imageryActor(item, relatedRecords);
          const button = append(imageryControls, 'button', 'map-imagery-button', [date, owner, imageryType, mapTitle(item.evidenceRecord, item.point && item.point.label)].filter(Boolean).join(' · '));
          button.type = 'button';
          button.addEventListener('click', () => {
            const meta = item.tier === 'A' ? 'Reliable image bounds support a geographic overlay.' : item.tier === 'B' ? 'A reliable footprint is shown without manufacturing an image rectangle.' : item.tier === 'C' ? 'Precise image footprint unavailable; the card is anchored to the supported location.' : 'Reliable geolocation unavailable; no map overlay is created.';
            renderEvidenceCard(item.evidenceRecord, { kicker: item.tier === 'D' ? imageryType : `${imageryType} · geographically linked`, title: item.point && item.point.label, meta, evidenceRecord: item.evidenceRecord });
            const layer = imageryLayers.get(item); if (layer && layer.setOpacity) layer.setOpacity(.72);
          });
        });
      }
      const legend = append(section, 'div', 'map-legend');
      if (groups.size) append(legend, 'span', '', 'Recorded evidence location');
      if (imagery.length) append(legend, 'span', '', 'Damage / imagery evidence');
      if (selectedCountryFeatures.length) append(legend, 'span', 'legend-country', 'Recorded participant state');
      if (routes.some(route => String(route.mode).toLowerCase() === 'maritime')) append(legend, 'span', 'legend-route legend-maritime', 'Maritime · schematic');
      if (routes.some(route => String(route.mode).toLowerCase() === 'pipeline')) append(legend, 'span', 'legend-route legend-pipeline', 'Pipeline · schematic');
      if (routes.some(route => String(route.mode).toLowerCase() === 'rail')) append(legend, 'span', 'legend-route legend-rail', 'Rail · schematic');
      append(legend, 'span', '', 'Reference geography');
      if (routes.length) append(section, 'p', 'map-mode-boundary', 'Strategic corridor diagrams are schematic: maritime lines are not live vessel tracking, pipeline lines are not surveyed alignments, and rail lines are not exact track alignments or live movements.');
      append(section, 'small', 'map-caveat', 'Locations follow the evidence record · routes are schematic · not live tracking, surveyed alignment, targeting, or navigation data');
      const equivalent = append(section, 'details');
      equivalent.dataset.phase5MapEquivalent = 'locations'; equivalent.dataset.phase6MapEquivalent = 'geography';
      append(equivalent, 'summary', '', `Text equivalent for this map (${groups.size} locations${selectedCountryFeatures.length ? `; ${selectedCountryFeatures.length} participant states` : ''})`);
      const list = append(equivalent, 'ul');
      selectedCountryFeatures.forEach(feature => append(list, 'li', '', `${feature.properties.name} · participant-state reference geography; not an operational headquarters or command location`));
      groups.forEach(group => append(list, 'li', '', `${group.point.label} · ${group.point.precision} · ${group.items.length} record${group.items.length === 1 ? '' : 's'}`));
      routes.forEach(route => append(list, 'li', '', `${publicNarrative(route.name)} · ${routeAuthority(route) === 'SCHEMATIC_REFERENCE_ROUTE' ? 'schematic reference route' : plainLabel(routeAuthority(route))} · ${publicNarrative(route.note)}`));
      imagery.forEach(item => {
        const placement = item.tier === 'A' ? 'georeferenced image overlay' : item.tier === 'B' ? 'recorded image footprint' : item.tier === 'C' ? 'location-linked imagery card; precise footprint unavailable' : 'evidence card only; reliable geolocation unavailable';
        append(list, 'li', '', `${item.evidenceRecord.observation_id ? 'Physical damage observation' : publicNarrative(item.record.imagery_type, 'Imagery evidence')} · ${mapTitle(item.evidenceRecord, item.point && item.point.label)} · ${placement}${item.point ? ` · ${item.point.label} · ${item.point.precision}` : ''}`);
      });
      return section;
    }
  });

  function pageFrame(context, description) {
    const article = element(context.documentObject, 'article', 'public-page');
    article.dataset.pageOwner = context.route.owner;
    const intro = append(article, 'header', 'page-intro');
    append(intro, 'p', 'eyebrow', context.route.primaryLabel);
    const heading = append(intro, 'h1', '', context.route.title); heading.tabIndex = -1;
    append(intro, 'p', '', description);
    return { article, heading };
  }

  function addSection(host, title, className) {
    const section = append(host, 'section', className || 'content-section');
    append(section, 'h2', '', title);
    return section;
  }

  function asArray(value) { return Array.isArray(value) ? value : []; }

  function sourceIdsFrom(item) {
    if (!item || typeof item !== 'object') return [];
    const values = [item.source_ids, item.sources, item.damage_imagery_source_ids, item.evidence];
    return values.flatMap(value => asArray(value)).filter(value => typeof value === 'string');
  }

  function facilityAuditSourceIds(audit) {
    return [...new Set(asArray(audit && audit.propositions).flatMap(proposition => asArray(proposition && proposition.basis_sources)).filter(value => typeof value === 'string'))];
  }

  function facilitySourceContext(facility) {
    const sourceIds = [...new Set(sourceIdsFrom(facility))];
    const localSources = {};
    asArray(facility && facility.unresolved_source_urls).forEach((url, index) => {
      const sourceId = `PRESERVED-FACILITY-${facility.facility_id}-SOURCE-${index + 1}`;
      sourceIds.push(sourceId);
      localSources[sourceId] = { title: `${publicNarrative(facility.name, facility.facility_id)} source`, publisher: 'Preserved facility evidence source', url };
    });
    return { sourceIds, localSources };
  }

  function appendFacilityAudit(host, context, audit) {
    const details = append(host, 'details', 'facility-claim-audit');
    details.dataset.facilityAuditId = audit.facility_audit_id;
    append(details, 'summary', '', `Facility claim review · ${asArray(audit.propositions).length} question${asArray(audit.propositions).length === 1 ? '' : 's'}`);
    append(details, 'p', 'section-note', 'The review separates the reported claim, observed physical effect, functional assessment and unresolved questions. Confirming one point does not confirm every claim about the facility.');
    const list = append(details, 'ul', 'method-list facility-audit-propositions');
    asArray(audit.propositions).forEach(proposition => {
      const row = append(list, 'li');
      append(row, 'strong', '', `${plainLabel(proposition.disposition, 'Unresolved')} — `);
      append(row, 'span', '', publicNarrative(proposition.question, 'Recorded facility question'));
      if (proposition.axis) append(row, 'small', '', ` Question type: ${plainLabel(proposition.axis)}.`);
    });
    const sourceIds = facilityAuditSourceIds(audit);
    if (sourceIds.length) details.append(EvidenceDrawer.create(context, { source_ids: sourceIds }));
    return details;
  }

  function relatedRecordsFrom(item) {
    if (!item || typeof item !== 'object') return [];
    return [item.event_refs, item.chronology, item.supporting_record_refs, item.contrary_or_limiting_refs]
      .flatMap(value => asArray(value))
      .filter(value => typeof value === 'string' && /^(?:PRE|EV|CUR|WIKI)-/.test(value));
  }

  function sourceEnvelope(item) { return { source_ids: sourceIdsFrom(item) }; }

  function localSourceMap(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
    return payload.sources && typeof payload.sources === 'object' && !Array.isArray(payload.sources) ? payload.sources : {};
  }

  function addProvenanceCard(host, context, options) {
    const card = append(host, 'article', options && options.className || 'record-card evidence-card');
    if (options && options.kicker) append(card, 'p', 'card-kicker', options.kicker);
    append(card, 'h3', '', options && options.title || 'Recorded finding');
    if (options && options.text) append(card, 'p', '', options.text);
    if (options && options.meta) append(card, 'p', 'record-status', options.meta);
    if (options && options.status) card.append(EvidenceStatus.create(context.documentObject, options.status));
    const evidenceItem = options && options.item || {};
    const sources = sourceIdsFrom(evidenceItem);
    const records = options && options.relatedRecords || relatedRecordsFrom(evidenceItem);
    if (sources.length || records.length || options && (options.alwaysShowEvidence || options.technicalId)) {
      card.append(EvidenceDrawer.create(context, sourceEnvelope(evidenceItem), {
        relatedRecords: records, localSources: options && options.localSources || {}, technicalId: options && options.technicalId, technicalIdLabel: options && options.technicalIdLabel
      }));
    }
    return card;
  }

  function addMetric(host, value, label, note) {
    const card = append(host, 'article', 'metric-card');
    append(card, 'strong', '', value); append(card, 'span', '', label); if (note) append(card, 'small', '', note); return card;
  }


  // Final polish semantic state notices: reader meaning first, accounting detail second.
  const STATE_NOTICE_TITLES = Object.freeze({
    'no-applicable-records': 'No applicable records',
    'no-geolocated-records': 'No geolocated records in this view',
    unresolved: 'Unresolved',
    'partial-evidence': 'Partial evidence',
    'insufficient-evidence': 'Insufficient evidence',
    'dependency-unavailable': 'Data dependency unavailable',
    'methodology-boundary': 'Methodology boundary'
  });

  function createStateNotice(context, options) {
    const settings = options || {}; const variant = settings.variant || 'methodology-boundary';
    const notice = element(context.documentObject, 'aside', `state-notice state-notice-${variant}`);
    notice.dataset.stateNotice = variant;
    append(notice, 'strong', 'state-notice-title', settings.title || STATE_NOTICE_TITLES[variant] || 'Evidence state');
    if (settings.message) append(notice, 'p', 'state-notice-message', settings.message);
    if (settings.accounting) append(notice, 'p', 'state-notice-accounting', settings.accounting);
    return notice;
  }

  function addOrientationCard(host, context, options) {
    const settings = options || {};
    const card = addProvenanceCard(host, context, {
      kicker: settings.kicker || settings.domain,
      title: settings.title,
      text: settings.text,
      meta: settings.meta,
      item: settings.item || {},
      relatedRecords: settings.relatedRecords || [],
      localSources: settings.localSources || {}
    });
    card.classList.add('orientation-card');
    card.dataset.orientationDomain = String(settings.domain || '').toLowerCase();
    if (settings.route) {
      const actions = append(card, 'div', 'record-actions orientation-actions');
      const link = append(actions, 'a', 'inline-route-link', settings.linkLabel || `Explore ${settings.domain}`);
      link.href = routeHref(settings.route);
    }
    return card;
  }

  function addSequence(host, context, steps, options) {
    const list = append(host, 'ol', options && options.className || 'story-sequence');
    asArray(steps).forEach((step, index) => {
      const item = append(list, 'li', 'story-step');
      append(item, 'span', 'step-number', String(index + 1).padStart(2, '0'));
      const body = append(item, 'div', 'step-body');
      if (step.date || step.kicker) append(body, 'p', 'card-kicker', step.date ? readableDate(step.date) : step.kicker);
      append(body, 'h3', '', step.title);
      if (step.text) append(body, 'p', '', step.text);
      if (step.item) body.append(EvidenceDrawer.create(context, sourceEnvelope(step.item), { relatedRecords: step.relatedRecords || relatedRecordsFrom(step.item), localSources: step.localSources || {} }));
    });
    return list;
  }

  function addBarChart(host, rows, options) {
    const chart = append(host, 'div', 'bar-chart');
    chart.setAttribute('role', 'img'); chart.setAttribute('aria-label', options && options.label || 'Evidence-linked comparison chart');
    const values = rows.map(row => Math.abs(Number(row.value))).filter(Number.isFinite);
    const maximum = Math.max(1, ...values);
    rows.forEach(row => {
      const line = append(chart, 'div', 'bar-row'); append(line, 'span', 'bar-label', row.label);
      const track = append(line, 'span', 'bar-track'); const bar = append(track, 'span', `bar-fill${Number(row.value) < 0 ? ' negative' : ''}`);
      bar.style.width = `${Math.max(2, Math.abs(Number(row.value)) / maximum * 100).toFixed(2)}%`;
      append(line, 'strong', 'bar-value', row.display === undefined ? formatNumber(row.value) : row.display);
    });
    if (options && options.note) append(host, 'p', 'chart-note', options.note);
    const details = append(host, 'details'); details.dataset.phase5ChartEquivalent = options && options.key || 'chart-values';
    append(details, 'summary', '', options && options.valuesLabel || 'Numeric values for this chart'); if (options && options.numericNote) append(details, 'p', '', options.numericNote);
    const table = append(details, 'table'); append(table, 'caption', '', options && options.tableCaption || options && options.label || 'Chart values');
    const thead = append(table, 'thead'); const headingRow = append(thead, 'tr');
    const categoryHeading = append(headingRow, 'th', '', options && options.categoryLabel || 'Category'); categoryHeading.scope = 'col';
    const valueHeading = append(headingRow, 'th', '', options && options.valueLabel || 'Value'); valueHeading.scope = 'col';
    const tbody = append(table, 'tbody');
    rows.forEach(row => { const tr = append(tbody, 'tr'); const th = append(tr, 'th', '', row.label); th.scope = 'row'; append(tr, 'td', '', row.display === undefined ? formatNumber(row.value) : row.display); });
    return chart;
  }

  function formatQuantity(record) {
    if (!record || record.quantity === null || record.quantity === undefined || record.quantity === '') return 'Unknown quantity';
    const quantity = formatNumber(record.quantity); const qualifier = String(record.quantity_qualifier || '').trim();
    if (qualifier === '>') return `More than ${quantity}`; if (qualifier && qualifier !== '=') return `${quantity} (${publicNarrative(qualifier)})`; return quantity;
  }

  function formatUsd(value) {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Unpriced';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
  }

  function appendActorIdentities(host, context, values, options) {
    const row = append(host, 'div', 'actor-row');
    const raw = asArray(values).flatMap(value => value && typeof value === 'object' ? [value] : String(value || '').split('/').map(part => part.trim())).filter(value => typeof value === 'object' || value);
    const identities = raw.length ? raw : ['Actor unresolved']; identities.forEach(value => row.append(context.services.actorIdentity.create(context.documentObject, value, options))); return row;
  }

  function addFactList(host, rows) {
    const facts = append(host, 'dl', 'fact-list');
    rows.filter(([, value]) => value !== null && value !== undefined && value !== '').forEach(([term, value]) => { append(facts, 'dt', '', term); append(facts, 'dd', '', String(value)); }); return facts;
  }

  function addLossCard(host, context, record) {
    const card = addProvenanceCard(host, context, {
      kicker: `${publicNarrative(record.side, 'Side unresolved')} · ${materialAssetClass(record)} · ${plainLabel(record.status, 'Physical state unresolved')}`,
      title: `${lossQuantityLabel(record)} · ${publicNarrative(record.item, 'Material item')}`, text: publicNarrative(record.note), technicalId: record.loss_id, item: record
    });
    card.dataset.lossId = record.loss_id; card.dataset.lossActor = String(record.owner || record.side || '').toLowerCase(); card.dataset.lossService = String(record.service || '').toLowerCase(); card.dataset.lossClass = String(record.accounting_category || '').toLowerCase(); card.dataset.lossPhysical = String(record.status || '').toLowerCase(); card.dataset.lossEvidence = String(record.confidence || '').toLowerCase();
    appendActorIdentities(card, context, [record.owner || record.side]);
    addFactList(card, [['Asset class', materialAssetClass(record)], ['Service', publicNarrative(record.service, 'Unresolved')], ['Type', plainLabel(record.accounting_category, 'Unresolved')], ['Quantity', record.quantity === null || record.quantity === undefined ? 'Unknown' : formatQuantity(record)], ['Quantity rule', record.quantity === null || record.quantity === undefined ? 'Unknown does not mean zero' : publicNarrative(record.quantity_qualifier, 'Exact quantity recorded')], ['Loss status', plainLabel(record.status, 'Unresolved')], ['Evidence confidence', plainLabel(record.confidence, 'Unresolved')], ['Date', readableDate(record.event_date)]]);
    if (record.side === 'CIVILIAN/COMMERCIAL' || String(record.side || '').includes('COMMERCIAL')) { const link = append(card, 'a', 'inline-route-link', context.route.key === 'hormuz.shipping' ? 'Open in the complete Losses record' : 'Open related Shipping & Trade context'); link.href = routeHref(context.route.key === 'hormuz.shipping' ? 'military.losses' : 'hormuz.shipping', { loss: record.loss_id }); }
    return card;
  }

  function eventType(item) { return String(item && (item.event && item.event.event_type || item.timeline && item.timeline.event_type) || ''); }
  function eventTopic(item) {
    const type = eventType(item);
    if (/(TALK|DIPLOMAC|NEGOTIAT|AGREEMENT|MOU|CEASEFIRE|MEDIAT)/.test(type)) return 'Diplomacy';
    if (/(HORMUZ|SHIP|VESSEL|MARITIME|MINE|TANKER)/.test(type)) return 'Hormuz';
    if (/(ECON|OIL|SANCTION|TRADE|INFLATION)/.test(type)) return 'Economy';
    if (/(CASUAL|LOSS|KILLED|DAMAGE|DESTROY|SUNK)/.test(type)) return 'Losses and damage';
    if (/(STRIKE|ATTACK|MISSILE|DRONE|INTERCEPT|MILITARY|NAVAL|OPERATION)/.test(type)) return 'Military'; return 'Wider record';
  }
  function mappedChronology(items, locationResolver) { return asArray(items).filter(item => pointFromRecord(item, locationResolver)); }
  function facilityActor(facility) {
    if (!facility || typeof facility !== 'object') return null; if (facility.actor || facility.owner) return facility.actor || facility.owner;
    if (/^US-/.test(String(facility.facility_id || facility.id || ''))) return 'United States'; const country = publicNarrative(facility.country || facility.host, ''); return country && country !== 'Regional' ? country : null;
  }
  function imageryActor(item, facilities) {
    const record = item && item.evidenceRecord || item && item.record || {}; const references = relationCandidates(record);
    let facility = asArray(facilities).find(candidate => references.includes(candidate.facility_id || candidate.id));
    if (!facility) { const target = String(record.target || record.facility_name || '').toLowerCase(); facility = asArray(facilities).find(candidate => { const name = String(candidate.name || '').toLowerCase(); return target && name && (target.includes(name) || name.includes(target)); }); }
    if (facility) return facilityActor(facility); const country = publicNarrative(record.country, ''); return country && country !== 'Regional' ? country : null;
  }
  function itemTitle(item, fallback) {
    if (!item || typeof item !== 'object') return fallback;
    for (const key of ['headline', 'title', 'name', 'facility_name', 'facility', 'issue', 'topic', 'claim', 'question', 'domain', 'label', 'summary', 'event_id', 'case_id', 'id']) { const value = publicNarrative(item[key], ''); if (value) return value; } return fallback;
  }
  function itemSummary(item) {
    if (!item || typeof item !== 'object') return '';
    for (const key of ['assessment', 'strongest_supported_conclusion', 'summary', 'observed_fact', 'description', 'position_change', 'what_actually_happened', 'question', 'purpose', 'note']) { if (typeof item[key] !== 'string') continue; const value = publicNarrative(item[key], ''); if (value) return value; } return '';
  }

  function renderDatasetBlocks(host, context, keys, limit = 5) {
    keys.filter(key => !key.startsWith('current.')).forEach(key => {
      const payload = modelData(context.model, key); const section = append(host, 'section', 'dataset-section'); section.dataset.datasetKey = key; append(section, 'h2', '', DATASET_LABELS[key] || 'Record');
      const records = recordArray(payload); if (!records.length) { append(section, 'p', 'section-note', 'This record supports the page and remains linked to its underlying evidence.'); return; }
      const list = append(section, 'div', 'record-list'); records.slice(0, limit).forEach((item, index) => { const card = append(list, 'article', 'record-card'); append(card, 'h3', '', itemTitle(item, `${DATASET_LABELS[key] || 'Record'} ${index + 1}`)); const summary = itemSummary(item); if (summary) append(card, 'p', '', summary); const status = item.current_status || item.status || item.verdict || item.confidence; if (status) append(card, 'p', 'record-status', displayTerm(status, 'Status recorded in the evidence record')); });
      if (records.length > limit) append(section, 'p', 'section-note', `${records.length.toLocaleString()} records are available in this collection.`);
    });
  }

  function eventActors(item) {
    const actorIds = item && (item.actor_ids || item.event && item.event.actor_ids); if (Array.isArray(actorIds) && actorIds.length) return actorIds;
    const actors = item && item.event && item.event.actors; if (Array.isArray(actors)) return actors; if (typeof actors === 'string') return [actors]; return [];
  }
  function eventCrossLinks(item) {
    const event = item.event || {}; const type = String(event.event_type || item.timeline && item.timeline.event_type || ''); const place = JSON.stringify(event.location || {}); const links = [{ key: 'timeline.chronology', label: 'Open in detailed chronology' }];
    if (event.facility_refs && event.facility_refs.length || /(STRIKE|ATTACK|MISSILE|DRONE|INTERCEPT|DAMAGE)/.test(type)) links.push({ key: 'military.campaigns', label: 'Related military record' });
    if (/(HORMUZ|SHIPPING|VESSEL|MARITIME|OIL)/.test(type) || /Hormuz/i.test(place)) links.push({ key: 'hormuz.shipping', label: 'Related Hormuz record' });
    if (/(DIPLOMACY|TALK|NEGOTIATION|AGREEMENT|MEDIATION|MOU)/.test(type)) links.push({ key: 'talks.overview', label: 'Related talks record' }); return links;
  }
  function renderEventCard(host, item, context, options) {
    const event = item.event || {}; const timeline = item.timeline || {}; const card = append(host, 'article', 'record-card chronology-card'); card.id = `event-${String(item.event_id).replace(/[^A-Za-z0-9_-]/g, '-')}`; card.dataset.eventId = item.event_id;
    const meta = append(card, 'div', 'record-meta'); append(meta, 'span', '', timeline.date || event.event_date || 'Date unresolved'); if (options && options.topic) append(meta, 'span', 'topic-chip', options.topic); if (options && options.detail) append(meta, 'span', 'record-class-chip', plainLabel(event.record_class || timeline.record_class, 'Record class not specified'));
    const knownBy = event.first_verified || timeline.first_verified || event.first_reported || timeline.first_reported; if (knownBy) append(meta, 'span', '', `Known by ${knownBy}`);
    append(card, 'h3', '', publicNarrative(timeline.summary || event.summary || event.target, item.event_id)); const actors = eventActors(item); if (actors.length) { const actorRow = append(card, 'div', 'actor-row'); actors.forEach(actor => actorRow.append(context.services.actorIdentity.create(context.documentObject, actor))); }
    card.append(EvidenceStatus.create(context.documentObject, { support: event.evidence_support || event.evidence_status || 'UNKNOWN', dispute: event.dispute_posture || event.disputed_by }));
    if (options && options.detail && event.observed_fact && event.observed_fact !== timeline.summary) append(card, 'p', '', publicNarrative(event.observed_fact));
    const actions = append(card, 'div', 'record-actions'); eventCrossLinks(item).forEach(linkDefinition => { if (linkDefinition.key === context.route.key && !(options && options.forceCurrentLink)) return; const link = append(actions, 'a', '', linkDefinition.label); link.href = routeHref(linkDefinition.key, { event: item.event_id }); });
    card.append(EvidenceDrawer.create(context, item)); return card;
  }

  function renderRelatedLinks(host, context) {
    if (!context.route.related || !context.route.related.length) return; const section = addSection(host, 'Continue exploring', 'related-section'); const links = append(section, 'div', 'related-links');
    context.route.related.forEach(key => { const route = ROUTES.get(key); const link = append(links, 'a', '', route.title); link.href = routeHref(key); });
  }

  function subjectPage(context, description, options) {
    const frame = pageFrame(context, description); if (options && options.boundaryNote) { const note = append(frame.article, 'aside', 'scope-note'); append(note, 'strong', '', options.boundaryNote.title); append(note, 'p', '', options.boundaryNote.text); }
    renderDatasetBlocks(frame.article, context, context.route.dataKeys, options && options.limit || 5);
    if (options && options.map) { const mapRecords = context.route.dataKeys.flatMap(key => recordArray(modelData(context.model, key))).filter(item => item && (item.map_ref || item.map_refs || item.location || item.location_id || item.location_ids)); frame.article.append(MapView.create(context, { records: mapRecords })); }
    renderRelatedLinks(frame.article, context); return frame.article;
  }


  function renderFinalNarrativeGates(article, context) {
    const contract = context.state && context.state.narrativeContract;
    if (!contract || article.querySelector('[data-narrative-gates]')) return;
    const wrapper = append(article, 'div', 'narrative-gates');
    wrapper.dataset.narrativeGates = 'approved';

    const war = contract.war90;
    const warSection = append(wrapper, 'section', 'content-section narrative-gate');
    warSection.setAttribute('data-war-in-90-seconds', 'approved');
    warSection.dataset.narrativeGate = 'war-90';
    append(warSection, 'h2', '', war.title);
    append(warSection, 'p', 'section-note', war.disclaimer);
    const sequence = append(warSection, 'div', 'story-sequence');
    asArray(war.milestones).forEach((milestone, index) => {
      const step = append(sequence, 'article', 'story-step');
      step.dataset.warMilestone = String(index + 1);
      const marker = append(step, 'span', 'step-number', String(index + 1));
      marker.setAttribute('aria-hidden', 'true');
      const body = append(step, 'div', 'step-body');
      append(body, 'h3', '', milestone.title);
      append(body, 'p', '', milestone.text);
      const changed = append(body, 'p', 'record-status');
      append(changed, 'strong', '', 'What changed: ');
      changed.append(context.documentObject.createTextNode(milestone.changed));
    });
    const warFooter = append(warSection, 'p', 'section-note');
    warFooter.append(context.documentObject.createTextNode(`${war.disclaimer} Open the `));
    const timelineLink = append(warFooter, 'a', 'inline-route-link', 'full Timeline');
    timelineLink.href = routeHref('timeline.war');
    warFooter.append(context.documentObject.createTextNode(' for the complete dated record.'));

    const objectives = contract.objectives;
    const objectiveSection = append(wrapper, 'section', 'content-section narrative-gate');
    objectiveSection.dataset.objectiveOrientation = 'approved';
    objectiveSection.dataset.narrativeGate = 'objectives';
    append(objectiveSection, 'h2', '', objectives.title);
    const objectiveGrid = append(objectiveSection, 'div', 'record-list two-column-list');
    asArray(objectives.actors).forEach(actor => {
      const card = append(objectiveGrid, 'article', 'record-card evidence-card');
      card.dataset.objectiveActor = actor.key;
      append(card, 'h3', '', actor.title);
      asArray(actor.stages).forEach(stage => {
        const stageNode = append(card, 'div', 'narrative-stage');
        stageNode.dataset.objectiveStage = stage.key;
        append(stageNode, 'h4', '', stage.title);
        append(stageNode, 'p', '', stage.text);
      });
    });

    const usEntry = contract.usEntry;
    const rationaleSection = append(wrapper, 'section', 'content-section narrative-gate');
    rationaleSection.dataset.usWarRationale = 'approved';
    rationaleSection.dataset.narrativeGate = 'us-entry';
    append(rationaleSection, 'h2', '', usEntry.title);
    append(rationaleSection, 'p', 'section-note', usEntry.intro);
    const rationaleGrid = append(rationaleSection, 'div', 'record-list two-column-list');
    asArray(usEntry.items).forEach(item => {
      const card = append(rationaleGrid, 'article', 'record-card evidence-card');
      card.dataset.rationaleKind = item.key;
      append(card, 'h3', '', item.title);
      append(card, 'p', '', item.text);
    });

    const hormuz = contract.hormuz;
    const hormuzSection = append(wrapper, 'section', 'content-section narrative-gate');
    hormuzSection.dataset.hormuzTrajectory = 'approved';
    hormuzSection.dataset.narrativeGate = 'hormuz-trajectory';
    append(hormuzSection, 'h2', '', hormuz.title);
    const hormuzGrid = append(hormuzSection, 'div', 'story-grid');
    asArray(hormuz.stages).forEach(stage => {
      const card = append(hormuzGrid, 'article', 'record-card evidence-card');
      card.dataset.hormuzStage = stage.key;
      append(card, 'h3', '', stage.title);
      append(card, 'p', '', stage.text);
    });
  }

  function OverviewPage(context) {
    const frame = pageFrame(context, 'The conflict began with U.S. and Israeli strikes on Iran on February 28, 2026. Iran retaliated across the region, and the war developed into a sustained military, maritime, economic and diplomatic confrontation.');
    frame.article.classList.add('overview-page');
    const domains = recordArray(modelData(context.model, 'ledger.domain_assessments'));
    const force = domains.find(domain => domain.domain === 'Force preservation') || domains.find(domain => /Air \/ long-range strike/i.test(domain.domain || ''));
    const maritime = domains.find(domain => /Maritime control/i.test(domain.domain || ''));
    const economy = domains.find(domain => /Economic|economy|sanction/i.test(domain.domain || ''));
    const firstWar = context.model.chronology.find(item => String(item.timeline && item.timeline.date || item.event && item.event.event_date || '') >= '2026-02-28');
    const publicView = modelData(context.model, 'analysis.endgame_public_view') || {};
    const mouNow = publicView.mou_now || {};
    const diplomaticEvents = context.model.chronology.filter(item => /(DIPLOMATIC|TALK|NEGOTIAT|MEDIAT|DEESCALAT)/.test(eventType(item))).slice(-4);
    const diplomacyEnvelope = { ...mouNow, source_ids: Array.from(new Set([...sourceIdsFrom(mouNow), ...diplomaticEvents.flatMap(sourceIdsFrom)])) };

    const now = addSection(frame.article, 'Where things stand now', 'content-section current-state-summary');
    now.dataset.currentStateSummary = 'four-domain';
    const nowGrid = append(now, 'div', 'story-grid current-state-grid');
    addOrientationCard(nowGrid, context, {
      domain: 'Military', title: 'U.S. strike capacity remained intact; Iran retained disruptive capability',
      text: publicNarrative(force && force.assessment, 'The reviewed record supports a U.S./coalition force-preservation advantage while Iran retains consequential strike and maritime capabilities.'),
      meta: force && `Confidence: ${displayTerm(force.confidence)}`, item: force || {}, relatedRecords: force && force.supporting_evidence || [],
      route: 'military.campaigns', linkLabel: 'Explore Campaigns & Strikes'
    });
    addOrientationCard(nowGrid, context, {
      domain: 'Hormuz', title: 'The Strait remains physically traversable but commercially contested',
      text: 'Iran retains leverage, but recognized exclusive control is not established. A reported formula that could drop compulsory tolls while retaining legitimate service charges remained a proposal at the cutoff.',
      meta: maritime && `Confidence: ${displayTerm(maritime.confidence)}`, item: maritime || {},
      relatedRecords: maritime && [...asArray(maritime.supporting_evidence), ...asArray(maritime.contrary_evidence)] || [],
      route: 'hormuz.overview', linkLabel: 'Explore Why Hormuz Matters'
    });
    addOrientationCard(nowGrid, context, {
      domain: 'Economy', title: 'Economic pressure on Iran is severe; regime collapse is not established',
      text: 'Severe crude-export contraction and deeper foreign-exchange and import pressure are established. Shortage concerns and unrest risk increased as blockade and sanctions effects accumulated.',
      meta: economy && `Confidence: ${displayTerm(economy.confidence)}`, item: economy || {}, relatedRecords: economy && [...asArray(economy.supporting_evidence), ...asArray(economy.contrary_evidence)] || [], route: 'hormuz.economy', linkLabel: 'Explore Oil & Economic Effects'
    });
    addOrientationCard(nowGrid, context, {
      domain: 'Diplomacy', title: 'The June MOU no longer controls either side, but talks remain active',
      text: 'Washington called it over and Iran later called it suspended. No final deal replaced it, while U.S.–Iran and regional de-escalation contacts continued at the cutoff.',
      item: diplomacyEnvelope, localSources: localSourceMap(publicView), relatedRecords: diplomaticEvents.map(item => item.event_id).filter(Boolean),
      route: 'talks.overview', linkLabel: 'Explore Talks & Agreements'
    });

    renderFinalNarrativeGates(frame.article, context);

    const whatHappened = addSection(frame.article, 'How the conflict opened', 'content-section lead-story historical-orientation');
    append(whatHappened, 'p', 'lead-copy', publicNarrative(firstWar && firstWar.event && firstWar.event.observed_fact, 'The United States and Israel opened strikes on Iran, and Iran retaliated against Israel and regional bases hosting U.S. forces.'));
    if (firstWar) whatHappened.append(EvidenceDrawer.create(context, firstWar));

    const theaterRecords = mappedChronology(context.model.chronology, context.services.locationResolver).filter(item => { const point = pointFromRecord(item, context.services.locationResolver); return point && point.lat >= 8 && point.lat <= 42 && point.lon >= 28 && point.lon <= 70; });
    const theaterMap = MapView.create(context, { title: 'Where the conflict extends', records: theaterRecords, fallbackViewport: [[11, 32], [40.5, 67.5]], maxZoom: 5, description: `This map shows ${theaterRecords.length.toLocaleString()} recorded events whose locations can be placed with reasonable confidence across the Iran–Gulf–Levant–Red Sea theater. Multiple events at the same location may be grouped; records without reliable coordinates remain in the chronology.` });
    theaterMap.classList.add('overview-theater-map'); theaterMap.dataset.selectionRule = 'accepted-chronology-with-supported-coordinate-in-broad-theater'; frame.article.append(theaterMap);

    const developments = addSection(frame.article, 'Latest in the record');
    append(developments, 'p', 'section-note', 'These are the latest dated developments, not a claim that every one changed the conflict by the same amount.');
    const developmentList = append(developments, 'div', 'record-list compact-record-list'); context.model.chronology.slice(-3).reverse().forEach(item => renderEventCard(developmentList, item, context, { topic: eventTopic(item) }));

    const record = addSection(frame.article, 'About the record');
    append(record, 'p', '', 'Counts describe the evidence collection; they are not a score of who is winning.');
    const metrics = append(record, 'div', 'metric-grid');
    addMetric(metrics, formatNumber(context.model.counts.chronology_records), 'dated chronology records', 'From pre-war context through the current cutoff.');
    addMetric(metrics, formatNumber(context.model.counts.canonical_source_records), 'source records', 'Conflicting source versions are preserved separately.');
    addMetric(metrics, readableDate(firstWar && firstWar.timeline && firstWar.timeline.date), 'war began', 'The opening event remains linked to its source record.');
    addMetric(metrics, context.model.release.current_osint_cutoff_display, 'evidence reviewed through', 'Later information is not backdated into earlier knowledge states.');

    const gate3Gaps = recordArray(modelData(context.model, 'gate3.gaps')); const migrationBoundaryGaps = recordArray(modelData(context.model, 'ledger.unresolved'));
    const unresolved = addSection(frame.article, 'What remains unresolved'); const unresolvedList = append(unresolved, 'div', 'question-list'); const unresolvedRecords = gate3Gaps.length ? gate3Gaps : migrationBoundaryGaps;
    unresolvedRecords.filter(item => item.priority === 'HIGH').slice(0, 4).forEach(item => { const card = append(unresolvedList, 'article', 'question-card'); append(card, 'h3', '', publicNarrative(item.topic, 'Open question')); append(card, 'p', '', publicNarrative(item.question)); if (item.why_it_matters) append(card, 'small', '', publicNarrative(item.why_it_matters)); });
    if (unresolvedRecords.length > 4) { const more = append(unresolved, 'details', 'secondary-context'); append(more, 'summary', '', `Review all ${unresolvedRecords.length.toLocaleString()} open evidence questions`); const moreList = append(more, 'div', 'question-list'); unresolvedRecords.slice(4).forEach(item => { const card = addProvenanceCard(moreList, context, { kicker: `${plainLabel(item.priority, 'Priority not assigned')} priority · ${plainLabel(item.status, 'Open')}`, title: publicNarrative(item.topic, 'Open question'), text: publicNarrative(item.question), meta: publicNarrative(item.why_it_matters), item: { related_records: item.related_records } }); card.dataset.gapId = item.gap_id || ''; }); }

    const explore = addSection(frame.article, 'Where to go next'); const links = append(explore, 'div', 'explore-grid');
    [['timeline.war', 'What happened', 'Follow the conflict timeline and the developments that changed the military, maritime and diplomatic record.'], ['military.campaigns', 'Military record', 'Strikes, facilities, weapons, casualties and damage imagery, with action and effect kept separate.'], ['hormuz.overview', 'Hormuz and the economy', 'What Iran could disrupt, what it could not control, and how trade adapted.'], ['talks.mou', 'Talks and agreements', 'What each side received, what was implemented, and why the interim bargain stopped controlling events.'], ['objectives.positions', 'Objectives and positions', 'Earlier positions, intervening events and later positions, using accepted findings only.'], ['evidence.claims', 'Claims and evidence', 'Claims, adjudications, source context and unresolved questions.']].forEach(([key, title, text]) => { const link = append(links, 'a', 'pathway-card'); append(link, 'strong', '', title); append(link, 'span', '', text); link.href = routeHref(key); });
    return frame.article;
  }

  const ACTOR_DIRECTORY_PINNED = Object.freeze(['Iran', 'United States', 'Israel', 'IRGC', 'Iranian parliament', 'Mohammad Baqer Qalibaf', 'Hezbollah', 'Houthis / Ansar Allah', 'Oman', 'Qatar']);
  function compareActorDirectoryText(left, right) { const a = String(left || ''); const b = String(right || ''); return a === b ? 0 : a < b ? -1 : 1; }
  function sortActorDirectory(records) { const pinned = new Set(ACTOR_DIRECTORY_PINNED); return asArray(records).slice().sort((a, b) => Number(pinned.has(b.canonical_name)) - Number(pinned.has(a.canonical_name)) || compareActorDirectoryText(a.canonical_name, b.canonical_name) || compareActorDirectoryText(a.actor_id, b.actor_id)); }

  function ActorsPage(context) {
    const frame = pageFrame(context, 'People are shown with their recorded role and affiliation. Flags follow the affiliated state or state institution; non-state groups do not inherit the flag of the country where they operate.');
    const modelDirectory = recordArray(modelData(context.model, 'current.actors')).map(item => item.record || item); const directory = sortActorDirectory(modelDirectory); const controls = append(frame.article, 'form', 'actor-controls'); controls.addEventListener('submit', event => event.preventDefault()); const searchLabel = append(controls, 'label', '', 'Search people and organizations'); const search = append(searchLabel, 'input'); search.type = 'search'; search.placeholder = 'Search by name, role or affiliation'; const resultCount = append(controls, 'p', 'filter-result-count'); resultCount.setAttribute('aria-live', 'polite');
    const groups = [{ title: 'States and state institutions', test: actor => ['state', 'state-institution'].includes(actor.affiliation_type) && actor.entity_type !== 'person' }, { title: 'People', test: actor => actor.entity_type === 'person' }, { title: 'Armed groups', test: actor => actor.affiliation_type === 'non-state' }, { title: 'International and other organizations', test: actor => !['state', 'state-institution', 'non-state'].includes(actor.affiliation_type) && actor.entity_type !== 'person' }];
    groups.forEach(group => { const records = directory.filter(group.test); if (!records.length) return; const section = addSection(frame.article, group.title); const list = append(section, 'div', 'actor-directory'); records.forEach(actor => { const card = append(list, 'article', 'actor-card'); card.dataset.actorId = actor.actor_id; card.dataset.actorSearch = JSON.stringify(actor).toLowerCase(); card.append(context.services.actorIdentity.create(context.documentObject, actor.actor_id, { subtitle: true })); }); });
    const draw = () => { const query = search.value.trim().toLowerCase(); let visible = 0; frame.article.querySelectorAll('[data-actor-id]').forEach(card => { card.hidden = Boolean(query && !card.dataset.actorSearch.includes(query)); if (!card.hidden) visible += 1; }); resultCount.textContent = `${visible.toLocaleString()} of ${directory.length.toLocaleString()} actor identities shown`; }; search.addEventListener('input', draw); draw();
    const note = append(frame.article, 'aside', 'scope-note'); append(note, 'strong', '', 'Identity boundary'); append(note, 'p', '', 'A role describes a person; affiliation determines actor identity. If the record does not establish an affiliation, Atlas shows the recorded name without guessing.'); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function TimelinePage(context) {
    const frame = pageFrame(context, `Explore the wartime record through selectable dates, events and map locations. Detailed Chronology contains all ${formatNumber(context.model.counts.chronology_records)} records.`);
    const coverage = recordArray(modelData(context.model, 'gate3.daily_coverage')); const conflictStart = coverage[0] && coverage[0].date || '2026-02-28'; const conflictEnd = coverage[coverage.length - 1] && coverage[coverage.length - 1].date || String(context.model.release.current_osint_cutoff).slice(0, 10); const eventDate = item => String(item.timeline && item.timeline.date || item.event && item.event.event_date || ''); const wartime = context.model.chronology.filter(item => eventDate(item) >= conflictStart && eventDate(item) <= conflictEnd); const prewar = context.model.chronology.filter(item => eventDate(item) < conflictStart);
    const explorer = addSection(frame.article, 'Explore the war timeline', 'content-section timeline-explorer'); explorer.dataset.timelineController = 'current-state'; append(explorer, 'p', 'section-note', `${coverage.length.toLocaleString()} conflict days are represented from ${readableDate(conflictStart)} through ${readableDate(conflictEnd)}. At broad scale, markers group nearby dates; narrowing the window exposes individual events.`);
    const controls = append(explorer, 'form', 'timeline-controls'); controls.addEventListener('submit', event => event.preventDefault()); const startLabel = append(controls, 'label', '', 'Window starts'); const startInput = append(startLabel, 'input'); startInput.type = 'date'; startInput.min = conflictStart; startInput.max = conflictEnd; const endLabel = append(controls, 'label', '', 'Window ends'); const endInput = append(endLabel, 'input'); endInput.type = 'date'; endInput.min = conflictStart; endInput.max = conflictEnd; const topicLabel = append(controls, 'label', '', 'Topic'); const topicSelect = append(topicLabel, 'select'); append(topicSelect, 'option', '', 'All topics').value = ''; ['Military', 'Hormuz', 'Economy', 'Diplomacy', 'Losses and damage', 'Wider record'].forEach(topic => { const option = append(topicSelect, 'option', '', topic); option.value = topic; }); const actorLabel = append(controls, 'label', '', 'Actor'); const actorSelect = append(actorLabel, 'select'); append(actorSelect, 'option', '', 'All actors').value = ''; Array.from(new Set(wartime.flatMap(eventActors))).sort().forEach(actor => { const option = append(actorSelect, 'option', '', context.services.actorIdentity.resolve(actor).label); option.value = actor; }); const windowLabel = append(controls, 'label', '', 'Timeline scale'); const windowSelect = append(windowLabel, 'select'); windowSelect.dataset.timelineScaleControl = 'window'; [['all', 'Full war'], ['60', '60 days'], ['30', '30 days'], ['7', '7 days']].forEach(([value, label]) => { const option = append(windowSelect, 'option', '', label); option.value = value; });
    const navigation = append(explorer, 'div', 'timeline-navigation'); const previous = append(navigation, 'button', 'action', 'Previous window'); previous.type = 'button'; const next = append(navigation, 'button', 'action', 'Next window'); next.type = 'button'; const full = append(navigation, 'button', 'action', 'Show full war'); full.type = 'button'; const resultCount = append(navigation, 'span', 'filter-result-count'); resultCount.setAttribute('aria-live', 'polite'); const rail = append(explorer, 'div', 'timeline-marker-rail'); rail.setAttribute('aria-label', 'Selectable chronology markers'); rail.tabIndex = 0; const selection = append(explorer, 'div', 'timeline-selection'); const mapHost = append(explorer, 'div', 'timeline-map-host'); let selectedId = context.route.params.event || '';
    const parseDay = value => new Date(`${value}T12:00:00Z`); const dayString = value => value.toISOString().slice(0, 10); const daysBetween = (left, right) => Math.round((parseDay(right) - parseDay(left)) / 86400000) + 1; const setWindow = (start, end) => { startInput.value = start < conflictStart ? conflictStart : start; endInput.value = end > conflictEnd ? conflictEnd : end; };
    const replaceMap = records => { const previousMap = mapHost.querySelector('[data-component="MapView"]'); if (previousMap && previousMap._atlasMap && previousMap._atlasMap.remove) previousMap._atlasMap.remove(); mapHost.replaceChildren(); const mapped = mappedChronology(records, context.services.locationResolver); if (!mapped.length) { append(mapHost, 'p', 'empty-state', records.length === 1 ? 'This selected record has no source-supported map point. Its textual location remains in the record.' : 'No records in this view have source-supported map points.'); return; } mapHost.append(MapView.create(context, { title: records.length === 1 ? 'Selected event location' : 'Locations in the active timeline window', records: mapped, description: `${mapped.length.toLocaleString()} visible record${mapped.length === 1 ? '' : 's'} include source-supported geography.` })); };
    const selectEvent = item => { selectedId = item.event_id; selection.replaceChildren(); renderEventCard(selection, item, context, { detail: true, topic: eventTopic(item) }); replaceMap([item]); rail.querySelectorAll('[data-event-id]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.eventId === selectedId))); };
    const draw = () => { if (!startInput.value || !endInput.value || startInput.value > endInput.value) setWindow(conflictStart, conflictEnd); const topic = topicSelect.value; const actor = actorSelect.value; const rows = wartime.filter(item => eventDate(item) >= startInput.value && eventDate(item) <= endInput.value).filter(item => !topic || eventTopic(item) === topic).filter(item => !actor || eventActors(item).includes(actor)); const span = daysBetween(startInput.value, endInput.value); const broad = span > 62; const groups = new Map(); rows.forEach(item => { const date = eventDate(item); const parsed = parseDay(date); const key = broad ? `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}` : date; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); }); rail.replaceChildren(); Array.from(groups.entries()).forEach(([key, items]) => { if (broad || items.length > 1 && span > 1) { const button = append(rail, 'button', 'timeline-marker cluster'); button.type = 'button'; const first = eventDate(items[0]); const last = eventDate(items[items.length - 1]); button.dataset.timelineCluster = key; button.textContent = broad ? `${readableDate(`${key}-01`).replace(/ 1,/, ',')} · ${items.length} events` : `${readableDate(key)} · ${items.length} events`; button.setAttribute('aria-label', `${items.length} events from ${readableDate(first)} through ${readableDate(last)}. Select to narrow this timeline window.`); button.addEventListener('click', () => { setWindow(first, last); windowSelect.value = String(Math.min(60, daysBetween(first, last))); draw(); }); } else { items.forEach(item => { const button = append(rail, 'button', 'timeline-marker event'); button.type = 'button'; button.dataset.eventId = item.event_id; button.setAttribute('aria-pressed', String(item.event_id === selectedId)); append(button, 'span', 'timeline-marker-date', readableDate(eventDate(item))); append(button, 'span', 'timeline-marker-title', publicNarrative(item.timeline && item.timeline.summary || item.event && item.event.summary, item.event_id)); button.addEventListener('click', () => selectEvent(item)); }); } }); resultCount.textContent = `${rows.length.toLocaleString()} wartime record${rows.length === 1 ? '' : 's'} in view`; if (!groups.size) append(rail, 'p', 'empty-state', 'No timeline records match this window and filter.'); const selected = rows.find(item => item.event_id === selectedId); if (selected) selectEvent(selected); else { selection.replaceChildren(); append(selection, 'p', 'empty-state', 'Select an event marker to inspect its evidence and map location.'); replaceMap(rows); } };
    const chooseScale = () => { if (windowSelect.value === 'all') setWindow(conflictStart, conflictEnd); else { const days = Number(windowSelect.value); const end = endInput.value || conflictEnd; const start = parseDay(end); start.setUTCDate(start.getUTCDate() - days + 1); setWindow(dayString(start), end); } draw(); };
    const shift = direction => { const span = daysBetween(startInput.value, endInput.value); const start = parseDay(startInput.value); const end = parseDay(endInput.value); start.setUTCDate(start.getUTCDate() + direction * span); end.setUTCDate(end.getUTCDate() + direction * span); if (dayString(start) < conflictStart) { setWindow(conflictStart, dayString(new Date(parseDay(conflictStart).getTime() + (span - 1) * 86400000))); } else if (dayString(end) > conflictEnd) { setWindow(dayString(new Date(parseDay(conflictEnd).getTime() - (span - 1) * 86400000)), conflictEnd); } else setWindow(dayString(start), dayString(end)); draw(); };
    setWindow(conflictStart, conflictEnd); [startInput, endInput].forEach(control => control.addEventListener('input', draw)); [topicSelect, actorSelect].forEach(control => control.addEventListener('change', draw)); windowSelect.addEventListener('change', chooseScale); previous.addEventListener('click', () => shift(-1)); next.addEventListener('click', () => shift(1)); full.addEventListener('click', () => { windowSelect.value = 'all'; setWindow(conflictStart, conflictEnd); draw(); }); draw();
    if (prewar.length) { const contextSection = append(frame.article, 'details', 'prewar-context'); contextSection.dataset.timelinePrewar = 'distinct'; append(contextSection, 'summary', '', `Prewar context (${prewar.length.toLocaleString()} records)`); append(contextSection, 'p', 'section-note', `These records explain causal or policy context before conflict Day 1, ${readableDate(conflictStart)}. They are not included in the ${coverage.length.toLocaleString()}-day war-duration count.`); const list = append(contextSection, 'div', 'record-list'); prewar.forEach(item => renderEventCard(list, item, context, { detail: true, topic: 'Prewar context' })); }
    renderRelatedLinks(frame.article, context); return frame.article;
  }

  function ChronologyPage(context) {
    const frame = pageFrame(context, 'Browse the complete chronology by date, actor, event type and evidence status. Record IDs and source IDs remain available for precise lookup, but the reading view leads with what happened.');
    const coverage = recordArray(modelData(context.model, 'gate3.daily_coverage')); const conflictStart = coverage[0] && coverage[0].date || '2026-02-28'; const conflictEnd = coverage[coverage.length - 1] && coverage[coverage.length - 1].date || String(context.model.release.current_osint_cutoff).slice(0, 10); const controls = append(frame.article, 'form', 'chronology-controls'); controls.addEventListener('submit', event => event.preventDefault());
    const searchLabel = append(controls, 'label', '', 'Search'); const search = append(searchLabel, 'input'); search.type = 'search'; search.placeholder = 'Event, location, actor, or record ID'; search.value = context.route.params.event || ''; const periodLabel = append(controls, 'label', '', 'Period'); const period = append(periodLabel, 'select'); [['', 'All records'], ['wartime', 'Wartime'], ['prewar', 'Prewar context']].forEach(([value, label]) => { const option = append(period, 'option', '', label); option.value = value; }); const fromLabel = append(controls, 'label', '', 'From'); const fromDate = append(fromLabel, 'input'); fromDate.type = 'date'; const throughLabel = append(controls, 'label', '', 'Through'); const throughDate = append(throughLabel, 'input'); throughDate.type = 'date'; const typeLabel = append(controls, 'label', '', 'Event type'); const typeSelect = append(typeLabel, 'select'); append(typeSelect, 'option', '', 'All event types').value = ''; Array.from(new Set(context.model.chronology.map(eventType).filter(Boolean))).sort().forEach(type => { const option = append(typeSelect, 'option', '', publicNarrative(type)); option.value = type; }); const actorLabel = append(controls, 'label', '', 'Actor'); const actorSelect = append(actorLabel, 'select'); append(actorSelect, 'option', '', 'All actors').value = ''; Array.from(new Set(context.model.chronology.flatMap(eventActors))).sort().forEach(actor => { const option = append(actorSelect, 'option', '', context.services.actorIdentity.resolve(actor).label); option.value = actor; }); const sourceLabel = append(controls, 'label', '', 'Source ID'); const source = append(sourceLabel, 'input'); source.type = 'search'; source.placeholder = 'SRC-…'; const evidenceLabel = append(controls, 'label', '', 'Evidence'); const evidence = append(evidenceLabel, 'select'); append(evidence, 'option', '', 'All evidence categories').value = ''; ['VERIFIED', 'CONFIRMED', 'SUPPORTED', 'UNVERIFIED', 'UNKNOWN'].forEach(status => { const option = append(evidence, 'option', '', displayTerm(status)); option.value = status; }); const knownByLabel = append(controls, 'label', '', 'Known by'); const knownBy = append(knownByLabel, 'input'); knownBy.type = 'date';
    const list = append(frame.article, 'div', 'record-list'); const pager = append(frame.article, 'div', 'pager'); const previous = append(pager, 'button', 'action', 'Previous page'); previous.type = 'button'; const count = append(pager, 'span'); const next = append(pager, 'button', 'action', 'Next page'); next.type = 'button'; const pageSize = 40; let page = 1;
    const draw = () => { const query = search.value.trim().toLowerCase(); const actor = actorSelect.value; const sourceQuery = source.value.trim().toUpperCase(); const evidenceValue = evidence.value; const knownDate = knownBy.value; const periodValue = period.value; const occurrenceFrom = fromDate.value; const occurrenceThrough = throughDate.value; const selectedType = typeSelect.value; const rows = context.model.chronology.filter(item => { const event = item.event || {}; const occurrence = String(item.timeline && item.timeline.date || event.event_date || ''); if (periodValue === 'wartime' && (occurrence < conflictStart || occurrence > conflictEnd)) return false; if (periodValue === 'prewar' && occurrence >= conflictStart) return false; if (occurrenceFrom && occurrence < occurrenceFrom) return false; if (occurrenceThrough && occurrence > occurrenceThrough) return false; if (selectedType && eventType(item) !== selectedType) return false; if (actor && !eventActors(item).includes(actor)) return false; if (sourceQuery && !(item.source_ids || []).some(id => id.includes(sourceQuery))) return false; if (evidenceValue) { const status = String(event.evidence_support || event.evidence_status || 'UNKNOWN'); if (evidenceValue === 'UNKNOWN' ? status !== 'UNKNOWN' : !status.includes(evidenceValue)) return false; } const firstKnown = event.first_verified || item.timeline && item.timeline.first_verified || event.first_reported || item.timeline && item.timeline.first_reported; if (knownDate && firstKnown && firstKnown > knownDate) return false; if (!query) return true; return JSON.stringify({ id: item.event_id, event, timeline: item.timeline, sources: item.source_ids }).toLowerCase().includes(query); }).slice().reverse(); const pageTotal = Math.max(1, Math.ceil(rows.length / pageSize)); if (page > pageTotal) page = pageTotal; const start = (page - 1) * pageSize; list.replaceChildren(); rows.slice(start, start + pageSize).forEach(item => renderEventCard(list, item, context, { detail: true })); count.textContent = `${rows.length.toLocaleString()} matching records · page ${page.toLocaleString()} of ${pageTotal.toLocaleString()}`; previous.disabled = page <= 1; next.disabled = page >= pageTotal; if (!rows.length) append(list, 'div', 'empty-state', 'No chronology records match these filters.'); };
    [search, source, knownBy, fromDate, throughDate].forEach(control => control.addEventListener('input', () => { page = 1; draw(); })); [period, typeSelect, actorSelect, evidence].forEach(control => control.addEventListener('change', () => { page = 1; draw(); })); previous.addEventListener('click', () => { page = Math.max(1, page - 1); draw(); list.scrollIntoView({ block: 'start' }); }); next.addEventListener('click', () => { page += 1; draw(); list.scrollIntoView({ block: 'start' }); }); draw(); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function CampaignsPage(context) {
    const frame = pageFrame(context, 'The campaign unfolded across a wide regional theater. Atlas keeps a weapon launch, penetration, impact, physical damage, mission effect and strategic effect as separate evidentiary questions.');
    const boundary = addSection(frame.article, 'From damage to strategic effect'); append(boundary, 'p', 'phase10-guardrail', 'A confirmed hit does not by itself establish destroyed capability or strategic effect.'); const framework = append(boundary, 'div', 'effect-framework-grid'); [['Physical damage', 'Observable physical harm. Does not establish loss of operational function.'], ['Asset lost', 'An individual asset is established destroyed, sunk, captured, abandoned, or otherwise unavailable. This does not establish elimination of the broader capability.'], ['Subsystem degraded', 'A component has been reduced or lost while the larger platform or system may retain other functions.'], ['Function degraded', 'A specific operational function is reduced, interrupted, or unavailable. This can occur without physical destruction.'], ['Local operational effect', 'A demonstrated effect at a specific site, unit, or limited area.'], ['Theater operational effect', 'A material influence on the broader campaign or theater.'], ['Strategic consequence', 'A material effect on the actor’s ability to achieve major objectives, the strategic balance, or the end state.']].forEach(([title, text]) => { const card = append(framework, 'article', 'effect-framework-card'); append(card, 'h3', '', title); append(card, 'p', '', text); }); append(boundary, 'p', 'section-note', 'This is an effects framework, not an automatic severity staircase. Asset loss and functional degradation are independent analytical dimensions; Atlas does not transform hit → destroyed → capability eliminated → strategic defeat unless each step is independently supported.');
    const chronology = context.model.chronology.filter(item => /(STRIKE|ATTACK|MISSILE|DRONE|INTERCEPT|MILITARY_OPERATION|NAVAL)/.test(eventType(item))); const tempo = addSection(frame.article, 'Recorded military activity by month'); const months = new Map(); chronology.forEach(item => { const month = String(item.timeline && item.timeline.date || '').slice(0, 7); if (month) months.set(month, (months.get(month) || 0) + 1); }); addBarChart(tempo, Array.from(months, ([label, value]) => ({ label, value })), { label: 'Recorded military activity by month', note: 'Number of documented military events—not weapons fired. One record can describe a wave, and quiet dates may reflect collection depth.', key: 'campaign-tempo', valuesLabel: 'Numeric values for recorded event tempo', tableCaption: 'Recorded military-event tempo', categoryLabel: 'Period', valueLabel: 'Recorded events', numericNote: 'These are recorded military-event counts. They are not total weapons, successful hits, destruction, or exhaustive operational tempo.' });
    const strikes = recordArray(modelData(context.model, 'reconciliation.strikes')); frame.article.append(MapView.create(context, { title: 'Strike geography', records: strikes, description: `${strikes.length.toLocaleString()} reconciled strike locations are plotted from the record. Coordinates retain their stated precision.` }));
    const coalitionIranStrikes = strikes.filter(strike => /USA|US_ISR_COMBINED/.test(String(strike.actor || '')) && strike.target_type !== 'maritime_blockade_strike' && Number(strike.lat) >= 25 && Number(strike.lat) <= 40 && Number(strike.lon) >= 44 && Number(strike.lon) <= 64); const effects = addSection(frame.article, 'U.S. / coalition attacks inside Iran: what the evidence establishes'); append(effects, 'p', 'section-note', 'Attack occurrence, physical effect and operational consequence are separate. A blank or unresolved later stage is not promoted from an earlier one.'); const effectsList = append(effects, 'div', 'record-list two-column-list'); coalitionIranStrikes.forEach(strike => { const card = addProvenanceCard(effectsList, context, { kicker: `${readableDate(strike.event_date)} · ${plainLabel(strike.verification)}`, title: publicNarrative(strike.name, strike.id), text: publicNarrative(strike.target_type || strike.purpose, 'Attack occurrence recorded; the target finding remains bounded by the cited source.'), technicalId: strike.id, technicalIdLabel: 'Stable strike record ID', item: strike }); card.dataset.strikeEffectId = strike.id; appendActorIdentities(card, context, [strike.actor || 'Actor unresolved']); addFactList(card, [['Attack occurrence', publicNarrative(strike.target_type || strike.purpose, 'Recorded; detail unresolved')], ['Physical effect', publicNarrative(strike.impact_grade || strike.effect, 'Unresolved')], ['Operational effect', publicNarrative(strike.operational_effect, 'Unresolved unless separately established by the evidence')]]); });
    const damageObservations = recordArray(modelData(context.model, 'forensic.damage_observations')); const physical = addSection(frame.article, 'What was physically damaged?'); append(physical, 'p', 'section-note', 'These records show physical damage. Operational effects are assessed separately.'); const physicalList = append(physical, 'div', 'record-list two-column-list'); damageObservations.forEach(observation => { const card = addProvenanceCard(physicalList, context, { kicker: `${plainLabel(observation.damage_confidence)} physical-evidence confidence`, title: publicNarrative(observation.target, observation.observation_id), text: publicNarrative(observation.observation), meta: 'Operational effect remains separately assessed.', technicalId: observation.observation_id, technicalIdLabel: 'Stable damage record ID', item: { source_ids: asArray(observation.sources) } }); card.dataset.damageObservationId = observation.observation_id; });
    const audits = recordArray(modelData(context.model, 'forensic.facility_claim_audits')); const propositions = addSection(frame.article, 'What did the damage change?'); append(propositions, 'p', 'section-note', 'Each question keeps its own finding. A strike or damaged component does not automatically prove a mission kill, destroyed platform or whole-site shutdown.'); const facilities = recordArray(modelData(context.model, 'ledger.facilities')); audits.forEach(audit => { const group = append(propositions, 'article', 'effect-proposition-group'); group.dataset.facilityAuditId = audit.facility_audit_id; append(group, 'h3', '', publicNarrative(audit.facility_name, audit.facility_id)); const list = append(group, 'div', 'record-list'); asArray(audit.propositions).forEach(proposition => addProvenanceCard(list, context, { kicker: `${plainLabel(proposition.axis, 'Evidence question')} · ${plainLabel(proposition.disposition)}`, title: publicNarrative(proposition.question), text: asArray(proposition.inference_basis).map(publicNarrative).join(' '), meta: `Confidence: ${plainLabel(proposition.analytic_confidence)}`, item: { source_ids: asArray(proposition.basis_sources) }, relatedRecords: [audit.facility_id] })); const facility = facilities.find(record => record.facility_id === audit.facility_id); if (facility) { const link = append(group, 'a', 'inline-route-link', `Open ${publicNarrative(facility.name, audit.facility_name)} in Bases & Infrastructure`); link.href = routeHref('military.facilities', { facility: audit.facility_id }); } });
    const movements = recordArray(modelData(context.model, 'gate3.movements')); if (movements.length) { const posture = addSection(frame.article, 'Force posture and movement chronology'); append(posture, 'p', 'section-note', 'Movement records preserve when a plan began, when it was formalized and when it was executed. Sequence alone is not proof that wartime pressure caused a pre-existing drawdown.'); const movementDetails = append(posture, 'details', 'secondary-context'); append(movementDetails, 'summary', '', `Review ${movements.length.toLocaleString()} movement records`); const movementList = append(movementDetails, 'div', 'record-list two-column-list'); movements.forEach(record => { const card = addProvenanceCard(movementList, context, { kicker: `${readableDate(record.date || record.execution_date)} · ${plainLabel(record.classification, 'Movement classification recorded')}`, title: publicNarrative(record.display_label || `${record.from || 'Origin'} to ${record.to || 'destination'}`), text: publicNarrative(record.assessment_notes || record.reported_reason), meta: publicNarrative(record.war_change_assessment), item: record }); card.dataset.movementId = record.movement_id; appendActorIdentities(card, context, asArray(record.governments_or_parties).length ? record.governments_or_parties : [record.actor]); addFactList(card, [['Planning began', record.planning_origin_date && readableDate(record.planning_origin_date)], ['Formalized', record.agreement_formalized_date && readableDate(record.agreement_formalized_date)], ['Executed', record.execution_date && readableDate(record.execution_date)], ['Causation boundary', asArray(record.causation_language).map(publicNarrative).join(' ')]]); }); }
    const examples = addSection(frame.article, 'Representative campaign developments'); const eventList = append(examples, 'div', 'record-list'); chronology.slice(-8).reverse().forEach(item => renderEventCard(eventList, item, context, { topic: eventTopic(item), detail: true })); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function FacilitiesPage(context) {
    const frame = pageFrame(context, 'For each base or facility, Atlas separates physical damage from whether it kept operating or later recovered.'); const facilities = mergeCurrentRecords(modelData(context.model, 'ledger.facilities'), modelData(context.model, 'gate3.facilities'), ['facility_id', 'id']); const claimAudits = recordArray(modelData(context.model, 'forensic.facility_claim_audits')); frame.article.append(MapView.create(context, { title: 'Facilities in the current record', records: facilities, description: `${facilities.length.toLocaleString()} facility records include geographic context. Map markers show the facility’s general location, not the exact point of impact.` })); const section = addSection(frame.article, 'Facility assessments'); const list = append(section, 'div', 'record-list'); facilities.forEach(facility => { const status = plainLabel(firstText(facility.current_status, facility.operational_effect_status, facility.damage_evidence_status), 'Current status unresolved'); const facilityAudits = claimAudits.filter(audit => audit.facility_id === facility.facility_id); const sourceContext = facilitySourceContext(facility); const card = addProvenanceCard(list, context, { kicker: [facility.country || facility.host, status].filter(Boolean).join(' · '), title: publicNarrative(facility.name, facility.facility_id), text: publicNarrative(facility.assessment || facility.note, 'The facility remains in the record; no broader functional conclusion is added here.'), item: { source_ids: sourceContext.sourceIds }, localSources: sourceContext.localSources }); card.dataset.facilityId = facility.facility_id; appendActorIdentities(card, context, [facilityActor(facility) || 'Actor unresolved']); const facts = append(card, 'dl', 'fact-list'); const addFact = (term, values) => { const readable = (Array.isArray(values) ? values : [values]).filter(Boolean).map(value => typeof value === 'string' ? publicNarrative(value, '') : publicNarrative(value && (value.detail || value.assessment || value.note), '')).filter(Boolean); if (!readable.length) return; append(facts, 'dt', '', term); append(facts, 'dd', '', readable.slice(0, 2).join(' ')); }; addFact('Physical damage', asArray(facility.verified_physical_damage).length ? facility.verified_physical_damage : [...asArray(facility.critical_assets_reported), ...asArray(facility.noncritical_or_soft_assets_reported)]); addFact('Functional effect', asArray(facility.verified_functional_effect).length ? facility.verified_functional_effect : facility.effect); addFact('Continued operation', asArray(facility.continued_operation_evidence).length ? facility.continued_operation_evidence : firstText(facility.continuity, facility.current_presence_status)); facilityAudits.forEach(audit => appendFacilityAudit(card, context, audit)); }); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function WeaponsPage(context) {
    const frame = pageFrame(context, 'Weapons fired, weapons that reached a target, and equipment destroyed are different counts. This page keeps them separate.');
    const expenditure = recordArray(modelData(context.model, 'ledger.munitions_expenditure')); const attrition = modelData(context.model, 'ledger.attrition_series'); const materialLosses = recordArray(modelData(context.model, 'current.material_losses')); const assetDisplay = modelData(context.model, 'analysis.asset_display'); const envelopes = modelData(context.model, 'forensic.loss_envelopes'); const rule = addSection(frame.article, 'What the counts mean'); append(rule, 'p', 'lead-copy', publicNarrative(modelData(context.model, 'ledger.munitions_expenditure').rule)); const sides = addSection(frame.article, 'Reported expenditure'); const columns = append(sides, 'div', 'comparison-grid'); ['U.S./COALITION', 'IRAN/ALIGNED'].forEach(side => { const column = append(columns, 'section', 'comparison-column'); append(column, 'h3', '', side === 'U.S./COALITION' ? 'United States / coalition' : 'Iran / aligned'); expenditure.filter(record => record.side === side).forEach(record => { const card = addProvenanceCard(column, context, { kicker: `${readableDate(record.period_end || record.event_date)} · ${plainLabel(record.evidence_type)}`, title: `${formatQuantity(record)} ${publicNarrative(record.munition)}`, text: publicNarrative(record.note), meta: record.cost_low ? `Recorded cost basis: $${(Number(record.cost_low) / 1e9).toFixed(2)} billion` : plainLabel(record.cost_status, 'No compatible price basis recorded'), item: record }); card.dataset.expenditureId = record.expenditure_id; appendActorIdentities(card, context, [record.actor || record.side]); }); });
    const series = addSection(frame.article, 'Quantitative series'); append(series, 'p', 'section-note', 'These are source-reported cumulative or event values with their recorded value type. Superseding and overlapping periods are not added together.'); const seriesGrid = append(series, 'div', 'record-list two-column-list'); Object.entries(attrition.series || {}).filter(([key]) => key.includes('munitions_expenditure')).forEach(([key, points]) => { asArray(points).forEach(point => { const card = addProvenanceCard(seriesGrid, context, { kicker: `${readableDate(point.date)} · ${plainLabel(point.value_type, 'Recorded series value')}`, title: `${point.qualifier === '>' ? 'More than ' : ''}${formatNumber(point.value)} ${publicNarrative(point.munition, 'munitions')}`, text: publicNarrative(point.note, 'A launch or expenditure value does not establish interception, impact, target hit or destruction.'), meta: `Series: ${plainLabel(key)}`, item: point }); appendActorIdentities(card, context, [key.startsWith('iran_') ? 'Iran' : 'United States']); }); });
    const approvedMetrics = addSection(frame.article, 'Inventory and launcher context'); append(approvedMetrics, 'p', 'section-note', 'These categories retain their evidence labels. Neutralized does not mean destroyed, and modeled inventory attrition is not a confirmed physical-loss count.'); const metricGrid = append(approvedMetrics, 'div', 'record-list two-column-list'); asArray(assetDisplay.iran && assetDisplay.iran.headline_categories).filter(item => ['launchers', 'missile_inventory'].includes(item.id)).forEach(item => { const card = addProvenanceCard(metricGrid, context, { kicker: plainLabel(item.public_status), title: `${item.headline} · ${item.label}`, text: publicNarrative(item.note || item.scope), meta: `${publicNarrative(item.subheadline)} · ${publicNarrative(item.scope)}`, item }); card.dataset.weaponMetricId = item.id; appendActorIdentities(card, context, ['Iran']); if (item.components) addFactList(card, item.components.map(([label, value]) => [label, formatNumber(value)])); }); const missileEnvelope = asArray(envelopes.categories).find(item => item.category === 'MISSILE_UAS_INVENTORY'); if (missileEnvelope) { const range = missileEnvelope.cost_model_range_usd || {}; addProvenanceCard(metricGrid, context, { kicker: 'Calculated range · not a confirmed inventory count', title: `${formatUsd(range.low)} – ${formatUsd(range.high)}`, text: 'Bounded material-value estimate for missile/UAS inventory. It remains a range and is not added to launch counts.', meta: `Central modeled value: ${formatUsd(range.central)}`, item: { source_ids: asArray(missileEnvelope.envelopes).flatMap(sourceIdsFrom) } }); }
    const linked = materialLosses.filter(record => record.side !== 'CIVILIAN/COMMERCIAL' && /(air|aircraft|helicopter|missile|drone|uas|launcher|radar|patriot|thaad)/i.test(`${record.item || ''} ${record.service || ''}`)); const durable = addSection(frame.article, 'Related durable-loss records'); append(durable, 'p', 'section-note', `${linked.length.toLocaleString()} material-loss records are linked by their recorded item or service language. They remain separate from munitions expended.`); const durableList = append(durable, 'div', 'record-list two-column-list'); linked.forEach(record => { const card = addLossCard(durableList, context, record); card.dataset.weaponLossId = record.loss_id; });
    const aviation = recordArray(modelData(context.model, 'forensic.aviation_reconciliation')); const aviationSection = addSection(frame.article, 'Aviation reconciliation'); append(aviationSection, 'p', 'section-note', publicNarrative(modelData(context.model, 'forensic.aviation_reconciliation').assessment)); const aviationList = append(aviationSection, 'div', 'record-list two-column-list'); aviation.forEach(record => { const card = addProvenanceCard(aviationList, context, { kicker: readableDate(record.date), title: `${record.id} · ${record.aircraft}`, text: record.event, meta: `Crew status: ${record.crew_status}`, item: record }); card.dataset.aviationId = record.id; appendActorIdentities(card, context, [record.actor]); });
    const unresolved = append(frame.article, 'aside', 'scope-note'); append(unresolved, 'strong', '', 'Quantitative boundary'); append(unresolved, 'p', '', 'No compatible current dataset supplies a route-level aggregate for interception, impact or known-target hits. Atlas does not derive those outcomes from launch counts.'); const gaps = addSection(frame.article, 'Limits of the series'); const gapList = append(gaps, 'ul', 'method-list'); asArray(modelData(context.model, 'ledger.attrition_series').gaps).forEach(gap => append(gapList, 'li', '', publicNarrative(gap))); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function LossesPage(context) {
    const frame = pageFrame(context, 'Casualties, equipment losses, munitions and costs are kept separate. Unknown does not mean zero, and overlapping reported statuses are not added into a unique-person total.');
    const corrections = modelData(context.model, 'analysis.casualty_corrections'); const losses = recordArray(modelData(context.model, 'current.material_losses')); const assetDisplay = modelData(context.model, 'analysis.asset_display'); const envelopeData = modelData(context.model, 'forensic.loss_envelopes'); const leadershipData = modelData(context.model, 'forensic.leadership_casualties'); const aviationData = modelData(context.model, 'forensic.aviation_reconciliation'); const pilotData = modelData(context.model, 'forensic.pilot_rescue_timeline'); const casualtyEvents = recordArray(modelData(context.model, 'gate3.casualties'));
    const summary = addSection(frame.article, 'What is recorded'); append(summary, 'p', 'lead-copy', `${losses.length.toLocaleString()} material-loss records preserve confirmed, damaged, reported, claimed, targeted and unresolved states. Record count is not platform count, and civilian/commercial records remain separate from military losses.`);
    const visualizations = addSection(frame.article, 'Two views of the material-loss record'); const statusCounts = new Map(); losses.forEach(record => statusCounts.set(plainLabel(record.status, 'Status unresolved'), (statusCounts.get(plainLabel(record.status, 'Status unresolved')) || 0) + 1)); const statusChart = addBarChart(visualizations, Array.from(statusCounts, ([label, value]) => ({ label, value })), { label: 'Material-loss record count by recorded physical or claim state', note: 'Values are record counts, not destroyed-platform quantities. Targeted, reported, damaged, claimed and unresolved states remain distinct.', key: 'loss-physical-state-record-counts', valuesLabel: 'Numeric record counts by physical or claim state', tableCaption: 'Material-loss records by physical or claim state', categoryLabel: 'Recorded state', valueLabel: 'Records', numericNote: 'Each value counts records. It does not sum platform quantity or convert an unknown quantity to zero.' }); statusChart.dataset.lossVisualization = 'physical-state-record-counts'; const categoryCounts = new Map(); losses.forEach(record => categoryCounts.set(plainLabel(record.accounting_category, 'Class unresolved'), (categoryCounts.get(plainLabel(record.accounting_category, 'Class unresolved')) || 0) + 1)); const categoryChart = addBarChart(visualizations, Array.from(categoryCounts, ([label, value]) => ({ label, value })), { label: 'Material-loss record count by recorded accounting class', note: 'This second view counts records by accounting class. It does not add overlapping quantities, envelopes, or modeled values.', key: 'loss-accounting-class-record-counts', valuesLabel: 'Numeric record counts by accounting class', tableCaption: 'Material-loss records by accounting class', categoryLabel: 'Accounting class', valueLabel: 'Records', numericNote: 'These are record counts—not platform quantities, replacement-cost values, or confirmed-destruction totals.' }); categoryChart.dataset.lossVisualization = 'accounting-class-record-counts';
    const personnel = addSection(frame.article, 'People'); append(personnel, 'p', 'section-note', 'Headline personnel statuses and named senior figures answer different questions. The named list is not added to the broader casualty display.'); const personnelGrid = append(personnel, 'div', 'casualty-columns'); const us = append(personnelGrid, 'section', 'casualty-column'); append(us, 'h3', '', 'United States'); const usMetrics = append(us, 'div', 'metric-grid compact-metrics'); addMetric(usMetrics, formatNumber(corrections.united_states.current_display.total_military_dead), 'Total military dead', 'Combined reported military deaths; not labeled entirely KIA.'); addMetric(usMetrics, formatNumber(corrections.united_states.current_display.wounded), 'WIA', 'Current cumulative wounded-in-action display.'); addMetric(usMetrics, formatNumber(corrections.united_states.current_display.missing), 'MIA', 'Retained until a source explicitly resolves formal status.'); us.append(EvidenceDrawer.create(context, { sources: corrections.united_states.sources.map((_, index) => `US-CAS-${index}`) }, { localSources: Object.fromEntries(corrections.united_states.sources.map((source, index) => [`US-CAS-${index}`, source])) })); const iran = append(personnelGrid, 'section', 'casualty-column'); append(iran, 'h3', '', 'Iran'); const iranMetrics = append(iran, 'div', 'metric-grid compact-metrics'); addMetric(iranMetrics, formatNumber(corrections.iran.official_snapshot.military_dead), 'military-death subtotal', `${readableDate(corrections.iran.official_snapshot.date)} official snapshot; not an August military-only cumulative total.`); addMetric(iranMetrics, formatNumber(corrections.iran.official_snapshot.civilian_dead), 'civilian dead', 'Same dated official snapshot.'); addMetric(iranMetrics, 'Unresolved', 'current military WIA / MIA', 'No supported current national military-only totals are integrated.'); iran.append(EvidenceDrawer.create(context, { sources: corrections.iran.sources.map((_, index) => `IR-CAS-${index}`) }, { localSources: Object.fromEntries(corrections.iran.sources.map((source, index) => [`IR-CAS-${index}`, source])) })); const warning = append(frame.article, 'details', 'scope-note casualty-method'); append(warning, 'summary', '', 'How casualty totals are counted'); append(warning, 'p', '', 'The missing service member may also be represented in a later death aggregate. Atlas therefore does not calculate “total casualties = dead + wounded + missing” without item-level deconfliction.');
    if (casualtyEvents.length) { const eventLedger = append(personnel, 'details', 'secondary-context casualty-event-ledger'); append(eventLedger, 'summary', '', `Browse ${casualtyEvents.length.toLocaleString()} event-level casualty records`); append(eventLedger, 'p', 'section-note', 'These records preserve event-level and snapshot accounting rules. They are not automatically added to the headline statuses or to each other.'); const eventList = append(eventLedger, 'div', 'record-list two-column-list'); casualtyEvents.forEach(record => { const card = addProvenanceCard(eventList, context, { kicker: `${readableDate(record.event_date || record.death_date)} · ${plainLabel(record.evidence_status, 'Evidence status recorded')}`, title: `${publicNarrative(record.country || record.organization, 'Actor not specified')} casualty record`, text: publicNarrative(record.notes), meta: `${plainLabel(record.aggregation_type, 'Accounting method recorded')} · ${plainLabel(record.display_category, 'Casualty category recorded')}`, item: record }); card.dataset.casualtyId = record.casualty_id; appendActorIdentities(card, context, [record.country || record.organization || record.side]); addFactList(card, [['Killed', record.killed === null || record.killed === undefined ? 'Not reported' : formatNumber(record.killed)], ['Wounded', record.wounded === null || record.wounded === undefined ? 'Not reported' : formatNumber(record.wounded)], ['Missing', record.missing === null || record.missing === undefined ? 'Not reported' : formatNumber(record.missing)], ['Comparison rule', record.compare_only_with_same_category ? 'Compare only with the same accounting category' : 'Use the record’s stated aggregation rule']]); }); }
    const leaders = recordArray(leadershipData); const leadership = addSection(personnel, 'Named senior Iranian figures', 'subsection'); append(leadership, 'p', 'section-note', `${leaders.length.toLocaleString()} itemized records form a minimum list. They may overlap aggregate casualty reporting and are not added to it.`); const leadershipList = append(leadership, 'div', 'record-list two-column-list'); leaders.forEach(record => { const affiliation = /IRGC/i.test(record.role_at_death || '') ? 'IRGC' : 'Iran'; const card = addProvenanceCard(leadershipList, context, { kicker: `${readableDate(record.death_date)} · ${plainLabel(record.death_status)}`, title: record.name, text: record.confirmation_basis, meta: `${record.role_at_death} · ${plainLabel(record.analytic_confidence)} confidence`, item: record }); card.dataset.leadershipId = record.leadership_id; appendActorIdentities(card, context, [{ name: record.name, entityType: 'person', role: record.role_at_death, affiliation }], { subtitle: true }); addFactList(card, [['Status', plainLabel(record.death_status)], ['Likelihood', plainLabel(record.analytic_likelihood)], ['Attribution', record.attribution], ['Date precision', plainLabel(record.date_precision)]]); });
    const material = addSection(frame.article, 'Equipment'); append(material, 'p', '', `Browse all ${losses.length.toLocaleString()} canonical material-loss records. Claimed, reported, probable, verified and unresolved states remain distinct when the record supplies those classifications; unknown quantities never become zero.`); const claimBoundary = append(material, 'aside', 'scope-note material-loss-claim-boundary'); append(claimBoundary, 'strong', '', 'Claimed ≠ verified'); append(claimBoundary, 'p', '', 'IRGC claim: six vessel successes. Verified loss count not established. The claim remains in the Lie Ledger and is not converted into six synthetic material-loss records.'); const controls = append(material, 'form', 'loss-controls'); controls.addEventListener('submit', event => event.preventDefault()); const controlsByField = {}; const addFilter = (field, label, values) => { const wrapper = append(controls, 'label', '', label); const select = append(wrapper, 'select'); select.dataset.lossFilter = field; append(select, 'option', '', `All ${label.toLowerCase()}`).value = ''; values.filter(Boolean).sort().forEach(value => { const option = append(select, 'option', '', publicNarrative(value)); option.value = String(value).toLowerCase(); }); controlsByField[field] = select; return select; }; addFilter('actor', 'Actor / owner', [...new Set(losses.map(record => record.owner || record.side))]); addFilter('service', 'Service', [...new Set(losses.map(record => record.service))]); addFilter('class', 'Type', [...new Set(losses.map(record => record.accounting_category))]); addFilter('physical', 'Loss status', [...new Set(losses.map(record => record.status))]); addFilter('evidence', 'Evidence confidence', [...new Set(losses.map(record => record.confidence))]); const filterCount = append(controls, 'p', 'filter-result-count'); filterCount.setAttribute('aria-live', 'polite');
    const lossSideGroup = record => { const side = String(record.side || ''); if (side === 'U.S./COALITION') return 'us-coalition'; if (side === 'IRAN/ALIGNED') return 'iran-aligned'; if (side === 'CIVILIAN/COMMERCIAL' || side.includes('COMMERCIAL')) return 'civilian-commercial'; return 'unclassified'; }; const groupDefinitions = [{ title: 'United States / coalition losses', group: 'military', key: 'us-coalition' }, { title: 'Iran / aligned losses', group: 'military', key: 'iran-aligned' }, { title: 'Civilian and commercial losses', group: 'commercial', key: 'civilian-commercial' }, { title: 'Other / not classified', group: 'unclassified', key: 'unclassified' }]; const groupViews = groupDefinitions.map(definition => { const section = append(material, 'section', 'loss-side-group'); section.dataset.lossGroup = definition.group; section.dataset.lossSideGroup = definition.key; const heading = append(section, 'h3', 'ledger-group-heading', definition.title); const records = losses.filter(record => lossSideGroup(record) === definition.key); append(section, 'p', 'section-note', `${records.length.toLocaleString()} material-loss record${records.length === 1 ? '' : 's'} in this group.`); const list = append(section, 'div', 'record-list two-column-list'); records.forEach(record => addLossCard(list, context, record)); return { section, heading, list }; });
    const drawLosses = () => { let visible = 0; material.querySelectorAll('[data-loss-id]').forEach(card => { card.hidden = Object.entries(controlsByField).some(([field, control]) => control.value && card.dataset[`loss${field[0].toUpperCase()}${field.slice(1)}`] !== control.value); if (!card.hidden) visible += 1; }); groupViews.forEach(view => { view.section.hidden = view.list.querySelectorAll('[data-loss-id]:not([hidden])').length === 0; }); filterCount.textContent = `${visible.toLocaleString()} of ${losses.length.toLocaleString()} material-loss records shown`; }; Object.values(controlsByField).forEach(control => control.addEventListener('change', drawLosses)); drawLosses();
    const assetSection = addSection(frame.article, 'Iranian asset breakdown'); append(assetSection, 'p', 'section-note', `${publicNarrative(assetDisplay.doctrine)} Some categories overlap; do not add them together.`); const assetList = append(assetSection, 'div', 'record-list two-column-list'); asArray(assetDisplay.iran && assetDisplay.iran.headline_categories).forEach(record => { const card = addProvenanceCard(assetList, context, { kicker: plainLabel(record.public_status), title: `${record.headline} · ${record.label}`, text: publicNarrative(record.note || record.scope), meta: `${publicNarrative(record.subheadline)} · ${publicNarrative(record.scope)}`, item: record }); card.dataset.assetCategoryId = record.id; appendActorIdentities(card, context, ['Iran']); if (record.components) addFactList(card, record.components.map(([label, value]) => [label, formatNumber(value)])); });
    const envelopes = addSection(frame.article, 'Estimated loss ranges'); append(envelopes, 'p', 'section-note', `${publicNarrative(envelopeData.doctrine)} ${publicNarrative(envelopeData.double_counting_rule)} Ranges remain ranges and are not silently added to hard material-loss record counts.`); const envelopeList = append(envelopes, 'div', 'record-list'); asArray(envelopeData.categories).forEach(category => { const range = category.cost_model_range_usd || {}; const low = range.low === undefined ? range.all_region_model_low : range.low; const central = range.central === undefined ? range.all_region_model_central : range.central; const high = range.high === undefined ? range.all_region_model_high : range.high; const card = addProvenanceCard(envelopeList, context, { kicker: `${plainLabel(category.model_status, 'Calculated range')} · not a hard count`, title: `${plainLabel(category.category)} · ${formatUsd(low)} – ${formatUsd(high)}`, text: `Central modeled value: ${formatUsd(central)}. ${asArray(category.overlap_notes).map(publicNarrative).join(' ')}`, meta: 'Low / central / upper cases remain separate.', item: { source_ids: asArray(category.envelopes).flatMap(sourceIdsFrom) } }); card.dataset.envelopeCategory = category.category; asArray(category.envelopes).forEach(envelope => { const detail = append(card, 'details', 'envelope-detail'); append(detail, 'summary', '', `${publicNarrative(envelope.label)} · ${formatUsd(envelope.estimated_cost_usd)}`); addFactList(detail, [['Estimate status', plainLabel(envelope.estimate_status)], ['Confidence', plainLabel(envelope.confidence)], ['Additivity', plainLabel(envelope.additivity)], ['Quantity basis', envelope.quantity_basis], ['Methodology', envelope.methodology], ['Exclusions', asArray(envelope.exclusions).join('; ')]]); if (sourceIdsFrom(envelope).length) detail.append(EvidenceDrawer.create(context, envelope)); }); });
    const aviationSection = addSection(frame.article, 'Aviation and pilot details'); append(aviationSection, 'p', 'section-note', publicNarrative(aviationData.assessment)); const aviationList = append(aviationSection, 'div', 'record-list two-column-list'); recordArray(aviationData).forEach(record => { const card = addProvenanceCard(aviationList, context, { kicker: readableDate(record.date), title: `${record.id} · ${record.aircraft}`, text: record.event, meta: `Crew status: ${record.crew_status}`, item: record }); card.dataset.aviationId = record.id; appendActorIdentities(card, context, [record.actor]); }); const pilot = addSection(aviationSection, 'Pilot-rescue evidence chronology', 'subsection'); append(pilot, 'p', 'section-note', publicNarrative(pilotData.method_rule)); addSequence(pilot, context, recordArray(pilotData).sort((a, b) => a.sequence - b.sequence).map(record => ({ date: record.date, title: `${record.id} · ${plainLabel(record.status)}`, text: record.event, item: record })), { className: 'story-sequence pilot-rescue-sequence' }); pilot.querySelectorAll('.story-step').forEach((item, index) => { item.dataset.pilotRescueId = recordArray(pilotData).sort((a, b) => a.sequence - b.sequence)[index].id; });
    const method = addSection(frame.article, 'How these records are counted'); append(method, 'p', '', 'Record IDs, status, quantity qualifiers and source links are preserved. Claims, targeted assets, damaged equipment, neutralized systems, modeled quantities and calculated envelopes are never relabeled as confirmed destruction.'); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function ImageryPage(context) {
    const frame = pageFrame(context, 'Imagery can show physical damage, but it does not automatically tell us whether a facility stopped operating. Each entry keeps its facility, source context, geographic precision and stated limitation.'); const overlays = recordArray(modelData(context.model, 'ledger.bda_overlays')); const facilities = mergeCurrentRecords(modelData(context.model, 'ledger.facilities'), modelData(context.model, 'gate3.facilities'), ['facility_id', 'id']); const damageObservations = recordArray(modelData(context.model, 'forensic.damage_observations')); const facilityClaimAudits = recordArray(modelData(context.model, 'forensic.facility_claim_audits')); const currentImagery = context.model.chronology.filter(record => imageryPayloads(record).length); const imageryRecords = [...overlays, ...damageObservations, ...currentImagery]; frame.article.append(MapView.create(context, { title: 'Locations with imagery or damage-review records', records: imageryRecords, relatedRecords: facilities, description: 'Imagery is overlaid only when the evidence record supplies reliable geolocation. Otherwise it remains a footprint, location-linked card or evidence-only record.' })); const section = addSection(frame.article, 'Imagery review'); append(section, 'p', 'section-note', 'An attack record establishes an event. A physical damage observation records what imagery or reporting shows. Operational effect requires separate evidence and is not inferred from visible damage alone.'); const descriptors = imageryRecords.flatMap(record => imageryPayloads(record)).map(payload => imageryDescriptor(payload, context.services.locationResolver, facilities)); const list = append(section, 'div', 'imagery-summary-list'); descriptors.forEach(item => { const tierText = { A: 'Reliable image bounds support a geographic overlay.', B: 'A reliable footprint is shown; the image is not stretched into a false rectangle.', C: 'The target area is supported, but a precise image footprint is unavailable.', D: 'Reliable geolocation is unavailable; this item remains an evidence card only.' }[item.tier]; const observation = Boolean(item.evidenceRecord.observation_id); const owner = imageryActor(item, facilities); const details = append(list, 'details', 'imagery-summary-row'); details.dataset.imagerySummary = item.evidenceRecord.observation_id || item.record.overlay_id || mapTitle(item.evidenceRecord); const summary = append(details, 'summary', 'imagery-summary'); summary.append(context.services.actorIdentity.create(context.documentObject, owner || 'Actor unresolved')); const summaryText = append(summary, 'span', 'imagery-summary-copy'); append(summaryText, 'strong', '', mapTitle(item.evidenceRecord, item.point && item.point.label)); append(summaryText, 'small', '', `${plainLabel(item.evidenceRecord.damage_confidence || item.record.candidate_confidence || item.record.evidence_status, 'Evidence status recorded')} · ${tierText}`); const detailBody = append(details, 'div', 'imagery-detail-body'); const card = addProvenanceCard(detailBody, context, { kicker: observation ? `Physical damage observation · ${plainLabel(item.evidenceRecord.damage_confidence, 'Evidence status recorded')}` : publicNarrative(item.record.imagery_type, plainLabel(item.record.candidate_confidence || item.record.evidence_status, 'Imagery evidence')), title: mapTitle(item.evidenceRecord, item.point && item.point.label), text: publicNarrative(item.evidenceRecord.observation || item.record.limitations || item.evidenceRecord.event && item.evidenceRecord.event.summary, tierText), meta: observation ? `${tierText} Location confidence: ${plainLabel(item.evidenceRecord.location_confidence, 'Unresolved')}. This observation does not by itself establish operational effect.` : tierText, item: evidenceEnvelope(item.evidenceRecord) }); appendActorIdentities(card, context, [owner || 'Actor unresolved']); if (observation) card.dataset.damageObservationId = item.evidenceRecord.observation_id; });
    const audits = addSection(frame.article, 'What claims about these facilities hold up?'); append(audits, 'p', 'section-note', 'These records test specific facility claims against the available observations. Confirmation of damage does not automatically confirm a mission kill, destroyed platform or whole-site shutdown.'); const auditList = append(audits, 'div', 'record-list two-column-list'); facilityClaimAudits.forEach(audit => { const facility = facilities.find(record => record.facility_id === audit.facility_id); const card = addProvenanceCard(auditList, context, { kicker: 'Claim review linked to a facility record', title: publicNarrative(audit.facility_name, audit.facility_id), text: facility ? `Related facility: ${publicNarrative(facility.name, facility.facility_id)}. Open the review to see what is confirmed, misleading, unsubstantiated or unresolved.` : 'The related facility identity is unresolved in the current public model.' }); card.dataset.facilityAuditId = audit.facility_audit_id; card.dataset.facilityId = audit.facility_id; appendFacilityAudit(card, context, audit); const facilityLink = append(card, 'a', 'inline-route-link', 'Open related facility record'); facilityLink.href = routeHref('military.facilities', { facility: audit.facility_id }); }); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function HormuzOverviewPage(context) {
    const frame = pageFrame(context, 'Iran can still make Hormuz dangerous, but it has not established internationally recognized exclusive control over the Strait. Current talks center on a shared arrangement.'); const hormuz = modelData(context.model, 'analysis.hormuz'); const reality = hormuz.hormuz_reality_check; const why = addSection(frame.article, 'Why the Strait matters', 'content-section lead-story'); append(why, 'p', 'lead-copy', publicNarrative(reality.bottom_line)); const metrics = append(why, 'div', 'metric-grid'); asArray(reality.metrics).forEach(metric => addMetric(metrics, metric.value, publicNarrative(metric.label), publicNarrative(metric.note))); const sequence = addSection(frame.article, 'From wartime claim to current talks'); const controlTrack = asArray(hormuz.mou_position_tracks).find(track => /legal sovereignty/i.test(track.topic || '')); const shipping = mergeCurrentRecords(modelData(context.model, 'ledger.shipping'), modelData(context.model, 'gate3.shipping'), ['shipping_id', 'id']); const latestShipping = shipping.filter(item => item.date).slice(-2); addSequence(sequence, context, [{ title: 'Iran claimed a controlling role', text: publicNarrative(controlTrack && controlTrack.iran_max, 'Iran publicly sought control or dominant management of the Strait.'), item: controlTrack || {}, localSources: localSourceMap(hormuz) }, { title: 'The Strait became commercially disrupted', text: 'Some physical transit continued, but tracked commercial traffic, insurance and operator willingness fell far below normal. “Open” and “closed” did not describe the same thing.', item: latestShipping[0] || {} }, { title: 'Iran retained practical gatekeeping leverage', text: 'Iran could still threaten, delay and selectively permit traffic. That coercive fact did not create internationally recognized sovereignty or a permanent toll right.', item: controlTrack || {}, localSources: localSourceMap(hormuz) }, { title: 'The negotiating lane became shared', text: 'Iran originally said it would control and manage the Strait. It is now negotiating a shared arrangement with Oman and other Gulf states. That is a step backward from its original claim. The final terms are still being negotiated.', item: controlTrack || {}, localSources: localSourceMap(hormuz) }, { title: 'The end state remains unresolved', text: 'Final authority, revenue, mine-clearing, inspection and permanent passage rules have not been settled. The record therefore shows a walk-back and concession, not total Iranian capitulation.', item: latestShipping[1] || {} }]); frame.article.append(MapView.create(context, { title: 'Hormuz and connected conflict locations', records: asArray(hormuz.current_board_delta), description: 'Mapped records show verified or qualified conflict developments around the Strait. They are not live ship tracks.' })); const adaptation = addSection(frame.article, 'What prolonged disruption changed'); const cards = append(adaptation, 'div', 'record-list two-column-list'); asArray(reality.erosion_mechanisms).forEach(mechanism => addProvenanceCard(cards, context, { title: publicNarrative(mechanism.mechanism), text: publicNarrative(mechanism.effect), item: mechanism, localSources: localSourceMap(hormuz) })); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function ShippingPage(context) {
    const frame = pageFrame(context, 'Commercial traffic never fit a simple open-or-closed label. This record separates observed vessel counts, physical passage, permission, insurance and normal commercial traffic.'); const shipping = mergeCurrentRecords(modelData(context.model, 'ledger.shipping'), modelData(context.model, 'gate3.shipping'), ['shipping_id', 'id']); const hormuz = modelData(context.model, 'analysis.hormuz'); const routeRecords = asArray(modelData(context.model, 'analysis.oil_routes').routes); const materialLosses = recordArray(modelData(context.model, 'current.material_losses')); const shippingMapRecords = asArray(hormuz.current_board_delta).filter(record => /SHIPPING|HORMUZ|IRAN OIL EXPORTS/i.test(String(record.category || ''))); frame.article.append(MapView.create(context, { title: 'Shipping pressure and strategic bypass corridors', records: shippingMapRecords, routes: routeRecords, maxZoom: 5, description: 'The map shows Red Sea/Suez maritime context, the Saudi East–West pipeline, and China/Russia–Iran rail logistics from the existing corridor records. Every line is schematic; none is live tracking, surveyed alignment, or targeting-quality geometry.' })); const reading = addSection(frame.article, 'How to read the traffic observations'); append(reading, 'p', 'lead-copy', 'AIS-visible counts are useful observations, not a complete census. Vessels can sail with transponders off, different providers count different categories, and a single successful transit does not establish commercial normalization.'); const observations = addSection(frame.article, 'Observed shipping record'); const list = append(observations, 'div', 'record-list'); shipping.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach(record => addProvenanceCard(list, context, { kicker: readableDate(record.date), title: `${publicNarrative(record.metric)}: ${String(record.value)}`, text: publicNarrative(record.notes), meta: record.baseline ? `Comparison basis: ${publicNarrative(record.baseline)}` : '', item: record })); const routes = addSection(frame.article, 'Strategic alternatives and trade adaptation'); append(routes, 'p', '', publicNarrative(modelData(context.model, 'analysis.oil_routes').geometry_policy, 'Route geometry is schematic and describes transport corridors, not live vessel tracks.')); const routeList = append(routes, 'div', 'record-list two-column-list'); routeRecords.forEach(route => { const card = addProvenanceCard(routeList, context, { kicker: `${plainLabel(route.mode, 'Transport mode')} · ${routeAuthority(route) === 'SCHEMATIC_REFERENCE_ROUTE' ? 'Schematic reference route' : plainLabel(routeAuthority(route), 'Documented route')}`, title: publicNarrative(route.name), text: publicNarrative(route.note), technicalId: route.id, technicalIdLabel: 'Stable corridor ID', item: route }); card.dataset.routeId = route.id; card.dataset.routeMode = String(route.mode || '').toLowerCase(); }); const merchantLosses = materialLosses.filter(record => record.side === 'CIVILIAN/COMMERCIAL' || String(record.side || '').includes('COMMERCIAL')); const merchant = addSection(frame.article, 'Merchant-vessel physical-loss record'); append(merchant, 'p', 'section-note', `${merchantLosses.length.toLocaleString()} commercial-vessel records remain separate from military equipment totals.`); const merchantDetails = append(merchant, 'details', 'merchant-loss-details'); append(merchantDetails, 'summary', '', `Browse ${merchantLosses.length.toLocaleString()} merchant-vessel records`); const merchantList = append(merchantDetails, 'div', 'record-list two-column-list'); merchantLosses.forEach(record => addLossCard(merchantList, context, record)); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function EconomyPage(context) {
    const frame = pageFrame(context, 'Economic effects extend beyond military spending. Oil flows, sanctions, insurance, infrastructure damage and growth forecasts are kept in their own accounting domains.'); const economics = modelData(context.model, 'ledger.economics'); const currentEconomics = mergeCurrentRecords(economics, modelData(context.model, 'gate3.economics'), ['economic_id', 'id']); const china = modelData(context.model, 'analysis.china_oil_shift'); const oilRouteData = modelData(context.model, 'analysis.oil_routes'); const oilRoutes = asArray(oilRouteData.routes); frame.article.append(MapView.create(context, { title: 'Economic exposure and transport alternatives', routes: oilRoutes, maxZoom: 5, description: 'Maritime, pipeline and rail corridor records connect chokepoint exposure with transport alternatives. Geometry is schematic and does not state capacity, current movement, or exact alignment.' })); const forecast = addSection(frame.article, '2026 growth forecasts'); addBarChart(forecast, asArray(economics.forecast_context.rows).map(row => ({ label: row.country, value: row.delta, display: `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)} points` })), { label: 'Change in 2026 real GDP growth forecasts, percentage points', note: publicNarrative(economics.forecast_context.note) }); const comparison = addSection(frame.article, 'GCC and Iran: comparable forecast context'); append(comparison, 'p', 'section-note', `${publicNarrative(economics.forecast_context.metric)} These are forecasts, not realized GDP or a measure of military success. Pre-war and current forecasts are compared within the same series.`); const comparisonGrid = append(comparison, 'div', 'comparison-grid economic-comparison'); const forecastRows = asArray(economics.forecast_context.rows); const gccNames = new Set(['Saudi Arabia', 'Oman', 'United Arab Emirates', 'Bahrain', 'Kuwait', 'Qatar']); [['GCC states', forecastRows.filter(row => gccNames.has(row.country))], ['Iran', forecastRows.filter(row => row.country === 'Iran')]].forEach(([label, rows]) => { const column = append(comparisonGrid, 'section', 'comparison-column'); append(column, 'h3', '', label); rows.forEach(row => { const card = addProvenanceCard(column, context, { kicker: 'Forecast · percentage points', title: row.country, text: `Pre-war forecast: ${row.prewar.toFixed(1)}%. Current forecast: ${row.current.toFixed(1)}%. Change: ${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)} percentage points.`, meta: 'Modeled forecast comparison; not a realized output measure.', item: row }); card.dataset.economicComparisonCountry = row.country; appendActorIdentities(card, context, [row.country]); }); }); const current = addSection(frame.article, 'Recorded economic effects'); const list = append(current, 'div', 'record-list two-column-list'); currentEconomics.slice().reverse().forEach(record => addProvenanceCard(list, context, { kicker: readableDate(record.date), title: publicNarrative(record.topic), text: publicNarrative(record.finding), meta: publicNarrative(record.causation_note), item: record })); const trade = addSection(frame.article, 'China and trade adaptation'); append(trade, 'p', 'lead-copy', publicNarrative(china.assessment)); const tradeRoutes = append(trade, 'div', 'record-list'); asArray(china.routes).forEach(route => addProvenanceCard(tradeRoutes, context, { kicker: `${plainLabel(route.status)} · ${plainLabel(route.line_class)}`, title: publicNarrative(route.name), text: publicNarrative(route.flow_evidence), meta: publicNarrative(route.note), item: route })); const arcticLinks = asArray(china.linked_existing_routes); if (arcticLinks.length) { const arctic = append(trade, 'details', 'secondary-context arctic-context'); append(arctic, 'summary', '', 'Secondary context: Arctic / Northern Sea Route'); append(arctic, 'p', '', 'Russia’s Arctic oil route to China is relevant as alternative supply context. It is not evidence of Iranian wartime shipments or a measured replacement for lost Iranian volume.'); arcticLinks.forEach(route => { const card = addProvenanceCard(arctic, context, { kicker: 'Contextual link · not mapped', title: route.route_id, text: publicNarrative(route.note), item: route }); card.dataset.arcticRouteId = route.route_id; }); } const corridorIndex = addSection(frame.article, 'Strategic transport corridors'); append(corridorIndex, 'p', '', publicNarrative(oilRouteData.geometry_policy)); const corridorList = append(corridorIndex, 'div', 'record-list two-column-list'); oilRoutes.forEach(route => { const card = addProvenanceCard(corridorList, context, { kicker: `${plainLabel(route.mode)} · Schematic`, title: publicNarrative(route.name), text: publicNarrative(route.note), technicalId: route.id, technicalIdLabel: 'Stable corridor ID', item: route }); card.dataset.economyRouteId = route.id; }); const note = append(frame.article, 'aside', 'scope-note'); append(note, 'strong', '', 'Accounting boundary'); append(note, 'p', '', publicNarrative(economics.separation_rule)); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function HormuzNegotiationsPage(context) {
    const frame = pageFrame(context, 'Current talks concern passage, mine-clearing, inspections, fees and future administration. A shared negotiating process is not the same as a final agreement.'); const hormuz = modelData(context.model, 'analysis.hormuz'); const tracks = asArray(hormuz.mou_position_tracks).filter(track => /Hormuz/i.test(track.topic || '')); const statement = addSection(frame.article, 'What is being negotiated now', 'content-section lead-story'); append(statement, 'p', 'lead-copy', 'Iran originally said it would control and manage the Strait. It is now negotiating a shared arrangement with Oman and other Gulf states. That is a step backward from its original claim. The final terms are still being negotiated.'); const issues = addSection(frame.article, 'Issue by issue'); const list = append(issues, 'div', 'record-list'); tracks.forEach(track => addProvenanceCard(list, context, { kicker: plainLabel(track.current_status), title: publicNarrative(track.topic), text: publicNarrative(track.analysis), meta: `Confidence: ${plainLabel(track.confidence)}`, item: track, localSources: localSourceMap(hormuz) })); const currentEvents = context.model.chronology.filter(item => /(HORMUZ|QATAR_TEHRAN_MEDIATION|MARITIME|MINE_CLEAR)/.test(eventType(item))).slice(-8).reverse(); const updates = addSection(frame.article, 'Latest negotiation and implementation record'); const eventList = append(updates, 'div', 'record-list'); currentEvents.forEach(item => renderEventCard(eventList, item, context, { detail: true, topic: eventTopic(item) })); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function DiplomacyPage(context) {
    const frame = pageFrame(context, 'The record moves from proposals to ceasefires, interim agreements, implementation, breakdown and renewed mediation. Those states are not interchangeable.');
    const agreements = mergeCurrentRecords(modelData(context.model, 'ledger.agreements'), modelData(context.model, 'gate3.agreements'), ['agreement_id', 'id']);
    const current = addSection(frame.article, 'Current diplomatic state', 'content-section lead-story'); current.dataset.diplomaticState = 'current';
    append(current, 'p', 'lead-copy', 'The June MOU no longer controls either side, but negotiations continue. Current talks involve Hormuz passage and administration, nuclear questions and regional de-escalation. Diplomatic contact does not itself establish agreement or concession.');
    const currentLinks = append(current, 'div', 'record-actions diplomatic-current-links');
    [['talks.mou', 'June MOU'], ['hormuz.talks', 'Current Hormuz Talks'], ['talks.nuclear', 'Nuclear Talks']].forEach(([key, label]) => { const link = append(currentLinks, 'a', 'inline-route-link', label); link.href = routeHref(key); });

    const renderAgreement = (host, agreement) => {
      const formalized = agreement.signed_or_formalized_date;
      const card = addProvenanceCard(host, context, { kicker: `${formalized ? `Signed / formalized ${readableDate(formalized)}` : `Origin ${readableDate(agreement.origin_date)}`} · ${plainLabel(agreement.status)}`, title: publicNarrative(agreement.name, agreement.agreement_id), text: publicNarrative(agreement.current_assessment || agreement.what_it_proves), technicalId: agreement.agreement_id, technicalIdLabel: 'Stable agreement ID', item: agreement, relatedRecords: agreement.relevant_drawdown_or_event_refs });
      card.dataset.agreementId = agreement.agreement_id; card.dataset.agreementFormalized = formalized ? 'true' : 'false';
      if (asArray(agreement.parties).length) appendActorIdentities(card, context, agreement.parties);
      addFactList(card, [['Type', plainLabel(agreement.agreement_type)], ['Status', plainLabel(agreement.status)], ['Host or mediator', publicNarrative(agreement.host_or_mediator, '')], ['What happened', publicNarrative(agreement.what_it_proves, '')], ['What remains uncertain', publicNarrative(agreement.what_it_does_not_prove, '')]]);
      if (agreement.agreement_id === 'AGR-US-IRN-14POINT-MOU-2026') { const links = append(card, 'div', 'agreement-route-links'); const mou = append(links, 'a', 'inline-route-link', 'Open the June MOU record'); mou.href = routeHref('talks.mou'); const nuclear = append(links, 'a', 'inline-route-link', 'Open the nuclear-talks record'); nuclear.href = routeHref('talks.nuclear'); }
    };
    const isWartime = agreement => String(agreement.signed_or_formalized_date || agreement.origin_date || '') >= '2026-02-28';
    const wartimeAgreements = agreements.filter(isWartime); const earlierAgreements = agreements.filter(agreement => !isWartime(agreement));
    const wartime = addSection(frame.article, 'Wartime agreements and negotiations'); wartime.dataset.agreementGroup = 'wartime';
    append(wartime, 'p', 'section-note', `${wartimeAgreements.length.toLocaleString()} wartime agreement, framework or proposal record${wartimeAgreements.length === 1 ? '' : 's'} are grouped here by relevance to the conflict, not treated as interchangeable legal states.`);
    const wartimeList = append(wartime, 'div', 'record-list agreement-directory'); wartimeAgreements.forEach(agreement => renderAgreement(wartimeList, agreement));
    const earlier = addSection(frame.article, 'Earlier agreements relevant to the war'); earlier.dataset.agreementGroup = 'historical';
    append(earlier, 'p', 'section-note', `${earlierAgreements.length.toLocaleString()} earlier agreement or framework record${earlierAgreements.length === 1 ? '' : 's'} remain available as context and retain their original dates.`);
    const earlierList = append(earlier, 'div', 'record-list agreement-directory'); earlierAgreements.forEach(agreement => renderAgreement(earlierList, agreement));

    const diplomacy = modelData(context.model, 'ledger.diplomacy'); const diplomacyRecords = mergeCurrentRecords(diplomacy, modelData(context.model, 'gate3.diplomacy'), ['diplomacy_id', 'id']);
    const sequence = addSection(frame.article, 'Detailed negotiation sequence'); sequence.dataset.diplomaticState = 'sequence';
    append(sequence, 'p', 'section-note', publicNarrative(diplomacy.rule));
    addSequence(sequence, context, diplomacyRecords.map(record => ({ date: record.date, title: publicNarrative(record.position_change, 'Diplomatic development'), text: asArray(record.actors).map(actor => context.services.actorIdentity.resolve(actor).label).join(' · '), item: record, relatedRecords: record.event_refs })));
    renderRelatedLinks(frame.article, context); return frame.article;
  }

  function MouPage(context) {
    const frame = pageFrame(context, 'The June MOU was an interim bargain, not a final peace settlement. This page shows what each side wanted, what the text did, what happened afterward and where the agreement stands now.'); const publicView = modelData(context.model, 'analysis.endgame_public_view'); const hormuz = modelData(context.model, 'analysis.hormuz'); const localSources = localSourceMap(publicView); const before = addSection(frame.article, 'What each side wanted'); const wants = append(before, 'div', 'comparison-grid'); ['Iran', 'United States / coalition'].forEach(side => { const column = append(wants, 'section', 'comparison-column'); append(column, 'h3', '', side); appendActorIdentities(column, context, [side === 'Iran' ? 'Iran' : 'United States']); const values = side === 'Iran' ? hormuz.non_mou_demands.iran : hormuz.non_mou_demands.us; asArray(values).slice(0, 5).forEach(value => { const title = itemTitle(value, 'Recorded negotiating demand'); const text = itemSummary(value); addProvenanceCard(column, context, { title, text, item: value, localSources: localSourceMap(hormuz) }); }); }); const exchange = addSection(frame.article, 'What the MOU actually did'); const exchangeGrid = append(exchange, 'div', 'comparison-grid'); Object.entries(publicView.who_got).forEach(([side, gains]) => { const column = append(exchangeGrid, 'section', 'comparison-column'); append(column, 'h3', '', side); const list = append(column, 'ul', 'method-list'); asArray(gains).forEach(gain => append(list, 'li', '', publicNarrative(gain))); }); const obligations = addSection(frame.article, 'What the agreement required'); append(obligations, 'p', '', 'The interim text combined immediate ceasefire, passage and restraint obligations with final-deal issues that still required negotiation, monitoring and continued performance.'); const obligationGrid = append(obligations, 'div', 'comparison-grid'); const immediate = append(obligationGrid, 'section', 'comparison-column'); append(immediate, 'h3', '', 'Immediate or interim obligations'); [1, 4, 5, 9, 10].map(number => publicView.clauses.find(clause => clause.paragraph === String(number))).filter(Boolean).forEach(clause => addProvenanceCard(immediate, context, { kicker: `Paragraph ${clause.paragraph}`, title: clause.title, text: clause.summary })); const deferred = append(obligationGrid, 'section', 'comparison-column'); append(deferred, 'h3', '', 'Deferred or final-deal work'); [3, 6, 7, 8, 11, 12, 13, 14].map(number => publicView.clauses.find(clause => clause.paragraph === String(number))).filter(Boolean).forEach(clause => addProvenanceCard(deferred, context, { kicker: `Paragraph ${clause.paragraph}`, title: clause.title, text: clause.summary })); const implementation = addSection(frame.article, 'What happened afterward'); addSequence(implementation, context, asArray(publicView.mou_death).map(step => ({ kicker: step.date, title: publicNarrative(step.title), text: publicNarrative(step.detail), item: step, localSources }))); const reversed = append(implementation, 'div', 'scope-note'); append(reversed, 'strong', '', 'Gains reversed or never realized'); const reversedList = append(reversed, 'ul', 'method-list'); asArray(hormuz.agreement_balance.iran_lost_after_collapse).forEach(value => append(reversedList, 'li', '', publicNarrative(value))); const status = addSection(frame.article, 'Where it stands now', 'content-section lead-story'); append(status, 'p', 'lead-copy', 'The June MOU no longer controls what either side has to do. Washington called it over. Iran later called it suspended. Neither side agreed to extend it, and no final deal replaced it. Parts of it are still being used as a starting point in new talks.'); append(status, 'p', 'section-note', publicNarrative(publicView.mou_status.afterlife)); const influence = addSection(frame.article, 'How it still shapes current talks'); append(influence, 'p', '', publicNarrative(publicView.mou_now.text)); influence.append(EvidenceDrawer.create(context, sourceEnvelope(publicView.mou_now), { localSources })); const explorer = addSection(frame.article, 'Read the agreement clause by clause'); append(explorer, 'p', 'section-note', 'Clause summaries preserve the analytical text. Open the linked evidence for document-level source context.'); const clauseDisclosure = append(explorer, 'details', 'ux-disclosure'); append(clauseDisclosure, 'summary', '', `Read all ${asArray(publicView.clauses).length.toLocaleString()} clauses`); const clauseGrid = append(clauseDisclosure, 'div', 'clause-grid'); asArray(publicView.clauses).forEach(clause => addProvenanceCard(clauseGrid, context, { kicker: `Paragraph ${clause.paragraph}`, title: publicNarrative(clause.title), text: publicNarrative(clause.summary), item: { source_ids: publicView.mou_now.source_ids }, localSources })); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function NuclearPage(context) {
    const frame = pageFrame(context, 'Iran moved from saying key nuclear terms were non-negotiable to negotiating enrichment, inspections and stockpile limits. No final nuclear settlement has been reached.'); const messaging = modelData(context.model, 'analysis.iran_messaging'); const series = asArray(messaging.series).find(item => /Nuclear/i.test(item.issue || '')); const publicView = modelData(context.model, 'analysis.endgame_public_view'); const clause = asArray(publicView.clauses).find(item => /Nuclear weapon/i.test(item.title || '')); const sequence = addSection(frame.article, 'Position and negotiating sequence'); addSequence(sequence, context, [{ date: series.said.date, title: 'Earlier public position', text: publicNarrative(series.said.text), item: series.said, localSources: localSourceMap(messaging) }, { date: '2026-06-17', title: 'What the interim MOU did', text: publicNarrative(clause.summary), item: { source_ids: ['R_MOU_JUN17'] }, localSources: localSourceMap(messaging) }, { date: series.shifted_to.date, title: 'Later position', text: publicNarrative(series.shifted_to.text), item: series.shifted_to, localSources: localSourceMap(messaging) }, { kicker: 'Supported conclusion', title: 'Movement, with final terms unresolved', text: publicNarrative(series.occurred.text), item: series.assessment }]); const boundary = append(frame.article, 'aside', 'scope-note'); append(boundary, 'strong', '', 'What this does not establish'); append(boundary, 'p', '', 'There is no controlling final nuclear settlement. The record supports movement toward negotiating practical terms while Iran continues to harden some inspection positions; it does not support describing the entire nuclear issue as settled or surrendered.'); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function RegionalDiplomacyPage(context) {
    const frame = pageFrame(context, 'Regional states added mediation and security arrangements during the conflict. Each arrangement is shown with its parties, pre-war context and relationship to existing security structures; timing alone does not prove causation.'); const agreements = mergeCurrentRecords(modelData(context.model, 'ledger.agreements'), modelData(context.model, 'gate3.agreements'), ['agreement_id', 'id']); const alignment = agreements.find(agreement => agreement.agreement_id === 'AGR-SAUDI-MARITIME-COALITION-2026'); const participants = asArray(alignment && alignment.parties).map(name => ({ name, identity: context.services.actorIdentity.resolve(name) })); const alignmentSection = addSection(frame.article, '14-state maritime support', 'content-section alignment-section'); append(alignmentSection, 'p', 'section-note', alignment ? publicNarrative(alignment.what_it_proves) : 'The alignment record is unavailable.'); if (alignment) { alignmentSection.append(MapView.create(context, { title: 'Participant-state geographic spread', countryNames: participants.map(item => item.identity.parentState || item.identity.canonicalName), maxZoom: 4, fallbackViewport: [[-2, 5], [42, 95]], description: 'Highlighted country geography represents states listed in the joint support/alignment record. It does not identify capitals, headquarters, command nodes, deployments, or operating areas.' })); const roster = append(alignmentSection, 'div', 'alignment-roster'); participants.forEach(item => { const card = append(roster, 'article', 'alignment-participant'); card.dataset.alignmentActorId = item.identity.actorId || ''; card.append(context.services.actorIdentity.create(context.documentObject, item.name, { subtitle: true })); }); alignmentSection.append(EvidenceDrawer.create(context, alignment, { relatedRecords: alignment.relevant_drawdown_or_event_refs })); const boundary = append(alignmentSection, 'aside', 'scope-note'); append(boundary, 'strong', '', 'Participation boundary'); append(boundary, 'p', '', publicNarrative(alignment.what_it_does_not_prove)); } const section = addSection(frame.article, 'Regional agreements and arrangements'); const list = append(section, 'div', 'record-list'); agreements.forEach(agreement => addProvenanceCard(list, context, { kicker: `${readableDate(agreement.signed_or_formalized_date || agreement.origin_date)} · ${plainLabel(agreement.status)}`, title: publicNarrative(agreement.name), text: publicNarrative(agreement.what_it_proves || agreement.current_assessment), meta: publicNarrative(agreement.what_it_does_not_prove), item: agreement, relatedRecords: agreement.relevant_drawdown_or_event_refs })); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function ObjectivesPage(context) {
    const frame = pageFrame(context, 'These are the objectives each side publicly set. Atlas compares them with what the evidence shows happened, without reducing the conflict to a single winner score. Achievement against a later narrowed objective does not erase the outcome against the original benchmark.'); const benchmark = addSection(frame.article, 'Objective benchmarks'); append(benchmark, 'p', 'section-note', 'Every outcome must identify the benchmark being used. A victory claim is an actor statement; it does not certify achievement.'); const benchmarkGrid = append(benchmark, 'div', 'definition-grid objective-benchmark-grid'); [['Original stated objective', 'Initial materially relevant public objective.'], ['Maximal demand', 'Most expansive public demand; not automatically the minimum acceptable settlement condition.'], ['Operational objective', 'Military or operational task supporting a broader goal.'], ['Subsequent stated objective', 'Later public objective.'], ['Narrowed objective', 'Later objective materially smaller in scope than the earlier objective.'], ['Bargaining position', 'Diplomatic demand or offer; not automatically a war objective.'], ['Outcome against original objective', 'Assessment benchmarked against the original stated objective.'], ['Outcome against revised objective', 'Assessment benchmarked against the later objective.'], ['Damage limitation', 'Preservation or minimization of further losses; not the same as achieving the original objective.'], ['Victory claim', 'An actor publicly describes the outcome as victory or success.']].forEach(([title, text]) => { const card = append(benchmarkGrid, 'article', 'definition-card'); append(card, 'strong', '', title); append(card, 'p', '', text); }); const objectives = modelData(context.model, 'analysis.endgame_us_objectives'); const corrections = modelData(context.model, 'analysis.endgame_objective_corrections'); const objectiveSources = localSourceMap(objectives); const applyOverrides = (records, overrides) => records.map(record => { const correction = asArray(overrides).find(item => String(record.objective || '').toLowerCase().includes(String(item.match || '').toLowerCase())); return correction ? { ...record, ...correction, objective: record.objective } : record; }); const usObjectives = applyOverrides(asArray(objectives.us_objectives), corrections.us_overrides); const iranObjectives = applyOverrides(asArray(objectives.iran_objectives), corrections.iran_overrides); const original = addSection(frame.article, 'Original and wartime objectives'); append(original, 'p', 'section-note', 'These are documented objectives and public benchmarks. Outcome labels come from the assessment; official claims do not certify their own success.'); const columns = append(original, 'div', 'comparison-grid'); [['United States / coalition', usObjectives], ['Iran', iranObjectives]].forEach(([side, rows]) => { const column = append(columns, 'section', 'comparison-column'); append(column, 'h3', '', side); appendActorIdentities(column, context, [side === 'Iran' ? 'Iran' : 'United States']); rows.forEach(record => addProvenanceCard(column, context, { kicker: record.origin ? publicNarrative(record.origin) : 'Documented objective', title: publicNarrative(record.objective), text: publicNarrative(record.assessment), meta: plainLabel(record.status), item: record, localSources: objectiveSources })); }); const demands = addSection(frame.article, 'Negotiating demands and later changes'); addSequence(demands, context, asArray(objectives.iran_walkbacks).map(change => ({ date: change.date, title: objectiveChangeLabel(change), text: `${publicNarrative(change.from)} → ${publicNarrative(change.to)}`, item: change, localSources: objectiveSources }))); const outcomes = modelData(context.model, 'analysis.iran_outcomes'); const issues = addSection(frame.article, 'Outcomes by level'); const list = append(issues, 'div', 'record-list'); asArray(outcomes.outcomes).forEach(outcome => { const card = addProvenanceCard(list, context, { kicker: `${publicNarrative(outcome.level)} · ${plainLabel(outcome.trend)}`, title: publicNarrative(outcome.headline || outcome.label), text: publicNarrative(outcome.strongest_supported_conclusion), meta: `Confidence: ${plainLabel(outcome.confidence)}`, item: outcome, relatedRecords: [...asArray(outcome.supporting_record_refs), ...asArray(outcome.contrary_or_limiting_refs)] }); const balance = append(card, 'div', 'outcome-balance'); append(balance, 'p', '', `Retained: ${publicNarrative(outcome.what_iran_retained, 'Not separately stated.')}`); append(balance, 'p', '', `Lost or constrained: ${publicNarrative(outcome.what_iran_lost, 'Not separately stated.')}`); if (outcome.what_this_does_not_prove) append(balance, 'p', '', `Does not prove: ${publicNarrative(outcome.what_this_does_not_prove)}`); }); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function PositionChangesPage(context) {
    const frame = pageFrame(context, 'This page compares earlier positions with what happened next and what actors later said or did. Atlas calls something a walkback only where the encoded analytical record already supports a material retreat from the earlier position.'); const rule = append(frame.article, 'aside', 'scope-note'); append(rule, 'strong', '', 'Walkback is an analytical classification'); append(rule, 'p', '', 'A wording change, negotiating-mechanics change, tactical adjustment, or public reframing is not automatically a walkback. UX renders the classification supplied by the analytical record; it does not manufacture one.'); const objectives = modelData(context.model, 'analysis.endgame_us_objectives'); const messaging = modelData(context.model, 'analysis.iran_messaging'); const changes = addSection(frame.article, 'Recorded changes'); asArray(objectives.iran_walkbacks).forEach(change => { const group = append(changes, 'article', 'position-sequence'); append(group, 'p', 'card-kicker', readableDate(change.date)); append(group, 'h3', '', objectiveChangeLabel(change)); const grid = append(group, 'div', 'position-grid'); addProvenanceCard(grid, context, { kicker: 'Earlier position', title: 'What Iran said it required', text: publicNarrative(change.from) }); addProvenanceCard(grid, context, { kicker: 'Later position or behavior', title: 'What changed', text: publicNarrative(change.to) }); if (change.assessment) append(group, 'p', 'supported-conclusion', publicNarrative(change.assessment)); group.append(EvidenceDrawer.create(context, sourceEnvelope(change), { localSources: localSourceMap(objectives) })); }); const explanation = addSection(frame.article, 'What changed'); const list = append(explanation, 'div', 'record-list'); asArray(messaging.series).forEach(series => addProvenanceCard(list, context, { kicker: plainLabel(series.status), title: publicNarrative(series.issue), text: publicNarrative(series.assessment && series.assessment.text), meta: series.assessment && `Confidence: ${plainLabel(series.assessment.confidence)}`, item: { source_ids: [...sourceIdsFrom(series.said), ...sourceIdsFrom(series.shifted_to)] }, localSources: localSourceMap(messaging) })); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function IranMessagingPage(context) {
    const frame = pageFrame(context, "This page compares Iran’s earlier statements with later statements and actions. Where motive remains unresolved, Atlas says so."); const threatBoundary = append(frame.article, 'aside', 'scope-note'); append(threatBoundary, 'strong', '', 'Threat → trigger → outcome'); append(threatBoundary, 'p', '', 'When a threatened response is not carried out by the evidence cutoff, Atlas states that nonoccurrence directly. That does not by itself establish that the original threat was a bluff or knowingly false; intent may have changed after the statement.'); const messaging = modelData(context.model, 'analysis.iran_messaging'); asArray(messaging.series).forEach(series => { const section = addSection(frame.article, publicNarrative(series.issue), 'content-section messaging-series'); append(section, 'p', 'status-banner', plainLabel(series.status)); addSequence(section, context, [{ date: series.said.date, title: 'What Iran said', text: publicNarrative(series.said.text), item: series.said, localSources: localSourceMap(messaging) }, { kicker: 'Intervening record', title: 'What happened', text: publicNarrative(series.occurred.text), item: series.occurred, localSources: localSourceMap(messaging) }, { date: series.shifted_to.date, title: 'What Iran said or did later', text: publicNarrative(series.shifted_to.text), item: series.shifted_to, localSources: localSourceMap(messaging) }, { kicker: 'Assessment', title: objectiveChangeLabel(series.assessment), text: publicNarrative(series.assessment.text), item: { source_ids: [...sourceIdsFrom(series.said), ...sourceIdsFrom(series.shifted_to)] }, localSources: localSourceMap(messaging) }]); if (asArray(series.assessment.alternatives).length) { const alternatives = append(section, 'div', 'scope-note'); append(alternatives, 'strong', '', 'Unresolved explanation'); append(alternatives, 'p', '', `The record leaves several possible explanations open: ${series.assessment.alternatives.map(value => publicNarrative(value)).join(', ')}.`); } }); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function ClaimChecksPage(context) {
    const frame = pageFrame(context, 'A claim is not fact because a government, military, party or armed group said it. Each case shows the claim, current finding, observed outcome, evidence and unresolved questions.'); const claims = recordArray(modelData(context.model, 'current.claims')); claims.forEach(claim => { const section = addSection(frame.article, publicNarrative(claim.claim), 'content-section claim-case'); const header = append(section, 'div', 'claim-finding'); append(header, 'p', 'card-kicker', `Claimed by ${publicNarrative(claim.claimant, 'claimant not identified')}`); append(header, 'strong', '', plainLabel(claim.current_verdict)); append(header, 'p', '', publicNarrative(claim.what_actually_happened)); const unresolved = append(section, 'div', 'unresolved-box'); append(unresolved, 'h3', '', 'What remains unresolved'); const unresolvedList = append(unresolved, 'ul', 'method-list'); asArray(claim.unresolved_questions).forEach(value => append(unresolvedList, 'li', '', publicNarrative(value))); const reasoning = append(section, 'details', 'ux-disclosure claim-reasoning'); append(reasoning, 'summary', '', 'Why we reached this finding'); const columns = append(reasoning, 'div', 'evidence-columns'); const support = append(columns, 'section', 'evidence-column support-column'); append(support, 'h3', '', 'Evidence supporting the claim'); const supportList = append(support, 'ul', 'method-list'); const supporting = asArray(claim.evidence_supporting_claim); if (supporting.length) supporting.forEach(value => append(supportList, 'li', '', publicNarrative(value))); else append(supportList, 'li', '', 'No supporting evidence is recorded in this case file.'); const contrary = append(columns, 'section', 'evidence-column contrary-column'); append(contrary, 'h3', '', 'Contrary or limiting evidence'); const contraryList = append(contrary, 'ul', 'method-list'); asArray(claim.counterevidence).forEach(value => append(contraryList, 'li', '', publicNarrative(value, value))); reasoning.append(EvidenceDrawer.create(context, sourceEnvelope(claim), { relatedRecords: claim.chronology })); }); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function InformationEnvironmentPage(context) {
    const frame = pageFrame(context, 'Claim accuracy & deception evidence. A false statement is not automatically a deliberate lie. Atlas treats factual accuracy and evidence of intent as separate questions.'); const ledger = recordArray(modelData(context.model, 'gate3.lie_ledger')); const families = recordArray(modelData(context.model, 'gate3.narrative_families')); const chains = recordArray(modelData(context.model, 'gate3.information_chains')); const reliability = recordArray(modelData(context.model, 'gate3.source_reliability')); const boundary = addSection(frame.article, 'How the ledger reaches a finding', 'content-section lie-ledger-boundary'); append(boundary, 'p', 'lead-copy', 'A false statement is not automatically a deliberate lie. Atlas treats factual accuracy and evidence of intent as separate questions. Evidence relation uses Supports, Contradicts, Mixed or Insufficient only when that relation is explicitly supplied; those labels are not proposition truth states.'); const knowledge = append(boundary, 'aside', 'scope-note knowledge-boundary'); append(knowledge, 'strong', '', 'Reasonable institutional knowledge'); append(knowledge, 'p', '', 'The asserted fact may be of a type the relevant institution would ordinarily be expected to know through its own command, administrative, operational or reporting systems. Institutional knowledge is not automatically individual speaker knowledge.'); const flow = append(boundary, 'ol', 'claim-event-tree'); ['What they said', 'What they did', 'What others did', 'What actually happened', 'Current adjudication'].forEach(step => append(flow, 'li', '', step));
    const section = addSection(frame.article, 'Claim, contradiction and deception ledger'); append(section, 'p', 'section-note', `${ledger.length.toLocaleString()} proposition records are shown from the evidence state. Originators and amplifiers remain separate where the record supports that distinction.`); const controls = append(section, 'form', 'lie-ledger-controls'); controls.addEventListener('submit', event => event.preventDefault()); const searchLabel = append(controls, 'label', '', 'Search claims'); const search = append(searchLabel, 'input'); search.type = 'search'; search.placeholder = 'Search claims, actors or categories'; const truthLabel = append(controls, 'label', '', 'Proposition status'); const truth = append(truthLabel, 'select'); append(truth, 'option', '', 'All proposition statuses').value = ''; Array.from(new Set(ledger.map(record => record.truth_adjudication).filter(Boolean))).sort().forEach(value => { const option = append(truth, 'option', '', propositionStatusLabel(value)); option.value = value; }); const deceptionLabel = append(controls, 'label', '', 'Evidence of knowing deception'); const deception = append(deceptionLabel, 'select'); append(deception, 'option', '', 'All deception scores').value = ''; [0, 1, 2, 3, 4].forEach(score => { const option = append(deception, 'option', '', score === 0 ? '0 — No evidence' : String(score)); option.value = String(score); }); const chainLabel = append(controls, 'label', '', 'Information chain'); const chain = append(chainLabel, 'select'); [['', 'All claim records'], ['linked', 'Linked to a chain'], ['unlinked', 'No chain recorded']].forEach(([value, label]) => { const option = append(chain, 'option', '', label); option.value = value; }); const count = append(controls, 'p', 'filter-result-count'); count.setAttribute('aria-live', 'polite'); const list = append(section, 'div', 'lie-ledger-list');
    const renderLedger = () => { const query = search.value.trim().toLowerCase(); const rows = ledger.filter(record => !query || JSON.stringify(record).toLowerCase().includes(query)).filter(record => !truth.value || record.truth_adjudication === truth.value).filter(record => chain.value !== 'linked' || record.chain_id || record.atlas_event_tree_link).filter(record => chain.value !== 'unlinked' || !record.chain_id && !record.atlas_event_tree_link).filter(record => deception.value === '' || String(record.deception_score) === deception.value); list.replaceChildren(); rows.forEach(record => { const details = append(list, 'details', 'lie-ledger-record'); details.dataset.claimId = record.claim_id; details.dataset.truthAdjudication = String(record.truth_adjudication || '').toLowerCase(); details.dataset.deceptionScore = String(record.deception_score); const summary = append(details, 'summary', 'lie-ledger-summary'); const heading = append(summary, 'span', 'lie-ledger-summary-copy'); append(heading, 'span', 'card-kicker', `${propositionStatusLabel(record.truth_adjudication)} · Evidence of knowing deception: ${deceptionDisplay(record)}`); append(heading, 'strong', '', publicNarrative(record.proposition || record.claim, record.claim_id)); append(heading, 'small', '', `${publicNarrative(record.actor, 'Originator unresolved')} · ${plainLabel(record.claim_category, 'Other')}`); const body = append(details, 'article', 'record-card lie-ledger-detail'); appendActorIdentities(body, context, [record.actor || 'Originator unresolved']); addFactList(body, [['Claim', publicNarrative(record.claim)], ['Testable proposition', publicNarrative(record.proposition)], ['Originator or speaker', publicNarrative(record.speaker_institution || record.actor, 'Unresolved in the record')], ['Originator status', plainLabel(record.originator_status || record.claimant_type, 'Not separately resolved')], ['Claim category', plainLabel(record.claim_category, 'Other')], ['What happened', publicNarrative(record.adjudication_basis || record.inherited_assessment, 'The record does not supply a separate narrative beyond the current finding.')], ['What the actor did afterward', publicNarrative(record.subsequent_revision, 'No later correction or replacement is recorded for this proposition.')], ['External test / later evidence', asArray(record.later_evidence).length ? `${record.later_evidence.length.toLocaleString()} later evidence reference${record.later_evidence.length === 1 ? '' : 's'}; open Evidence below.` : 'No separate external-test reference is recorded.'], ['Claim test status', plainLabel(record.claim_test_status, 'Test not resolved')], ['Proposition status', propositionStatusLabel(record.truth_adjudication)], ['Evidence relation', firstText(record.evidence_relation, record.evidence_relation_status) ? plainLabel(firstText(record.evidence_relation, record.evidence_relation_status)) : null], ['Evidence of knowing deception', deceptionDisplay(record)], ['Deception basis', publicNarrative(record.deception_basis)], ['Narrative function', firstText(record.narrative_function) ? publicNarrative(record.narrative_function) : null], ['Knowledge evidence', plainLabel(record.knowledge_access, 'Not established')], ['Knowledge-evidence basis', publicNarrative(record.knowledge_access_note, 'No separate knowledge-evidence basis is recorded.')], ['Reasonable institutional knowledge', firstText(record.reasonable_institutional_knowledge, record.institutional_knowledge_status) ? plainLabel(firstText(record.reasonable_institutional_knowledge, record.institutional_knowledge_status)) : null], ['Institutional deception', firstText(record.institutional_deception_status) ? plainLabel(record.institutional_deception_status) : null], ['Individual speaker knowledge', firstText(record.individual_speaker_knowledge, record.individual_deception_status) ? plainLabel(firstText(record.individual_speaker_knowledge, record.individual_deception_status)) : null], ['Confidence & limits', plainLabel(record.confidence, 'Unresolved')], ['What would change the rating', publicNarrative(record.what_would_change_rating)], ['Event time', publicNarrative(record.event_time, 'Not established')], ['Knowledge time', publicNarrative(record.knowledge_time, 'Not established')], ['Information-chain link', record.chain_id || record.atlas_event_tree_link || 'No chain link recorded']]); const publicLine = append(body, 'p', 'claim-public-sentence'); publicLine.textContent = claimPublicSentence(record); const evidenceIds = [...new Set([...sourceIdsFrom(record), ...asArray(record.later_evidence)])]; if (evidenceIds.length) body.append(EvidenceDrawer.create(context, { source_ids: evidenceIds })); }); count.textContent = `${rows.length.toLocaleString()} of ${ledger.length.toLocaleString()} claim propositions shown`; if (!rows.length) append(list, 'p', 'empty-state', 'No claim propositions match these filters.'); };
    search.addEventListener('input', renderLedger); [truth, deception, chain].forEach(control => control.addEventListener('change', renderLedger)); renderLedger(); const familySection = addSection(frame.article, 'Recurring narrative families'); append(familySection, 'p', 'section-note', 'A family links repeated or potentially recycled stories. A queue status is not an adjudication and does not prove coordination or fabrication.'); const familyDetails = append(familySection, 'details', 'secondary-context narrative-family-directory'); append(familyDetails, 'summary', '', `Browse ${families.length.toLocaleString()} narrative families`); const familyList = append(familyDetails, 'div', 'record-list two-column-list'); families.forEach(record => { const card = addProvenanceCard(familyList, context, { kicker: plainLabel(record.status, 'Status recorded'), title: publicNarrative(record.claim_family), text: 'This family remains linked for cross-iteration reconstruction; its status is not promoted into a truth or intent finding.', item: record }); card.dataset.narrativeFamilyId = record.narrative_family_id; }); const chainSection = addSection(frame.article, 'Information chains'); append(chainSection, 'p', 'section-note', 'Chains distinguish an original claim, later revisions and amplifiers where those links are recorded. Repeating a false claim does not automatically establish that an amplifier knew it was false.'); const chainDetails = append(chainSection, 'details', 'secondary-context information-chain-directory'); append(chainDetails, 'summary', '', `Browse ${chains.length.toLocaleString()} information chains`); const chainList = append(chainDetails, 'div', 'record-list'); chains.forEach(record => { const chainRecords = asArray(record.records); const sources = [...new Set(chainRecords.flatMap(item => [item.source_id, ...asArray(item.later_evidence)]).filter(Boolean))]; const card = addProvenanceCard(chainList, context, { kicker: `${chainRecords.length.toLocaleString()} linked record${chainRecords.length === 1 ? '' : 's'}`, title: publicNarrative(record.information_chain_id, 'Information chain'), text: chainRecords.length ? `${publicNarrative(chainRecords[0].exact_translated_claim || chainRecords[0].proposition, 'Original claim recorded')}${chainRecords[chainRecords.length - 1].subsequent_iranian_revision ? ` Later revision: ${publicNarrative(chainRecords[chainRecords.length - 1].subsequent_iranian_revision)}` : ''}` : 'No linked records are exposed in this chain.', item: { source_ids: sources } }); card.dataset.informationChainId = record.information_chain_id; }); const reliabilitySection = addSection(frame.article, 'Descriptive source history'); append(reliabilitySection, 'p', 'section-note', 'These counts describe propositions adjudicated in this corpus. They are not a probability that a future claim is true, and they do not by themselves establish deceptive intent.'); const reliabilityDetails = append(reliabilitySection, 'details', 'secondary-context reliability-directory'); append(reliabilityDetails, 'summary', '', `Browse ${reliability.length.toLocaleString()} source and claimant histories`); const reliabilityList = append(reliabilityDetails, 'div', 'record-list two-column-list'); reliability.forEach(record => { const outcomes = Object.entries(record.proposition_outcomes || {}).map(([label, value]) => `${plainLabel(label)}: ${formatNumber(value)}`).join(' · '); const card = addProvenanceCard(reliabilityList, context, { kicker: plainLabel(record.subject_type, 'Recorded subject'), title: publicNarrative(record.display_name || record.subject_id_or_name), text: outcomes || 'No proposition outcomes recorded.', meta: `${formatNumber(record.correction_count)} corrections recorded · ${formatNumber(record.claim_count)} claims reviewed`, item: record }); card.dataset.reliabilityId = record.reliability_id; }); const legacyClaims = modelData(context.model, 'analysis.information_war_claims'); const legacySection = addSection(frame.article, 'Earlier curated narrative summaries'); const legacyDetails = append(legacySection, 'details', 'secondary-context'); append(legacyDetails, 'summary', '', `Review ${asArray(legacyClaims).length.toLocaleString()} earlier narrative summaries preserved at the migration boundary`); const legacyList = append(legacyDetails, 'div', 'record-list'); asArray(legacyClaims).forEach((claim, claimIndex) => { const localSources = Object.fromEntries(asArray(claim.sources).map((source, sourceIndex) => [`INFO-${claimIndex}-${sourceIndex}`, source])); const card = addProvenanceCard(legacyList, context, { kicker: `${plainLabel(claim.verdict)} · ${publicNarrative(claim.date_window, 'Date window not established')}`, title: publicNarrative(claim.claim), text: publicNarrative(claim.assessment), meta: [claim.platform, claim.reach].filter(Boolean).map(value => publicNarrative(value)).join(' · '), item: { source_ids: Object.keys(localSources) }, localSources }); if (asArray(claim.status_tags).length) { const tags = append(card, 'div', 'tag-row'); claim.status_tags.forEach(tag => append(tags, 'span', '', plainLabel(tag))); } }); const networks = modelData(context.model, 'analysis.influence_networks'); const networkSection = addSection(frame.article, 'Observed amplification networks'); append(networkSection, 'p', 'section-note', 'These measurements describe the collected sample and minimum observed engagement. They do not prove who directed a network or how many people believed the content.'); const networkList = append(networkSection, 'div', 'record-list two-column-list'); asArray(networks.networks).forEach(network => addProvenanceCard(networkList, context, { title: publicNarrative(network.name), text: `${formatNumber(network.posts_approx)} approximate posts · at least ${formatNumber(network.views_min)} views · ${formatNumber(network.sampled_accounts)} sampled accounts`, meta: asArray(network.notes).map(note => publicNarrative(note)).filter(Boolean).join(' ') })); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function sourceFamilyForProfile(profile) {
    const type = String(profile && profile.outlet_type || '').toUpperCase();
    const reporting = new Set(['NEWS_OUTLET', 'NEWS_AGENCY', 'WIRE_SERVICE', 'NEWSPAPER', 'BROADCASTER', 'PUBLIC_BROADCASTER', 'SPECIALIST_MARKET_NEWS', 'STATE_MEDIA', 'STATE_NEWS_AGENCY']);
    const official = new Set(['OFFICIAL_GOVERNMENT', 'OFFICIAL_MILITARY', 'INTERNATIONAL_ORGANIZATION', 'OFFICIAL_INSTITUTION', 'TECHNICAL_GOVERNMENT']);
    const research = new Set(['THINK_TANK', 'RESEARCH_INSTITUTE', 'ACADEMIC', 'COMMERCIAL_DATA_PROVIDER', 'SATELLITE_PROVIDER', 'SHIPPING_DATA_PROVIDER', 'MARKET_DATA_PROVIDER']);
    const political = new Set(['ADVOCACY_ORGANIZATION', 'POLITICAL_MEDIA', 'POLITICAL_NEWS_COMMENTARY', 'COMMENTARY_CREATOR', 'SOCIAL_ACCOUNT']);
    if (reporting.has(type)) return 'Reporting'; if (official.has(type)) return 'Official & primary sources'; if (research.has(type)) return 'Research & technical data'; if (political.has(type)) return 'Political, advocacy & social sources'; return 'Other / not classified';
  }

  function sourceRatingContext(profile) {
    const ground = profile && profile.ground_news || {}; const status = String(ground.status || '').toUpperCase();
    if (status === 'RATED') {
      const bias = firstText(ground.bias_bucket_3, ground.bias_raw); const factuality = firstText(ground.factuality); return ['Ground News', bias && `Bias: ${plainLabel(bias)}`, factuality && `Factuality: ${publicNarrative(factuality)}`].filter(Boolean).join(' · ');
    }
    if (status === 'NOT_APPLICABLE') return 'Ground News: not applicable to this source type';
    if (status === 'NOT_RATED') return 'Ground News: no external rating available';
    return null;
  }

  function SourcesDirectoryPage(context) {
    const frame = pageFrame(context, 'Browse the sources behind the current record by source type, origin and outlet. Search remains available, but you do not need to know a source ID to find the evidence.');
    const guide = addSection(frame.article, 'How source context works');
    append(guide, 'p', '', 'Publisher type, ownership or affiliation, external publisher ratings and Atlas’s claim-level evidence findings answer different questions. State media is a publisher type, not a truth verdict.');
    append(guide, 'p', 'source-rating-note', 'Publisher-level ratings describe the outlet, not whether a particular article or claim is true. Atlas assesses individual claims against their evidence.');
    const controls = append(frame.article, 'form', 'source-controls'); controls.addEventListener('submit', event => event.preventDefault());
    const label = append(controls, 'label', '', 'Search all sources'); const search = append(label, 'input'); search.type = 'search'; search.placeholder = 'Outlet, title, topic, or source ID';
    const count = append(controls, 'p', 'filter-result-count'); count.setAttribute('aria-live', 'polite');
    const directory = append(frame.article, 'div', 'source-directory');
    const rawSources = asArray(context.model.sources && context.model.sources.records);
    const rawById = new Map(rawSources.map(source => [source.source_id, source]));
    const resolved = context.services.sourceResolver.catalog();
    const familyOrder = ['Reporting', 'Official & primary sources', 'Research & technical data', 'Political, advocacy & social sources', 'Other / not classified'];
    const draw = () => {
      const query = search.value.trim().toLowerCase();
      const rows = resolved.map(source => ({ source, raw: rawById.get(source.sourceId) || {} })).filter(row => !query || JSON.stringify(row).toLowerCase().includes(query));
      const grouped = new Map(familyOrder.map(name => [name, new Map()]));
      rows.forEach(row => {
        const profile = row.raw.outlet_profile || {};
        const family = sourceFamilyForProfile(profile);
        const origin = firstText(profile.country, profile.region) || 'Other / not classified';
        const sourceRecord = row.source.status === 'resolved' && row.source.selected ? row.source.selected.record : row.source.identity || {};
        const outlet = firstText(profile.display_name, sourceRecord.publisher, sourceRecord.title) || row.source.sourceId;
        const originMap = grouped.get(family);
        if (!originMap.has(origin)) originMap.set(origin, new Map());
        const outletMap = originMap.get(origin);
        if (!outletMap.has(outlet)) outletMap.set(outlet, []);
        outletMap.get(outlet).push(row);
      });
      directory.replaceChildren();
      familyOrder.forEach(familyName => {
        const originMap = grouped.get(familyName);
        const familyCount = Array.from(originMap.values()).flatMap(outletMap => Array.from(outletMap.values())).reduce((sum, values) => sum + values.length, 0);
        if (!familyCount) return;
        const family = append(directory, 'section', 'source-family');
        append(family, 'h2', '', familyName);
        append(family, 'p', '', `${familyCount.toLocaleString()} source record${familyCount === 1 ? '' : 's'}`);
        Array.from(originMap.entries()).sort(([left], [right]) => left.localeCompare(right)).forEach(([originName, outletMap]) => {
          const origin = append(family, 'section', 'source-origin'); append(origin, 'h3', '', displayTerm(originName, 'Other / not classified'));
          Array.from(outletMap.entries()).sort(([left], [right]) => left.localeCompare(right)).forEach(([outletName, outletRows]) => {
            const details = append(origin, 'details', 'source-outlet');
            const summary = append(details, 'summary'); append(summary, 'span', 'source-outlet-name', outletName); append(summary, 'span', 'source-outlet-count', `${outletRows.length.toLocaleString()} item${outletRows.length === 1 ? '' : 's'}`);
            const profile = outletRows.find(row => row.raw.outlet_profile && Object.keys(row.raw.outlet_profile).length)?.raw.outlet_profile || {};
            const meta = append(details, 'div', 'source-outlet-meta');
            if (profile.outlet_type) append(meta, 'span', '', plainLabel(profile.outlet_type));
            if (profile.state_affiliation) append(meta, 'span', '', publicNarrative(profile.state_affiliation));
            if (profile.ownership_note) append(meta, 'span', '', publicNarrative(profile.ownership_note));
            const rating = sourceRatingContext(profile); if (rating) append(meta, 'span', '', rating);
            const items = append(details, 'div', 'source-list');
            outletRows.slice().sort((left, right) => String(left.source.sourceId).localeCompare(String(right.source.sourceId))).forEach(row => {
              const source = row.source; const record = source.status === 'resolved' && source.selected ? source.selected.record : source.identity || {}; const card = append(items, 'article', 'source-card'); card.dataset.sourceId = source.sourceId;
              append(card, 'h4', '', publicNarrative(record.title || record.publisher, source.sourceId));
              const metaLine = append(card, 'div', 'record-meta'); if (record.publicationDate) append(metaLine, 'span', '', `Published ${record.publicationDate}`);
              const registry = row.raw.registry || {}; const retrieved = firstText(registry.retrieved_at, registry.retrieval_date, registry.retrieved_on); if (retrieved) append(metaLine, 'span', '', `Retrieved ${retrieved}`);
              if (record.role) append(metaLine, 'span', '', publicNarrative(record.role));
              const technical = append(card, 'details', 'source-variants'); append(technical, 'summary', '', 'Source record details'); append(technical, 'p', 'source-id', `Source ID: ${source.sourceId}`);
              const contextRow = append(card, 'div', 'source-context-row'); append(contextRow, 'span', '', source.conflict ? 'Metadata differs across preserved evidence packages' : 'Source record resolved'); if (source.conflict) append(contextRow, 'span', '', `${source.variants.length} preserved versions`);
              appendSourceResolution(context.documentObject, card, source);
            });
          });
        });
      });
      count.textContent = `${rows.length.toLocaleString()} of ${resolved.length.toLocaleString()} sources shown`;
      if (!rows.length) append(directory, 'p', 'empty-state', 'No sources match this search.');
    };
    search.addEventListener('input', draw); draw(); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function SourcesPage(context) { return SourcesDirectoryPage(context); }

  function MethodPage(context) {
    const frame = pageFrame(context, 'How Atlas turns reporting, official claims, imagery and later corrections into a public record without hiding uncertainty.'); const packageLineage = asArray(context.model.input_packages); const principles = addSection(frame.article, 'The rules in ordinary language'); const list = append(principles, 'ul', 'method-list'); ['Unknown ≠ zero. Unknown does not mean zero.', 'Claimed ≠ verified.', 'Reported ≠ established.', 'Unsupported ≠ false.', 'Disputed ≠ false.', 'False ≠ automatically knowingly deceptive.', 'Institutional knowledge ≠ automatically individual speaker knowledge.', 'A confirmed hit does not by itself establish destroyed capability or strategic effect.', 'A launch does not prove penetration, impact or damage.', 'Later evidence does not retroactively become evidence known at the historical cutoff.', 'A strengthened stable-ID record is not a second occurrence of the event.', 'Outcome against a revised objective does not erase outcome against the original objective.', 'Uncertainty ends where the evidence ends it—and no earlier.', 'A publisher-level rating describes the outlet, not whether a particular article or claim is true.'].forEach(text => append(list, 'li', '', text)); const flow = addSection(frame.article, 'From summary to evidence'); addSequence(flow, context, [{ title: 'Read the conclusion', text: 'The page leads with the supported finding in ordinary language.' }, { title: 'Open the evidence detail', text: 'Drawers expose source links and related chronology records without making every page a wall of citations.' }, { title: 'Check status and dispute separately', text: 'Support describes the evidence. Dispute describes who contests it. One does not substitute for the other.' }, { title: 'Follow corrections through time', text: 'New evidence can clarify the current record while the earlier claim, date and revision history remain preserved.' }]); const current = addSection(frame.article, 'Current record'); append(current, 'p', '', `The current record contains ${formatNumber(context.model.counts.chronology_records)} chronology records and ${formatNumber(context.model.counts.canonical_source_records)} source records from ${formatNumber(packageLineage.length)} evidence collections. The current evidence cutoff is ${formatEvidenceClock(context.model.release.current_osint_cutoff)}; the frozen review cutoff remains ${formatEvidenceClock(context.model.release.gate2_evidence_cutoff)}.`); const history = addSection(frame.article, 'What was known then / what was learned later'); append(history, 'p', '', 'Historical views preserve the evidence boundary that existed at the selected time. Later corroboration can strengthen or revise the current record without making the historical view read as though that information was already known. Historical assessment preserved means the historical state is faithfully retained; it does not mean Atlas currently endorses that conclusion.'); const stable = append(history, 'aside', 'scope-note'); append(stable, 'strong', '', 'Stable-ID strengthening'); append(stable, 'p', '', 'The event did not happen again. The record became stronger or more precise. For Minab: Attribution strengthened by later evidence. Existing event retained.'); renderRelatedLinks(frame.article, context); return frame.article;
  }

  function ArchivePage(context) {
    const frame = pageFrame(context, 'Earlier public editions are preserved for historical reference. They do not change the current record.'); const section = addSection(frame.article, 'Archived editions'); const list = append(section, 'div', 'record-list'); recordArray(modelData(context.model, 'archive.snapshot_index')).forEach(snapshot => { const card = append(list, 'article', 'record-card'); append(card, 'h3', '', publicNarrative(snapshot.label, 'Archived edition')); append(card, 'p', '', snapshot.date || 'Date not stated'); append(card, 'p', '', 'Historical edition; not part of the current assessment.'); }); const note = append(frame.article, 'aside', 'scope-note'); append(note, 'strong', '', 'Historical reference boundary'); append(note, 'p', '', 'Earlier supporting records remain preserved for audit and historical reference. They do not populate current public pages.'); renderRelatedLinks(frame.article, context); return frame.article;
  }

  const LOCAL_NAV_ROUTES = new Set(['military.campaigns', 'military.losses', 'military.imagery', 'hormuz.shipping', 'hormuz.economy', 'talks.overview', 'talks.mou', 'talks.regional', 'objectives.outcomes', 'objectives.positions', 'evidence.claims', 'evidence.information', 'evidence.sources']);

  function addPageLocalNavigation(article, context) {
  if (!LOCAL_NAV_ROUTES.has(context.route.key)) return;
  const sections = Array.from(article.children).filter(node => node.matches && node.matches('section, .context-map, .related-section')).filter(node => {
    const heading = node.querySelector(':scope > h2');
    return heading && heading.textContent.trim() !== 'Continue exploring';
  });
  if (sections.length < 3) return;
  const nav = element(context.documentObject, 'nav', 'page-local-nav compact-section-index'); nav.setAttribute('aria-label', 'Jump to sections');
  const details = append(nav, 'details', 'section-index-disclosure');
  details.open = Number(context.windowObject && context.windowObject.innerWidth || 0) >= 900;
  append(details, 'summary', '', 'Jump to sections');
  const links = append(details, 'div', 'page-local-nav__links');
  sections.forEach(section => {
    const heading = section.querySelector(':scope > h2'); if (!heading) return;
    heading.tabIndex = -1;
    const button = append(links, 'button', 'section-index-link', heading.textContent.trim()); button.type = 'button';
    button.addEventListener('click', () => { heading.focus({ preventScroll: true }); section.scrollIntoView({ block: 'start', behavior: context.windowObject && context.windowObject.matchMedia && context.windowObject.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); if (Number(context.windowObject && context.windowObject.innerWidth || 0) < 900) details.open = false; });
  });
  const intro = article.querySelector('.page-intro'); const clocks = article.querySelector('.evidence-clock-bar'); const glance = article.querySelector('.at-a-glance'); const analyticalHero = article.querySelector('.analytical-hero'); (analyticalHero || clocks || glance || intro).after(nav);
}

  function addSafeAtAGlance(article, context) {
    const definitions = {
      'military.campaigns': [['reconciliation.strikes', 'reconciled strike records'], ['forensic.damage_observations', 'physical-damage observations'], ['forensic.facility_claim_audits', 'facility claim reviews']],
      'military.losses': [['current.material_losses', 'material-loss records'], ['gate3.casualties', 'event-level casualty records'], ['forensic.leadership_casualties', 'named senior-leadership records']],
      'evidence.information': [['gate3.lie_ledger', 'claim propositions'], ['gate3.narrative_families', 'narrative families'], ['gate3.information_chains', 'information chains']],
      'evidence.claims': [['current.claims', 'claim-check records']],
      'evidence.sources': [['current.sources', 'source records']]
    };
    const rows = definitions[context.route.key]; if (!rows) return;
    const section = element(context.documentObject, 'section', 'at-a-glance'); append(section, 'h2', '', 'At a glance'); const grid = append(section, 'div', 'metric-grid'); rows.forEach(([key, label]) => addMetric(grid, formatNumber(recordArray(modelData(context.model, key)).length), label)); const intro = article.querySelector('.page-intro'); intro.after(section);
  }

  function applyPresentationDisclosure(article, context) {
    if (context.route.key === 'military.campaigns') {
      ['What was physically damaged?', 'What did the damage change?'].forEach(title => {
        const section = Array.from(article.querySelectorAll('section')).find(node => node.querySelector(':scope > h2')?.textContent.trim() === title); if (!section) return;
        const candidates = Array.from(section.children).filter(node => node.matches && (node.matches('.record-list') || node.matches('.effect-proposition-group'))); if (!candidates.length) return;
        const details = append(section, 'details', 'ux-disclosure'); append(details, 'summary', '', title === 'What was physically damaged?' ? 'Browse detailed damage observations' : 'Browse detailed facility-effect reviews'); candidates.forEach(node => details.append(node));
      });
    }
    if (context.route.key === 'military.losses') {
      const section = Array.from(article.querySelectorAll('section')).find(node => node.querySelector(':scope > h2')?.textContent.trim() === 'Aviation and pilot details'); if (section) { const children = Array.from(section.children).filter(node => node.tagName !== 'H2' && !node.classList.contains('section-note')); if (children.length) { const details = append(section, 'details', 'ux-disclosure'); append(details, 'summary', '', 'Browse aviation and pilot forensic detail'); children.forEach(node => details.append(node)); } }
    }
  }


function visualSweepInsertAfterStatus(article, node) {
  const anchor = article.querySelector('.compact-section-index') || article.querySelector('.evidence-clock-bar') || article.querySelector('.at-a-glance') || article.querySelector('.page-intro');
  if (anchor) anchor.after(node); else article.prepend(node);
  return node;
}

function routeContextLabels(routes, endpointsOnly) {
  const labels = [];
  asArray(routes).forEach(route => {
    const nodes = asArray(route && route.nodes);
    nodes.forEach((node, index) => {
      const endpoint = index === 0 || index === nodes.length - 1;
      if (endpointsOnly && !endpoint) return;
      const priority = endpoint ? 0 : 3;
      if (Array.isArray(node) && node.length >= 3 && Number.isFinite(Number(node[1])) && Number.isFinite(Number(node[2]))) labels.push({ label: publicNarrative(node[0], 'Route node'), lat: Number(node[1]), lon: Number(node[2]), kind: String(route.mode || '').toLowerCase() === 'maritime' ? 'port' : 'place', priority });
      else if (node && typeof node === 'object') {
        const lat = Number(node.lat === undefined ? node.latitude : node.lat); const lon = Number(node.lon === undefined ? node.longitude : node.lon);
        if (validMapPoint([lat, lon])) labels.push({ label: publicNarrative(node.label || node.name, 'Route node'), lat, lon, kind: node.kind || 'place', priority });
      }
    });
  });
  return labels;
}

function enhanceTimelineVisual(article, context) {
  const explorer = article.querySelector('[data-timeline-controller]'); if (!explorer || explorer.querySelector('[data-timeline-density]')) return;
  const coverage = recordArray(modelData(context.model, 'gate3.daily_coverage'));
  const conflictStart = coverage[0] && coverage[0].date || '2026-02-28';
  const conflictEnd = coverage[coverage.length - 1] && coverage[coverage.length - 1].date || String(context.model.release.current_osint_cutoff).slice(0, 10);
  const eventDate = item => String(item.timeline && item.timeline.date || item.event && item.event.event_date || '');
  const wartime = context.model.chronology.filter(item => eventDate(item) >= conflictStart && eventDate(item) <= conflictEnd);
  const parseDay = value => new Date(`${value}T12:00:00Z`); const dayString = value => value.toISOString().slice(0, 10);
  const totalDays = Math.max(1, Math.round((parseDay(conflictEnd) - parseDay(conflictStart)) / 86400000) + 1);
  const binCount = Math.min(24, totalDays); const binSize = Math.ceil(totalDays / binCount);
  const bins = [];
  for (let index = 0; index < binCount; index += 1) {
    const start = new Date(parseDay(conflictStart).getTime() + index * binSize * 86400000); if (start > parseDay(conflictEnd)) break;
    const end = new Date(Math.min(parseDay(conflictEnd).getTime(), start.getTime() + (binSize - 1) * 86400000)); const startValue = dayString(start); const endValue = dayString(end);
    const records = wartime.filter(item => { const date = eventDate(item); return date >= startValue && date <= endValue; }); bins.push({ start: startValue, end: endValue, count: records.length });
  }
  const maxCount = Math.max(1, ...bins.map(bin => bin.count));
  const density = element(context.documentObject, 'section', 'timeline-density-overview analytical-hero'); density.dataset.timelineDensity = 'record-count-only';
  append(density, 'h2', '', 'Conflict tempo at a glance'); append(density, 'p', 'section-note', 'Bar height shows the number of recorded events in each interval. A larger cluster means more recorded events—not greater strategic importance.');
  const strip = append(density, 'div', 'timeline-density-strip'); strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', 'Recorded event density across the full conflict');
  bins.forEach(bin => { const button = append(strip, 'button', 'timeline-density-bin'); button.type = 'button'; button.style.setProperty('--density', String(bin.count / maxCount)); button.dataset.start = bin.start; button.dataset.end = bin.end; button.setAttribute('aria-label', `${bin.count} recorded events from ${readableDate(bin.start)} through ${readableDate(bin.end)}. Event density only; not strategic importance.`); append(button, 'span', 'timeline-density-bar', ''); append(button, 'small', '', String(bin.count)); button.addEventListener('click', () => { const inputs = explorer.querySelectorAll('.timeline-controls input[type="date"]'); if (inputs.length >= 2) { inputs[0].value = bin.start; inputs[1].value = bin.end; const EventCtor = context.windowObject && context.windowObject.Event; if (EventCtor) { inputs[0].dispatchEvent(new EventCtor('change', { bubbles: true })); inputs[1].dispatchEvent(new EventCtor('change', { bubbles: true })); } } }); });
  const controls = explorer.querySelector('.timeline-controls'); explorer.insertBefore(density, controls || explorer.firstChild);
  const scaleSelect = explorer.querySelector('[data-timeline-scale-control="window"]');
  if (scaleSelect) { const options = [['all', 'Full'], [String(Math.ceil(totalDays / 4)), '4×'], [String(Math.ceil(totalDays / 8)), '8×'], [String(Math.ceil(totalDays / 16)), '16×']]; scaleSelect.replaceChildren(); options.forEach(([value, label]) => { const option = append(scaleSelect, 'option', '', label); option.value = value; }); scaleSelect.dataset.timelineScaleModel = 'semantic-conflict-span'; }
  const fullButton = Array.from(explorer.querySelectorAll('.timeline-navigation button')).find(button => /full war/i.test(button.textContent)); if (fullButton) fullButton.textContent = 'Back to full conflict';
}

function enhanceCampaignVisual(article, context) {
  const map = article.querySelector('.context-map'); if (!map || article.querySelector('[data-visual-sweep-hero="campaign"]')) return;
  map.dataset.mapScope = 'military-theater'; map.classList.add('hero-map'); const heading = map.querySelector(':scope > h2'); if (heading) heading.textContent = 'Strike geography';
  const hero = element(context.documentObject, 'section', 'analytical-hero campaign-hero'); hero.dataset.visualSweepHero = 'campaign'; append(hero, 'h2', '', 'Campaign picture');
  const layout = append(hero, 'div', 'analytical-hero-grid'); layout.append(map); const glance = article.querySelector('.at-a-glance'); if (glance) layout.append(glance); else { const note = append(layout, 'aside', 'hero-context-panel'); append(note, 'strong', '', 'Map-led campaign view'); append(note, 'p', '', 'Mapped strike and damage records appear first; physical damage and strategic effect remain separately assessed below.'); }
  visualSweepInsertAfterStatus(article, hero);
}

function enhanceShippingVisual(article, context) {
  if (article.querySelector('[data-shipping-map-system]')) return;
  const oil = modelData(context.model, 'analysis.oil_routes') || {}; const routes = asArray(oil.routes);
  if (!routes.length) {
    const warning = createStateNotice(context, { variant: 'dependency-unavailable', title: 'Route data unavailable', message: 'Atlas cannot render the broader shipping network because no supported route geometry is present in the current public model.', accounting: 'No route geometry is inferred to fill this gap.' });
    warning.dataset.shippingRouteDependency = 'missing'; visualSweepInsertAfterStatus(article, warning); return;
  }
  const shippingRecords = [...recordArray(modelData(context.model, 'ledger.shipping')), ...recordArray(modelData(context.model, 'gate3.shipping')), ...recordArray(modelData(context.model, 'current.material_losses')).filter(record => record.military_platform === false || String(record.side || '').includes('COMMERCIAL'))];
  const inHormuz = shippingRecords.filter(record => { const point = pointFromRecord(record, context.services.locationResolver); return point && point.lat >= 22.4 && point.lat <= 28.9 && point.lon >= 50.8 && point.lon <= 60.8; });
  const system = element(context.documentObject, 'section', 'shipping-map-system analytical-hero'); system.dataset.shippingMapSystem = 'chokepoint-network';
  append(system, 'h2', '', 'From chokepoint to network consequences');
  append(system, 'p', 'section-note meaning-first-summary', `${routes.length.toLocaleString()} strategic transport corridor${routes.length === 1 ? ' is' : 's are'} shown.`);
  append(system, 'p', 'method-note', 'These are source-supported schematic routes, not precise vessel tracks, surveyed alignment, or targeting-quality geometry.');
  const grid = append(system, 'div', 'shipping-map-grid');
  const choke = MapView.create(context, { title: 'Hormuz chokepoint', records: inHormuz, viewportOverride: [[22.4, 50.8], [28.9, 60.8]], scope: 'hormuz-chokepoint', maxZoom: 7, contextNote: 'Country, coastline and named evidence locations provide orientation. Geographic precision remains bounded by the underlying record.', description: inHormuz.length ? `${inHormuz.length.toLocaleString()} geolocated shipping or commercial-loss record${inHormuz.length === 1 ? '' : 's'} are shown within the public Hormuz context window.` : 'This map provides geographic context for the Strait; current public shipping evidence in this view is primarily corridor- and reporting-based rather than point-mapped loss evidence.' });
  choke.dataset.shippingMapView = 'chokepoint';
  if (!inHormuz.length) choke.append(createStateNotice(context, { variant: 'no-geolocated-records', message: 'This map provides geographic context. Current public shipping evidence in this view is primarily corridor- and reporting-based rather than represented by geolocated material-loss records.', accounting: 'Geolocated shipping or commercial-loss records in this view: 0' }));
  const network = MapView.create(context, { title: 'Network consequences', records: shippingRecords, routes, scope: 'route-network', maxZoom: 5, contextLabels: routeContextLabels(routes), contextNote: 'Named route nodes provide city, port and corridor context. Roads are not inferred where no deterministic road reference layer is packaged.', description: 'Broader maritime, pipeline and rail corridors show how pressure at Hormuz connects to Red Sea, Arabian Peninsula and Eurasian alternatives.' }); network.dataset.shippingMapView = 'network';
  grid.append(choke, network); const oldMap = article.querySelector('.context-map'); if (oldMap && oldMap !== choke && oldMap !== network) { if (oldMap._atlasMap && oldMap._atlasMap.remove) oldMap._atlasMap.remove(); oldMap.remove(); }
  visualSweepInsertAfterStatus(article, system);
}

function visualLossGroup(record) { const side = String(record && record.side || ''); if (side === 'U.S./COALITION') return ['United States / coalition', 'us-coalition']; if (side === 'IRAN/ALIGNED') return ['Iran / aligned', 'iran-aligned']; if (side === 'CIVILIAN/COMMERCIAL' || side.includes('COMMERCIAL')) return ['Civilian / commercial', 'civilian-commercial']; return ['Other / not classified', 'unclassified']; }

function enhanceLossLedgerVisual(article, context) {
  if (article.querySelector('[data-loss-comparison]')) return;
  const losses = recordArray(modelData(context.model, 'current.material_losses')); if (!losses.length) return;
  article.querySelectorAll('[data-loss-id]').forEach(card => { if (!card.id) card.id = `loss-${String(card.dataset.lossId).replace(/[^A-Za-z0-9_-]/g, '-')}`; });
  const section = element(context.documentObject, 'section', 'loss-comparison analytical-hero'); section.dataset.lossComparison = 'record-count-auditable'; append(section, 'h2', '', 'Loss record comparison'); append(section, 'p', 'section-note', 'These summaries count canonical material-loss records. They do not add unknown quantities, overlapping envelopes, claimed successes, or incompatible platform quantities. Every count links back to the contributing stable records.');
  const groups = new Map(); losses.forEach(record => { const [label, key] = visualLossGroup(record); if (!groups.has(key)) groups.set(key, { label, key, records: [] }); groups.get(key).records.push(record); });
  const grid = append(section, 'div', 'loss-comparison-grid');
  Array.from(groups.values()).forEach(group => { const panel = append(grid, 'section', 'loss-group-summary'); panel.dataset.lossSummaryGroup = group.key; append(panel, 'h3', '', group.label); append(panel, 'p', 'loss-summary-total', `${group.records.length.toLocaleString()} canonical record${group.records.length === 1 ? '' : 's'}`); const categories = new Map(); group.records.forEach(record => { const category = plainLabel(record.accounting_category, 'Category unresolved'); if (!categories.has(category)) categories.set(category, []); categories.get(category).push(record); }); Array.from(categories.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([category, records]) => { const details = append(panel, 'details', 'loss-category-drilldown'); details.dataset.aggregation = 'record-count-only'; details.dataset.contributingRecordIds = records.map(record => record.loss_id).join(','); const summary = append(details, 'summary'); append(summary, 'span', '', category); append(summary, 'strong', '', String(records.length)); const unknown = records.filter(record => record.quantity === null || record.quantity === undefined || record.quantity === '').length; if (unknown) append(details, 'p', 'loss-summary-unknown', `${unknown} record${unknown === 1 ? '' : 's'} with unknown quantity. Unknown does not mean zero.`); const list = append(details, 'ul', 'loss-summary-records'); records.forEach(record => { const item = append(list, 'li'); const link = append(item, 'a', '', publicNarrative(record.item, record.loss_id)); link.href = `#loss-${String(record.loss_id).replace(/[^A-Za-z0-9_-]/g, '-')}`; append(item, 'small', '', ` ${plainLabel(record.status, 'Status unresolved')} · ${lossQuantityLabel(record)}`); }); }); });
  visualSweepInsertAfterStatus(article, section);
}

function enhanceEconomyVisual(article, context) {
  if (article.querySelector('[data-economic-viz]')) return;
  const payload = modelData(context.model, 'ledger.economics') || {}; const outlook = payload.forecast_context || payload.economicOutlook || payload.economic_outlook || {}; const rows = asArray(outlook.rows); if (!rows.length) { const notice = createStateNotice(context, { variant: 'dependency-unavailable', title: 'Comparable economic snapshots unavailable', message: 'Atlas cannot render the economic comparison because the current public model does not contain comparable recorded snapshots.', accounting: 'No values are interpolated or invented to fill the missing series.' }); visualSweepInsertAfterStatus(article, notice); return; }
  const section = element(context.documentObject, 'section', 'economic-snapshot-dashboard analytical-hero'); section.dataset.economicViz = 'paired-snapshot-small-multiples'; section.dataset.interpolation = 'none'; append(section, 'h2', '', 'Economic pressure: comparable snapshots'); append(section, 'p', 'section-note', `${publicNarrative(outlook.metric, 'Comparable economic metric')}. Each country shows the recorded prewar and current forecast snapshots. Atlas does not interpolate values between observations.`);
  const maxDelta = Math.max(1, ...rows.map(row => Math.abs(Number(row.delta))).filter(Number.isFinite)); const grid = append(section, 'div', 'economic-small-multiples');
  rows.forEach(row => { const card = append(grid, 'article', 'economic-snapshot-card'); card.dataset.economicCountry = row.country || ''; append(card, 'h3', '', publicNarrative(row.country, 'Economy')); const values = append(card, 'div', 'economic-paired-values'); const before = append(values, 'div'); append(before, 'span', '', 'Prewar'); append(before, 'strong', '', `${Number(row.prewar).toFixed(1)}%`); const current = append(values, 'div'); append(current, 'span', '', 'Current'); append(current, 'strong', '', `${Number(row.current).toFixed(1)}%`); const delta = append(card, 'div', `economic-delta ${Number(row.delta) < 0 ? 'negative' : 'positive'}`); delta.style.setProperty('--delta-size', String(Math.min(1, Math.abs(Number(row.delta)) / maxDelta))); append(delta, 'span', 'economic-delta-bar', ''); append(delta, 'strong', '', `${Number(row.delta) > 0 ? '+' : ''}${Number(row.delta).toFixed(1)} pp`); });
  const tableDetails = append(section, 'details', 'economic-numeric-equivalent'); append(tableDetails, 'summary', '', 'Numeric values and methodology'); append(tableDetails, 'p', '', publicNarrative(outlook.note, 'These are reported comparison snapshots; no values are inferred between them.')); const table = append(tableDetails, 'table'); const thead = append(table, 'thead'); const hr = append(thead, 'tr'); ['Economy', 'Prewar', 'Current', 'Change'].forEach(label => { const th = append(hr, 'th', '', label); th.scope = 'col'; }); const tbody = append(table, 'tbody'); rows.forEach(row => { const tr = append(tbody, 'tr'); const th = append(tr, 'th', '', row.country); th.scope = 'row'; append(tr, 'td', '', `${Number(row.prewar).toFixed(1)}%`); append(tr, 'td', '', `${Number(row.current).toFixed(1)}%`); append(tr, 'td', '', `${Number(row.delta) > 0 ? '+' : ''}${Number(row.delta).toFixed(1)} pp`); });
  const currentRecords = recordArray(modelData(context.model, 'gate3.economics')); if (currentRecords.length) { const snapshots = append(section, 'div', 'economic-event-snapshots'); append(snapshots, 'h3', '', 'Dated pressure snapshots'); currentRecords.slice().sort((a, b) => String(a.date || a.event_date || '').localeCompare(String(b.date || b.event_date || ''))).slice(-6).forEach(record => { const card = addProvenanceCard(snapshots, context, { kicker: readableDate(record.date || record.event_date), title: itemTitle(record, 'Economic pressure record'), text: itemSummary(record), item: record, relatedRecords: relatedRecordsFrom(record) }); card.dataset.economicSnapshot = record.economic_id || record.event_id || record.id || ''; }); }
  visualSweepInsertAfterStatus(article, section);
}

function agreementOrdinal(position) { const value = Number(position); if (!Number.isFinite(value)) return null; if (value <= 20) return { index: 0, label: 'Strongly favored Iran' }; if (value <= 40) return { index: 1, label: 'Leaned Iran' }; if (value <= 60) return { index: 2, label: 'Mixed / split' }; if (value <= 80) return { index: 3, label: 'Leaned U.S. / coalition' }; return { index: 4, label: 'Strongly favored U.S. / coalition' }; }

function enhanceMouVisual(article, context) {
  if (article.querySelector('[data-agreement-balance]')) return;
  const hormuz = modelData(context.model, 'analysis.hormuz') || {}; const tracks = asArray(hormuz.mou_position_tracks); if (!tracks.length) return;
  const section = element(context.documentObject, 'section', 'agreement-balance-matrix analytical-hero'); section.dataset.agreementBalance = 'existing-position-derived'; append(section, 'h2', '', 'Agreement balance by term'); append(section, 'p', 'section-note', 'The five-state labels are a presentation of the existing analyst position field: 0–20 strongly Iran; >20–40 leaned Iran; >40–60 mixed/split; >60–80 leaned U.S./coalition; >80 strongly U.S./coalition. Non-scorable terms remain “Balance not adjudicated.”');
  const list = append(section, 'div', 'agreement-term-list'); const labels = ['Strongly Iran', 'Leaned Iran', 'Mixed / split', 'Leaned U.S.', 'Strongly U.S.'];
  tracks.forEach(track => { const row = append(list, 'article', 'agreement-term-row'); row.dataset.clause = String(track.clause); append(row, 'h3', '', `${track.clause}. ${publicNarrative(track.topic, 'Agreement term')}`); const ordinal = track.scorable ? agreementOrdinal(track.position) : null; const state = append(row, 'div', 'agreement-ordinal'); state.setAttribute('role', 'img'); state.setAttribute('aria-label', ordinal ? `${ordinal.label}; underlying analyst position ${track.position} of 100` : 'Balance not adjudicated'); labels.forEach((label, index) => { const cell = append(state, 'span', `agreement-state${ordinal && ordinal.index === index ? ' selected' : ''}`, label); cell.setAttribute('aria-hidden', 'true'); }); append(row, 'p', 'agreement-current-balance', ordinal ? `${ordinal.label} · analyst position ${track.position}/100` : 'Balance not adjudicated'); if (track.later_marker && Number.isFinite(Number(track.later_marker.position))) { const later = agreementOrdinal(track.later_marker.position); const compare = append(row, 'div', 'agreement-before-after'); append(compare, 'span', '', `At signing: ${ordinal ? ordinal.label : 'Not adjudicated'}`); append(compare, 'span', '', `Later: ${later ? later.label : 'Not adjudicated'}`); append(compare, 'p', '', publicNarrative(track.later_marker.text)); } else if (track.current_status) append(row, 'p', 'record-status', publicNarrative(track.current_status)); const details = append(row, 'details', 'agreement-term-detail'); append(details, 'summary', '', 'Term, concessions and evidence'); addFactList(details, [['Iran sought', publicNarrative(track.iran_max)], ['MOU result', publicNarrative(track.mou)], ['U.S. / coalition sought', publicNarrative(track.us_max)], ['Atlas analysis', publicNarrative(track.analysis)], ['Current status', publicNarrative(track.current_status)]]); if (asArray(track.sources).length) details.append(EvidenceDrawer.create(context, { source_ids: asArray(track.sources) })); });
  visualSweepInsertAfterStatus(article, section);
}

function applyVisualSweep(article, context) {
  article.dataset.visualSweep = 'phase10-approved'; article.classList.add(`visual-route-${context.route.key.replace(/\./g, '-')}`);
  if (context.route.key === 'timeline.war') enhanceTimelineVisual(article, context);
  if (context.route.key === 'military.campaigns') enhanceCampaignVisual(article, context);
  if (context.route.key === 'hormuz.shipping') enhanceShippingVisual(article, context);
  if (context.route.key === 'military.losses') enhanceLossLedgerVisual(article, context);
  if (context.route.key === 'hormuz.economy') enhanceEconomyVisual(article, context);
  if (context.route.key === 'talks.mou') enhanceMouVisual(article, context);
}

  function preparePage(owner) {
    return context => {
      const article = owner(context);
      addSafeAtAGlance(article, context);
      addEvidenceClocks(article, context);
      applyPresentationDisclosure(article, context);
      applyVisualSweep(article, context);
      addPageLocalNavigation(article, context);
      return article;
    };
  }

  const PAGE_OWNERS = Object.freeze({
    OverviewPage: preparePage(OverviewPage),
    ActorsPage: preparePage(ActorsPage),
    TimelinePage: preparePage(TimelinePage),
    ChronologyPage: preparePage(ChronologyPage),
    CampaignsPage: preparePage(CampaignsPage),
    FacilitiesPage: preparePage(FacilitiesPage),
    WeaponsPage: preparePage(WeaponsPage),
    LossesPage: preparePage(LossesPage),
    ImageryPage: preparePage(ImageryPage),
    HormuzOverviewPage: preparePage(HormuzOverviewPage),
    ShippingPage: preparePage(ShippingPage),
    EconomyPage: preparePage(EconomyPage),
    HormuzNegotiationsPage: preparePage(HormuzNegotiationsPage),
    DiplomacyPage: preparePage(DiplomacyPage),
    MouPage: preparePage(MouPage),
    NuclearPage: preparePage(NuclearPage),
    RegionalDiplomacyPage: preparePage(RegionalDiplomacyPage),
    ObjectivesPage: preparePage(ObjectivesPage),
    PositionChangesPage: preparePage(PositionChangesPage),
    IranMessagingPage: preparePage(IranMessagingPage),
    ClaimChecksPage: preparePage(ClaimChecksPage),
    InformationEnvironmentPage: preparePage(InformationEnvironmentPage),
    SourcesPage: preparePage(SourcesDirectoryPage),
    MethodPage: preparePage(MethodPage),
    ArchivePage: preparePage(ArchivePage)
  });

  function navigationLink(documentObject, route, currentRoute, className) {
    const link = element(documentObject, 'a', className || '', route.label); link.href = routeHref(route.key); link.dataset.routeKey = route.key; if (route.key === currentRoute.key) link.setAttribute('aria-current', 'page'); return link;
  }

  const PublicNavigation = Object.freeze({
    renderPrimary(documentObject, currentRoute) { const nav = element(documentObject, 'nav', 'primary-nav'); nav.setAttribute('aria-label', 'Primary'); const list = append(nav, 'ul'); PRIMARY_SECTIONS.forEach(primary => { const item = append(list, 'li'); const defaultRoute = routesForPrimary(primary.id)[0]; const link = navigationLink(documentObject, { ...defaultRoute, label: primary.label }, currentRoute); if (primary.id === currentRoute.primary) link.setAttribute('aria-current', 'page'); item.append(link); }); return nav; },
    renderSecondary(documentObject, currentRoute) { const nav = element(documentObject, 'nav', 'secondary-nav'); nav.setAttribute('aria-label', `${currentRoute.primaryLabel} pages`); append(nav, 'h2', '', currentRoute.primaryLabel); const list = append(nav, 'ul'); routesForPrimary(currentRoute.primary).forEach(route => { const item = append(list, 'li'); item.append(navigationLink(documentObject, route, currentRoute)); }); return nav; },
    renderMobile(documentObject, currentRoute) { const details = element(documentObject, 'details', 'mobile-navigation'); details.dataset.component = 'PublicNavigation'; const summary = append(details, 'summary', '', `${currentRoute.primaryLabel} — ${currentRoute.label}`); summary.setAttribute('aria-label', 'Open public navigation'); const inner = append(details, 'div', 'mobile-navigation-inner'); const primary = append(inner, 'nav', 'mobile-primary'); primary.setAttribute('aria-label', 'Primary mobile'); const primaryList = append(primary, 'ul'); PRIMARY_SECTIONS.forEach(section => { const item = append(primaryList, 'li'); const defaultRoute = routesForPrimary(section.id)[0]; const link = navigationLink(documentObject, { ...defaultRoute, label: section.label }, currentRoute); if (section.id === currentRoute.primary) link.setAttribute('aria-current', 'page'); item.append(link); }); const secondary = append(inner, 'nav', 'mobile-secondary'); secondary.setAttribute('aria-label', `${currentRoute.primaryLabel} mobile pages`); append(secondary, 'h2', '', currentRoute.primaryLabel); const secondaryList = append(secondary, 'ul'); routesForPrimary(currentRoute.primary).forEach(route => { const item = append(secondaryList, 'li'); item.append(navigationLink(documentObject, route, currentRoute)); }); return details; }
  });

  const AppShell = Object.freeze({
    create(documentObject) {
      const app = element(documentObject, 'div', 'atlas-app'); app.dataset.component = 'AppShell'; const skip = append(app, 'button', 'skip-link', 'Skip to content'); skip.type = 'button'; const header = append(app, 'header', 'app-header'); const headerInner = append(header, 'div', 'header-inner'); const brand = append(headerInner, 'a', 'brand'); brand.href = routeHref(DEFAULT_ROUTE_KEY); append(brand, 'span', 'brand-title', 'Iran War Evidence Atlas'); append(brand, 'span', 'brand-subtitle', 'What happened, what the evidence shows, and what remains uncertain.'); const primaryHost = append(header, 'div', 'primary-nav-host'); const mobileHost = append(header, 'div', 'mobile-nav-host'); const grid = append(app, 'div', 'app-grid'); const aside = append(grid, 'aside', 'secondary-column'); const main = append(grid, 'div', 'page-host'); main.id = 'main-content'; main.tabIndex = -1; const focusMain = () => main.focus(); skip.addEventListener('click', focusMain); skip.addEventListener('keydown', event => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); focusMain(); }); const footer = append(app, 'footer', 'page-footer'); return { app, primaryHost, mobileHost, aside, main, footer };
    }
  });

  function mount(options) {
    const settings = options || {}; const documentObject = settings.documentObject || root.document; const windowObject = settings.windowObject || root; const rootElement = settings.rootElement; const routeRuntime = settings.routeRuntime; const state = settings.state; invariant(documentObject && rootElement && routeRuntime && typeof routeRuntime.forRoute === 'function', 'Public IA mount requires a document, root element, and guarded route runtime'); const firstRoute = parseRoute(windowObject.location && windowObject.location.hash); const firstAccess = routeRuntime.forRoute(firstRoute); if (rootElement.__atlasRouteController) rootElement.__atlasRouteController.destroy(); const shell = AppShell.create(documentObject); rootElement.replaceChildren(shell.app); rootElement.className = 'atlas-ready'; rootElement.dataset.status = 'ready'; rootElement.setAttribute('aria-busy', 'false'); let previousRouteKey = null; let currentServices = firstAccess.services;
    const renderRoute = (focusHeading, prepared) => { const route = parseRoute(windowObject.location && windowObject.location.hash); const access = prepared && prepared.routeKey === route.key ? prepared.access : routeRuntime.forRoute(route); const model = access.model; currentServices = access.services; if (!route.canonical && windowObject.history && windowObject.location) windowObject.history.replaceState(null, '', routeHref(route.key, route.params)); const context = { documentObject, windowObject, model, services: access.services, state, route }; shell.primaryHost.replaceChildren(PublicNavigation.renderPrimary(documentObject, route)); shell.mobileHost.replaceChildren(PublicNavigation.renderMobile(documentObject, route)); shell.aside.replaceChildren(PublicNavigation.renderSecondary(documentObject, route)); const page = PAGE_OWNERS[route.owner](context); shell.main.replaceChildren(page); shell.footer.replaceChildren(); append(shell.footer, 'span', '', `Current evidence cutoff: ${formatEvidenceClock(model.release.current_osint_cutoff)}. Frozen review cutoff: ${formatEvidenceClock(model.release.gate2_evidence_cutoff)}. `); const archive = append(shell.footer, 'a', '', 'Archive'); archive.href = routeHref('evidence.archive'); state.routeKey = route.key; state.pageOwner = route.owner; state.primarySection = route.primaryLabel; state.secondaryPage = route.label; documentObject.title = `${route.title} · Iran War Evidence Atlas`; if (focusHeading && previousRouteKey && previousRouteKey !== route.key) { const heading = shell.main.querySelector('h1'); if (heading) heading.focus(); } previousRouteKey = route.key; return route; };
    const onHashChange = () => renderRoute(true); windowObject.addEventListener('hashchange', onHashChange); const initialRoute = renderRoute(false, { routeKey: firstRoute.key, access: firstAccess }); const controller = Object.freeze({ render: () => renderRoute(false), current: () => parseRoute(windowObject.location && windowObject.location.hash), services: () => currentServices, destroy: () => windowObject.removeEventListener('hashchange', onHashChange), initialRoute }); rootElement.__atlasRouteController = controller; return controller;
  }

  return Object.freeze({
    DEFAULT_ROUTE_KEY, PRIMARY_SECTIONS, ROUTE_DEFINITIONS, ROUTES, DATASET_LABELS, DISPLAY_TERMS, AFFILIATED_ACTORS, PERSON_PROFILES, PAGE_OWNERS, AppShell, PublicNavigation, EvidenceDrawer, ActorIdentity, EvidenceStatus, MapView, eventTemporalValues, eventEvidenceValues, formatEvidenceClock, propositionStatusLabel, deceptionDisplay, objectiveChangeLabel, lossQuantityLabel, materialAssetClass, displayTerm, publicNarrative, routeHref, parseRoute, routesForPrimary, modelData, recordArray, sortActorDirectory, validateRegistry, mount
  });
}));
