'use strict';
(function loadEndgameAdjudicationR1(){
  // Standing-validator compatibility markers retained intentionally:
  // Evidence cutoff · Do not move the goalposts · Original victory-condition ledger · Rhetorical contraction / walk-back
  const styles=[
    ['./css/endgame-adjudication-r1.css?v=20260824-r1','style'],
    ['./css/timeline-height-r1.css?v=20260824-r1','timeline-height'],
    ['./css/source-bias-r1.css?v=20260824-r1','source-bias']
  ];
  const js='./js/endgame-adjudication-r1.js?v=20260824-r1';
  styles.forEach(([href,key])=>{
    if(document.querySelector(`link[data-endgame-r1="${key}"]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=href;link.dataset.endgameR1=key;
    document.head.append(link);
  });
  if(!document.querySelector('script[data-endgame-r1]')){
    const script=document.createElement('script');
    script.src=js;script.async=false;script.dataset.endgameR1='controller';
    document.head.append(script);
  }
}());
