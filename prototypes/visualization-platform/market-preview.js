import './prototype.css';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
echarts.use([LineChart, AriaComponent, GridComponent, TooltipComponent, MarkLineComponent, SVGRenderer]);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
async function fetchJson(path) {
  const response = await fetch(path,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok) throw new Error('Failed to load accepted/researched input: '+path);
  return response.json();
}
async function initMarketObservationPrototype() {
  const [dataset, network] = await Promise.all([
    fetchJson('/data/research/eia-brent-spot-2026-visual-candidate.json'),
    fetchJson('/data/sanctions-financial-network-v1.json')
  ]);
  const chartHost=document.getElementById('market-observations-chart');
  const status=document.getElementById('market-status');
  const selectedDetail=document.getElementById('market-selected-event');
  const markerRail=document.getElementById('market-sanction-markers');
  const markerDisclosure=document.getElementById('market-actions-disclosure');
  if(markerDisclosure)markerDisclosure.open=matchMedia('(min-width: 700px)').matches;
  const table=document.getElementById('market-observations-table');
  const toggle=document.getElementById('market-markers-toggle');
  const observations=Array.isArray(dataset.observations)?dataset.observations:[];
  const actions=(Array.isArray(network.wartime_actions)?network.wartime_actions:[])
    .filter(row=>/^2026-[0-9]{2}-[0-9]{2}$/.test(row.date)&&row.title)
    .slice().sort((a,b)=>a.date.localeCompare(b.date));
  const projection=dataset.forecast_reference;
  if(projection?.canonical_status!=='EXTERNAL_PRIMARY_SOURCE_RESEARCH_NOT_ACCEPTED_AS_CANONICAL' ||
     projection?.type!=='EIA_STEO_PROJECTED_QUARTER_AVERAGE_NOT_DAILY_PRICE' ||
     projection?.period!=='2026-Q4' || projection?.value!==105)
    throw new Error('Missing qualified EIA Q4 forecast-average research reference.');
  if(observations.length!==41 || observations.some((row,i)=>
    !/^2026-[0-9]{2}-[0-9]{2}$/.test(row.date) || !Number.isFinite(row.value) ||
    row.value<=0 || (i>0 && observations[i-1].date>=row.date)))
    throw new Error('Missing, malformed or non-chronological EIA market observations.');
  for(const row of observations){
    const tr=document.createElement('tr');
    const date=document.createElement('td');date.textContent=row.date;
    const price=document.createElement('td');price.textContent='$'+row.value.toFixed(2);
    tr.append(date,price);table.append(tr);
  }
  const marketChart=echarts.init(chartHost,null,{renderer:'svg'});
  let markersVisible=true;
  let selectedIndex=-1;
  const render=()=>marketChart.setOption({
    animation:!reducedMotion,
    backgroundColor:'transparent',
    grid:{top:34,bottom:55,left:75,right:28},
    aria:{enabled:true,description:'Observed EIA Europe Brent spot prices, 2026, sampled weekly. Dashed vertical marks indicate dated sanctions actions only; they do not measure or imply price effects.'},
    tooltip:{trigger:'axis',axisPointer:{type:'line'},valueFormatter:v=>'$'+Number(v).toFixed(2)+' per barrel'},
    xAxis:{type:'time',min:'2026-01-01',max:'2027-01-02',
      axisLabel:{color:'#b6cbd9'},axisLine:{lineStyle:{color:'#4d6175'}},splitLine:{show:false}},
    yAxis:{type:'value',scale:true,name:'Europe Brent spot · USD/bbl',
      nameTextStyle:{color:'#b6cbd9'},axisLabel:{color:'#b6cbd9',formatter:v=>'$'+Math.round(v)},
      splitLine:{lineStyle:{color:'rgba(188,207,226,.15)'}}},
    series:[{type:'line',name:'EIA Europe Brent spot',smooth:false,symbolSize:5,
      showSymbol:true,connectNulls:false,data:observations.map(row=>[row.date,row.value]),
      lineStyle:{width:2,color:'#87d2e8'},itemStyle:{color:'#b9e6f6'},
      markLine:{silent:true,animation:false,symbol:'none',
        data:[
          ...(markersVisible?actions.map((a,i)=>({
            xAxis:a.date,name:a.title,label:{show:false},
            lineStyle:{color:i===selectedIndex?'#f2cf73':'#b88b5d',
              opacity:i===selectedIndex?1:.45,width:i===selectedIndex?2:1,type:'dashed'}
          })):[]),
          {xAxis:'2026-11-03',name:'Election date (calendar reference only)',label:{show:false},
            lineStyle:{color:'#f2cf73',type:'solid',width:2,opacity:.9}},
          [
            {coord:['2026-10-01',projection.value],name:'EIA Q4 2026 average forecast $105/b — not projected daily prices',label:{show:false},
              lineStyle:{color:'#a7cbac',type:'dashed',width:3,opacity:.9}},
            {coord:['2026-12-31',projection.value],label:{show:false}}
          ]
        ]
      }
    }]
  },{notMerge:true});
  for(let i=0;i<actions.length;i++){
    const action=actions[i];
    const button=document.createElement('button');
    button.className='market-event-button';button.type='button';
    button.textContent=action.date+' · '+action.title;
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{
      selectedIndex=i;
      for(const b of markerRail.querySelectorAll('button'))
        b.setAttribute('aria-pressed',String(b===button));
      selectedDetail.replaceChildren();
      const heading=document.createElement('strong');heading.textContent=action.date+' · '+action.title;
      const target=document.createElement('p');target.textContent='Accepted target: '+String(action.targeted_node||'Not specified');
      const observed=document.createElement('p');observed.textContent='Accepted outcome and limitations: '+String(action.observed_effect||'Effect not established');
      const sources=document.createElement('p');sources.textContent='Accepted sanctions source IDs: '+(action.source_ids||[]).join(', ')+'. A marker is calendar context only, not an inferred Brent-price effect.';
      selectedDetail.append(heading,target,observed,sources);
      render();
    });
    markerRail.append(button);
  }
  const election=document.createElement('p');election.className='market-election-reference';
  election.textContent='Nov. 3 — U.S. midterm election: future calendar reference only. No post–Oct. 6 market observation or hypothetical forward price is plotted.';
  markerRail.append(election);
  toggle.addEventListener('click',()=>{
    markersVisible=!markersVisible;
    toggle.setAttribute('aria-pressed',String(markersVisible));
    toggle.textContent=markersVisible?'Sanctions markers on':'Sanctions markers off';
    render();
  });
  render();
  new ResizeObserver(()=>marketChart.resize()).observe(chartHost);
  status.textContent=observations.length+' EIA observed Brent spot samples through '+observations.at(-1).date+'; '+actions.length+' accepted sanctions dates. Dashed $105/b Q4 reference is the EIA October 6 forecast QUARTERLY AVERAGE, not a predicted daily price or observed settlement. The existing 2026 GDP comparison is separate. Research-only; not canonical evidence.';
}


async function buildStaticForecastReference() {
  const ledger=await fetchJson('/data/integration-v1.2/economics.json');
  const rows=ledger?.forecast_context?.rows||[];
  const tbody=document.getElementById('market-static-forecast-table');
  const mobile=document.createElement('div');mobile.className='market-gdp-mobile-cards';
  mobile.setAttribute('aria-label','Seven accepted 2026 GDP forecast comparisons');
  const tableWrap=tbody.closest('.table-scroll');
  tableWrap.dataset.marketForecastTable='desktop';
  tableWrap.after(mobile);
  for(const row of rows){
    const tr=document.createElement('tr');
    for(const val of [row.country,row.prewar.toFixed(1)+'%',row.current.toFixed(1)+'%',(row.delta>0?'+':'')+row.delta.toFixed(1)+' pp']){
      const td=document.createElement('td');td.textContent=val;tr.append(td);
    }
    tbody.append(tr);
    const card=document.createElement('article');card.className='market-gdp-mobile-card';
    const name=document.createElement('h3');name.textContent=row.country;card.append(name);
    const metrics=document.createElement('dl');metrics.className='market-gdp-mobile-metrics';
    for(const [label,value] of [
      ['Prewar forecast',row.prewar.toFixed(1)+'%'],
      ['Current forecast',row.current.toFixed(1)+'%'],
      ['Revision',(row.delta>0?'+':'')+row.delta.toFixed(1)+' pp']
    ]){
      const part=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=label;dd.textContent=value;part.append(dt,dd);metrics.append(part);
    }
    card.append(metrics);mobile.append(card);
  }
}
await Promise.all([initMarketObservationPrototype(),buildStaticForecastReference()]);
