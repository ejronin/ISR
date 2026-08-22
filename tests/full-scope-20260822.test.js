'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..');const Core=require(path.join(ROOT,'js/full-scope-core.js'));
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const outcomes=load('data/iran-outcome-assessments-v1.0.json');
const forensic={assessments:load('data/forensic-v1.3.2/public-assessments.json')};
forensic.claims=fs.existsSync(path.join(ROOT,'data/forensic-v1.3.2/iranian-claim-evolution.json'))?load('data/forensic-v1.3.2/iranian-claim-evolution.json'):{claims:[
 {claim_id:'IR-CLM-0001',chain_id:'CH-F15E-CSAR-URANIUM',claim_date:'2026-04-03',exact_translated_claim:'Iranian air defenses downed a Lakenheath F-35 in central Iran.',final_disposition:['FALSE'],next_replacement_claim_id:'IR-CLM-0003'},
 {claim_id:'IR-CLM-0003',chain_id:'CH-F15E-CSAR-URANIUM',claim_date:'2026-04-06',exact_translated_claim:'Press TV states the F-35 identification was a misidentification and debris showed an F-15E.',final_disposition:['CORRECTED'],contradiction_type:'SELF_CORRECTION'}]};
forensic.chains=fs.existsSync(path.join(ROOT,'data/forensic-v1.3.2/claim-chain-index.json'))?load('data/forensic-v1.3.2/claim-chain-index.json'):{chains:[{chain_id:'CH-F15E-CSAR-URANIUM',label:'F-15E identification → pilot capture/rescue → loss attribution → Isfahan/uranium narrative',assessment:'OUTCOME-PRESERVING NARRATIVE SUBSTITUTION',claim_ids:['IR-CLM-0001','IR-CLM-0003'],start_date:'2026-04-03',end_date:'2026-04-09'},{chain_id:'CH-DENA-ADMISSION',label:'IRIS Dena physical loss and acknowledgment',assessment:'ADMISSION LATENCY — NOT A LIE CASE',claim_ids:[],start_date:'2026-03-05',end_date:'2026-03-05'}]};
forensic.leaders=fs.existsSync(path.join(ROOT,'data/forensic-v1.3.2/iran-leadership-casualties.json'))?load('data/forensic-v1.3.2/iran-leadership-casualties.json'):{records:[{leadership_id:'L1',name:'Ali Khamenei',role_at_death:'Supreme Leader'}]};
forensic.losses=fs.existsSync(path.join(ROOT,'data/forensic-v1.3.2/iran-loss-envelopes.json'))?load('data/forensic-v1.3.2/iran-loss-envelopes.json'):{categories:[]};forensic.facilities={records:[]};forensic.sources={sources:[]};
const ledger={events:{events:[]},claims:{claims:[{case_id:'carrier',claim:'USS Abraham Lincoln carrier sunk',current_verdict:'FALSE',map_refs:[]}]},'material-losses':{records:[]},casualties:{records:[]}};
const index=Core.buildAuthorityIndex({outcomes,forensic,ledger,legacy:{}});
const cases=['F-35','F-15E','uranium','Al Udeid','Khamenei','Dena','335 launchers','Hormuz control','carrier sunk','Iran won'];
for(const q of cases){const hits=Core.rankSearch(index,q,10);assert(hits.length,`regression query produced no result: ${q}`);}
assert.strictEqual(Core.rankSearch(index,'335 launchers')[0].classLabel,'CURRENT ASSESSMENT');
assert.strictEqual(Core.rankSearch(index,'Iran won')[0].rank,100);
const chain=forensic.chains.chains.find(x=>x.chain_id==='CH-F15E-CSAR-URANIUM');const fresh=Core.claimFreshness(chain,forensic.claims.claims,'2026-08-20 15:59 ET');
assert.strictEqual(fresh.claimed.claim_date,'2026-04-03');assert.strictEqual(fresh.corrected.claim_date,'2026-04-06','correction timestamp must come from replacement record');
const pos=Core.timelinePositions([{event_id:'a',event_date:'2026-03-01'},{event_id:'b',event_date:'2026-03-01'},{event_id:'c',event_date:'2026-03-01'},{event_id:'d',event_date:'2026-03-01'},{event_id:'e',event_date:'2026-03-02'}]);assert.deepStrictEqual(pos.slice(0,4).map(x=>x.lane),[0,1,2,2]);
assert.strictEqual(Core.isMapped({map_refs:[],facility_refs:[]}),false);assert.strictEqual(Core.eventMapRef({map_refs:['M1']}),'M1');
console.log('full-scope JS tests: PASS');
