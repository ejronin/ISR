
function showAtlasPanel(id, button){
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('active');});
  var panel=document.getElementById(id);
  if(panel) panel.classList.add('active');
  if(button) button.classList.add('active');
  var app=document.getElementById('app');
  if(app){ if(id==='losses'){app.classList.add('loss-mode');}else{app.classList.remove('loss-mode');} }
  try{ if(id!=='losses' && window.atlasMap && typeof window.atlasMap.invalidateSize==='function') setTimeout(function(){window.atlasMap.invalidateSize();},30); }catch(e){}
}


(function atlasShell(){
  const canonicalUrl='https://ejronin.github.io/ISR/';
  function setShareStatus(message){
    const el=document.getElementById('shareStatus');
    if(el){ el.textContent=message; window.setTimeout(()=>{ if(el.textContent===message) el.textContent=''; },2200); }
  }
  async function copyCanonicalLink(){
    try{
      if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(canonicalUrl); }
      else{
        const input=document.createElement('input');input.value=canonicalUrl;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();
      }
      setShareStatus('Link copied');
    }catch(e){ setShareStatus('Copy failed — use the address bar'); }
  }
  function wireShell(){
    const copy=document.getElementById('copyLinkButton'); if(copy) copy.addEventListener('click',copyCanonicalLink);
    const snapshotList=document.getElementById('snapshotList');
    if(snapshotList){
      fetch('./data/snapshots.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(rows=>{
        if(!Array.isArray(rows)||!rows.length)return;
        snapshotList.innerHTML=rows.slice().reverse().map(row=>`<div class="snapshot-row"><div><strong>${String(row.date||'Snapshot')}</strong><br><span>${String(row.label||'Historical board')}</span></div><a target="_blank" rel="noopener" href="${encodeURI(String(row.path||''))}">Open snapshot</a></div>`).join('');
      }).catch(()=>{});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireShell);else wireShell();
})();
