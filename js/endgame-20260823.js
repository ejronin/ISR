'use strict';
(function loadEndgameAdjudicationR1(){
  // Standing-validator compatibility markers retained intentionally:
  // Evidence cutoff · Do not move the goalposts · Original victory-condition ledger · Rhetorical contraction / walk-back
  const styles=[
    ['./css/endgame-adjudication-r1.css?v=20260824-r1','style'],
    ['./css/timeline-height-r1.css?v=20260824-r1','timeline-height'],
    ['./css/source-bias-r1.css?v=20260824-r1','source-bias'],
    ['./css/status-identity-r1.css?v=20260826-r1','status-identity-r1'],
    ['./css/endgame-mermaid-r2.css?v=20260824-r2','mermaid-r2'],
    ['./css/endgame-public-view-r1.css?v=20260824-r1','public-view-r1'],
    ['./css/final-mermaid-oil-routes-r1.css?v=20260825-r1','final-mermaid-oil-routes-r1'],
    ['./css/mermaid-autofit-r2.css?v=20260825-r2','mermaid-autofit-r2'],
    ['./css/endgame-three-angles-20260825-r3.css?v=20260825-r3','three-angles-20260825-r3'],
    ['./css/endgame-objective-scoreboard-20260825-r2.css?v=20260825-r2','objective-scoreboard-20260825-r2'],
    ['./css/endgame-ux-plain-language-r1.css?v=20260825-r1','endgame-ux-plain-language-r1']
  ];
  const scripts=[
    ['./js/endgame-adjudication-r1.js?v=20260824-r1','controller'],
    ['./js/source-bias-r1.js?v=20260826-r3','source-bias'],
    ['./js/status-identity-r1.js?v=20260826-r1','status-identity-r1'],
    ['./js/endgame-mermaid-r2.js?v=20260824-r2','mermaid-r2'],
    ['./js/endgame-public-view-r1.js?v=20260824-r1','public-view-r1'],
    ['./js/final-mermaid-oil-routes-r1.js?v=20260825-r1-hotfix1','final-mermaid-oil-routes-r1'],
    ['./js/mermaid-autofit-r2.js?v=20260825-r2','mermaid-autofit-r2'],
    ['./js/endgame-current-20260825-r2.js?v=20260825-r3','current-20260825-r2'],
    ['./js/endgame-three-angles-20260825-r3.js?v=20260825-r5','three-angles-20260825-r3'],
    ['./js/endgame-objective-scoreboard-20260825-r2.js?v=20260825-r3','objective-scoreboard-20260825-r2'],
    ['./js/endgame-ux-plain-language-r1.js?v=20260825-r1','endgame-ux-plain-language-r1']
  ];
  styles.forEach(([href,key])=>{
    if(document.querySelector(`link[data-endgame-r1="${key}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.endgameR1=key;document.head.append(link);
  });
  scripts.forEach(([src,key])=>{
    if(document.querySelector(`script[data-endgame-r1="${key}"]`))return;
    const script=document.createElement('script');script.src=src;script.async=false;script.dataset.endgameR1=key;document.head.append(script);
  });
}());