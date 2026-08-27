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
  function install(){
    const root=document.getElementById('infowar');
    root?.querySelector('[data-iran-messaging-r1]')?.remove();
    if(window.ISRIranMessagingShifts20260827R1?.refresh)return window.ISRIranMessagingShifts20260827R1.refresh();
    loadShiftSeries();
    return false;
  }
  window.ISRIranMessagingR1={install,loadShiftSeries,model:()=>window.ISRIranMessagingShifts20260827R1?.model?.()||null};
  loadShiftSeries();
  window.addEventListener('atlasstatechange',()=>install());
  window.addEventListener('atlascurrentready20260827',()=>install());
}());
