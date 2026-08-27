'use strict';
(function IranMessagingR1CompatibilityShim(){
  if(window.__ISR_IRAN_MESSAGING_R1_SHIM__)return;
  window.__ISR_IRAN_MESSAGING_R1_SHIM__=true;
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
  function install(){
    const root=document.getElementById('infowar');
    root?.querySelector('[data-'+'iran-messaging-r1]')?.remove();
    loadHousekeeping();
    if(window.ISRIranMessagingShifts20260827R1?.refresh)return window.ISRIranMessagingShifts20260827R1.refresh();
    loadShiftSeries();
    return false;
  }
  window.ISRIranMessagingR1={install,loadShiftSeries,loadHousekeeping,model:()=>window.ISRIranMessagingShifts20260827R1?.model?.()||null};
  loadHousekeeping();
  loadShiftSeries();
  window.addEventListener('atlasstatechange',()=>install());
  window.addEventListener('atlascurrentready20260827',()=>install());
}());