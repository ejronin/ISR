'use strict';
(function IranMessagingR1CompatibilityShim(){
  if(window.__ISR_IRAN_MESSAGING_R1_SHIM__)return;
  window.__ISR_IRAN_MESSAGING_R1_SHIM__=true;
  function loadShiftSeries(){
    if(!document.querySelector('link[data-iran-messaging-shifts-20260827]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='./css/iran-messaging-shifts-20260827-r1.css?v=20260827-r1';css.dataset.iranMessagingShifts20260827='1';document.head?.appendChild(css);
    }
    if(!document.querySelector('script[data-iran-messaging-shifts-20260827]')){
      const js=document.createElement('script');js.src='./js/iran-messaging-shifts-20260827-r1.js?v=20260827-r1';js.async=false;js.dataset.iranMessagingShifts20260827='1';document.head?.appendChild(js);
    }else{
      window.ISRIranMessagingShifts20260827R1?.refresh?.();
    }
  }
  function loadHousekeeping(){
    if(!document.querySelector('link[data-public-housekeeping-r1]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='./css/public-housekeeping-r1.css?v=20260827-r1';css.dataset.publicHousekeepingR1='1';document.head?.appendChild(css);
    }
    if(!document.querySelector('script[data-public-housekeeping-r1]')){
      const js=document.createElement('script');js.src='./js/public-housekeeping-r1.js?v=20260827-r1';js.async=false;js.dataset.publicHousekeepingR1='1';document.head?.appendChild(js);
    }else{
      window.ISRPublicHousekeepingR1?.apply?.();
    }
  }
  function repairShiftSeries(){
    const root=document.getElementById('infowar');
    if(!root)return false;
    root.querySelector('[data-'+'iran-messaging-r1]')?.remove();
    if(root.querySelector('[data-iran-messaging-shifts-20260827]'))return true;
    if(window.ISRIranMessagingShifts20260827R1?.refresh){
      window.ISRIranMessagingShifts20260827R1.refresh();
      return true;
    }
    loadShiftSeries();
    return false;
  }
  function repairBurst(){
    [0,80,250,750,1600].forEach(ms=>setTimeout(repairShiftSeries,ms));
  }
  function install(){
    const mounted=repairShiftSeries();
    if(!mounted)loadShiftSeries();
    return mounted;
  }
  window.ISRIranMessagingR1={install,loadShiftSeries,loadHousekeeping,repairShiftSeries,repairBurst,model:()=>window.ISRIranMessagingShifts20260827R1?.model?.()||null};
  loadShiftSeries();
  loadHousekeeping();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repairBurst,{once:true});else repairBurst();
  window.addEventListener('atlasstatechange',repairBurst);
  window.addEventListener('atlascurrentready20260827',repairBurst);
}());