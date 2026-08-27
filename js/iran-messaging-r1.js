'use strict';
(function IranMessagingR1CompatibilityShim(){
  if(window.__ISR_IRAN_MESSAGING_R1_SHIM__)return;
  window.__ISR_IRAN_MESSAGING_R1_SHIM__=true;
  let messagingRoot=null,messagingObserver=null,repairQueued=false;
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
    repairQueued=false;
    const root=document.getElementById('infowar');
    if(!root)return;
    root.querySelector('[data-'+'iran-messaging-r1]')?.remove();
    if(root.querySelector('[data-iran-messaging-shifts-20260827]'))return;
    if(window.ISRIranMessagingShifts20260827R1?.refresh)window.ISRIranMessagingShifts20260827R1.refresh();
    else loadShiftSeries();
  }
  function queueRepair(){
    if(repairQueued)return;
    repairQueued=true;
    queueMicrotask(repairShiftSeries);
  }
  function watchShiftSeries(){
    const root=document.getElementById('infowar');
    if(!root)return false;
    if(root!==messagingRoot){
      messagingObserver?.disconnect();
      messagingRoot=root;
      messagingObserver=new MutationObserver(queueRepair);
      messagingObserver.observe(root,{childList:true,subtree:true});
    }
    repairShiftSeries();
    return true;
  }
  function install(){
    watchShiftSeries();
    if(window.ISRIranMessagingShifts20260827R1?.refresh)return window.ISRIranMessagingShifts20260827R1.refresh();
    loadShiftSeries();
    return false;
  }
  window.ISRIranMessagingR1={install,loadShiftSeries,loadHousekeeping,watchShiftSeries,model:()=>window.ISRIranMessagingShifts20260827R1?.model?.()||null};
  loadShiftSeries();
  loadHousekeeping();
  if(!watchShiftSeries())document.addEventListener('DOMContentLoaded',watchShiftSeries,{once:true});
  window.addEventListener('atlasstatechange',()=>{install();setTimeout(watchShiftSeries,80);});
  window.addEventListener('atlascurrentready20260827',()=>{install();setTimeout(watchShiftSeries,80);});
}());