'use strict';
let marketFeed=null,marketMessage='Market data has not refreshed yet.',marketLoading=false;
let selectedResearch='';
function portfolioQuote(symbol){
  const manual=state.quotes[symbol],live=!state.demo&&marketFeed?.stocks?.[symbol];
  if(live?.price>0&&live.asOf&&(!manual||!manual.date||live.asOf>=manual.date))return {price:live.price,date:live.asOf,source:'CSE'};
  return manual;
}
async function refreshMarket(){
  if(marketLoading)return;marketLoading=true;
  try{
    const response=await fetch('./market-data.json?refresh='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('Market feed unavailable');
    const next=await response.json();
    if(next.version!==1||!next.stocks||!Number.isFinite(Date.parse(next.fetchedAt)))throw Error('Invalid feed');
    marketFeed=next;
    const age=(Date.now()-Date.parse(next.fetchedAt))/86400000;
    marketMessage=(age>3?'Stale feed — ':'')+'CSE fetched '+new Date(next.fetchedAt).toLocaleString('en-GB',{timeZone:'Asia/Colombo'})+' (Sri Lanka)';
  }catch{marketMessage='Market refresh unavailable. Showing the last available quotes; check their dates.';}
  finally{marketLoading=false;if(cloudReady)render();}
}
function sma(history,n){if(history.length<n)return null;return history.slice(-n).reduce((s,x)=>s+x.close,0)/n;}
function rsi(history,n=14){
  if(history.length<n+1)return null;let up=0,down=0;
  for(let i=1;i<=n;i++){const d=history[i].close-history[i-1].close;up+=Math.max(0,d);down+=Math.max(0,-d);}up/=n;down/=n;
  for(let i=n+1;i<history.length;i++){const d=history[i].close-history[i-1].close;up=(up*(n-1)+Math.max(0,d))/n;down=(down*(n-1)+Math.max(0,-d))/n;}
  return down===0?(up===0?50:100):100-100/(1+up/down);
}
function researchLink(url){try{const u=new URL(url);return u.protocol==='https:'?esc(u.href):'#';}catch{return '#';}}
function portfolioInsights(t){
  if(!t.holdings.length)return '';
  const largest=[...t.holdings].sort((a,b)=>(b.value??0)-(a.value??0))[0];
  const weight=t.value?largest.value/t.value*100:0;
  const fees=Number(state.statement?.sellFeeRate??0);
  const net=t.value*(1-fees)-t.cost;
  const down=[...t.holdings].filter(x=>x.gain<0).sort((a,b)=>a.gain-b.gain)[0];
  return `<div class="panel insight-summary"><div class="panel-head"><div><h2>Your portfolio insights</h2><p class="panel-subtitle">Calculated from your private holdings and dated quotes.</p></div><a href="#research" class="text-button">Stock research ↗</a></div><div class="insight-grid"><article><small>LARGEST POSITION</small><h3>${esc(largest.symbol)} · ${num(weight,1)}%</h3><p>${weight>30?'A large share of your portfolio depends on this one company. Review its risks alongside your wider investments.':'Compare company and sector exposures before adding to existing holdings.'}</p></article><article><small>ESTIMATED EXIT RESULT</small><h3 class="${tone(net)}">${money(net)}</h3><p>${fees?num(fees*100,2)+'% estimated selling fees, inferred from the imported statement.':'No estimated selling fee configured.'} Gross unrealised result: ${money(t.gain)}. ${t.missing?'Partial: missing quotes.':''}</p></article><article><small>DOWNSIDE SCENARIO</small><h3>${money(t.value*.1)}</h3><p>A hypothetical 10% fall across priced holdings would reduce market value by this amount. This is a scenario, not a forecast.</p></article>${down?`<article><small>LARGEST UNREALISED DRAG</small><h3>${esc(down.symbol)}</h3><p>${money(down.gain)} before selling fees. Revisit the business thesis, earnings and debt rather than relying on the purchase price alone.</p></article>`:''}</div><p class="research-note">${esc(marketMessage)}. Prices refresh from the latest scheduled CSE snapshot at sign-in. No broker connection or order execution.</p></div>`;
}
function openingBalances(){
  if(!state.openings?.length)return '';
  return `<div class="panel"><div class="panel-head"><div><h2>Imported opening balances</h2><p class="panel-subtitle">${esc(state.statement?.date?'Statement as of '+state.statement.date:'Statement date not supplied')} · imported ${esc(state.statement?.importedAt||'')} · not historical purchases</p></div></div><div class="table-wrap"><table><thead><tr><th>SYMBOL</th><th>SHARES</th><th>TOTAL COST (LKR)</th><th>AVERAGE COST</th></tr></thead><tbody>${state.openings.map(h=>`<tr><td>${esc(h.symbol)}</td><td>${num(h.qty,0)}</td><td>${num(h.cost)}</td><td>${num(h.cost/h.qty,5)}</td></tr>`).join('')}</tbody></table></div><p class="research-note">Cost comes from the statement's Total Cost column. Earlier trades, realised returns and dividend history were not supplied. The cost-basis chart starts at import, not at purchase.</p></div>`;
}
function researchPage(t){
  if(!t.holdings.length)return '<div class="empty">Add holdings to see stock research.</div>';
  if(!t.holdings.some(h=>h.symbol===selectedResearch))selectedResearch=t.holdings[0].symbol;
  const h=t.holdings.find(h=>h.symbol===selectedResearch),m=marketFeed?.stocks?.[h.symbol],info=m?.info||{},note=state.research?.[h.symbol];
  const price=h.quote,lo=info.p12LowPrice,hi=info.p12HiPrice;
  const position=price!=null&&hi>lo?(price-lo)/(hi-lo)*100:null;
  const hist=(m?.history||[]).filter(x=>Number.isFinite(x.close)&&x.close>0).sort((a,b)=>a.date.localeCompare(b.date));
  const s20=sma(hist,20),s50=sma(hist,50),r14=rsi(hist);
  const fmt=v=>Number.isFinite(v)?num(v):'Not available';
  const reports=[...(m?.reports?.quarterly||[]),...(m?.reports?.annual||[])];
  const reviewStale=note&&reports.some(r=>r.uploadedDate&&r.uploadedDate>Date.parse(note.asOf+'T23:59:59+05:30'));
  return `${portfolioInsights(t)}<div class="panel research-panel"><div class="panel-head"><div><h2>Stock research</h2><p class="panel-subtitle">Fundamentals, price behaviour and the questions that matter.</p></div><button class="button secondary" data-action="refreshMarket">↻ Refresh data</button></div><label class="research-select">Choose a holding<select id="research-symbol">${t.holdings.map(x=>`<option ${x.symbol===h.symbol?'selected':''} value="${esc(x.symbol)}">${esc(x.symbol)} — ${esc(x.name)}</option>`).join('')}</select></label><h2>${esc(h.name)}</h2><p class="research-note">Quote: ${price===null?'Unavailable':money(price)} · quote date ${esc(h.quoteDate||'unknown')} · ${esc(marketMessage)}</p><div class="insight-grid"><article><small>YOUR WEIGHT</small><h3>${t.value&&h.value!==null?num(h.value/t.value*100,1)+'%':'—'}</h3></article><article><small>12-MONTH PRICE RANGE</small><h3>${fmt(lo)} – ${fmt(hi)}</h3></article><article><small>MARKET CAPITALISATION</small><h3>${m?.marketCap?money(m.marketCap):'Not available'}</h3></article><article><small>LATEST SESSION CHANGE</small><h3>${fmt(m?.percentageChange)}${Number.isFinite(m?.percentageChange)?'%':''}</h3></article></div><h3>Technical analysis</h3><p>${position===null?'The CSE range is unavailable for this stock.':`The quote is ${num(position,1)}% of the way from its reported 12-month low to high. ${position<20?'It is near the lower end of that range; this alone does not establish a reversal or make it cheap.':position>80?'It is near the upper end of that range; strength can persist, but this is not a valuation measure.':'It is trading within the middle of its reported range.'}`}</p><p>Reported month-to-date trading range: ${fmt(info.mtdLowPrice)}–${fmt(info.mtdHiPrice)}. These are observed extremes, not confirmed support or resistance levels.</p><div class="insight-grid"><article><small>SMA 20 SESSIONS</small><h3>${fmt(s20)}</h3></article><article><small>SMA 50 SESSIONS</small><h3>${fmt(s50)}</h3></article><article><small>RSI 14 (WILDER)</small><h3>${fmt(r14)}</h3></article></div><p class="research-note">${hist.length} daily observation(s) collected. SMA needs 20/50 observations; RSI needs at least 15. Values appear automatically when enough history exists. History is unadjusted: splits, rights issues and illiquid trading can distort these measures. No invented backfill.</p><h3>Fundamental review</h3>${reviewStale?'<p class="info-box">A newer filing is available. The written review below needs updating before you rely on it.</p>':''}${note?`<p><b>Reviewed ${esc(note.asOf||'')} · ${esc(note.period||'')}</b></p><div class="insight-grid">${(note.metrics||[]).map(x=>`<article><small>${esc(x.label)}</small><h3>${esc(x.value)}</h3></article>`).join('')}</div><p>${esc(note.summary||'')}</p><p><b>Watch:</b> ${esc(note.watch||'')}</p><p>${(note.sources||[]).map(s=>`<a class="text-button" href="${researchLink(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join(' · ')}</p>`:'<p>No reviewed financial assessment is stored for this holding yet. Use the latest filings below.</p>'}<p class="research-note">The written assessment is dated research, not automatically generated advice. Report links and market measures refresh automatically. Check newer filings before relying on an older assessment.</p><h3>Latest official filings</h3>${reports.length?`<ul class="report-list">${reports.map(r=>`<li><a href="${researchLink('https://cdn.cse.lk/'+r.path)}" target="_blank" rel="noopener noreferrer">${esc(r.fileText||'Financial report')} ↗</a> <small>Published ${r.uploadedDate?new Date(r.uploadedDate).toLocaleDateString('en-GB'):'date unavailable'}</small></li>`).join('')}</ul>`:'<p>Report feed unavailable for this stock.</p>'}<p><a class="text-button" href="https://www.cse.lk/company-profile?symbol=${encodeURIComponent(h.symbol)}" target="_blank" rel="noopener noreferrer">Official CSE profile and fundamental data ↗</a></p><p class="research-note">Research supports your own review; it does not promise returns or place trades. Market prices alone cannot establish fair value.</p></div>`;
}
