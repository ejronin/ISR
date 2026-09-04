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
    { key: 'military.facilities', primary: 'military', slug: 'facilities', label: 'Bases & Infrastructure', title: 'Bases & Infrastructure', owner: 'FacilitiesPage', dataKeys: ['ledger.facilities', 'ledger.map_links', 'forensic.facility_claim_audits'], related: ['military.campaigns', 'military.imagery', 'timeline.chronology'] },
    { key: 'military.weapons', primary: 'military', slug: 'weapons', label: 'Air, Missiles & Drones', title: 'Air, Missiles & Drones', owner: 'WeaponsPage', dataKeys: ['ledger.munitions_expenditure', 'ledger.attrition_series', 'current.material_losses'], related: ['military.campaigns', 'military.losses'] },
    { key: 'military.losses', primary: 'military', slug: 'losses', label: 'Casualties & Losses', title: 'Casualties & Losses', owner: 'LossesPage', dataKeys: ['ledger.casualties', 'current.material_losses', 'forensic.loss_envelopes', 'analysis.casualty_corrections'], related: ['military.weapons', 'evidence.method'] },
    { key: 'military.imagery', primary: 'military', slug: 'imagery', label: 'Damage Imagery', title: 'Damage Imagery', owner: 'ImageryPage', dataKeys: ['current.chronology', 'ledger.bda_overlays', 'ledger.facilities', 'forensic.facility_claim_audits', 'forensic.damage_observations'], related: ['military.facilities', 'military.campaigns', 'evidence.method'] },

    { key: 'hormuz.overview', primary: 'hormuz', slug: 'overview', label: 'Why Hormuz Matters', title: 'Why Hormuz Matters', owner: 'HormuzOverviewPage', dataKeys: ['analysis.hormuz', 'ledger.agreements'], related: ['hormuz.shipping', 'hormuz.talks', 'talks.mou'] },
    { key: 'hormuz.shipping', primary: 'hormuz', slug: 'shipping', label: 'Shipping & Trade', title: 'Shipping & Trade', owner: 'ShippingPage', dataKeys: ['ledger.shipping', 'analysis.oil_routes', 'analysis.hormuz'], related: ['hormuz.overview', 'hormuz.economy', 'hormuz.talks'] },
    { key: 'hormuz.economy', primary: 'hormuz', slug: 'economy', label: 'Oil & Economic Effects', title: 'Oil & Economic Effects', owner: 'EconomyPage', dataKeys: ['ledger.economics', 'analysis.china_oil_shift', 'analysis.oil_routes'], related: ['hormuz.shipping', 'hormuz.overview'] },
    { key: 'hormuz.talks', primary: 'hormuz', slug: 'talks', label: 'Current Hormuz Talks', title: 'Current Hormuz Talks', owner: 'HormuzNegotiationsPage', dataKeys: ['current.chronology', 'ledger.agreements', 'analysis.hormuz'], related: ['talks.mou', 'talks.overview', 'hormuz.shipping'] },

    { key: 'talks.overview', primary: 'talks', slug: 'overview', label: 'Talks & Agreements', title: 'Talks & Agreements', owner: 'DiplomacyPage', dataKeys: ['ledger.agreements', 'ledger.diplomacy'], related: ['talks.mou', 'talks.nuclear', 'talks.regional'] },
    { key: 'talks.mou', primary: 'talks', slug: 'june-mou', label: 'June MOU', title: 'June MOU', owner: 'MouPage', dataKeys: ['ledger.agreements', 'analysis.hormuz', 'analysis.endgame_public_view', 'analysis.endgame_current_aug25', 'analysis.endgame_current_aug26'], related: ['hormuz.talks', 'talks.nuclear', 'objectives.outcomes'] },
    { key: 'talks.nuclear', primary: 'talks', slug: 'nuclear', label: 'Nuclear Talks', title: 'Nuclear Talks', owner: 'NuclearPage', dataKeys: ['ledger.agreements', 'ledger.diplomacy'], related: ['talks.overview', 'talks.mou', 'objectives.positions'] },
    { key: 'talks.regional', primary: 'talks', slug: 'regional', label: 'Regional Diplomacy', title: 'Regional Diplomacy', owner: 'RegionalDiplomacyPage', dataKeys: ['ledger.agreements', 'ledger.diplomacy'], related: ['talks.overview', 'hormuz.talks', 'start.actors'] },

    { key: 'objectives.outcomes', primary: 'objectives', slug: 'outcomes', label: 'Objectives & Outcomes', title: 'Objectives & Outcomes', owner: 'ObjectivesPage', dataKeys: ['analysis.iran_outcomes', 'analysis.endgame_us_objectives', 'analysis.endgame_objective_corrections', 'analysis.outcome_evidence_links'], related: ['objectives.positions', 'objectives.iran', 'talks.mou'] },
    { key: 'objectives.positions', primary: 'objectives', slug: 'positions', label: 'Position Changes', title: 'Position Changes', owner: 'PositionChangesPage', dataKeys: ['current.chronology', 'analysis.endgame_public_view', 'analysis.outcome_evidence_links'], related: ['objectives.outcomes', 'objectives.iran', 'timeline.chronology'] },
    { key: 'objectives.iran', primary: 'objectives', slug: 'iran-position', label: "How Iran's Position Changed", title: "How Iran's Position Changed", owner: 'IranMessagingPage', dataKeys: ['analysis.iran_messaging'], related: ['objectives.positions', 'talks.overview', 'evidence.information'] },

    { key: 'evidence.claims', primary: 'evidence', slug: 'claims', label: 'Claim Checks', title: 'Claim Checks', owner: 'ClaimChecksPage', dataKeys: ['current.claims', 'forensic.public_assessments'], related: ['evidence.information', 'evidence.sources', 'timeline.chronology'] },
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
    'current.material_losses': 'Current canonical material-loss records',
    'current.claims': 'Current canonical claim records',
    'reconciliation.coverage_audit': 'Coverage audit',
    'forensic.loss_envelopes': 'Loss ranges and accounting',
    'forensic.facility_claim_audits': 'Facility claim checks',
    'forensic.damage_observations': 'Physical damage observations',
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
    if (!value) return 'Date unresolved';
    const matched = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return publicNarrative(value, String(value));
    const date = new Date(`${matched[1]}-${matched[2]}-${matched[3]}T12:00:00Z`);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function formatNumber(value) {
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
          canonicalName,
          label: canonicalName,
          entityType,
          role: actor.role || null,
          affiliation: affiliationName,
          affiliationId: actor.affiliation_id || (entityType === 'person' ? null : actor.actor_id),
          affiliationType: actor.affiliation_type || 'unknown',
          parentState: actor.parent_state || null,
          flag: actor.flag || '',
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
      if (actor.flag) {
        const flag = append(wrapper, 'span', 'actor-flag', actor.flag);
        flag.setAttribute('aria-hidden', 'true');
      }
      append(wrapper, 'span', 'actor-name', actor.canonicalName);
      if (options && options.subtitle) append(wrapper, 'span', 'actor-subtitle', actor.subtitle);
      return wrapper;
    },
    createResolver(model) {
      const records = model && model.entities && Array.isArray(model.entities.actors) ? model.entities.actors : [];
      const modelActors = records.map(item => item && item.record ? item.record : item).filter(Boolean);
      const resolver = {
        size: modelActors.length,
        resolve(value) { return ActorIdentity.resolve(value, modelActors); },
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
    const metadata = [record.publisher, record.publicationDate, record.role, selected && selected.packageLabel].filter(Boolean);
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
        ? `Evidence and sources (${references.length + relatedRecords.length})`
        : 'Evidence and sources');
      const body = append(details, 'div', 'evidence-drawer-body');
      if (item && item.event_id) {
        const record = item.event && typeof item.event === 'object' ? item.event : item;
        const temporal = eventTemporalValues(item);
        const status = eventEvidenceValues(item);
        const actorValues = item.actor_ids || record.actor_ids || record.actors || [];
        const locationValues = item.location_ids || record.location_ids || [];
        const facts = append(body, 'dl', 'evidence-facts');
        appendDefinition(facts, 'Event ID', item.event_id);
        appendDefinition(facts, 'Event summary', firstText(record.summary, record.observed_fact, record.headline, item.summary));
        appendDefinition(facts, 'Occurred', temporal.occurred);
        appendDefinition(facts, 'First reported / known', temporal.knownBy);
        appendDefinition(facts, 'Later revision known', temporal.revisionKnownAt);
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
        append(body, 'h4', '', 'Sources');
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
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) continue;
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
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
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
    return asArray(coordinates).map(point => [Number(point && point[0]), Number(point && point[1])]).filter(point => point.every(Number.isFinite));
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
      return bounds.every(point => point.every(Number.isFinite)) ? bounds : null;
    }
    if (typeof value === 'object') {
      const south = Number(value.south === undefined ? value.min_lat : value.south);
      const west = Number(value.west === undefined ? value.min_lon : value.west);
      const north = Number(value.north === undefined ? value.max_lat : value.north);
      const east = Number(value.east === undefined ? value.max_lon : value.east);
      if ([south, west, north, east].every(Number.isFinite)) return [[south, west], [north, east]];
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
    return result.every(point => point.every(Number.isFinite)) ? result : null;
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
    return readableDate(record && (record.date || record.capture_date || record.publication_date) || record && record.timeline && record.timeline.date || nested.date);
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

  const MapView = Object.freeze({
    pointFromRecord,
    pointAlongPolyline,
    routeGeometry,
    imageryDescriptor,
    create(context, options) {
      const documentObject = context.documentObject;
      const section = element(documentObject, 'section', 'context-map');
      section.dataset.component = 'MapView';
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
      append(section, 'p', '', options && options.description || (groups.size
        ? `${groups.size.toLocaleString()} source-linked locations are shown. Geographic precision follows the underlying record.`
        : 'No source-supported point coordinates are available for these records. Reference geography remains available for context.'));

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
        const summary = publicNarrative(record && (record.summary || record.observation || record.note || record.limitations || record.assessment) || nested.summary, extra && extra.text || 'This location is supplied by the accepted current evidence record.');
        append(card, 'p', '', summary);
        if (extra && extra.meta) append(card, 'p', 'map-card-meta', extra.meta);
        const envelope = evidenceEnvelope(extra && extra.evidenceRecord || record);
        if (envelope.source_ids.length) card.append(EvidenceDrawer.create(context, envelope, { relatedRecords: relatedRecordsFrom(extra && extra.evidenceRecord || record) }));
        const close = append(card, 'button', 'map-card-close', 'Close map card');
        close.type = 'button';
        close.addEventListener('click', () => { cardHost.hidden = true; cardHost.replaceChildren(); mapHost.focus(); });
      };

      const L = root.L;
      const geography = root.ATLAS_REFERENCE_GEOGRAPHY;
      if (L && geography && geography.type === 'FeatureCollection') {
        const map = L.map(mapHost, { attributionControl: false, scrollWheelZoom: false, zoomControl: true, minZoom: 3, maxZoom: 10, worldCopyJump: false });
        ['reference', 'routes', 'imagery', 'evidence', 'labels'].forEach((name, index) => {
          map.createPane(`atlas-${name}`);
          map.getPane(`atlas-${name}`).style.zIndex = String(210 + index * 80);
        });
        const routeKey = context.route && context.route.key || '';
        const detailLayer = String(routeKey).startsWith('hormuz.') ? 'hormuz_10m' : 'regional_50m';
        const features = geography.features.filter(feature => feature.properties && feature.properties.layer === detailLayer);
        L.geoJSON({ type: 'FeatureCollection', features }, {
          pane: 'atlas-reference',
          interactive: false,
          style: { color: '#587082', weight: detailLayer === 'hormuz_10m' ? 1.2 : .8, fillColor: '#172732', fillOpacity: .92 }
        }).addTo(map);

        routes.forEach(route => {
          const coordinates = routeGeometry(route);
          const authority = routeAuthority(route);
          const maritime = String(route.mode).toLowerCase() === 'maritime';
          const line = L.polyline(coordinates, {
            pane: 'atlas-routes', color: maritime ? '#7fcbe8' : '#d5ad6d', weight: 4, opacity: .9,
            dashArray: authority === 'SCHEMATIC_REFERENCE_ROUTE' ? '9 7' : null
          }).addTo(map);
          line.on('click', () => {
            const sources = routeSources(route);
            cardHost.replaceChildren(); cardHost.hidden = false;
            const card = append(cardHost, 'article', 'map-card');
            append(card, 'p', 'card-kicker', authority === 'SCHEMATIC_REFERENCE_ROUTE' ? 'Schematic reference route' : authority === 'DOCUMENTED_TRACK' ? 'Documented track' : 'Documented corridor');
            append(card, 'h3', '', publicNarrative(route.name, 'Transport route'));
            append(card, 'p', '', publicNarrative(route.note, 'The stored route geometry is shown in sequence.'));
            append(card, 'p', 'map-card-meta', maritime ? 'This line explains a maritime path. It is not live vessel tracking.' : 'This is a geographic corridor reference, not live tracking.');
            if (sources.sourceIds.length) card.append(EvidenceDrawer.create(context, { source_ids: sources.sourceIds }, { localSources: sources.localSources }));
            const close = append(card, 'button', 'map-card-close', 'Close map card'); close.type = 'button'; close.addEventListener('click', () => { cardHost.hidden = true; cardHost.replaceChildren(); mapHost.focus(); });
          });
          const flowPoint = pointAlongPolyline(coordinates, .58);
          if (flowPoint) L.marker(flowPoint, { pane: 'atlas-routes', interactive: false, icon: L.divIcon({ className: 'route-flow-marker', html: '<span aria-hidden="true">›</span>', iconSize: [24, 24] }) }).addTo(map);
        });

        let selectedOverlay = null;
        imagery.forEach((item, index) => {
          const title = mapTitle(item.evidenceRecord, item.point && item.point.label || `Imagery record ${index + 1}`);
          if (item.tier === 'A') {
            const overlay = L.imageOverlay(item.imageUrl, item.bounds, { pane: 'atlas-imagery', opacity: .56, alt: `${title} imagery overlay`, interactive: true }).addTo(map);
            imageryLayers.set(item, overlay);
            overlay.on('click', () => { if (selectedOverlay && selectedOverlay !== overlay) selectedOverlay.setOpacity(.36); selectedOverlay = overlay; overlay.setOpacity(.72); renderEvidenceCard(item.evidenceRecord, { kicker: 'Georeferenced imagery', meta: 'The accepted record supplies reliable image bounds.', evidenceRecord: item.evidenceRecord }); });
          } else if (item.tier === 'B') {
            const footprintLayer = L.polygon(item.footprint, { pane: 'atlas-imagery', color: '#e9c983', weight: 2, fillOpacity: .18 }).addTo(map);
            imageryLayers.set(item, footprintLayer);
            footprintLayer.on('click', () => renderEvidenceCard(item.evidenceRecord, { kicker: 'Imagery footprint', meta: 'The accepted record supplies a footprint; the preview is not stretched into a false rectangle.', evidenceRecord: item.evidenceRecord }));
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

        const viewport = options && options.viewport || routeViewport(routeKey);
        map.fitBounds(viewport, { padding: [12, 12], animate: false });
        keyboardMarkers.forEach(marker => {
          const markerElement = marker.getElement();
          if (!markerElement) return;
          markerElement.addEventListener('keydown', event => {
            if (event.key !== ' ' && event.code !== 'Space' && event.key !== 'Spacebar') return;
            event.preventDefault();
            marker.fire('click');
          }, true);
        });
        asArray(geography.metadata && geography.metadata.labels).filter(label => label.lat >= viewport[0][0] && label.lat <= viewport[1][0] && label.lon >= viewport[0][1] && label.lon <= viewport[1][1]).forEach(label => {
          L.marker([label.lat, label.lon], { pane: 'atlas-labels', interactive: false, icon: L.divIcon({ className: `reference-map-label ${label.kind || ''}`, html: `<span>${String(label.label).replace(/[<>&]/g, '')}</span>`, iconSize: null }) }).addTo(map);
        });
        mapHost.addEventListener('keydown', event => { if (event.key === 'Escape' && !cardHost.hidden) { event.preventDefault(); cardHost.hidden = true; cardHost.replaceChildren(); } });
        if (root.requestAnimationFrame) root.requestAnimationFrame(() => map.invalidateSize(false));
        section._atlasMap = map;
      } else {
        append(mapHost, 'p', 'empty-state', 'The authorized local reference geography is unavailable. Textual locations remain below.');
      }

      const routeControls = routes.length ? append(section, 'div', 'map-route-controls') : null;
      if (routeControls) routes.forEach(route => {
        const button = append(routeControls, 'button', 'map-route-button', publicNarrative(route.name, 'Transport route'));
        button.type = 'button';
        button.addEventListener('click', () => {
          const sources = routeSources(route);
          cardHost.replaceChildren(); cardHost.hidden = false;
          const card = append(cardHost, 'article', 'map-card');
          append(card, 'p', 'card-kicker', routeAuthority(route) === 'SCHEMATIC_REFERENCE_ROUTE' ? 'Schematic reference route' : plainLabel(routeAuthority(route), 'Documented route'));
          append(card, 'h3', '', publicNarrative(route.name, 'Transport route'));
          append(card, 'p', '', publicNarrative(route.note));
          append(card, 'p', 'map-card-meta', String(route.mode).toLowerCase() === 'maritime' ? 'This line explains a maritime path. It is not live vessel tracking.' : 'This is a geographic corridor reference, not live tracking.');
          if (sources.sourceIds.length) card.append(EvidenceDrawer.create(context, { source_ids: sources.sourceIds }, { localSources: sources.localSources }));
        });
      });

      const imageryControls = imagery.length ? append(section, 'div', 'map-imagery-controls') : null;
      if (imageryControls) {
        append(imageryControls, 'p', 'map-control-label', imagery.length > 1 ? 'Imagery and damage records shown' : 'Imagery or damage record');
        imagery.forEach(item => {
          const imageryType = item.evidenceRecord.observation_id ? 'Physical damage observation' : publicNarrative(item.record.imagery_type, 'Imagery evidence');
          const button = append(imageryControls, 'button', 'map-imagery-button', `${mapDate(item.evidenceRecord) || 'Date unresolved'} · ${imageryType} · ${mapTitle(item.evidenceRecord, item.point && item.point.label)}`);
          button.type = 'button';
          button.addEventListener('click', () => {
            const meta = item.tier === 'A' ? 'Reliable image bounds support a geographic overlay.' : item.tier === 'B' ? 'A reliable footprint is shown without manufacturing an image rectangle.' : item.tier === 'C' ? 'Precise image footprint unavailable; the card is anchored to the supported location.' : 'Reliable geolocation unavailable; no map overlay is created.';
            renderEvidenceCard(item.evidenceRecord, { kicker: item.tier === 'D' ? imageryType : `${imageryType} · geographically linked`, title: item.point && item.point.label, meta, evidenceRecord: item.evidenceRecord });
            const layer = imageryLayers.get(item);
            if (layer && layer.setOpacity) layer.setOpacity(.72);
          });
        });
      }

      const legend = append(section, 'div', 'map-legend');
      if (groups.size) append(legend, 'span', '', 'Recorded evidence location');
      if (imagery.length) append(legend, 'span', '', 'Damage / imagery evidence');
      if (routes.length) append(legend, 'span', '', 'Transport reference route');
      append(legend, 'span', '', 'Reference geography');
      append(section, 'small', 'map-caveat', 'Locations reflect the current evidence record · routes are not live tracking · not targeting or navigation data');
      const equivalent = append(section, 'details');
      equivalent.dataset.phase5MapEquivalent = 'locations';
      equivalent.dataset.phase6MapEquivalent = 'geography';
      append(equivalent, 'summary', '', `Text equivalent for this map (${groups.size} locations)`);
      const list = append(equivalent, 'ul');
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

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

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
      localSources[sourceId] = {
        title: `${publicNarrative(facility.name, facility.facility_id)} source`,
        publisher: 'Preserved facility evidence source',
        url
      };
    });
    return { sourceIds, localSources };
  }

  function appendFacilityAudit(host, context, audit) {
    const details = append(host, 'details', 'facility-claim-audit');
    details.dataset.facilityAuditId = audit.facility_audit_id;
    append(details, 'summary', '', `Facility claim audit · ${asArray(audit.propositions).length} proposition${asArray(audit.propositions).length === 1 ? '' : 's'}`);
    append(details, 'p', 'section-note', 'The audit separates a reported claim, an observed physical effect, a functional assessment and an unresolved proposition. Confirmation of one proposition does not confirm every claim about the facility.');
    const list = append(details, 'ul', 'method-list facility-audit-propositions');
    asArray(audit.propositions).forEach(proposition => {
      const row = append(list, 'li');
      append(row, 'strong', '', `${plainLabel(proposition.disposition, 'Unresolved')} — `);
      append(row, 'span', '', publicNarrative(proposition.question, 'Recorded facility proposition'));
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

  function sourceEnvelope(item) {
    return { source_ids: sourceIdsFrom(item) };
  }

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
    if (sources.length || records.length || options && options.alwaysShowEvidence) {
      card.append(EvidenceDrawer.create(context, sourceEnvelope(evidenceItem), {
        relatedRecords: records,
        localSources: options && options.localSources || {}
      }));
    }
    return card;
  }

  function addMetric(host, value, label, note) {
    const card = append(host, 'article', 'metric-card');
    append(card, 'strong', '', value);
    append(card, 'span', '', label);
    if (note) append(card, 'small', '', note);
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
      if (step.item) body.append(EvidenceDrawer.create(context, sourceEnvelope(step.item), {
        relatedRecords: step.relatedRecords || relatedRecordsFrom(step.item),
        localSources: step.localSources || {}
      }));
    });
    return list;
  }

  function addBarChart(host, rows, options) {
    const chart = append(host, 'div', 'bar-chart');
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', options && options.label || 'Evidence-linked comparison chart');
    const values = rows.map(row => Math.abs(Number(row.value))).filter(Number.isFinite);
    const maximum = Math.max(1, ...values);
    rows.forEach(row => {
      const line = append(chart, 'div', 'bar-row');
      append(line, 'span', 'bar-label', row.label);
      const track = append(line, 'span', 'bar-track');
      const bar = append(track, 'span', `bar-fill${Number(row.value) < 0 ? ' negative' : ''}`);
      bar.style.width = `${Math.max(2, Math.abs(Number(row.value)) / maximum * 100).toFixed(2)}%`;
      append(line, 'strong', 'bar-value', row.display === undefined ? formatNumber(row.value) : row.display);
    });
    if (options && options.note) append(host, 'p', 'chart-note', options.note);
    const details = append(host, 'details');
    details.dataset.phase5ChartEquivalent = options && options.key || 'chart-values';
    append(details, 'summary', '', options && options.valuesLabel || 'Numeric values for this chart');
    if (options && options.numericNote) append(details, 'p', '', options.numericNote);
    const table = append(details, 'table');
    append(table, 'caption', '', options && options.tableCaption || options && options.label || 'Chart values');
    const thead = append(table, 'thead');
    const headingRow = append(thead, 'tr');
    const categoryHeading = append(headingRow, 'th', '', options && options.categoryLabel || 'Category');
    categoryHeading.scope = 'col';
    const valueHeading = append(headingRow, 'th', '', options && options.valueLabel || 'Value');
    valueHeading.scope = 'col';
    const tbody = append(table, 'tbody');
    rows.forEach(row => {
      const tr = append(tbody, 'tr');
      const th = append(tr, 'th', '', row.label);
      th.scope = 'row';
      append(tr, 'td', '', row.display === undefined ? formatNumber(row.value) : row.display);
    });
    return chart;
  }

  function eventType(item) {
    return String(item && (item.event && item.event.event_type || item.timeline && item.timeline.event_type) || '');
  }

  function eventTopic(item) {
    const type = eventType(item);
    if (/(TALK|DIPLOMAC|NEGOTIAT|AGREEMENT|MOU|CEASEFIRE|MEDIAT)/.test(type)) return 'Diplomacy';
    if (/(HORMUZ|SHIP|VESSEL|MARITIME|MINE|TANKER)/.test(type)) return 'Hormuz';
    if (/(ECON|OIL|SANCTION|TRADE|INFLATION)/.test(type)) return 'Economy';
    if (/(CASUAL|LOSS|KILLED|DAMAGE|DESTROY|SUNK)/.test(type)) return 'Losses and damage';
    if (/(STRIKE|ATTACK|MISSILE|DRONE|INTERCEPT|MILITARY|NAVAL|OPERATION)/.test(type)) return 'Military';
    return 'Wider record';
  }

  function mappedChronology(items, locationResolver) {
    return asArray(items).filter(item => pointFromRecord(item, locationResolver));
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
    const actorIds = item && (item.actor_ids || item.event && item.event.actor_ids);
    if (Array.isArray(actorIds) && actorIds.length) return actorIds;
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
    if (options && options.topic) append(meta, 'span', 'topic-chip', options.topic);
    const knownBy = event.first_verified || timeline.first_verified || event.first_reported || timeline.first_reported;
    if (knownBy) append(meta, 'span', '', `Known by ${knownBy}`);
    if (options && options.detail) append(meta, 'span', '', item.event_id);
    append(card, 'h3', '', publicNarrative(timeline.summary || event.summary || event.target, item.event_id));
    const actors = eventActors(item);
    if (actors.length) {
      const actorRow = append(card, 'div', 'actor-row');
      actors.forEach(actor => actorRow.append(context.services.actorIdentity.create(context.documentObject, actor)));
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
    card.append(EvidenceDrawer.create(context, item));
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
      const mapRecords = context.route.dataKeys.flatMap(key => recordArray(modelData(context.model, key))).filter(item => item && (item.map_ref || item.map_refs || item.location || item.location_id || item.location_ids));
      frame.article.append(MapView.create(context, { records: mapRecords }));
    }
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function OverviewPage(context) {
    const frame = pageFrame(context, 'The conflict began with U.S. and Israeli strikes on Iran on February 28, 2026. Iran retaliated across the region, and the war developed into a sustained military, maritime, economic and diplomatic confrontation.');
    frame.article.classList.add('overview-page');
    const domains = recordArray(modelData(context.model, 'ledger.domain_assessments'));
    const force = domains.find(domain => domain.domain === 'Force preservation') || domains.find(domain => /Air \/ long-range strike/i.test(domain.domain || ''));
    const maritime = domains.find(domain => /Maritime control/i.test(domain.domain || ''));
    const firstWar = context.model.chronology.find(item => !String(item.event_id).startsWith('PRE-'));

    const whatHappened = addSection(frame.article, 'What happened?', 'content-section lead-story');
    append(whatHappened, 'p', 'lead-copy', publicNarrative(firstWar && firstWar.event && firstWar.event.observed_fact,
      'The United States and Israel opened strikes on Iran, and Iran retaliated against Israel and regional bases hosting U.S. forces.'));
    if (firstWar) whatHappened.append(EvidenceDrawer.create(context, firstWar));

    const now = addSection(frame.article, 'Where things stand now');
    const nowGrid = append(now, 'div', 'story-grid');
    addProvenanceCard(nowGrid, context, {
      kicker: 'Military result so far',
      title: 'U.S. strike capacity remained intact; Iran retained disruptive capability',
      text: publicNarrative(force && force.assessment, 'The reviewed record supports a U.S./coalition force-preservation advantage while Iran retains consequential strike and maritime capabilities.'),
      meta: force && `Confidence: ${displayTerm(force.confidence)}`,
      item: force || {},
      relatedRecords: force && force.supporting_evidence || []
    });
    addProvenanceCard(nowGrid, context, {
      kicker: 'Diplomatic result so far',
      title: 'The June MOU no longer controls either side',
      text: 'Washington called it over. Iran later called it suspended. Neither side agreed to extend it, and no final deal replaced it. Parts of it are still being used as a starting point in new talks.',
      item: modelData(context.model, 'analysis.endgame_public_view').mou_now,
      localSources: localSourceMap(modelData(context.model, 'analysis.endgame_public_view'))
    });
    addProvenanceCard(nowGrid, context, {
      kicker: 'Hormuz',
      title: 'Iran retains leverage, but not recognized exclusive control',
      text: 'Iran originally said it would control and manage the Strait. It is now negotiating a shared arrangement with Oman and other Gulf states. That is a step backward from its original claim. The final terms are still being negotiated.',
      meta: maritime && `Confidence: ${displayTerm(maritime.confidence)}`,
      item: maritime || {},
      relatedRecords: maritime && [...asArray(maritime.supporting_evidence), ...asArray(maritime.contrary_evidence)] || []
    });

    const record = addSection(frame.article, 'How to read the record');
    append(record, 'p', '', 'This edition assembles the accepted evidence once and presents the current result directly. Counts describe the evidence collection; they are not a score of who is winning.');
    const metrics = append(record, 'div', 'metric-grid');
    addMetric(metrics, formatNumber(context.model.counts.chronology_records), 'dated chronology records', 'From pre-war context through the current cutoff.');
    addMetric(metrics, formatNumber(context.model.counts.canonical_source_records), 'source records', 'Conflicting source versions are preserved separately.');
    addMetric(metrics, readableDate(firstWar && firstWar.timeline && firstWar.timeline.date), 'war began', 'The opening event remains linked to its source record.');
    addMetric(metrics, context.model.release.current_osint_cutoff_display, 'evidence reviewed through', 'Later information is not backdated into earlier knowledge states.');

    const developments = addSection(frame.article, 'Latest in the accepted record');
    append(developments, 'p', 'section-note', 'These are the latest dated developments, not a claim that every one changed the conflict by the same amount.');
    const developmentList = append(developments, 'div', 'record-list compact-record-list');
    context.model.chronology.slice(-3).reverse().forEach(item => renderEventCard(developmentList, item, context, { topic: eventTopic(item) }));

    const unresolved = addSection(frame.article, 'What remains unresolved');
    const unresolvedList = append(unresolved, 'div', 'question-list');
    recordArray(modelData(context.model, 'ledger.unresolved')).filter(item => item.priority === 'HIGH').slice(0, 4).forEach(item => {
      const card = append(unresolvedList, 'article', 'question-card');
      append(card, 'h3', '', publicNarrative(item.topic, 'Open question'));
      append(card, 'p', '', publicNarrative(item.question));
      if (item.why_it_matters) append(card, 'small', '', publicNarrative(item.why_it_matters));
    });

    const explore = addSection(frame.article, 'What should I look at next?');
    const links = append(explore, 'div', 'explore-grid');
    [
      ['timeline.war', 'Follow the conflict', 'A selective timeline of the developments that changed the military, maritime and diplomatic record.'],
      ['military.campaigns', 'See the military record', 'Strikes, facilities, weapons, casualties and damage imagery with action and effect kept separate.'],
      ['hormuz.overview', 'Understand Hormuz', 'Why the Strait matters, what changed in practice, and what is still being negotiated.'],
      ['talks.mou', 'Trace the June agreement', 'What each side received, what was implemented, and why the interim bargain stopped controlling events.'],
      ['objectives.positions', 'Compare words with outcomes', 'Earlier positions, intervening events and later positions, using approved findings only.'],
      ['evidence.claims', 'Check major claims', 'Claims, support, contrary evidence and unresolved questions in one place.']
    ].forEach(([key, title, text]) => {
      const link = append(links, 'a', 'pathway-card');
      append(link, 'strong', '', title);
      append(link, 'span', '', text);
      link.href = routeHref(key);
    });
    return frame.article;
  }

  function ActorsPage(context) {
    const frame = pageFrame(context, 'People are shown with their recorded role and affiliation. Flags follow the affiliated state or state institution; non-state groups do not inherit the flag of the country where they operate.');
    const referencedIds = new Set(context.model.chronology.flatMap(item => item.actor_ids || item.event && item.event.actor_ids || []));
    const modelDirectory = context.model.entities && Array.isArray(context.model.entities.actors)
      ? context.model.entities.actors.map(item => item.record || item).filter(actor => referencedIds.has(actor.actor_id))
      : [];
    const frequency = new Map();
    context.model.chronology.flatMap(item => item.actor_ids || item.event && item.event.actor_ids || []).forEach(id => frequency.set(id, (frequency.get(id) || 0) + 1));
    const pinned = new Set(['Iran', 'United States', 'Israel', 'IRGC', 'Iranian parliament', 'Mohammad Baqer Qalibaf', 'Hezbollah', 'Houthis / Ansar Allah', 'Oman', 'Qatar']);
    const directory = modelDirectory
      .slice()
      .sort((a, b) => Number(pinned.has(b.canonical_name)) - Number(pinned.has(a.canonical_name)) || (frequency.get(b.actor_id) || 0) - (frequency.get(a.actor_id) || 0) || String(a.canonical_name).localeCompare(String(b.canonical_name)))
      .slice(0, 32);
    const groups = [
      { title: 'States and state institutions', test: actor => ['state', 'state-institution'].includes(actor.affiliation_type) && actor.entity_type !== 'person' },
      { title: 'Named people', test: actor => actor.entity_type === 'person' },
      { title: 'Non-state armed groups', test: actor => actor.affiliation_type === 'non-state' },
      { title: 'International and other organizations', test: actor => !['state', 'state-institution', 'non-state'].includes(actor.affiliation_type) && actor.entity_type !== 'person' }
    ];
    groups.forEach(group => {
      const records = directory.filter(group.test);
      if (!records.length) return;
      const section = addSection(frame.article, group.title);
      const list = append(section, 'div', 'actor-directory');
      records.forEach(actor => {
        const card = append(list, 'article', 'actor-card');
        card.append(context.services.actorIdentity.create(context.documentObject, actor.actor_id, { subtitle: true }));
      });
    });
    const note = append(frame.article, 'aside', 'scope-note');
    append(note, 'strong', '', 'Identity boundary');
    append(note, 'p', '', 'A role describes a person; affiliation determines actor identity. If the accepted record does not establish an affiliation, the Atlas shows the recorded name without guessing.');
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function TimelinePage(context) {
    const frame = pageFrame(context, `A selective timeline of developments that changed the military, maritime, economic or diplomatic record. Detailed Chronology retains all ${formatNumber(context.model.counts.chronology_records)} records.`);
    const wartime = context.model.chronology.filter(item => !String(item.event_id).startsWith('PRE-'));
    const phases = [
      { title: 'Opening week', start: '2026-02-28', end: '2026-03-07', text: 'Opening strikes, Iranian retaliation and immediate regional effects.' },
      { title: 'Regional escalation', start: '2026-03-08', end: '2026-04-30', text: 'Sustained strikes, maritime disruption, early ceasefire efforts and the blockade.' },
      { title: 'Pressure and bargaining', start: '2026-05-01', end: '2026-06-16', text: 'Continued fighting alongside increasingly specific military, nuclear and Hormuz demands.' },
      { title: 'June interim agreement', start: '2026-06-17', end: '2026-07-06', text: 'The MOU began controlling the public bargain while implementation disputes accumulated.' },
      { title: 'Agreement breakdown', start: '2026-07-07', end: '2026-07-31', text: 'Renewed attacks, reversed relief and explicit statements that the interim bargain was no longer functioning.' },
      { title: 'Current negotiation cycle', start: '2026-08-01', end: '9999-12-31', text: 'New maritime proposals, regional mediation, economic pressure and unresolved final terms.' }
    ];
    const key = addSection(frame.article, 'How to use this timeline', 'content-section timeline-key');
    append(key, 'p', '', 'Each phase shows representative developments across distinct topics. Selection changes visual emphasis only; it does not remove records from the evidence base. Use Detailed Chronology for every event and filter.');
    phases.forEach(phase => {
      const items = wartime.filter(item => {
        const date = item.timeline && item.timeline.date || item.event && item.event.event_date || '';
        return date >= phase.start && date <= phase.end;
      });
      if (!items.length) return;
      const candidates = items.filter(item => /(MILITARY_OPERATION|AGREEMENT|MOU|CEASEFIRE|DIPLOMAC|NEGOTIAT|HORMUZ|SHIPPING|CASUAL|LOSS|DAMAGE|DESTROY|SANCTION|ECON|OIL|BLOCKADE)/.test(eventType(item)) || item.event && (item.event.later_outcome || item.event.current_status));
      const pool = candidates.length ? candidates : items;
      const chosen = [];
      const topics = new Set();
      pool.forEach(item => {
        const topic = eventTopic(item);
        if (chosen.length < 5 && !topics.has(topic)) {
          chosen.push(item);
          topics.add(topic);
        }
      });
      for (const item of pool.slice().reverse()) {
        if (chosen.length >= 5) break;
        if (!chosen.includes(item)) chosen.push(item);
      }
      chosen.sort((a, b) => String(a.timeline.date).localeCompare(String(b.timeline.date)));
      const section = addSection(frame.article, phase.title, 'timeline-month timeline-phase');
      append(section, 'p', 'phase-range', `${readableDate(phase.start)} – ${phase.end.startsWith('9999') ? context.model.release.current_osint_cutoff_display : readableDate(phase.end)}`);
      append(section, 'p', 'section-note', `${phase.text} ${items.length.toLocaleString()} chronology records fall within this period.`);
      const mapped = mappedChronology(items, context.services.locationResolver);
      if (mapped.length) section.append(MapView.create(context, {
        title: `${phase.title}: mapped records`,
        records: mapped,
        description: `${mapped.length.toLocaleString()} records in this phase include source-supported coordinates.`
      }));
      const list = append(section, 'div', 'record-list');
      chosen.forEach(item => renderEventCard(list, item, context, { topic: eventTopic(item) }));
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
      const option = append(actorSelect, 'option', '', context.services.actorIdentity.resolve(actor).label);
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
    let limit = context.route.params.event ? context.model.counts.chronology_records : 40;
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
    const frame = pageFrame(context, 'The military campaign unfolded across a wide regional theater. This page keeps what was attempted, what reached a target and what damage was actually established as separate questions.');
    const boundary = addSection(frame.article, 'From launch to verified effect');
    const boundaryGrid = append(boundary, 'div', 'definition-grid');
    [
      ['Launch', 'A weapon was fired or a sortie began. This does not prove it reached the target.'],
      ['Attempted strike', 'An attack was directed at a target. Interception, malfunction or miss may still prevent an impact.'],
      ['Confirmed hit', 'Evidence supports an impact at the target or facility. A hit does not by itself prove destruction.'],
      ['Assessed damage', 'Reporting or imagery supports a physical or functional effect, with its confidence and limits retained.'],
      ['Destruction or loss', 'The reviewed record supports that the asset was destroyed, sunk or otherwise lost—not merely targeted.']
    ].forEach(([title, text]) => addProvenanceCard(boundaryGrid, context, { title, text }));

    const chronology = context.model.chronology.filter(item => /(STRIKE|ATTACK|MISSILE|DRONE|INTERCEPT|MILITARY_OPERATION|NAVAL)/.test(eventType(item)));
    const tempo = addSection(frame.article, 'Recorded campaign tempo');
    const months = new Map();
    chronology.forEach(item => {
      const month = String(item.timeline && item.timeline.date || '').slice(0, 7);
      if (month) months.set(month, (months.get(month) || 0) + 1);
    });
    addBarChart(tempo, Array.from(months, ([label, value]) => ({ label, value })), {
      label: 'Monthly count of military-event records in the accepted chronology',
      note: 'Record counts show documented event tempo, not weapon totals. One record can describe a wave, and quiet dates may reflect collection depth.',
      key: 'campaign-tempo',
      valuesLabel: 'Numeric values for recorded event tempo',
      tableCaption: 'Recorded military-event / strike-record tempo',
      categoryLabel: 'Period',
      valueLabel: 'Recorded events',
      numericNote: 'These are recorded military-event / strike-record counts. They are not total weapons, successful hits, destruction, or exhaustive operational tempo.'
    });

    const strikes = recordArray(modelData(context.model, 'reconciliation.strikes'));
    frame.article.append(MapView.create(context, {
      title: 'Reconciled strike geography',
      records: strikes,
      description: `${strikes.length.toLocaleString()} reconciled strike locations are plotted from the accepted record. Coordinates retain their stated precision.`
    }));

    const examples = addSection(frame.article, 'Representative campaign developments');
    const eventList = append(examples, 'div', 'record-list');
    chronology.slice(-8).reverse().forEach(item => renderEventCard(eventList, item, context, { topic: eventTopic(item), detail: true }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function FacilitiesPage(context) {
    const frame = pageFrame(context, 'Facilities are presented as places with dated damage, continuing-operation and reconstitution evidence—not as isolated strike claims.');
    const facilities = recordArray(modelData(context.model, 'ledger.facilities'));
    const claimAudits = recordArray(modelData(context.model, 'forensic.facility_claim_audits'));
    frame.article.append(MapView.create(context, {
      title: 'Facilities in the current record',
      records: facilities,
      description: `${facilities.length.toLocaleString()} current facility records include source-supported geographic context. Preserved reference points identify the facility—not a precise damage location.`
    }));
    const section = addSection(frame.article, 'Facility assessments');
    const list = append(section, 'div', 'record-list');
    facilities.forEach(facility => {
      const status = plainLabel(firstText(facility.current_status, facility.operational_effect_status, facility.damage_evidence_status), 'Current status unresolved');
      const facilityAudits = claimAudits.filter(audit => audit.facility_id === facility.facility_id);
      const sourceContext = facilitySourceContext(facility);
      const card = addProvenanceCard(list, context, {
        kicker: [facility.country || facility.host, status].filter(Boolean).join(' · '),
        title: publicNarrative(facility.name, facility.facility_id),
        text: publicNarrative(facility.assessment || facility.note, 'The facility remains in the accepted record; no broader functional conclusion is added here.'),
        item: { source_ids: sourceContext.sourceIds },
        localSources: sourceContext.localSources
      });
      card.dataset.facilityId = facility.facility_id;
      const facts = append(card, 'dl', 'fact-list');
      const addFact = (term, values) => {
        const readable = (Array.isArray(values) ? values : [values]).filter(Boolean).map(value => typeof value === 'string' ? publicNarrative(value, '') : publicNarrative(value && (value.detail || value.assessment || value.note), '')).filter(Boolean);
        if (!readable.length) return;
        append(facts, 'dt', '', term);
        append(facts, 'dd', '', readable.slice(0, 2).join(' '));
      };
      addFact('Physical damage', asArray(facility.verified_physical_damage).length ? facility.verified_physical_damage : [...asArray(facility.critical_assets_reported), ...asArray(facility.noncritical_or_soft_assets_reported)]);
      addFact('Functional effect', asArray(facility.verified_functional_effect).length ? facility.verified_functional_effect : facility.effect);
      addFact('Continued operation', asArray(facility.continued_operation_evidence).length ? facility.continued_operation_evidence : firstText(facility.continuity, facility.current_presence_status));
      facilityAudits.forEach(audit => appendFacilityAudit(card, context, audit));
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function WeaponsPage(context) {
    const frame = pageFrame(context, 'Aircraft, missiles, drones and defenses are shown through the propositions the sources actually support. A launch is expenditure; it is not automatically a hit or a measure of effectiveness.');
    const expenditure = recordArray(modelData(context.model, 'ledger.munitions_expenditure'));
    const rule = addSection(frame.article, 'What the counts mean');
    append(rule, 'p', 'lead-copy', publicNarrative(modelData(context.model, 'ledger.munitions_expenditure').rule));
    const sides = addSection(frame.article, 'Reported expenditure');
    const columns = append(sides, 'div', 'comparison-grid');
    ['U.S./COALITION', 'IRAN/ALIGNED'].forEach(side => {
      const column = append(columns, 'section', 'comparison-column');
      append(column, 'h3', '', side === 'U.S./COALITION' ? 'United States / coalition' : 'Iran / aligned');
      expenditure.filter(record => record.side === side).forEach(record => {
        addProvenanceCard(column, context, {
          kicker: `${readableDate(record.period_end || record.event_date)} · ${plainLabel(record.evidence_type)}`,
          title: `${record.quantity_qualifier === '>' ? 'More than ' : ''}${formatNumber(record.quantity)} ${publicNarrative(record.munition)}`,
          text: publicNarrative(record.note),
          meta: record.cost_low ? `Recorded cost basis: $${(Number(record.cost_low) / 1e9).toFixed(2)} billion` : plainLabel(record.cost_status, 'No compatible price basis recorded'),
          item: record
        });
      });
    });
    const gaps = addSection(frame.article, 'Limits of the series');
    const gapList = append(gaps, 'ul', 'method-list');
    asArray(modelData(context.model, 'ledger.attrition_series').gaps).forEach(gap => append(gapList, 'li', '', publicNarrative(gap)));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function LossesPage(context) {
    const frame = pageFrame(context, 'Personnel, material loss, munitions and cost records remain separate. Unknown does not mean zero, and overlapping reported statuses are not added into a unique-person total.');
    const corrections = modelData(context.model, 'analysis.casualty_corrections');
    const personnel = addSection(frame.article, 'Current personnel display');
    const personnelGrid = append(personnel, 'div', 'casualty-columns');
    const us = append(personnelGrid, 'section', 'casualty-column');
    append(us, 'h3', '', 'United States');
    const usMetrics = append(us, 'div', 'metric-grid compact-metrics');
    addMetric(usMetrics, formatNumber(corrections.united_states.current_display.total_military_dead), 'Total military dead', 'Combined reported military deaths; not labeled entirely KIA.');
    addMetric(usMetrics, formatNumber(corrections.united_states.current_display.wounded), 'WIA', 'Current cumulative wounded-in-action display.');
    addMetric(usMetrics, formatNumber(corrections.united_states.current_display.missing), 'MIA', 'Retained until a source explicitly resolves formal status.');
    us.append(EvidenceDrawer.create(context, { sources: corrections.united_states.sources.map((_, index) => `US-CAS-${index}`) }, {
      localSources: Object.fromEntries(corrections.united_states.sources.map((source, index) => [`US-CAS-${index}`, source]))
    }));
    const iran = append(personnelGrid, 'section', 'casualty-column');
    append(iran, 'h3', '', 'Iran');
    const iranMetrics = append(iran, 'div', 'metric-grid compact-metrics');
    addMetric(iranMetrics, formatNumber(corrections.iran.official_snapshot.military_dead), 'military-death subtotal', `${readableDate(corrections.iran.official_snapshot.date)} official snapshot; not an August military-only cumulative total.`);
    addMetric(iranMetrics, formatNumber(corrections.iran.official_snapshot.civilian_dead), 'civilian dead', 'Same dated official snapshot.');
    addMetric(iranMetrics, 'Unresolved', 'current military WIA / MIA', 'No supported current national military-only totals are integrated.');
    iran.append(EvidenceDrawer.create(context, { sources: corrections.iran.sources.map((_, index) => `IR-CAS-${index}`) }, {
      localSources: Object.fromEntries(corrections.iran.sources.map((source, index) => [`IR-CAS-${index}`, source]))
    }));
    const warning = append(frame.article, 'aside', 'scope-note');
    append(warning, 'strong', '', 'Do not add the headline categories');
    append(warning, 'p', '', 'The missing service member may also be represented in a later death aggregate. The Atlas therefore does not calculate “total casualties = dead + wounded + missing” without item-level deconfliction.');

    const losses = recordArray(modelData(context.model, 'current.material_losses'));
    const material = addSection(frame.article, 'Material losses and damage');
    append(material, 'p', '', `${losses.length.toLocaleString()} material-loss entities are tracked. That does not mean ${losses.length.toLocaleString()} confirmed destroyed assets: the records preserve destroyed, damaged, claimed, targeted and unresolved states separately.`);
    const statusCounts = new Map();
    losses.forEach(record => statusCounts.set(plainLabel(record.status, 'Status unresolved'), (statusCounts.get(plainLabel(record.status, 'Status unresolved')) || 0) + 1));
    addBarChart(material, Array.from(statusCounts, ([label, value]) => ({ label, value })), {
      label: 'Material-loss entities grouped by recorded status',
      note: 'Counts are record entities by status, not a replacement-cost total and not proof that every item was destroyed.'
    });
    const list = append(material, 'div', 'record-list two-column-list');
    losses.slice(0, 12).forEach(record => addProvenanceCard(list, context, {
      kicker: `${record.side || 'Side unresolved'} · ${plainLabel(record.status)}`,
      title: `${record.quantity_qualifier === '>' ? 'More than ' : ''}${formatNumber(record.quantity)} ${publicNarrative(record.item, 'material item')}`,
      text: publicNarrative(record.note),
      meta: plainLabel(record.accounting_category, 'Accounting category recorded'),
      item: record
    }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function ImageryPage(context) {
    const frame = pageFrame(context, 'Damage imagery is supporting evidence, not a self-authenticating verdict. Every entry keeps its facility, source context, geographic precision and stated limitation.');
    const overlays = recordArray(modelData(context.model, 'ledger.bda_overlays'));
    const facilities = recordArray(modelData(context.model, 'ledger.facilities'));
    const damageObservations = recordArray(modelData(context.model, 'forensic.damage_observations'));
    const facilityClaimAudits = recordArray(modelData(context.model, 'forensic.facility_claim_audits'));
    const currentImagery = context.model.chronology.filter(record => imageryPayloads(record).length);
    const imageryRecords = [...overlays, ...damageObservations, ...currentImagery];
    frame.article.append(MapView.create(context, {
      title: 'Locations with imagery or damage-review records',
      records: imageryRecords,
      relatedRecords: facilities,
      description: 'Imagery is overlaid only when the current evidence record supplies reliable geolocation. Otherwise it remains a footprint, location-linked card or evidence-only record.'
    }));
    const section = addSection(frame.article, 'Imagery review');
    append(section, 'p', 'section-note', 'A strike or attack record establishes an event. A physical damage observation records what imagery or reporting shows. An operational-effect assessment requires separate evidence and is not inferred from visible damage alone.');
    const list = append(section, 'div', 'record-list two-column-list');
    imageryRecords.flatMap(record => imageryPayloads(record)).map(payload => imageryDescriptor(payload, context.services.locationResolver, facilities)).forEach(item => {
      const tierText = {
        A: 'Reliable image bounds support a geographic overlay.',
        B: 'A reliable footprint is shown; the image is not stretched into a false rectangle.',
        C: 'The target area is supported, but a precise image footprint is unavailable.',
        D: 'Reliable geolocation is unavailable; this item remains an evidence card only.'
      }[item.tier];
      const observation = Boolean(item.evidenceRecord.observation_id);
      const card = addProvenanceCard(list, context, {
        kicker: observation
          ? `Physical damage observation · ${plainLabel(item.evidenceRecord.damage_confidence, 'Evidence status recorded')}`
          : publicNarrative(item.record.imagery_type, plainLabel(item.record.candidate_confidence || item.record.evidence_status, 'Imagery evidence')),
        title: mapTitle(item.evidenceRecord, item.point && item.point.label),
        text: publicNarrative(item.evidenceRecord.observation || item.record.limitations || item.evidenceRecord.event && item.evidenceRecord.event.summary, tierText),
        meta: observation
          ? `${tierText} Location confidence: ${plainLabel(item.evidenceRecord.location_confidence, 'Unresolved')}. This observation does not by itself establish operational effect.`
          : tierText,
        item: evidenceEnvelope(item.evidenceRecord)
      });
      if (observation) card.dataset.damageObservationId = item.evidenceRecord.observation_id;
    });

    const audits = addSection(frame.article, 'Facility claim audits');
    append(audits, 'p', 'section-note', 'These records test specific facility claims against the available observations. Each proposition keeps its own disposition; confirmation of damage does not automatically confirm a claimed mission kill, destroyed platform or whole-site shutdown.');
    const auditList = append(audits, 'div', 'record-list two-column-list');
    facilityClaimAudits.forEach(audit => {
      const facility = facilities.find(record => record.facility_id === audit.facility_id);
      const card = addProvenanceCard(auditList, context, {
        kicker: 'Claim review linked to a facility record',
        title: publicNarrative(audit.facility_name, audit.facility_id),
        text: facility
          ? `Related current facility: ${publicNarrative(facility.name, facility.facility_id)}. Open the proposition audit to see what is confirmed, misleading, unsubstantiated or unresolved.`
          : 'The related facility identity is unresolved in the current public model.'
      });
      card.dataset.facilityAuditId = audit.facility_audit_id;
      card.dataset.facilityId = audit.facility_id;
      appendFacilityAudit(card, context, audit);
      const facilityLink = append(card, 'a', 'inline-route-link', 'Open related facility record');
      facilityLink.href = routeHref('military.facilities', { facility: audit.facility_id });
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function HormuzOverviewPage(context) {
    const frame = pageFrame(context, 'Hormuz matters because a large share of traded oil and gas normally passes through a narrow waterway. The war showed that physical passage, commercial willingness, insurance and legal control are different questions.');
    const hormuz = modelData(context.model, 'analysis.hormuz');
    const reality = hormuz.hormuz_reality_check;
    const why = addSection(frame.article, 'Why the Strait matters', 'content-section lead-story');
    append(why, 'p', 'lead-copy', publicNarrative(reality.bottom_line));
    const metrics = append(why, 'div', 'metric-grid');
    asArray(reality.metrics).forEach(metric => addMetric(metrics, metric.value, publicNarrative(metric.label), publicNarrative(metric.note)));

    const sequence = addSection(frame.article, 'From wartime claim to current talks');
    const controlTrack = asArray(hormuz.mou_position_tracks).find(track => /legal sovereignty/i.test(track.topic || ''));
    const shipping = recordArray(modelData(context.model, 'ledger.shipping'));
    const latestShipping = shipping.filter(item => item.date).slice(-2);
    addSequence(sequence, context, [
      { title: 'Iran claimed a controlling role', text: publicNarrative(controlTrack && controlTrack.iran_max, 'Iran publicly sought control or dominant management of the Strait.'), item: controlTrack || {}, localSources: localSourceMap(hormuz) },
      { title: 'The Strait became commercially disrupted', text: 'Some physical transit continued, but tracked commercial traffic, insurance and operator willingness fell far below normal. “Open” and “closed” did not describe the same thing.', item: latestShipping[0] || {} },
      { title: 'Iran retained practical gatekeeping leverage', text: 'Iran could still threaten, delay and selectively permit traffic. That coercive fact did not create internationally recognized sovereignty or a permanent toll right.', item: controlTrack || {}, localSources: localSourceMap(hormuz) },
      { title: 'The negotiating lane became shared', text: 'Iran originally said it would control and manage the Strait. It is now negotiating a shared arrangement with Oman and other Gulf states. That is a step backward from its original claim. The final terms are still being negotiated.', item: controlTrack || {}, localSources: localSourceMap(hormuz) },
      { title: 'The end state remains unresolved', text: 'Final authority, revenue, mine-clearing, inspection and permanent passage rules have not been settled. The Atlas therefore records a walk-back and concession, not total Iranian capitulation.', item: latestShipping[1] || {} }
    ]);

    frame.article.append(MapView.create(context, {
      title: 'Hormuz and connected conflict locations',
      records: asArray(hormuz.current_board_delta),
      description: 'Mapped records show verified or qualified conflict developments around the Strait. They are not live ship tracks.'
    }));
    const adaptation = addSection(frame.article, 'What prolonged disruption changed');
    const cards = append(adaptation, 'div', 'record-list two-column-list');
    asArray(reality.erosion_mechanisms).forEach(mechanism => addProvenanceCard(cards, context, {
      title: publicNarrative(mechanism.mechanism),
      text: publicNarrative(mechanism.effect),
      item: mechanism,
      localSources: localSourceMap(hormuz)
    }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function ShippingPage(context) {
    const frame = pageFrame(context, 'Commercial traffic never fit a simple open-or-closed label. This record separates observed vessel counts, physical passage, permission, insurance and normal commercial traffic.');
    const shipping = recordArray(modelData(context.model, 'ledger.shipping'));
    const hormuz = modelData(context.model, 'analysis.hormuz');
    const routeRecords = asArray(modelData(context.model, 'analysis.oil_routes').routes);
    frame.article.append(MapView.create(context, {
      title: 'Maritime incident and pressure geography',
      records: asArray(hormuz.current_board_delta),
      routes: routeRecords.filter(route => String(route.mode).toLowerCase() === 'maritime'),
      description: 'Locations come from the accepted Hormuz record. Stored maritime reference geometry is schematic and does not reproduce live AIS tracks.'
    }));
    const reading = addSection(frame.article, 'How to read the traffic observations');
    append(reading, 'p', 'lead-copy', 'AIS-visible counts are useful observations, not a complete census. Vessels can sail with transponders off, different providers count different categories, and a single successful transit does not establish commercial normalization.');
    const observations = addSection(frame.article, 'Observed shipping record');
    const list = append(observations, 'div', 'record-list');
    shipping.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach(record => addProvenanceCard(list, context, {
      kicker: readableDate(record.date),
      title: `${publicNarrative(record.metric)}: ${String(record.value)}`,
      text: publicNarrative(record.notes),
      meta: record.baseline ? `Comparison basis: ${publicNarrative(record.baseline)}` : '',
      item: record
    }));
    const routes = addSection(frame.article, 'Alternative routes and trade adaptation');
    append(routes, 'p', '', publicNarrative(modelData(context.model, 'analysis.oil_routes').geometry_policy, 'Route geometry is schematic and describes transport corridors, not live vessel tracks.'));
    const routeList = append(routes, 'div', 'record-list two-column-list');
    routeRecords.forEach(route => addProvenanceCard(routeList, context, {
      kicker: `${plainLabel(route.mode, 'Transport mode')} · ${routeAuthority(route) === 'SCHEMATIC_REFERENCE_ROUTE' ? 'Schematic reference route' : plainLabel(routeAuthority(route), 'Documented route')}`,
      title: publicNarrative(route.name),
      text: publicNarrative(route.note),
      item: route
    }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function EconomyPage(context) {
    const frame = pageFrame(context, 'Economic effects extend beyond military spending. Oil flows, sanctions, insurance, infrastructure damage and growth forecasts are kept in their own accounting domains.');
    const economics = modelData(context.model, 'ledger.economics');
    const china = modelData(context.model, 'analysis.china_oil_shift');
    const forecast = addSection(frame.article, 'Forecast change across the region');
    addBarChart(forecast, asArray(economics.forecast_context.rows).map(row => ({
      label: row.country,
      value: row.delta,
      display: `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)} points`
    })), {
      label: 'Change in 2026 real GDP growth forecasts, percentage points',
      note: publicNarrative(economics.forecast_context.note)
    });
    const current = addSection(frame.article, 'Recorded economic effects');
    const list = append(current, 'div', 'record-list two-column-list');
    recordArray(economics).slice().reverse().forEach(record => addProvenanceCard(list, context, {
      kicker: readableDate(record.date),
      title: publicNarrative(record.topic),
      text: publicNarrative(record.finding),
      meta: publicNarrative(record.causation_note),
      item: record
    }));
    const trade = addSection(frame.article, 'China and trade adaptation');
    append(trade, 'p', 'lead-copy', publicNarrative(china.assessment));
    const tradeRoutes = append(trade, 'div', 'record-list');
    asArray(china.routes).forEach(route => addProvenanceCard(tradeRoutes, context, {
      kicker: `${plainLabel(route.status)} · ${plainLabel(route.line_class)}`,
      title: publicNarrative(route.name),
      text: publicNarrative(route.flow_evidence),
      meta: publicNarrative(route.note),
      item: route
    }));
    const note = append(frame.article, 'aside', 'scope-note');
    append(note, 'strong', '', 'Accounting boundary');
    append(note, 'p', '', publicNarrative(economics.separation_rule));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function HormuzNegotiationsPage(context) {
    const frame = pageFrame(context, 'The current talks concern passage, mine-clearing, inspections, fees and future administration. A shared negotiating process is not the same as a final agreement.');
    const hormuz = modelData(context.model, 'analysis.hormuz');
    const tracks = asArray(hormuz.mou_position_tracks).filter(track => /Hormuz/i.test(track.topic || ''));
    const statement = addSection(frame.article, 'Current negotiating position', 'content-section lead-story');
    append(statement, 'p', 'lead-copy', 'Iran originally said it would control and manage the Strait. It is now negotiating a shared arrangement with Oman and other Gulf states. That is a step backward from its original claim. The final terms are still being negotiated.');
    const issues = addSection(frame.article, 'Issue by issue');
    const list = append(issues, 'div', 'record-list');
    tracks.forEach(track => addProvenanceCard(list, context, {
      kicker: plainLabel(track.current_status),
      title: publicNarrative(track.topic),
      text: publicNarrative(track.analysis),
      meta: `Confidence: ${plainLabel(track.confidence)}`,
      item: track,
      localSources: localSourceMap(hormuz)
    }));
    const currentEvents = context.model.chronology.filter(item => /(HORMUZ|QATAR_TEHRAN_MEDIATION|MARITIME|MINE_CLEAR)/.test(eventType(item))).slice(-8).reverse();
    const updates = addSection(frame.article, 'Latest negotiation and implementation record');
    const eventList = append(updates, 'div', 'record-list');
    currentEvents.forEach(item => renderEventCard(eventList, item, context, { detail: true, topic: eventTopic(item) }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function DiplomacyPage(context) {
    const frame = pageFrame(context, 'The diplomatic record moves from proposal to ceasefire, interim agreement, implementation, breakdown and renewed mediation. Those states are not interchangeable.');
    const diplomacy = modelData(context.model, 'ledger.diplomacy');
    const sequence = addSection(frame.article, 'Negotiation sequence');
    append(sequence, 'p', 'section-note', publicNarrative(diplomacy.rule));
    addSequence(sequence, context, recordArray(diplomacy).map(record => ({
      date: record.date,
      title: publicNarrative(record.position_change, 'Diplomatic development'),
      text: asArray(record.actors).map(actor => context.services.actorIdentity.resolve(actor).label).join(' · '),
      item: record,
      relatedRecords: record.event_refs
    })));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function MouPage(context) {
    const frame = pageFrame(context, 'The June MOU was an interim bargain, not a final peace settlement. This page follows what each side sought, what the text exchanged, what happened in practice and why the old instrument no longer controls events.');
    const publicView = modelData(context.model, 'analysis.endgame_public_view');
    const hormuz = modelData(context.model, 'analysis.hormuz');
    const localSources = localSourceMap(publicView);

    const before = addSection(frame.article, '1. What each side wanted before the MOU');
    const wants = append(before, 'div', 'comparison-grid');
    ['Iran', 'United States / coalition'].forEach(side => {
      const column = append(wants, 'section', 'comparison-column');
      append(column, 'h3', '', side);
      const values = side === 'Iran' ? hormuz.non_mou_demands.iran : hormuz.non_mou_demands.us;
      asArray(values).slice(0, 5).forEach(value => {
        const title = itemTitle(value, 'Recorded negotiating demand');
        const text = itemSummary(value);
        addProvenanceCard(column, context, { title, text, item: value, localSources: localSourceMap(hormuz) });
      });
    });

    const exchange = addSection(frame.article, '2. What the interim MOU gave each side');
    const exchangeGrid = append(exchange, 'div', 'comparison-grid');
    Object.entries(publicView.who_got).forEach(([side, gains]) => {
      const column = append(exchangeGrid, 'section', 'comparison-column');
      append(column, 'h3', '', side);
      const list = append(column, 'ul', 'method-list');
      asArray(gains).forEach(gain => append(list, 'li', '', publicNarrative(gain)));
    });

    const obligations = addSection(frame.article, '3–5. Immediate obligations, deferred issues and implementation');
    append(obligations, 'p', '', 'The interim text combined immediate ceasefire, passage and restraint obligations with final-deal issues that still required negotiation, monitoring and continued performance.');
    const obligationGrid = append(obligations, 'div', 'comparison-grid');
    const immediate = append(obligationGrid, 'section', 'comparison-column');
    append(immediate, 'h3', '', 'Immediate or interim obligations');
    [1, 4, 5, 9, 10].map(number => publicView.clauses.find(clause => clause.paragraph === String(number))).filter(Boolean).forEach(clause => addProvenanceCard(immediate, context, { kicker: `Paragraph ${clause.paragraph}`, title: clause.title, text: clause.summary }));
    const deferred = append(obligationGrid, 'section', 'comparison-column');
    append(deferred, 'h3', '', 'Deferred or final-deal work');
    [3, 6, 7, 8, 11, 12, 13, 14].map(number => publicView.clauses.find(clause => clause.paragraph === String(number))).filter(Boolean).forEach(clause => addProvenanceCard(deferred, context, { kicker: `Paragraph ${clause.paragraph}`, title: clause.title, text: clause.summary }));

    const implementation = addSection(frame.article, '6–9. What was implemented, reversed and broken');
    addSequence(implementation, context, asArray(publicView.mou_death).map(step => ({
      kicker: step.date,
      title: publicNarrative(step.title),
      text: publicNarrative(step.detail),
      item: step,
      localSources
    })));
    const reversed = append(implementation, 'div', 'scope-note');
    append(reversed, 'strong', '', 'Gains reversed or never realized');
    const reversedList = append(reversed, 'ul', 'method-list');
    asArray(hormuz.agreement_balance.iran_lost_after_collapse).forEach(value => append(reversedList, 'li', '', publicNarrative(value)));

    const status = addSection(frame.article, '10. Status now', 'content-section lead-story');
    append(status, 'p', 'lead-copy', 'The June MOU no longer controls what either side has to do. Washington called it over. Iran later called it suspended. Neither side agreed to extend it, and no final deal replaced it. Parts of it are still being used as a starting point in new talks.');
    append(status, 'p', 'section-note', publicNarrative(publicView.mou_status.afterlife));

    const influence = addSection(frame.article, '11. How it still shapes current talks');
    append(influence, 'p', '', publicNarrative(publicView.mou_now.text));
    influence.append(EvidenceDrawer.create(context, sourceEnvelope(publicView.mou_now), { localSources }));

    const explorer = addSection(frame.article, '12. Clause explorer');
    append(explorer, 'p', 'section-note', 'Clause summaries preserve the approved analytical text. Open the linked evidence for the document-level source context.');
    const clauseGrid = append(explorer, 'div', 'clause-grid');
    asArray(publicView.clauses).forEach(clause => addProvenanceCard(clauseGrid, context, {
      kicker: `Paragraph ${clause.paragraph}`,
      title: publicNarrative(clause.title),
      text: publicNarrative(clause.summary),
      item: { source_ids: publicView.mou_now.source_ids },
      localSources
    }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function NuclearPage(context) {
    const frame = pageFrame(context, 'Iran described its nuclear position as sovereign and non-negotiable, then accepted that enrichment, inspections and stockpile terms could be negotiated. That is movement from the earlier position, not wholesale nuclear capitulation.');
    const messaging = modelData(context.model, 'analysis.iran_messaging');
    const series = asArray(messaging.series).find(item => /Nuclear/i.test(item.issue || ''));
    const publicView = modelData(context.model, 'analysis.endgame_public_view');
    const clause = asArray(publicView.clauses).find(item => /Nuclear weapon/i.test(item.title || ''));
    const sequence = addSection(frame.article, 'Position and negotiating sequence');
    addSequence(sequence, context, [
      { date: series.said.date, title: 'Earlier public position', text: publicNarrative(series.said.text), item: series.said, localSources: localSourceMap(messaging) },
      { date: '2026-06-17', title: 'What the interim MOU did', text: publicNarrative(clause.summary), item: { source_ids: ['R_MOU_JUN17'] }, localSources: localSourceMap(messaging) },
      { date: series.shifted_to.date, title: 'Later position', text: publicNarrative(series.shifted_to.text), item: series.shifted_to, localSources: localSourceMap(messaging) },
      { kicker: 'Supported conclusion', title: 'Movement, with final terms unresolved', text: publicNarrative(series.occurred.text), item: series.assessment }
    ]);
    const boundary = append(frame.article, 'aside', 'scope-note');
    append(boundary, 'strong', '', 'What this does not establish');
    append(boundary, 'p', '', 'There is no controlling final nuclear settlement. The record supports movement toward negotiating practical terms while Iran continues to harden some inspection positions; it does not support describing the entire nuclear issue as settled or surrendered.');
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function RegionalDiplomacyPage(context) {
    const frame = pageFrame(context, 'Regional states added mediation and security arrangements during the conflict. Each arrangement is shown with its parties, pre-war context and relationship to existing security structures; timing alone does not prove causation.');
    const agreements = recordArray(modelData(context.model, 'ledger.agreements'));
    const section = addSection(frame.article, 'Regional agreements and arrangements');
    const list = append(section, 'div', 'record-list');
    agreements.forEach(agreement => addProvenanceCard(list, context, {
      kicker: `${readableDate(agreement.signed_or_formalized_date || agreement.origin_date)} · ${plainLabel(agreement.status)}`,
      title: publicNarrative(agreement.name),
      text: publicNarrative(agreement.what_it_proves || agreement.current_assessment),
      meta: publicNarrative(agreement.what_it_does_not_prove),
      item: agreement,
      relatedRecords: agreement.relevant_drawdown_or_event_refs
    }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function ObjectivesPage(context) {
    const frame = pageFrame(context, 'Objectives are compared issue by issue. A side can achieve one aim, partly achieve another, abandon a demand and absorb costs elsewhere; the Atlas does not calculate a single winner score.');
    const objectives = modelData(context.model, 'analysis.endgame_us_objectives');
    const corrections = modelData(context.model, 'analysis.endgame_objective_corrections');
    const objectiveSources = localSourceMap(objectives);
    const applyOverrides = (records, overrides) => records.map(record => {
      const correction = asArray(overrides).find(item => String(record.objective || '').toLowerCase().includes(String(item.match || '').toLowerCase()));
      return correction ? { ...record, ...correction, objective: record.objective } : record;
    });
    const usObjectives = applyOverrides(asArray(objectives.us_objectives), corrections.us_overrides);
    const iranObjectives = applyOverrides(asArray(objectives.iran_objectives), corrections.iran_overrides);

    const original = addSection(frame.article, 'Original and wartime objectives');
    append(original, 'p', 'section-note', 'These are documented objectives and public benchmarks. Outcome labels come from the approved assessment; official claims do not certify their own success.');
    const columns = append(original, 'div', 'comparison-grid');
    [['United States / coalition', usObjectives], ['Iran', iranObjectives]].forEach(([side, rows]) => {
      const column = append(columns, 'section', 'comparison-column');
      append(column, 'h3', '', side);
      rows.forEach(record => addProvenanceCard(column, context, {
        kicker: record.origin ? publicNarrative(record.origin) : 'Documented objective',
        title: publicNarrative(record.objective),
        text: publicNarrative(record.assessment),
        meta: plainLabel(record.status),
        item: record,
        localSources: objectiveSources
      }));
    });

    const demands = addSection(frame.article, 'Negotiating demands and later changes');
    addSequence(demands, context, asArray(objectives.iran_walkbacks).map(change => ({
      date: change.date,
      title: plainLabel(change.type),
      text: `${publicNarrative(change.from)} → ${publicNarrative(change.to)}`,
      item: change,
      localSources: objectiveSources
    })));

    const outcomes = modelData(context.model, 'analysis.iran_outcomes');
    const issues = addSection(frame.article, 'Outcomes by level');
    const list = append(issues, 'div', 'record-list');
    asArray(outcomes.outcomes).forEach(outcome => {
      const card = addProvenanceCard(list, context, {
        kicker: `${publicNarrative(outcome.level)} · ${plainLabel(outcome.trend)}`,
        title: publicNarrative(outcome.headline || outcome.label),
        text: publicNarrative(outcome.strongest_supported_conclusion),
        meta: `Confidence: ${plainLabel(outcome.confidence)}`,
        item: outcome,
        relatedRecords: [...asArray(outcome.supporting_record_refs), ...asArray(outcome.contrary_or_limiting_refs)]
      });
      const balance = append(card, 'div', 'outcome-balance');
      append(balance, 'p', '', `Retained: ${publicNarrative(outcome.what_iran_retained, 'Not separately stated.')}`);
      append(balance, 'p', '', `Lost or constrained: ${publicNarrative(outcome.what_iran_lost, 'Not separately stated.')}`);
      if (outcome.what_this_does_not_prove) append(balance, 'p', '', `Does not prove: ${publicNarrative(outcome.what_this_does_not_prove)}`);
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function PositionChangesPage(context) {
    const frame = pageFrame(context, 'Position changes are shown as a sequence: earlier position, intervening events, later position and the approved conclusion. The frontend does not infer a concession or walk-back on its own.');
    const objectives = modelData(context.model, 'analysis.endgame_us_objectives');
    const messaging = modelData(context.model, 'analysis.iran_messaging');
    const changes = addSection(frame.article, 'Recorded changes');
    asArray(objectives.iran_walkbacks).forEach(change => {
      const group = append(changes, 'article', 'position-sequence');
      append(group, 'p', 'card-kicker', readableDate(change.date));
      append(group, 'h3', '', plainLabel(change.type));
      const grid = append(group, 'div', 'position-grid');
      addProvenanceCard(grid, context, { kicker: 'Earlier position', title: 'What Iran said it required', text: publicNarrative(change.from) });
      addProvenanceCard(grid, context, { kicker: 'Later position or behavior', title: 'What changed', text: publicNarrative(change.to) });
      if (change.assessment) append(group, 'p', 'supported-conclusion', publicNarrative(change.assessment));
      group.append(EvidenceDrawer.create(context, sourceEnvelope(change), { localSources: localSourceMap(objectives) }));
    });
    const explanation = addSection(frame.article, 'Issue-specific conclusions');
    const list = append(explanation, 'div', 'record-list');
    asArray(messaging.series).forEach(series => addProvenanceCard(list, context, {
      kicker: plainLabel(series.status),
      title: publicNarrative(series.issue),
      text: publicNarrative(series.assessment && series.assessment.text),
      meta: series.assessment && `Confidence: ${plainLabel(series.assessment.confidence)}`,
      item: { source_ids: [...sourceIdsFrom(series.said), ...sourceIdsFrom(series.shifted_to)] },
      localSources: localSourceMap(messaging)
    }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function IranMessagingPage(context) {
    const frame = pageFrame(context, "Iran's recorded shifts are presented in plain sequence. Observable movement is stated directly; competing explanations for motive remain alternatives unless the approved analysis resolves them.");
    const messaging = modelData(context.model, 'analysis.iran_messaging');
    asArray(messaging.series).forEach(series => {
      const section = addSection(frame.article, publicNarrative(series.issue), 'content-section messaging-series');
      append(section, 'p', 'status-banner', plainLabel(series.status));
      addSequence(section, context, [
        { date: series.said.date, title: 'What Iran said', text: publicNarrative(series.said.text), item: series.said, localSources: localSourceMap(messaging) },
        { kicker: 'Intervening record', title: 'What happened', text: publicNarrative(series.occurred.text), item: series.occurred, localSources: localSourceMap(messaging) },
        { date: series.shifted_to.date, title: 'What Iran said or did later', text: publicNarrative(series.shifted_to.text), item: series.shifted_to, localSources: localSourceMap(messaging) },
        { kicker: 'Approved assessment', title: plainLabel(series.assessment.classification), text: publicNarrative(series.assessment.text), item: { source_ids: [...sourceIdsFrom(series.said), ...sourceIdsFrom(series.shifted_to)] }, localSources: localSourceMap(messaging) }
      ]);
      if (asArray(series.assessment.alternatives).length) {
        const alternatives = append(section, 'div', 'scope-note');
        append(alternatives, 'strong', '', 'Unresolved explanation');
        append(alternatives, 'p', '', `The record leaves several possible explanations open: ${series.assessment.alternatives.map(value => publicNarrative(value)).join(', ')}.`);
      }
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function ClaimChecksPage(context) {
    const frame = pageFrame(context, 'A claim is not treated as fact because a government, military, party or armed group said it. Each case keeps the claim, evidence for it, contrary evidence, current finding and unresolved questions separate.');
    const claims = recordArray(modelData(context.model, 'current.claims'));
    claims.forEach(claim => {
      const section = addSection(frame.article, publicNarrative(claim.claim), 'content-section claim-case');
      const header = append(section, 'div', 'claim-finding');
      append(header, 'p', 'card-kicker', `Claimed by ${publicNarrative(claim.claimant, 'claimant not identified')}`);
      append(header, 'strong', '', plainLabel(claim.current_verdict));
      append(header, 'p', '', publicNarrative(claim.what_actually_happened));
      const columns = append(section, 'div', 'evidence-columns');
      const support = append(columns, 'section', 'evidence-column support-column');
      append(support, 'h3', '', 'Evidence supporting the claim');
      const supportList = append(support, 'ul', 'method-list');
      const supporting = asArray(claim.evidence_supporting_claim);
      if (supporting.length) supporting.forEach(value => append(supportList, 'li', '', publicNarrative(value)));
      else append(supportList, 'li', '', 'No supporting evidence is recorded in this case file.');
      const contrary = append(columns, 'section', 'evidence-column contrary-column');
      append(contrary, 'h3', '', 'Contrary or limiting evidence');
      const contraryList = append(contrary, 'ul', 'method-list');
      asArray(claim.counterevidence).forEach(value => append(contraryList, 'li', '', publicNarrative(value, value)));
      const unresolved = append(section, 'div', 'unresolved-box');
      append(unresolved, 'h3', '', 'What remains unresolved');
      const unresolvedList = append(unresolved, 'ul', 'method-list');
      asArray(claim.unresolved_questions).forEach(value => append(unresolvedList, 'li', '', publicNarrative(value)));
      section.append(EvidenceDrawer.create(context, sourceEnvelope(claim), { relatedRecords: claim.chronology }));
    });
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function InformationEnvironmentPage(context) {
    const frame = pageFrame(context, 'The information record separates what a claim said, how it spread, the evidence used to assess it and the current verdict. Reach does not make a claim true.');
    const claims = modelData(context.model, 'analysis.information_war_claims');
    const section = addSection(frame.article, 'Tracked narratives');
    const list = append(section, 'div', 'record-list');
    asArray(claims).forEach((claim, claimIndex) => {
      const localSources = Object.fromEntries(asArray(claim.sources).map((source, sourceIndex) => [`INFO-${claimIndex}-${sourceIndex}`, source]));
      const card = addProvenanceCard(list, context, {
        kicker: `${plainLabel(claim.verdict)} · ${publicNarrative(claim.date_window, 'Date window unresolved')}`,
        title: publicNarrative(claim.claim),
        text: publicNarrative(claim.assessment),
        meta: [claim.platform, claim.reach].filter(Boolean).map(value => publicNarrative(value)).join(' · '),
        item: { source_ids: Object.keys(localSources) },
        localSources
      });
      if (asArray(claim.status_tags).length) {
        const tags = append(card, 'div', 'tag-row');
        claim.status_tags.forEach(tag => append(tags, 'span', '', plainLabel(tag)));
      }
    });
    const networks = modelData(context.model, 'analysis.influence_networks');
    const networkSection = addSection(frame.article, 'Observed amplification networks');
    append(networkSection, 'p', 'section-note', 'These measurements describe the collected sample and minimum observed engagement. They do not prove who directed a network or how many people believed the content.');
    const networkList = append(networkSection, 'div', 'record-list two-column-list');
    asArray(networks.networks).forEach(network => addProvenanceCard(networkList, context, {
      title: publicNarrative(network.name),
      text: `${formatNumber(network.posts_approx)} approximate posts · at least ${formatNumber(network.views_min)} views · ${formatNumber(network.sampled_accounts)} sampled accounts`,
      meta: asArray(network.notes).map(note => publicNarrative(note)).filter(Boolean).join(' ')
    }));
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function SourcesPage(context) {
    const frame = pageFrame(context, 'The source catalog behind the current record. A source shows what an outlet, official or technical record reported; it does not automatically prove every claim inside it.');
    const guide = addSection(frame.article, 'How source context works');
    append(guide, 'p', '', 'Source type, outlet context and the proposition a source supports are kept separate. When the same source ID carries conflicting metadata in different evidence packages, the Atlas preserves each version instead of choosing a global winner.');
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
      const sources = context.services.sourceResolver.catalog()
        .filter(source => !query || JSON.stringify(source).toLowerCase().includes(query))
        .sort((left, right) => {
          const variantDifference = asArray(right.variants).length - asArray(left.variants).length;
          return variantDifference || String(left.sourceId).localeCompare(String(right.sourceId));
        });
      list.replaceChildren();
      sources.slice(0, 80).forEach(source => {
        const record = source.status === 'resolved' && source.selected ? source.selected.record : source.identity;
        const card = append(list, 'article', 'source-card');
        card.dataset.sourceId = source.sourceId;
        append(card, 'h2', '', publicNarrative(record && (record.publisher || record.title), source.sourceId));
        append(card, 'p', 'source-id', source.sourceId);
        if (record && record.title && record.title !== record.publisher) append(card, 'p', '', publicNarrative(record.title));
        const contextRow = append(card, 'div', 'source-context-row');
        append(contextRow, 'span', '', source.conflict ? 'Source metadata differs across evidence packages' : 'Source record resolved');
        append(contextRow, 'span', '', source.conflict ? `${source.variants.length} preserved source versions` : 'One current source record');
        appendSourceResolution(context.documentObject, card, source);
      });
      count.textContent = `${Math.min(sources.length, 80)} of ${sources.length} matching sources shown`;
    };
    search.addEventListener('input', draw);
    draw();
    renderRelatedLinks(frame.article, context);
    return frame.article;
  }

  function MethodPage(context) {
    const frame = pageFrame(context, 'A short explanation of how the Atlas turns reporting, official claims, imagery and later corrections into a public record without hiding uncertainty.');
    const packageLineage = asArray(context.model.input_packages);
    const principles = addSection(frame.article, 'The rules in ordinary language');
    const list = append(principles, 'ul', 'method-list');
    [
      'A launch does not prove a hit.',
      'A hit does not prove destruction.',
      'A government statement is evidence of what the government said, not automatic proof that the claim is true.',
      'Absence of reporting does not prove absence of activity.',
      'Unknown does not mean zero.',
      'Conflicting estimates are preserved rather than averaged without explanation.',
      'Later corrections do not pretend the later information was known earlier.',
      'The date something happened is kept separate from the date it was first reported or verified.',
      'Evidence support is kept separate from who disputes a claim.'
    ].forEach(text => append(list, 'li', '', text));
    const flow = addSection(frame.article, 'From summary to evidence');
    addSequence(flow, context, [
      { title: 'Read the public conclusion', text: 'The page leads with the supported finding in ordinary language.' },
      { title: 'Open the evidence detail', text: 'Drawers expose source links and related chronology records without making every page a wall of citations.' },
      { title: 'Check status and dispute separately', text: 'Support describes the evidence. Dispute describes who contests it. One does not substitute for the other.' },
      { title: 'Follow corrections through time', text: 'New evidence can clarify the current record while the earlier claim, date and revision history remain preserved.' }
    ]);
    const current = addSection(frame.article, 'Current edition');
    append(current, 'p', '', `The accepted current record contains ${formatNumber(context.model.counts.chronology_records)} chronology records and ${formatNumber(context.model.counts.canonical_source_records)} canonical source records from ${formatNumber(packageLineage.length)} accepted evidence collections, reviewed through ${context.model.release.current_osint_cutoff_display}. Later corrections remain temporally explicit, so a correction does not pretend the information was known earlier.`);
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
      append(card, 'p', '', 'Retained in repository history; not included in the current production site.');
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
    const routeRuntime = settings.routeRuntime;
    const state = settings.state;
    invariant(documentObject && rootElement && routeRuntime && typeof routeRuntime.forRoute === 'function', 'Public IA mount requires a document, root element, and guarded route runtime');
    const firstRoute = parseRoute(windowObject.location && windowObject.location.hash);
    const firstAccess = routeRuntime.forRoute(firstRoute);
    if (rootElement.__atlasRouteController) rootElement.__atlasRouteController.destroy();
    const shell = AppShell.create(documentObject);
    rootElement.replaceChildren(shell.app);
    rootElement.className = 'atlas-ready';
    rootElement.dataset.status = 'ready';
    rootElement.setAttribute('aria-busy', 'false');

    let previousRouteKey = null;
    let currentServices = firstAccess.services;
    const renderRoute = (focusHeading, prepared) => {
      const route = parseRoute(windowObject.location && windowObject.location.hash);
      const access = prepared && prepared.routeKey === route.key ? prepared.access : routeRuntime.forRoute(route);
      const model = access.model;
      currentServices = access.services;
      if (!route.canonical && windowObject.history && windowObject.location) {
        windowObject.history.replaceState(null, '', routeHref(route.key, route.params));
      }
      const context = { documentObject, windowObject, model, services: access.services, state, route };
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
      return route;
    };
    const onHashChange = () => renderRoute(true);
    windowObject.addEventListener('hashchange', onHashChange);
    const initialRoute = renderRoute(false, { routeKey: firstRoute.key, access: firstAccess });
    const controller = Object.freeze({
      render: () => renderRoute(false),
      current: () => parseRoute(windowObject.location && windowObject.location.hash),
      services: () => currentServices,
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
    eventTemporalValues,
    eventEvidenceValues,
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
