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

  const PRIMARY_SECTIONS = Object.freeze([
    { id: 'start', slug: 'start', label: 'Start Here', modelPage: 'start_here' },
    { id: 'timeline', slug: 'timeline', label: 'Timeline', modelPage: 'timeline' },
    { id: 'military', slug: 'military', label: 'Military Record', modelPage: 'military_record' },
    { id: 'hormuz', slug: 'hormuz', label: 'Hormuz & Economy', modelPage: 'hormuz_economy' },
    { id: 'talks', slug: 'talks', label: 'Talks & June Agreement', modelPage: 'diplomacy_mou' },
    { id: 'objectives', slug: 'objectives', label: 'What Each Side Wanted', modelPage: 'objectives_position_changes' },
    { id: 'evidence', slug: 'evidence', label: 'Claims & Evidence', modelPage: 'claims_sources' }
  ]);

  const ROUTE_DEFINITIONS = Object.freeze([
    { key: 'start.overview', primary: 'start', slug: 'overview', label: 'Overview', title: 'Start Here', owner: 'OverviewPage', dataKeys: ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view'], related: ['timeline.war', 'military.campaigns', 'hormuz.overview', 'talks.mou', 'objectives.outcomes', 'evidence.claims'] },
    { key: 'start.actors', primary: 'start', slug: 'actors', label: "Who's Involved", title: "Who's Involved", owner: 'ActorsPage', dataKeys: ['current.chronology'], related: ['timeline.war', 'evidence.sources'] },

    { key: 'timeline.war', primary: 'timeline', slug: 'war', label: 'War Timeline', title: 'War Timeline', owner: 'TimelinePage', dataKeys: ['current.chronology', 'ledger.daily_coverage'], related: ['timeline.chronology', 'military.campaigns', 'talks.overview'] },
    { key: 'timeline.chronology', primary: 'timeline', slug: 'chronology', label: 'Detailed Chronology', title: 'Detailed Chronology', owner: 'ChronologyPage', dataKeys: ['current.chronology', 'ledger.map_links'], related: ['timeline.war', 'evidence.sources', 'evidence.method'] },

    { key: 'military.campaigns', primary: 'military', slug: 'campaigns', label: 'Campaigns & Strikes', title: 'Campaigns & Strikes', owner: 'CampaignsPage', dataKeys: ['current.chronology', 'ledger.map_links', 'reconciliation.strikes'], related: ['timeline.chronology', 'military.facilities', 'military.weapons'] },
    { key: 'military.facilities', primary: 'military', slug: 'facilities', label: 'Bases & Infrastructure', title: 'Bases & Infrastructure', owner: 'FacilitiesPage', dataKeys: ['ledger.facilities', 'ledger.map_links'], related: ['military.campaigns', 'military.imagery', 'timeline.chronology'] },
    { key: 'military.weapons', primary: 'military', slug: 'weapons', label: 'Air, Missiles & Drones', title: 'Air, Missiles & Drones', owner: 'WeaponsPage', dataKeys: ['ledger.munitions_expenditure', 'ledger.attrition_series', 'ledger.material_losses'], related: ['military.campaigns', 'military.losses'] },
    { key: 'military.losses', primary: 'military', slug: 'losses', label: 'Casualties & Losses', title: 'Casualties & Losses', owner: 'LossesPage', dataKeys: ['ledger.casualties', 'ledger.material_losses', 'reconciliation.material_losses', 'forensic.loss_envelopes', 'analysis.casualty_corrections'], related: ['military.weapons', 'evidence.method'] },
    { key: 'military.imagery', primary: 'military', slug: 'imagery', label: 'Damage Imagery', title: 'Damage Imagery', owner: 'ImageryPage', dataKeys: ['ledger.bda_overlays', 'ledger.facilities', 'forensic.facility_claim_audits'], related: ['military.facilities', 'military.campaigns', 'evidence.method'] },

    { key: 'hormuz.overview', primary: 'hormuz', slug: 'overview', label: 'Why Hormuz Matters', title: 'Why Hormuz Matters', owner: 'HormuzOverviewPage', dataKeys: ['analysis.hormuz', 'ledger.agreements'], related: ['hormuz.shipping', 'hormuz.talks', 'talks.mou'] },
    { key: 'hormuz.shipping', primary: 'hormuz', slug: 'shipping', label: 'Shipping & Trade', title: 'Shipping & Trade', owner: 'ShippingPage', dataKeys: ['ledger.shipping', 'analysis.oil_routes'], related: ['hormuz.overview', 'hormuz.economy', 'hormuz.talks'] },
    { key: 'hormuz.economy', primary: 'hormuz', slug: 'economy', label: 'Oil & Economic Effects', title: 'Oil & Economic Effects', owner: 'EconomyPage', dataKeys: ['ledger.economics', 'analysis.china_oil_shift', 'analysis.oil_routes'], related: ['hormuz.shipping', 'hormuz.overview'] },
    { key: 'hormuz.talks', primary: 'hormuz', slug: 'talks', label: 'Current Hormuz Talks', title: 'Current Hormuz Talks', owner: 'HormuzNegotiationsPage', dataKeys: ['current.chronology', 'ledger.agreements', 'analysis.hormuz'], related: ['talks.mou', 'talks.overview', 'hormuz.shipping'] },

    { key: 'talks.overview', primary: 'talks', slug: 'overview', label: 'Talks & Agreements', title: 'Talks & Agreements', owner: 'DiplomacyPage', dataKeys: ['ledger.agreements', 'ledger.diplomacy'], related: ['talks.mou', 'talks.nuclear', 'talks.regional'] },
    { key: 'talks.mou', primary: 'talks', slug: 'june-mou', label: 'June MOU', title: 'June MOU', owner: 'MouPage', dataKeys: ['ledger.agreements', 'analysis.hormuz', 'analysis.endgame_public_view', 'analysis.endgame_current_aug25', 'analysis.endgame_current_aug26'], related: ['hormuz.talks', 'talks.nuclear', 'objectives.outcomes'] },
    { key: 'talks.nuclear', primary: 'talks', slug: 'nuclear', label: 'Nuclear Talks', title: 'Nuclear Talks', owner: 'NuclearPage', dataKeys: ['ledger.agreements', 'ledger.diplomacy'], related: ['talks.overview', 'talks.mou', 'objectives.positions'] },
    { key: 'talks.regional', primary: 'talks', slug: 'regional', label: 'Regional Diplomacy', title: 'Regional Diplomacy', owner: 'RegionalDiplomacyPage', dataKeys: ['ledger.agreements', 'ledger.diplomacy'], related: ['talks.overview', 'hormuz.talks', 'start.actors'] },

    { key: 'objectives.outcomes', primary: 'objectives', slug: 'outcomes', label: 'Objectives & Outcomes', title: 'Objectives & Outcomes', owner: 'ObjectivesPage', dataKeys: ['analysis.iran_outcomes', 'analysis.endgame_us_objectives', 'analysis.endgame_objective_corrections', 'analysis.outcome_evidence_links'], related: ['objectives.positions', 'objectives.iran', 'talks.mou'] },
    { key: 'objectives.positions', primary: 'objectives', slug: 'positions', label: 'Position Changes', title: 'Position Changes', owner: 'PositionChangesPage', dataKeys: ['current.chronology', 'analysis.endgame_public_view', 'analysis.outcome_evidence_links'], related: ['objectives.outcomes', 'objectives.iran', 'timeline.chronology'] },
    { key: 'objectives.iran', primary: 'objectives', slug: 'iran-position', label: "How Iran's Position Changed", title: "How Iran's Position Changed", owner: 'IranMessagingPage', dataKeys: ['analysis.iran_messaging'], related: ['objectives.positions', 'talks.overview', 'evidence.information'] },

    { key: 'evidence.claims', primary: 'evidence', slug: 'claims', label: 'Claim Checks', title: 'Claim Checks', owner: 'ClaimChecksPage', dataKeys: ['ledger.claims', 'forensic.public_assessments'], related: ['evidence.information', 'evidence.sources', 'timeline.chronology'] },
    { key: 'evidence.information', primary: 'evidence', slug: 'information', label: 'Information Environment', title: 'Information Environment', owner: 'InformationEnvironmentPage', dataKeys: ['analysis.information_war_claims', 'analysis.influence_networks', 'forensic.claim_evolution'], related: ['evidence.claims', 'objectives.iran', 'evidence.method'] },
    { key: 'evidence.sources', primary: 'evidence', slug: 'sources', label: 'Sources', title: 'Sources', owner: 'SourcesPage', dataKeys: ['current.sources', 'analysis.source_context', 'analysis.media_bias_provider'], related: ['evidence.method', 'evidence.claims'] },
    { key: 'evidence.method', primary: 'evidence', slug: 'method', label: 'How We Check the Evidence', title: 'How We Check the Evidence', owner: 'MethodPage', dataKeys: ['current.sources', 'ledger.source_role_map', 'ledger.revision_history', 'reconciliation.coverage_audit'], related: ['evidence.sources', 'evidence.claims', 'evidence.archive'] },
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
    'reconciliation.coverage_audit': 'Coverage audit',
    'forensic.loss_envelopes': 'Loss ranges and accounting',
    'forensic.facility_claim_audits': 'Facility claim checks',
    'forensic.public_assessments': 'Public assessments',
    'forensic.claim_evolution': 'Claim evolution',
    'analysis.casualty_corrections': 'Current casualty display',
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
    'archive.snapshot_index': 'Archived public editions'
  });

  const DISPLAY_TERMS = Object.freeze({
    STRONGLY_SUPPORTED: 'Strongly supported',
    SUPPORTED: 'Supported',
    VERIFIED: 'Verified',
    CONFIRMED: 'Confirmed',
    PARTIALLY_SUPPORTED: 'Partially supported',
    UNVERIFIED: 'Unverified',
    FALSE: 'False',
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
    ACCEPTED_HISTORICAL_RECONCILIATION: 'Accepted historical reconciliation',
    CANONICAL_LEDGER_DATA: 'Canonical record',
    APPROVED_ANALYTICAL_DATA: 'Approved analysis',
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
    if (MACHINE_TOKEN_PATTERN.test(raw)) {
      MACHINE_TOKEN_PATTERN.lastIndex = 0;
      return fallback;
    }
    MACHINE_TOKEN_PATTERN.lastIndex = 0;
    return raw;
  }

  function publicNarrative(value, fallback = '') {
    if (value === null || value === undefined) return fallback;
    const raw = String(value).trim();
    if (!raw) return fallback;
    const unknownTokens = raw.match(MACHINE_TOKEN_PATTERN) || [];
    if (unknownTokens.some(token => !DISPLAY_TERMS[token])) return fallback;
    return raw.replace(MACHINE_TOKEN_PATTERN, token => DISPLAY_TERMS[token]);
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
        entityType: value.entityType || null,
        role: value.role || value.title || null,
        affiliation: value.affiliation || value.affiliationId || null
      };
    }
    return { name: String(value || 'Unknown').trim(), entityType: null, role: null, affiliation: null };
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
    resolve(value) {
      const input = normalizedActorInput(value);
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
        canonicalName,
        label: canonicalName,
        entityType: resolvedEntityType,
        role,
        affiliation: affiliationName,
        affiliationId: affiliation ? affiliation.id : null,
        affiliationType: affiliation ? affiliation.affiliationType : 'unknown',
        parentState: affiliation ? affiliation.parentState : null,
        flag: affiliation ? affiliation.flag : '',
        subtitle
      };
    },
    create(documentObject, value, options) {
      const actor = this.resolve(value);
      const wrapper = element(documentObject, 'span', 'actor-identity');
      wrapper.dataset.actorName = actor.canonicalName;
      wrapper.dataset.actorEntityType = actor.entityType;
      wrapper.dataset.actorKind = actor.affiliationType;
      wrapper.dataset.actorAffiliationType = actor.affiliationType;
      if (actor.affiliation) wrapper.dataset.actorAffiliation = actor.affiliation;
      if (actor.parentState) wrapper.dataset.actorParentState = actor.parentState;
      if (actor.role) wrapper.dataset.actorRole = actor.role;
      if (actor.flag) {
        const flag = append(wrapper, 'span', 'actor-flag', actor.flag);
        flag.setAttribute('aria-hidden', 'true');
      }
      append(wrapper, 'span', 'actor-name', actor.canonicalName);
      if (options && options.subtitle) append(wrapper, 'span', 'actor-subtitle', actor.subtitle);
      return wrapper;
    }
  });

  const EvidenceStatus = Object.freeze({
    viewModel(value) {
      const rawSupport = value && value.support;
      const support = rawSupport === null || rawSupport === undefined || rawSupport === ''
        ? 'Unknown'
        : displayTerm(rawSupport, 'Evidence status recorded');
      const dispute = value && value.dispute ? displayTerm(value.dispute, 'Unknown') : null;
      return { support, dispute };
    },
    create(documentObject, value) {
      const view = this.viewModel(value || {});
      const wrapper = element(documentObject, 'div', 'evidence-status');
      wrapper.dataset.component = 'EvidenceStatus';
      const support = append(wrapper, 'span', 'evidence-support', view.support);
      support.setAttribute('aria-label', `Evidence support: ${view.support}`);
      if (view.dispute) {
        const dispute = append(wrapper, 'span', 'dispute-posture', view.dispute);
        dispute.setAttribute('aria-label', `Dispute posture: ${view.dispute}`);
      }
      return wrapper;
    }
  });

  function sourceDisplayRecord(source, variantKey) {
    if (!source) return null;
    if (variantKey) {
      const variant = (source.variants || []).find(item => item.variant_key === variantKey);
      if (variant) return variant.record;
    }
    return source.resolution === 'UNAMBIGUOUS' ? source.record : null;
  }

  function safeExternalUrl(value) {
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch (_) {
      return null;
    }
  }

  const EvidenceDrawer = Object.freeze({
    create(documentObject, item, model) {
      const references = item && item.source_references || [];
      const details = element(documentObject, 'details', 'evidence-drawer');
      details.dataset.component = 'EvidenceDrawer';
      append(details, 'summary', '', references.length ? `Evidence and sources (${references.length})` : 'Evidence and sources');
      const body = append(details, 'div', 'evidence-drawer-body');
      if (!references.length) {
        append(body, 'p', '', 'No source links are attached to this summarized view.');
        return details;
      }
      const index = new Map(model.sources.records.map(source => [source.source_id, source]));
      const list = append(body, 'ul', 'source-link-list');
      references.forEach(reference => {
        const catalog = index.get(reference.source_id);
        const record = sourceDisplayRecord(catalog, reference.variant_key);
        const itemNode = append(list, 'li');
        const label = publicNarrative(record && (record.outlet || record.title), reference.source_id);
        const url = safeExternalUrl(record && record.url);
        if (url) {
          const link = append(itemNode, 'a', '', label);
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        } else {
          append(itemNode, 'span', '', label);
        }
      });
      return details;
    }
  });

  const MapView = Object.freeze({
    create(documentObject, options) {
      const section = element(documentObject, 'section', 'context-map');
      section.dataset.component = 'MapView';
      append(section, 'h2', '', options && options.title || 'Locations in this record');
      const count = Number(options && options.count || 0);
      append(section, 'p', '', count
        ? `${count.toLocaleString()} mapped records are available for this section.`
        : 'No additional location summary is asserted in this view.');
      return section;
    }
  });

  function pageFrame(context, description) {
    const article = element(context.documentObject, 'article', 'public-page');
    article.dataset.pageOwner = context.route.owner;
    const intro = append(article, 'header', 'page-intro');
    append(intro, 'p', 'eyebrow', context.route.primaryLabel);
    const heading = append(intro, 'h1', '', context.route.title);
    heading.tabIndex = -1;
    append(intro, 'p', '', description);
    return { article, heading };
  }

  function addSection(host, title, className) {
    const section = append(host, 'section', className || 'content-section');
    append(section, 'h2', '', title);
    return section;
  }

  function itemTitle(item, fallback) {
    if (!item || typeof item !== 'object') return fallback;
    for (const key of ['headline', 'title', 'name', 'facility_name', 'facility', 'issue', 'topic', 'claim', 'question', 'domain', 'label', 'summary', 'event_id', 'case_id', 'id']) {
      const value = publicNarrative(item[key], '');
      if (value) return value;
    }
    return fallback;
  }

  function itemSummary(item) {
    if (!item || typeof item !== 'object') return '';
    for (const key of ['assessment', 'strongest_supported_conclusion', 'summary', 'observed_fact', 'description', 'position_change', 'what_actually_happened', 'question', 'purpose', 'note']) {
      if (typeof item[key] !== 'string') continue;
      const value = publicNarrative(item[key], '');
      if (value) return value;
    }
    return '';
  }

  function renderDatasetBlocks(host, context, keys, limit = 5) {
    keys.filter(key => !key.startsWith('current.')).forEach(key => {
      const payload = modelData(context.model, key);
      const section = append(host, 'section', 'dataset-section');
      section.dataset.datasetKey = key;
      append(section, 'h2', '', DATASET_LABELS[key] || 'Approved record');
      const records = recordArray(payload);
      if (!records.length) {
        append(section, 'p', 'section-note', 'This record supports the page and remains linked to its underlying evidence.');
        return;
      }
      const list = append(section, 'div', 'record-list');
      records.slice(0, limit).forEach((item, index) => {
        const card = append(list, 'article', 'record-card');
        append(card, 'h3', '', itemTitle(item, `${DATASET_LABELS[key] || 'Record'} ${index + 1}`));
        const summary = itemSummary(item);
        if (summary) append(card, 'p', '', summary);
        const status = item.current_status || item.status || item.verdict || item.confidence;
        if (status) append(card, 'p', 'record-status', displayTerm(status, 'Status recorded in the evidence record'));
      });
      if (records.length > limit) append(section, 'p', 'section-note', `${records.length.toLocaleString()} records are available in this collection.`);
    });
  }

  function eventActors(item) {
    const actors = item && item.event && item.event.actors;
    if (Array.isArray(actors)) return actors;
    if (typeof actors === 'string') return [actors];
    return [];
  }

  function eventCrossLinks(item) {
    const event = item.event || {};
    const type = String(event.event_type || item.timeline && item.timeline.event_type || '');
    const place = JSON.stringify(event.location || {});
    const links = [{ key: 'timeline.chronology', label: 'Open in detailed chronology' }];
    if (event.facility_refs && event.facility_refs.length || /(STRIKE|ATTACK|MISSILE|DRONE|INTERCEPT|DAMAGE)/.test(type)) links.push({ key: 'military.campaigns', label: 'Related military record' });
    if (/(HORMUZ|SHIPPING|VESSEL|MARITIME|OIL)/.test(type) || /Hormuz/i.test(place)) links.push({ key: 'hormuz.shipping', label: 'Related Hormuz record' });
    if (/(DIPLOMACY|TALK|NEGOTIATION|AGREEMENT|MEDIATION|MOU)/.test(type)) links.push({ key: 'talks.overview', label: 'Related talks record' });
    return links;
  }

  function renderEventCard(host, item, context, options) {
    const event = item.event || {};
    const timeline = item.timeline || {};
    const card = append(host, 'article', 'record-card chronology-card');
    card.id = `event-${String(item.event_id).replace(/[^A-Za-z0-9_-]/g, '-')}`;
    card.dataset.eventId = item.event_id;
    const meta = append(card, 'div', 'record-meta');
    append(meta, 'span', '', timeline.date || event.event_date || 'Date unresolved');
    const knownBy = event.first_verified || timeline.first_verified || event.first_reported || timeline.first_reported;
    if (knownBy) append(meta, 'span', '', `Known by ${knownBy}`);
    append(meta, 'span', '', item.event_id);
    append(card, 'h3', '', publicNarrative(timeline.summary || event.summary || event.target, item.event_id));
    const actors = eventActors(item);
    if (actors.length) {
      const actorRow = append(card, 'div', 'actor-row');
      actors.forEach(actor => actorRow.append(ActorIdentity.create(context.documentObject, actor)));
    }
    card.append(EvidenceStatus.create(context.documentObject, {
      support: event.evidence_support || event.evidence_status || 'UNKNOWN',
      dispute: event.dispute_posture || event.disputed_by
    }));
    if (options && options.detail && event.observed_fact && event.observed_fact !== timeline.summary) append(card, 'p', '', publicNarrative(event.observed_fact));
    const actions = append(card, 'div', 'record-actions');
    eventCrossLinks(item).forEach(linkDefinition => {
      if (linkDefinition.key === context.route.key && !(options && options.forceCurrentLink)) return;
      const link = append(actions, 'a', '', linkDefinition.label);
      link.href = routeHref(linkDefinition.key, { event: item.event_id });
    });
    card.append(EvidenceDrawer.create(context.documentObject, item, context.model));
    return card;
  }

  function renderRelatedLinks(host, context) {
    if (!context.route.related || !context.route.related.length) return;
    const section = addSection(host, 'Continue exploring', 'related-section');
    const links = append(section, 'div', 'related-links');
    context.route.related.forEach(key => {
      const route = ROUTES.get(key);
      const link = append(links, 'a', '', route.title);
      link.href = routeHref(key);
    });
  }

  function subjectPage(context, description, options) {
    const frame = pageFrame(context, description);
    if (options && options.boundaryNote) {
      const note = append(frame.article, 'aside', 'scope-note');
      append(note, 'strong', '', options.boundaryNote.title);
      append(note, 'p', '', options.boundaryNote.text);
    }
    renderDatasetBlocks(frame.article, context, context.route.dataKeys, options && options.limit || 5);
    if (options && options.map) {
      const mapRecords = context.route.dataKeys.flatMap(key => recordArray(modelData(context.model, key))).filter(item => item && (item.map_ref || item.map_refs || item.location));
      frame.article.append(MapView.create(context.documentObject, { count: mapRecords.length }));
    }
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function OverviewPage(context) {
    const frame = pageFrame(context, 'A clear route into the conflict, its major military and diplomatic tracks, and the evidence behind the public record.');
    const orientation = addSection(frame.article, 'Conflict orientation');
    append(orientation, 'p', '', 'Follow the conflict through the military campaign, disruption around the Strait of Hormuz, negotiations, stated objectives, and major claims.');

    const situation = addSection(frame.article, 'Current situation');
    const domains = recordArray(modelData(context.model, 'ledger.domain_assessments'));
    const agreementView = modelData(context.model, 'analysis.endgame_public_view') || {};
    const nuclearClause = (agreementView.clauses || []).find(clause => /nuclear/i.test(`${clause.title || ''} ${clause.summary || ''}`));
    const situationRecords = [
      { label: 'Military', record: domains.find(domain => domain.domain === 'Force preservation') || domains.find(domain => /Air \/ long-range strike/i.test(domain.domain || '')) },
      { label: 'Hormuz', record: domains.find(domain => /Maritime control/i.test(domain.domain || '')) },
      { label: 'Diplomacy', record: domains.find(domain => /Alliance \/ diplomatic/i.test(domain.domain || '')) },
      { label: 'Economic', record: domains.find(domain => /Economic sustainability/i.test(domain.domain || '')) },
      { label: 'Nuclear', record: nuclearClause && { assessment: nuclearClause.summary } }
    ];
    const grid = append(situation, 'div', 'situation-grid');
    situationRecords.forEach(item => {
      const card = append(grid, 'article', 'situation-card');
      append(card, 'h3', '', item.label);
      append(card, 'p', '', publicNarrative(item.record && item.record.assessment, 'A separate current summary is not stated in the reviewed record.'));
      if (item.record && item.record.confidence) append(card, 'span', 'confidence-label', `Confidence: ${displayTerm(item.record.confidence)}`);
    });

    const developments = addSection(frame.article, 'Latest recorded developments');
    const developmentList = append(developments, 'div', 'record-list');
    context.model.chronology.slice(-5).reverse().forEach(item => renderEventCard(developmentList, item, context));

    const unresolved = addSection(frame.article, 'What remains unresolved');
    const unresolvedList = append(unresolved, 'div', 'question-list');
    recordArray(modelData(context.model, 'ledger.unresolved')).slice(0, 4).forEach(item => {
      const card = append(unresolvedList, 'article', 'question-card');
      append(card, 'h3', '', publicNarrative(item.topic, 'Open question'));
      append(card, 'p', '', publicNarrative(item.question));
    });

    const explore = addSection(frame.article, 'Explore the record');
    const links = append(explore, 'div', 'explore-grid');
    PRIMARY_SECTIONS.slice(1).forEach(primary => {
      const route = routesForPrimary(primary.id)[0];
      const link = append(links, 'a', '', primary.label);
      link.href = routeHref(route.key);
    });
    return frame.article;
  }

  function ActorsPage(context) {
    const frame = pageFrame(context, 'The named people, states, institutions, non-state armed groups, and international or other organizations in the current record.');
    const body = JSON.stringify(context.model.chronology).toLowerCase();
    const section = addSection(frame.article, "Actors in the record");
    const list = append(section, 'div', 'actor-directory');
    const directory = [
      ...AFFILIATED_ACTORS.map(actor => ({ aliases: actor.aliases, value: actor.canonicalName })),
      ...PERSON_PROFILES.map(person => ({ aliases: person.aliases, value: person.canonicalName }))
    ];
    directory.filter(entry => entry.aliases.some(alias => body.includes(alias))).forEach(entry => {
      const card = append(list, 'article', 'actor-card');
      card.append(ActorIdentity.create(context.documentObject, entry.value, { subtitle: true }));
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function TimelinePage(context) {
    const frame = pageFrame(context, 'A reader-first chronological view of the war. The full forensic record remains available in Detailed Chronology.');
    const wartime = context.model.chronology.filter(item => !String(item.event_id).startsWith('PRE-'));
    const months = new Map();
    wartime.forEach(item => {
      const month = String(item.timeline && item.timeline.date || item.event && item.event.event_date || '').slice(0, 7) || 'Date unresolved';
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(item);
    });
    months.forEach((items, month) => {
      const section = addSection(frame.article, month, 'timeline-month');
      append(section, 'p', 'section-note', `${items.length.toLocaleString()} events recorded in this month.`);
      const list = append(section, 'div', 'record-list');
      items.slice(-3).forEach(item => renderEventCard(list, item, context));
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function ChronologyPage(context) {
    const frame = pageFrame(context, 'The complete current chronology with occurrence date, known-by date, actors, evidence status, record ID, and source links.');
    const controls = append(frame.article, 'form', 'chronology-controls');
    controls.addEventListener('submit', event => event.preventDefault());
    const searchLabel = append(controls, 'label', '', 'Search');
    const search = append(searchLabel, 'input');
    search.type = 'search';
    search.placeholder = 'Event, location, actor, or record ID';
    search.value = context.route.params.event || '';
    const actorLabel = append(controls, 'label', '', 'Actor');
    const actorSelect = append(actorLabel, 'select');
    append(actorSelect, 'option', '', 'All actors').value = '';
    Array.from(new Set(context.model.chronology.flatMap(eventActors))).sort().forEach(actor => {
      const option = append(actorSelect, 'option', '', ActorIdentity.resolve(actor).label);
      option.value = actor;
    });
    const sourceLabel = append(controls, 'label', '', 'Source ID');
    const source = append(sourceLabel, 'input');
    source.type = 'search';
    source.placeholder = 'SRC-…';
    const evidenceLabel = append(controls, 'label', '', 'Evidence');
    const evidence = append(evidenceLabel, 'select');
    append(evidence, 'option', '', 'All evidence categories').value = '';
    ['VERIFIED', 'CONFIRMED', 'SUPPORTED', 'UNVERIFIED', 'UNKNOWN'].forEach(status => {
      const option = append(evidence, 'option', '', displayTerm(status));
      option.value = status;
    });
    const knownByLabel = append(controls, 'label', '', 'Known by');
    const knownBy = append(knownByLabel, 'input');
    knownBy.type = 'date';
    const list = append(frame.article, 'div', 'record-list');
    const pager = append(frame.article, 'div', 'pager');
    const count = append(pager, 'span');
    const more = append(pager, 'button', 'action', 'Show more');
    more.type = 'button';
    let limit = context.route.params.event ? 205 : 40;
    const draw = () => {
      const query = search.value.trim().toLowerCase();
      const actor = actorSelect.value;
      const sourceQuery = source.value.trim().toUpperCase();
      const evidenceValue = evidence.value;
      const knownDate = knownBy.value;
      const rows = context.model.chronology.filter(item => {
        const event = item.event || {};
        if (actor && !eventActors(item).includes(actor)) return false;
        if (sourceQuery && !(item.source_ids || []).some(id => id.includes(sourceQuery))) return false;
        if (evidenceValue) {
          const status = String(event.evidence_support || event.evidence_status || 'UNKNOWN');
          if (evidenceValue === 'UNKNOWN' ? status !== 'UNKNOWN' : !status.includes(evidenceValue)) return false;
        }
        const firstKnown = event.first_verified || item.timeline && item.timeline.first_verified || event.first_reported || item.timeline && item.timeline.first_reported;
        if (knownDate && firstKnown && firstKnown > knownDate) return false;
        if (!query) return true;
        return JSON.stringify({ id: item.event_id, event, timeline: item.timeline, sources: item.source_ids }).toLowerCase().includes(query);
      }).slice().reverse();
      list.replaceChildren();
      rows.slice(0, limit).forEach(item => renderEventCard(list, item, context, { detail: true }));
      count.textContent = `${Math.min(rows.length, limit)} of ${rows.length} matching records`;
      more.hidden = rows.length <= limit;
      if (!rows.length) append(list, 'div', 'empty-state', 'No chronology records match these filters.');
    };
    [search, source, knownBy].forEach(control => control.addEventListener('input', () => { limit = 40; draw(); }));
    [actorSelect, evidence].forEach(control => control.addEventListener('change', () => { limit = 40; draw(); }));
    more.addEventListener('click', () => { limit += 40; draw(); });
    draw();
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function CampaignsPage(context) {
    return subjectPage(context, 'The campaign record keeps attempted attacks, launches, interceptions, impacts, hits, damage, operational effects, destruction, and material losses distinct.', { map: true, limit: 8 });
  }
  function FacilitiesPage(context) { return subjectPage(context, 'Verified damage and operational effects at bases and infrastructure, without treating a damaged component as proof that an entire site stopped operating.', { map: true, limit: 10 }); }
  function WeaponsPage(context) { return subjectPage(context, 'Current records for aircraft, missiles, drones, defenses, expenditure, and attrition, preserving each accounting category.', { limit: 8 }); }
  function LossesPage(context) { return subjectPage(context, 'Casualties, material losses, munitions expenditure, and cost ranges remain separate so unknown values are not converted into zero.', { boundaryNote: { title: 'Accounting boundary', text: 'Reported statuses and overlapping categories are not automatically added into a grand total.' }, limit: 8 }); }
  function ImageryPage(context) { return subjectPage(context, 'Damage-imagery records remain tied to the facility, observation date, claimed effect, and evidentiary limitations they support.', { map: true, limit: 8 }); }

  function HormuzOverviewPage(context) { return subjectPage(context, 'The Strait of Hormuz as a military, shipping, energy, and negotiating issue, organized here as one public subject.', { map: true, limit: 6 }); }
  function ShippingPage(context) { return subjectPage(context, 'Commercial traffic, vessel incidents, routing, and trade records for the Strait and connected corridors.', { map: true, limit: 8 }); }
  function EconomyPage(context) { return subjectPage(context, 'Oil, trade, shipping, and wider economic effects, with the underlying accounting scopes kept separate.', { limit: 8 }); }
  function HormuzNegotiationsPage(context) { return subjectPage(context, 'The current negotiating record for maritime access, de-escalation, mine-clearing, and related diplomatic contacts.', { limit: 8 }); }

  function DiplomacyPage(context) { return subjectPage(context, 'Talks, ceasefires, agreements, breakdowns, and mediation contacts in chronological and documentary context.', { limit: 10 }); }
  function MouPage(context) { return subjectPage(context, 'The June agreement record, its provisions, current status, and connected diplomatic tracks.', { limit: 8 }); }
  function NuclearPage(context) { return subjectPage(context, 'Nuclear-related talks and positions as recorded in the diplomatic and agreement record.', { limit: 8 }); }
  function RegionalDiplomacyPage(context) { return subjectPage(context, 'Regional mediation, agreements, security arrangements, and diplomatic contacts without treating sequence alone as proof of causation.', { limit: 10 }); }

  function ObjectivesPage(context) { return subjectPage(context, 'What the parties said they wanted, which outcomes the evidence supports, and what remains unresolved.', { limit: 8 }); }
  function PositionChangesPage(context) { return subjectPage(context, 'Recorded changes between earlier positions, intervening events, and later statements or behavior. Labels shown here come from the recorded assessments.', { limit: 8 }); }
  function IranMessagingPage(context) { return subjectPage(context, "Iran's recorded position-change series, keeping observed movement separate from explanations of motive.", { limit: 8 }); }

  function ClaimChecksPage(context) { return subjectPage(context, 'Major claims tested against the current chronology, counterevidence, unresolved questions, and linked sources.', { limit: 10 }); }
  function InformationEnvironmentPage(context) { return subjectPage(context, 'False, misleading, synthetic, and contested narratives alongside the evidence used to assess them.', { limit: 10 }); }

  function SourcesPage(context) {
    const frame = pageFrame(context, 'The source catalog behind the current record. Where source details differ across records, each version remains attached to the evidence that used it.');
    const controls = append(frame.article, 'form', 'source-controls');
    controls.addEventListener('submit', event => event.preventDefault());
    const label = append(controls, 'label', '', 'Search sources');
    const search = append(label, 'input');
    search.type = 'search';
    search.placeholder = 'Outlet, title, or source ID';
    const list = append(frame.article, 'div', 'source-list');
    const count = append(frame.article, 'p', 'section-note');
    const draw = () => {
      const query = search.value.trim().toLowerCase();
      const sources = context.model.sources.records.filter(source => !query || JSON.stringify(source).toLowerCase().includes(query));
      list.replaceChildren();
      sources.slice(0, 80).forEach(source => {
        const record = sourceDisplayRecord(source) || source.variants && source.variants[0] && source.variants[0].record;
        const card = append(list, 'article', 'source-card');
        append(card, 'h2', '', publicNarrative(record && (record.outlet || record.title), source.source_id));
        append(card, 'p', 'source-id', source.source_id);
        if (record && record.title && record.title !== record.outlet) append(card, 'p', '', publicNarrative(record.title));
        const url = safeExternalUrl(record && record.url);
        if (url) {
          const link = append(card, 'a', '', 'Open source');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      });
      count.textContent = `${Math.min(sources.length, 80)} of ${sources.length} matching sources shown`;
    };
    search.addEventListener('input', draw);
    draw();
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function MethodPage(context) {
    const frame = pageFrame(context, 'How the public record separates occurrence, publication, verification, dispute, correction, and unresolved questions.');
    const principles = addSection(frame.article, 'Evidence-checking principles');
    const list = append(principles, 'ul', 'method-list');
    ['Keep occurrence date separate from when information became public.', 'Link summarized records back to their source evidence.', 'Keep evidence support separate from who disputes a claim.', 'Preserve corrections and unresolved questions instead of silently overwriting them.', 'Treat unknown values as unknown, not zero.'].forEach(text => append(list, 'li', '', text));
    const assembly = addSection(frame.article, 'Record assembly');
    const tableWrap = append(assembly, 'div', 'table-wrap');
    const table = append(tableWrap, 'table');
    const head = append(table, 'thead');
    const headRow = append(head, 'tr');
    ['Record layer', 'Contribution', 'Cumulative chronology'].forEach(value => append(headRow, 'th', '', value));
    const body = append(table, 'tbody');
    context.model.input_packages.forEach(input => {
      const row = append(body, 'tr');
      append(row, 'td', '', displayTerm(input.role, 'Reviewed evidence layer'));
      append(row, 'td', '', input.contribution);
      append(row, 'td', '', input.cumulative_chronology_records);
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function ArchivePage(context) {
    const frame = pageFrame(context, 'Earlier public editions preserved separately from the current record.');
    const section = addSection(frame.article, 'Archived editions');
    const list = append(section, 'div', 'record-list');
    recordArray(modelData(context.model, 'archive.snapshot_index')).forEach(snapshot => {
      const card = append(list, 'article', 'record-card');
      append(card, 'h3', '', publicNarrative(snapshot.label, 'Archived edition'));
      append(card, 'p', '', snapshot.date || 'Date not stated');
      const link = append(card, 'a', '', 'Open archived edition');
      link.href = encodeURI(snapshot.path);
    });
    const note = append(frame.article, 'aside', 'scope-note');
    append(note, 'strong', '', 'Historical reference boundary');
    append(note, 'p', '', 'Earlier supporting records remain preserved for audit and archive use. They do not populate current public pages.');
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  const PAGE_OWNERS = Object.freeze({
    OverviewPage,
    ActorsPage,
    TimelinePage,
    ChronologyPage,
    CampaignsPage,
    FacilitiesPage,
    WeaponsPage,
    LossesPage,
    ImageryPage,
    HormuzOverviewPage,
    ShippingPage,
    EconomyPage,
    HormuzNegotiationsPage,
    DiplomacyPage,
    MouPage,
    NuclearPage,
    RegionalDiplomacyPage,
    ObjectivesPage,
    PositionChangesPage,
    IranMessagingPage,
    ClaimChecksPage,
    InformationEnvironmentPage,
    SourcesPage,
    MethodPage,
    ArchivePage
  });

  function navigationLink(documentObject, route, currentRoute, className) {
    const link = element(documentObject, 'a', className || '', route.label);
    link.href = routeHref(route.key);
    link.dataset.routeKey = route.key;
    if (route.key === currentRoute.key) link.setAttribute('aria-current', 'page');
    return link;
  }

  const PublicNavigation = Object.freeze({
    renderPrimary(documentObject, currentRoute) {
      const nav = element(documentObject, 'nav', 'primary-nav');
      nav.setAttribute('aria-label', 'Primary');
      const list = append(nav, 'ul');
      PRIMARY_SECTIONS.forEach(primary => {
        const item = append(list, 'li');
        const defaultRoute = routesForPrimary(primary.id)[0];
        const link = navigationLink(documentObject, { ...defaultRoute, label: primary.label }, currentRoute);
        if (primary.id === currentRoute.primary) link.setAttribute('aria-current', 'page');
        item.append(link);
      });
      return nav;
    },
    renderSecondary(documentObject, currentRoute) {
      const nav = element(documentObject, 'nav', 'secondary-nav');
      nav.setAttribute('aria-label', `${currentRoute.primaryLabel} pages`);
      append(nav, 'h2', '', currentRoute.primaryLabel);
      const list = append(nav, 'ul');
      routesForPrimary(currentRoute.primary).forEach(route => {
        const item = append(list, 'li');
        item.append(navigationLink(documentObject, route, currentRoute));
      });
      return nav;
    },
    renderMobile(documentObject, currentRoute) {
      const details = element(documentObject, 'details', 'mobile-navigation');
      details.dataset.component = 'PublicNavigation';
      const summary = append(details, 'summary', '', `${currentRoute.primaryLabel} — ${currentRoute.label}`);
      summary.setAttribute('aria-label', 'Open public navigation');
      const inner = append(details, 'div', 'mobile-navigation-inner');
      const primary = append(inner, 'nav', 'mobile-primary');
      primary.setAttribute('aria-label', 'Primary mobile');
      const primaryList = append(primary, 'ul');
      PRIMARY_SECTIONS.forEach(section => {
        const item = append(primaryList, 'li');
        const defaultRoute = routesForPrimary(section.id)[0];
        const link = navigationLink(documentObject, { ...defaultRoute, label: section.label }, currentRoute);
        if (section.id === currentRoute.primary) link.setAttribute('aria-current', 'page');
        item.append(link);
      });
      const secondary = append(inner, 'nav', 'mobile-secondary');
      secondary.setAttribute('aria-label', `${currentRoute.primaryLabel} mobile pages`);
      append(secondary, 'h2', '', currentRoute.primaryLabel);
      const secondaryList = append(secondary, 'ul');
      routesForPrimary(currentRoute.primary).forEach(route => {
        const item = append(secondaryList, 'li');
        item.append(navigationLink(documentObject, route, currentRoute));
      });
      return details;
    }
  });

  const AppShell = Object.freeze({
    create(documentObject) {
      const app = element(documentObject, 'div', 'atlas-app');
      app.dataset.component = 'AppShell';
      const skip = append(app, 'button', 'skip-link', 'Skip to content');
      skip.type = 'button';
      const header = append(app, 'header', 'app-header');
      const headerInner = append(header, 'div', 'header-inner');
      const brand = append(headerInner, 'a', 'brand');
      brand.href = routeHref(DEFAULT_ROUTE_KEY);
      append(brand, 'span', 'brand-title', 'Iran War Evidence Atlas');
      append(brand, 'span', 'brand-subtitle', 'A clear account backed by an auditable record');
      const primaryHost = append(header, 'div', 'primary-nav-host');
      const mobileHost = append(header, 'div', 'mobile-nav-host');
      const grid = append(app, 'div', 'app-grid');
      const aside = append(grid, 'aside', 'secondary-column');
      const main = append(grid, 'div', 'page-host');
      main.id = 'main-content';
      main.tabIndex = -1;
      const focusMain = () => main.focus();
      skip.addEventListener('click', focusMain);
      skip.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        focusMain();
      });
      const footer = append(app, 'footer', 'page-footer');
      return { app, primaryHost, mobileHost, aside, main, footer };
    }
  });

  function mount(options) {
    const settings = options || {};
    const documentObject = settings.documentObject || root.document;
    const windowObject = settings.windowObject || root;
    const rootElement = settings.rootElement;
    const model = settings.model;
    const state = settings.state;
    invariant(documentObject && rootElement && model, 'Public IA mount requires a document, root element, and current model');
    validateRegistry(model);
    if (rootElement.__atlasRouteController) rootElement.__atlasRouteController.destroy();
    const shell = AppShell.create(documentObject);
    rootElement.replaceChildren(shell.app);
    rootElement.className = 'atlas-ready';
    rootElement.dataset.status = 'ready';
    rootElement.setAttribute('aria-busy', 'false');

    let previousRouteKey = null;
    const renderRoute = (focusHeading) => {
      const route = parseRoute(windowObject.location && windowObject.location.hash);
      if (!route.canonical && windowObject.history && windowObject.location) {
        windowObject.history.replaceState(null, '', routeHref(route.key, route.params));
      }
      const context = { documentObject, windowObject, model, state, route };
      shell.primaryHost.replaceChildren(PublicNavigation.renderPrimary(documentObject, route));
      shell.mobileHost.replaceChildren(PublicNavigation.renderMobile(documentObject, route));
      shell.aside.replaceChildren(PublicNavigation.renderSecondary(documentObject, route));
      const page = PAGE_OWNERS[route.owner](context);
      shell.main.replaceChildren(page);
      shell.footer.replaceChildren();
      append(shell.footer, 'span', '', `Evidence reviewed through ${model.release.current_osint_cutoff_display}. `);
      const archive = append(shell.footer, 'a', '', 'Archive');
      archive.href = routeHref('evidence.archive');
      state.routeKey = route.key;
      state.pageOwner = route.owner;
      state.primarySection = route.primaryLabel;
      state.secondaryPage = route.label;
      documentObject.title = `${route.title} · Iran War Evidence Atlas`;
      if (focusHeading && previousRouteKey && previousRouteKey !== route.key) {
        const heading = shell.main.querySelector('h1');
        if (heading) heading.focus();
      }
      previousRouteKey = route.key;
      if (typeof windowObject.CustomEvent === 'function' && windowObject.dispatchEvent) {
        windowObject.dispatchEvent(new windowObject.CustomEvent('atlasroutechange', { detail: { routeKey: route.key, owner: route.owner } }));
      }
      return route;
    };
    const onHashChange = () => renderRoute(true);
    windowObject.addEventListener('hashchange', onHashChange);
    const initialRoute = renderRoute(false);
    const controller = Object.freeze({
      render: () => renderRoute(false),
      current: () => parseRoute(windowObject.location && windowObject.location.hash),
      destroy: () => windowObject.removeEventListener('hashchange', onHashChange),
      initialRoute
    });
    rootElement.__atlasRouteController = controller;
    return controller;
  }

  return Object.freeze({
    DEFAULT_ROUTE_KEY,
    PRIMARY_SECTIONS,
    ROUTE_DEFINITIONS,
    ROUTES,
    DATASET_LABELS,
    DISPLAY_TERMS,
    AFFILIATED_ACTORS,
    PERSON_PROFILES,
    PAGE_OWNERS,
    AppShell,
    PublicNavigation,
    EvidenceDrawer,
    ActorIdentity,
    EvidenceStatus,
    MapView,
    displayTerm,
    publicNarrative,
    routeHref,
    parseRoute,
    routesForPrimary,
    modelData,
    recordArray,
    validateRegistry,
    mount
  });
}));
