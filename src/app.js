'use strict';
const E = TreasuresEngine;
const app = document.getElementById('app');
// This is a single-page calculator: native form navigation would lose all input.
// Install the guard once, before rendering or binding individual controls.
app.addEventListener('submit', event => event.preventDefault());
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function initial(currency='KRW') { return {meeting:'',date:today(),currency,people:[{id:1,name:''},{id:2,name:''}],expenses:[{id:3,detail:'',amount:'',tax:0,payer:'',members:[1,2]}]}; }
let data=initial(), lang='ko', view='home', result=null, nextId=4, selected=1, errors={}, notice='', copyStatus='', manualCopy='';
const t=()=>I18N[lang];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const locale=()=>({ko:'ko-KR',en:'en-US',ja:'ja-JP'}[lang]);
// The engine works in integer minor units; USD amounts are entered in dollars and settled in cents.
const CURRENCIES={KRW:{symbol:'₩',digits:0,ko:'원'},USD:{symbol:'$',digits:2,ko:'달러'},JPY:{symbol:'¥',digits:0,ko:'엔'}};
const cur=()=>CURRENCIES[data.currency]||CURRENCIES.KRW;
function minorUnits(value){const s=String(value).trim();if(!cur().digits)return s;const m=/^(\d+)(?:\.(\d{1,2}))?$/.exec(s);return m?String(Number(m[1])*100+Number((m[2]||'').padEnd(2,'0'))):s;}
function engineData(){return {...data,expenses:data.expenses.map(e=>({...e,amount:minorUnits(e.amount)}))};}
function engineErrors(){const found=E.validate(engineData());if(cur().digits)for(const key in found)if(found[key]==='amountError'||found[key]==='totalError')found[key]+='Usd';return found;}
const money=n=>{const c=cur(),value=n/10**c.digits,digits={minimumFractionDigits:c.digits,maximumFractionDigits:c.digits};return lang==='ko'?new Intl.NumberFormat('ko-KR',digits).format(value)+c.ko:new Intl.NumberFormat(locale(),{style:'currency',currency:data.currency,...digits}).format(value);};
const name=id=>data.people.find(p=>p.id===Number(id))?.name.trim()||`${t().emptyName} ${data.people.findIndex(p=>p.id===Number(id))+1}`;
const icon=(key)=>{const paths={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',input:'M8 4h12v16H4V8m1 6L15 4l4 4L9 18H5v-4',output:'M5 3h14v18l-3-2-4 2-4-2-3 2V3m3 5h8m-8 4h8m-8 4h4',copy:'M8 8h12v13H8V8M4 16V3h12',plus:'M12 5v14M5 12h14',people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',arrow:'M5 12h14m-6-6 6 6-6 6',check:'m5 12 4 4L19 6',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18'};return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[key]||paths.output}"/></svg>`;};
const brand=()=>`<div class="brand"><img src="assets/logo-mark.png" alt="" width="48" height="48"><span>${t().brand}</span></div>`;
function languageControl(){return `<label class="language-select">${icon('globe')}<span class="sr-only">${t().lang}</span><select id="language" aria-label="${t().lang}">${[['ko','한국어'],['en','English'],['ja','日本語']].map(([c,l])=>`<option value="${c}" ${c===lang?'selected':''}>${l}</option>`).join('')}</select></label>`;}
function err(key){const code=errors[key];return `<span class="field-error" id="error-${key}" ${code?'':'hidden'}>${code?t()[code]:''}</span>`;}
function invalidAttrs(key){return `aria-invalid="${Boolean(errors[key])}" aria-describedby="error-${key}"`;}
function render(focusId){persistSession();const m=t();document.documentElement.lang=lang;document.title=`${m.brand} · My AI Treasures`;app.innerHTML=`<a class="skip" href="#main">${m.skip}</a>${view==='home'?homeHTML():shellHTML()}<div id="live" class="sr-only" role="status" aria-live="polite"></div>${view!=='home'?dialogHTML()+memberDialogHTML():''}`;bind();if(focusId)requestAnimationFrame(()=>document.getElementById(focusId)?.focus());}
function homeHTML(){const m=t();return `<main id="main" class="landing"><header class="landing-header">${brand()}<span class="edition">My AI Treasures / 01</span></header><div class="landing-copy"><p class="eyebrow">${m.tag}</p><h1>${m.headline}</h1><p class="landing-lead">${m.lead}</p><div class="hero-actions"><button class="primary" data-action="start">${m.start}${icon('arrow')}</button><button class="quiet" data-action="demo">${m.demo}</button></div><p class="privacy">${icon('check')}${m.privacy}</p></div><div class="hero-art" aria-hidden="true"></div><footer class="landing-footer"><div class="language-pills" role="group" aria-label="${m.lang}">${[['ko','한국어'],['en','English'],['ja','日本語']].map(([c,l])=>`<button data-language="${c}" aria-pressed="${lang===c}">${l}</button>`).join('')}</div><p>${m.heroCaption}</p></footer></main>`;}
function shellHTML(){const m=t();return `<div class="app-shell"><aside class="sidebar"><div>${brand()}<p class="sidebar-caption">${m.quick}</p></div><div class="sidebar-nav"><p class="overline">My AI Treasures</p><button data-action="input" class="side-main ${view==='input'?'active':''}">${icon('input')}${m.input}<span>01</span></button><div class="section-links"><button data-section="meeting-section">${m.meetingNav}</button><button data-section="people-section">${m.peopleNav}</button><button data-section="expenses-section">${m.expensesNav}</button></div><button data-action="calculate" class="side-main ${view==='output'?'active':''}">${icon('output')}${m.output}<span>02</span></button></div><div class="sidebar-bottom"><div class="tiny-logo">✳</div><p>${m.local}</p><button class="secondary" data-action="new">${icon('plus')}${m.new}</button></div></aside><div class="main-shell"><header class="workspace-header"><div class="mobile-brand">${brand()}</div><div class="breadcrumb">${m.quick} <span>/</span> ${view==='input'?m.input:m.output}</div><div class="header-controls">${languageControl()}<button class="icon-button" data-action="home" aria-label="${m.home}" title="${m.home}">${icon('home')}</button></div></header><main id="main" class="workspace"><div class="page-intro"><div><p class="eyebrow">${view==='input'?m.step1:'04 · '+m.output}</p><h1>${view==='input'?m.title:m.resultTitle}</h1><p>${view==='input'?m.subtitle:`${esc(data.meeting)} · ${esc(data.date)}`}</p></div><div class="step-indicator" aria-hidden="true"><span class="${view==='input'?'current':'done'}">01</span><i></i><span class="${view==='output'?'current':''}">02</span></div></div><nav class="tabs" aria-label="${m.navLabel}"><button data-action="input" ${view==='input'?'aria-current="page"':''}>${icon('input')}${m.input}</button><button data-action="calculate" ${view==='output'?'aria-current="page"':''}>${icon('output')}${m.output}</button></nav><p class="home-hint">${icon('check')}${m.homeHint}</p><div id="notice" class="notice" role="status" ${notice?'':'hidden'}>${notice?m[notice]:''}</div>${view==='input'?inputHTML():outputHTML()}</main></div><nav class="mobile-nav" aria-label="${m.navLabel}"><button data-action="input" class="${view==='input'?'active':''}">${icon('input')}<span>${m.input}</span></button><button data-action="calculate" class="${view==='output'?'active':''}">${icon('output')}<span>${m.output}</span></button><button data-action="copy" ${view!=='output'?'disabled':''}>${icon('copy')}<span>${m.copy}</span></button><button data-action="new">${icon('plus')}<span>${m.new}</span></button></nav></div>`;}
function inputHTML(){const m=t();return `<div class="input-layout"><form id="settlement-form" novalidate><section class="card" id="meeting-section"><div class="card-heading"><span class="section-number">01</span><h2>${m.meetingNav}</h2></div><div class="meeting-fields"><label class="field field-wide">${m.meeting} <small>${m.required}</small><input id="meeting" data-root="meeting" maxlength="120" value="${esc(data.meeting)}" placeholder="${m.meetingPlaceholder}" required ${invalidAttrs('meeting')}>${err('meeting')}</label><label class="field">${m.date}<input id="date" type="date" data-root="date" value="${esc(data.date)}" required ${invalidAttrs('date')}>${err('date')}</label><label class="field">${m.currency}<select id="currency" data-root="currency" ${invalidAttrs('currency')}><option value="KRW" ${data.currency==='KRW'?'selected':''}>${m.krw}</option><option value="USD" ${data.currency==='USD'?'selected':''}>${m.usd}</option><option value="JPY" ${data.currency==='JPY'?'selected':''}>${m.jpy}</option></select>${err('currency')}</label></div><p class="help">${m.currencyHint}</p></section><section class="card" id="people-section"><div class="card-heading"><span class="section-number">02</span><h2>${m.peopleNav}</h2><span class="count-pill">${data.people.length}</span></div><p class="help">${m.peopleHelp}</p>${err('people')}<div class="people-list">${data.people.map((p,i)=>`<div class="person-box"><div class="person-input"><span class="avatar">${String(i+1).padStart(2,'0')}</span><label class="sr-only" for="person-${p.id}">${m.name} ${i+1}</label><input id="person-${p.id}" data-person="${p.id}" value="${esc(p.name)}" maxlength="80" placeholder="${m.namePlaceholder} ${i+1}" ${invalidAttrs('person-'+p.id)}><button type="button" class="icon-button remove" data-remove-person="${p.id}" aria-label="${m.remove} ${m.name} ${i+1}">${icon('trash')}</button></div>${err('person-'+p.id)}</div>`).join('')}</div><button type="button" class="add-button" data-action="add-person">${icon('plus')}${m.addPerson}</button></section><section class="card" id="expenses-section"><div class="card-heading"><span class="section-number">03</span><h2>${m.expensesNav}</h2><span class="count-pill">${data.expenses.length}</span></div>${err('expenses')}<div class="expense-list">${data.expenses.map(expenseHTML).join('')}</div><button type="button" class="add-button full" data-action="add-expense">${icon('plus')}${m.addExpense}</button><p class="help rule-help">${m.expenseHelp}</p></section><div id="error-summary" role="alert" ${Object.keys(errors).length?'':'hidden'} class="error-summary">${m.errorSummary}</div><button type="button" data-action="calculate" class="primary calculate-main">${m.calculate}${icon('arrow')}</button></form><aside class="summary-card"><span class="summary-decoration">✳</span><p class="eyebrow">${m.preview}</p><h2>${m.total}</h2><strong id="preview-total">${money(previewTotal())}</strong><dl><div><dt>${m.count}</dt><dd id="preview-people">${data.people.length} ${m.personUnit}</dd></div><div><dt>${m.expenseCount}</dt><dd>${data.expenses.length} ${m.expenseUnit}</dd></div></dl><p>${m.rule}</p><button class="primary" data-action="calculate">${m.calculate}${icon('arrow')}</button></aside></div>`;}
function previewTotal(){return engineData().expenses.reduce((s,e)=>s+(/^\d+$/.test(String(e.amount))&&Number(e.amount)<=E.LIMIT?E.final(e):0),0);}
function expenseHTML(e,i){const m=t();return `<article class="expense-item" data-expense="${e.id}"><div class="expense-top"><span class="expense-index">${String(i+1).padStart(2,'0')}</span><span class="expense-caption">${m.detail}</span><button type="button" class="icon-button remove" data-remove-expense="${e.id}" aria-label="${m.remove} ${m.detail} ${i+1}">${icon('trash')}</button></div><div class="expense-fields"><label class="field expense-detail">${m.detail}<input id="detail-${e.id}" data-field="detail" maxlength="200" value="${esc(e.detail)}" placeholder="${m.detailPlaceholder}" ${invalidAttrs('detail-'+e.id)}>${err('detail-'+e.id)}</label><div class="field amount-field"><label for="amount-${e.id}">${m.amount}</label><div class="amount-combo"><input id="amount-${e.id}" data-field="amount" inputmode="${cur().digits?'decimal':'numeric'}" value="${esc(e.amount)}" placeholder="${cur().digits?'0.00':'0'}" autocomplete="off" ${invalidAttrs('amount-'+e.id)}><span class="currency-symbol">${cur().symbol}</span><label class="sr-only" for="tax-${e.id}">${m.tax}</label><select id="tax-${e.id}" data-field="tax" class="tax-select" ${invalidAttrs('tax-'+e.id)}>${m.taxOptions.map((x,j)=>`<option value="${j}" ${e.tax===j?'selected':''}>${x}</option>`).join('')}</select></div>${err('amount-'+e.id)}${err('tax-'+e.id)}<span class="expense-subtotal">${subtotal(e)}</span></div><label class="field payer-field">${m.payer}<select id="payer-${e.id}" data-field="payer" ${invalidAttrs('payer-'+e.id)}><option value="">${m.choose}</option>${data.people.map(p=>`<option value="${p.id}" ${Number(e.payer)===p.id?'selected':''}>${esc(name(p.id))}</option>`).join('')}</select>${err('payer-'+e.id)}</label></div><fieldset class="members" id="members-${e.id}" ${invalidAttrs('members-'+e.id)}><legend>${m.members} <span class="members-count">${e.members.length}</span> ${m.selected}</legend><div class="member-options">${data.people.map(p=>`<label class="member-chip"><input type="checkbox" data-member="${p.id}" ${e.members.includes(p.id)?'checked':''}><span>${esc(name(p.id))}</span></label>`).join('')}</div><div class="member-actions"><button type="button" data-members-all="true">${m.selectAll}</button><button type="button" data-members-all="false">${m.selectNone}</button></div></fieldset>${err('members-'+e.id)}</article>`;}
function subtotal(e){const x={...e,amount:minorUnits(e.amount)};return /^\d+$/.test(x.amount)?`${t().addedTax} ${money(E.tax(x))} · ${t().final} ${money(E.final(x))}`:'';}
function outputHTML(){const m=t();return `<div class="results"><section class="card ledger-card"><div class="card-heading"><span class="section-number">01</span><h2>${m.ledgerTitle}</h2></div>${result.ledger.map(e=>`<article class="ledger-item"><div class="ledger-top"><div><h3>${esc(e.detail)}</h3><span>${m.payer}: ${esc(name(e.payer))}</span></div><strong>${money(e.final)}</strong></div><dl class="ledger-details"><div><dt>${m.amount}</dt><dd>${money(Number(e.amount))}</dd></div><div><dt>${m.taxOptions[e.tax]}</dt><dd>+ ${money(e.taxAmount)}</dd></div><div><dt>${m.base}</dt><dd>${money(e.base)}</dd></div></dl><div class="allocation-line"><span>${m.members}</span><div>${e.allocations.map(a=>`<span class="allocation">${esc(name(a.id))} <b>${money(a.share)}</b></span>`).join('')}</div></div><p class="help">${m.remainder}: ${money(e.remainder)} · ${m.extraPeople}: ${e.allocations.filter(a=>a.extra).map(a=>esc(name(a.id))).join(', ')||m.none}</p></article>`).join('')}</section><section class="total-strip" aria-label="${m.preview}"><div><span>${m.total}</span><strong>${money(result.total)}</strong></div><div><span>${m.count}</span><b>${data.people.length} ${m.personUnit}</b></div><div><span>${m.expenseCount}</span><b>${data.expenses.length} ${m.expenseUnit}</b></div><p>${m.rule}</p></section><section class="card people-results"><div class="card-heading"><span class="section-number">02</span><h2>${m.peopleSummary}</h2></div><div class="person-results-list">${result.rows.map(p=>`<article class="person-result"><div class="person-result-heading"><h3>${esc(p.name)}</h3><button type="button" class="secondary member-message-button" data-message-person="${p.id}" aria-label="${esc(p.name)} · ${m.writeMessage}">${icon('input')}${m.writeMessage}</button></div><dl><div><dt>${m.paid}</dt><dd>${money(p.paid)}</dd></div><div><dt>${m.share}</dt><dd>${money(p.share)}</dd></div><div><dt>${m.send}</dt><dd class="${p.balance>0?'highlight':''}">${money(Math.max(0,p.balance))}</dd></div><div><dt>${m.receive}</dt><dd>${money(Math.max(0,-p.balance))}</dd></div></dl></article>`).join('')}</div></section><section class="personal-card"><div class="personal-header"><p>${icon('arrow')}${m.personal}</p><label><span class="sr-only">${m.peopleNav}</span><select id="selected-person">${data.people.map(p=>`<option value="${p.id}" ${selected===p.id?'selected':''}>${esc(p.name.trim())}</option>`).join('')}</select></label></div><div id="personal-details">${personalHTML()}</div></section><section class="card all-transfers"><div class="card-heading"><span class="section-number">03</span><h2>${m.allTransfers}</h2></div>${result.transfers.length?result.transfers.map(x=>`<div class="transfer-line"><span>${esc(name(x.from))} <i>→</i> ${esc(name(x.to))}</span><strong>${money(x.amount)}</strong></div>`).join(''):`<p class="balanced">${icon('check')}${m.noTransfers}</p>`}</section><div class="result-actions"><button class="primary" data-action="copy">${icon('copy')}${m.copyFull}</button><button class="secondary" data-action="input">${m.edit}</button></div><p role="status" class="copy-status">${copyStatus?m[copyStatus]:''}</p>${manualCopy?`<section class="card manual-copy"><label class="field">${m.manual}<textarea readonly id="manual-text" rows="12">${esc(manualCopy)}</textarea></label><button class="secondary" data-action="select-copy">${m.selectText}</button></section>`:''}</div>`;}
function personalHTML(){const p=result.rows.find(p=>p.id===selected)||result.rows[0],m=t();const title=p.balance>0?m.sendTitle:p.balance<0?m.receiveTitle:m.balancedTitle;return `<p class="personal-title">${esc(p.name)}${title}</p><strong class="personal-amount">${money(Math.abs(p.balance))}</strong>${p.balance<=0?`<p class="no-send">${m.noSend}</p>`:''}<div class="personal-transfers">${result.transfers.filter(x=>p.balance>0?x.from===p.id:x.to===p.id).map(x=>`<div class="transfer-line"><span>${esc(name(x.from))} → ${esc(name(x.to))}</span><strong>${money(x.amount)}</strong></div>`).join('')}</div>`;}
function dialogHTML(){const m=t();return `<dialog id="reset-dialog" aria-labelledby="reset-title"><h2 id="reset-title">${m.confirmTitle}</h2><p>${m.confirmBody}</p><div class="dialog-actions"><button class="secondary" id="cancel-reset">${m.cancel}</button><button class="primary" id="confirm-reset">${m.confirm}</button></div></dialog>`;}
function invalidate(){persistSession();const hadResult=Boolean(result);result=null;copyStatus='';manualCopy='';if(hadResult){notice='changed';const el=document.getElementById('notice');if(el){el.hidden=false;el.textContent=t().changed;}}}
function clearError(key){delete errors[key];document.getElementById('error-'+key)?.setAttribute('hidden','');document.getElementById(key)?.setAttribute('aria-invalid','false');if(!Object.keys(errors).length)document.getElementById('error-summary')?.setAttribute('hidden','');}
function announce(key){const live=document.getElementById('live');if(live)live.textContent=t()[key];}
function navigate(next){view=next;render();window.scrollTo({top:0,behavior:'instant'});document.querySelector('.page-intro h1')?.setAttribute('tabindex','-1');document.querySelector('.page-intro h1')?.focus({preventScroll:true});}
function calculate(){errors=engineErrors();if(Object.keys(errors).length){notice='';view='input';const first=Object.keys(errors)[0];render();requestAnimationFrame(()=>{const el=document.getElementById(first)||document.getElementById(first+'-section');el?.scrollIntoView({block:'center',behavior:'instant'});if(el?.matches('input,select'))el.focus({preventScroll:true});});return;}result=E.settle(engineData());errors={};notice='';copyStatus='';manualCopy='';if(!data.people.some(p=>p.id===selected))selected=data.people[0].id;navigate('output');}
function changeLanguage(code){lang=code;copyStatus='';manualCopy='';render();}
function sample(){data={meeting:t().sampleMeeting,date:'2026-11-06',currency:'JPY',people:[{id:1,name:'A'},{id:2,name:'B'},{id:3,name:'C'}],expenses:[{id:4,detail:t().sampleDetails[0],amount:'1000',tax:1,payer:1,members:[1,2,3]},{id:5,detail:t().sampleDetails[1],amount:'500',tax:2,payer:2,members:[1,2,3]},{id:6,detail:t().sampleDetails[2],amount:'101',tax:3,payer:3,members:[1,2,3]}]};nextId=7;selected=2;errors={};invalidate();notice='';navigate('input');}
const compactCurrency=window.matchMedia('(max-width:1000px) and (orientation:landscape)');
function applyCurrencyLabels(){const select=document.getElementById('currency');if(!select)return;for(const option of select.options){option.dataset.full??=option.textContent;option.textContent=compactCurrency.matches?option.value:option.dataset.full;}select.title=compactCurrency.matches?select.options[select.selectedIndex]?.dataset.full||'':'';}
compactCurrency.addEventListener('change',applyCurrencyLabels);
function bind(){applyCurrencyLabels();app.querySelectorAll('button').forEach(button=>button.type='button');app.querySelectorAll('[data-language]').forEach(b=>b.onclick=()=>changeLanguage(b.dataset.language));const language=document.getElementById('language');if(language)language.onchange=()=>changeLanguage(language.value);app.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));if(view==='home')return;
const dialog=document.getElementById('reset-dialog');document.getElementById('cancel-reset').onclick=()=>dialog.close();document.getElementById('confirm-reset').onclick=()=>{data=initial(data.currency);nextId=4;selected=1;errors={};invalidate();notice='';navigate('input');};
app.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{if(view!=='input'){view='input';render();}document.getElementById(b.dataset.section)?.scrollIntoView({behavior:'instant',block:'start'});});
bindMemberMessages();
if(view==='output'){document.getElementById('selected-person').onchange=e=>{selected=Number(e.target.value);persistSession();document.getElementById('personal-details').innerHTML=personalHTML();};return;}
const form = document.getElementById('settlement-form');
form.onsubmit = event => event.preventDefault();
form.onkeydown = event => {
  // Enter in text fields must not calculate, reload, or interrupt IME composition.
  if (event.key === 'Enter' && event.target.matches('input') && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
  }
};
app.querySelectorAll('[data-root]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{data[el.dataset.root]=el.value;invalidate();clearError(el.dataset.root);if(el.dataset.root==='currency')render();}));
app.querySelectorAll('[data-person]').forEach(el=>el.oninput=()=>{data.people.find(p=>p.id===Number(el.dataset.person)).name=el.value;invalidate();clearError('person-'+el.dataset.person);app.querySelectorAll('[data-field="payer"]').forEach(s=>Array.from(s.options).forEach(o=>{if(o.value)o.textContent=name(o.value);}));app.querySelectorAll('[data-member]').forEach(c=>c.nextElementSibling.textContent=name(c.dataset.member));});
app.querySelectorAll('[data-remove-person]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.removePerson);if(data.expenses.some(e=>Number(e.payer)===id)){notice='payerDelete';render();return;}data.people=data.people.filter(p=>p.id!==id);data.expenses.forEach(e=>e.members=e.members.filter(x=>x!==id));invalidate();errors={};render();});
app.querySelectorAll('[data-expense]').forEach(row=>{const e=data.expenses.find(e=>e.id===Number(row.dataset.expense));row.querySelectorAll('[data-field]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{e[el.dataset.field]=el.dataset.field==='tax'?Number(el.value):el.value;invalidate();clearError(`${el.dataset.field}-${e.id}`);row.querySelector('.expense-subtotal').textContent=subtotal(e);document.getElementById('preview-total').textContent=money(previewTotal());}));row.querySelectorAll('[data-member]').forEach(c=>c.onchange=()=>{const id=Number(c.dataset.member);e.members=c.checked?[...new Set([...e.members,id])]:e.members.filter(x=>x!==id);invalidate();clearError('members-'+e.id);row.querySelector('.members-count').textContent=e.members.length;});row.querySelectorAll('[data-members-all]').forEach(b=>b.onclick=()=>{e.members=b.dataset.membersAll==='true'?data.people.map(p=>p.id):[];invalidate();clearError('members-'+e.id);render();});row.querySelector('[data-remove-expense]').onclick=()=>{data.expenses=data.expenses.filter(x=>x.id!==e.id);invalidate();errors={};render();};});}
function action(key){if(key==='start'){navigate('input');return;}if(key==='demo'){sample();return;}if(key==='home'){lang='ko';view='home';errors={};invalidate();notice='';render();window.scrollTo(0,0);return;}if(key==='input'){navigate('input');return;}if(key==='calculate'){calculate();return;}if(key==='new'){document.getElementById('reset-dialog').showModal();return;}if(key==='copy'){if(result)copyGuide();return;}if(key==='select-copy'){document.getElementById('manual-text').focus();document.getElementById('manual-text').select();return;}if(key==='add-person'){const id=nextId++;data.people.push({id,name:''});invalidate();notice='newPersonHint';errors={};render('person-'+id);return;}if(key==='add-expense'){const id=nextId++;data.expenses.push({id,detail:'',amount:'',tax:0,payer:'',members:data.people.map(p=>p.id)});invalidate();errors={};render('detail-'+id);}}
function guideText(){const m=t();return [`${data.meeting.trim()} · ${data.date}`,`${m.currency}: ${data.currency}`,`${m.total}: ${money(result.total)}`,'',`[${m.expensesNav}]`,...result.ledger.map(e=>`${e.detail} | ${m.payer}: ${name(e.payer)} | ${m.amount}: ${money(Number(e.amount))} | ${m.taxOptions[e.tax]} | ${m.addedTax}: ${money(e.taxAmount)} | ${m.final}: ${money(e.final)} | ${m.members}: ${e.allocations.map(a=>`${name(a.id)} ${money(a.share)}`).join(', ')}`),'',`[${m.peopleSummary}]`,...result.rows.map(p=>`${p.name} | ${m.paid}: ${money(p.paid)} | ${m.share}: ${money(p.share)} | ${m.send}: ${money(Math.max(p.balance,0))} | ${m.receive}: ${money(Math.max(-p.balance,0))}`),'',`[${m.allTransfers}]`,...(result.transfers.length?result.transfers.map(x=>`${name(x.from)} → ${name(x.to)}: ${money(x.amount)}`):[m.noTransfers])].join('\n');}
async function copyGuide(){const text=guideText();try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);copyStatus='copied';manualCopy='';}catch{copyStatus='copyFailed';manualCopy=text;}const y=window.scrollY;render();window.scrollTo(0,y);announce(copyStatus);if(manualCopy)document.getElementById('manual-text').scrollIntoView({block:'center',behavior:'instant'});}


// Individual message drafts are derived only from the current calculated result.
function memberMessageText(id) {
  if (!result) return '';
  const p = result.rows.find(row => row.id === id);
  if (!p) return '';
  const m = t();
  const summary = p.balance > 0 ? m.send : p.balance < 0 ? m.receive : m.messageSettled;
  const transfers = result.transfers.filter(x => x.from === id || x.to === id);
  return [
    `${m.messageRecipient}: ${p.name}`,
    `${data.meeting.trim()} · ${data.date}`,
    '', guideText(), '',
    `[${m.memberMessageSummary}]`,
    `${m.name}: ${p.name}`,
    `${m.paid}: ${money(p.paid)}`,
    `${m.share}: ${money(p.share)}`,
    `${summary}: ${money(Math.abs(p.balance))}`,
    ...(p.balance <= 0 ? [m.noSend] : []),
    ...transfers.map(x => `${name(x.from)} → ${name(x.to)}: ${money(x.amount)}`)
  ].join('\n');
}
function memberDialogHTML() {
  const m = t();
  return `<dialog id="member-message-dialog" class="member-message-dialog" aria-labelledby="member-message-title"><div class="message-dialog-heading"><h2 id="member-message-title">${m.writeMessage}</h2><button type="button" class="icon-button" id="close-member-message" aria-label="${m.closeMessage}">×</button></div><p class="help">${m.messageHelp}</p><label class="field">${m.messageText}<textarea id="member-message-text" rows="15" readonly></textarea></label><p id="member-message-status" class="copy-status" role="status" aria-live="polite"></p><div class="message-dialog-actions"><button type="button" class="primary" id="copy-member-message">${icon('copy')}${m.copyMessage}</button><button type="button" class="secondary" id="select-member-message">${m.selectText}</button></div></dialog>`;
}
function bindMemberMessages() {
  const dialog = document.getElementById('member-message-dialog');
  if (!dialog) return;
  const text = document.getElementById('member-message-text');
  const status = document.getElementById('member-message-status');
  app.querySelectorAll('[data-message-person]').forEach(button => button.onclick = () => {
    text.value = memberMessageText(Number(button.dataset.messagePerson));
    status.textContent = '';
    dialog.showModal();
    document.getElementById('close-member-message').focus();
  });
  document.getElementById('close-member-message').onclick = () => dialog.close();
  document.getElementById('select-member-message').onclick = () => { text.focus(); text.select(); };
  document.getElementById('copy-member-message').onclick = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text.value);
      status.textContent = t().messageCopied;
    } catch {
      status.textContent = t().copyFailed;
      text.focus(); text.select();
    }
  };
}


// Session-only persistence: no account, network request, localStorage or cookies.
const sessionStore = TreasuresStorage.createSessionStore();
let persistenceReady = false;
let saveQueue = Promise.resolve();
function persistSession() {
  if (!persistenceReady) return;
  const snapshot = JSON.parse(JSON.stringify({version:1,data,lang,view,selected}));
  saveQueue = saveQueue.catch(() => {}).then(() => sessionStore.save(snapshot)).catch(() => {
    notice = 'storageUnavailable';
    const el = document.getElementById('notice');
    if (el) { el.hidden = false; el.textContent = t().storageUnavailable; }
  });
}
function restoreSnapshot(snapshot) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.data) return false;
  const d = snapshot.data;
  const id = value => Number.isSafeInteger(value) && value > 0;
  const text = value => typeof value === 'string';
  if (!text(d.meeting) || !text(d.date) || !['KRW','USD','JPY'].includes(d.currency) || !Array.isArray(d.people) || !Array.isArray(d.expenses)) return false;
  if (!d.people.every(p => p && id(p.id) && text(p.name))) return false;
  if (new Set(d.people.map(p => p.id)).size !== d.people.length) return false;
  if (!d.expenses.every(e => e && id(e.id) && text(e.detail) && text(e.amount) && (text(e.payer)||id(e.payer)) && Number.isInteger(e.tax) && e.tax>=0 && e.tax<=3 && Array.isArray(e.members) && e.members.every(id))) return false;
  const ids = [...d.people.map(p=>p.id),...d.expenses.map(e=>e.id)];
  if (new Set(ids).size !== ids.length || ids.some(x=>x>=Number.MAX_SAFE_INTEGER)) return false;
  // Copy known fields only; never trust a stored object as HTML or executable code.
  data = {meeting:d.meeting,date:d.date,currency:d.currency,people:d.people.map(p=>({id:p.id,name:p.name})),expenses:d.expenses.map(e=>({id:e.id,detail:e.detail,amount:e.amount,tax:e.tax,payer:e.payer,members:[...e.members]}))};
  lang = ['ko','en','ja'].includes(snapshot.lang) ? snapshot.lang : 'ko';
  selected = data.people.some(p=>p.id===snapshot.selected) ? snapshot.selected : (data.people[0]?.id||1);
  nextId = Math.max(0,...ids)+1;
  view = ['home','input','output'].includes(snapshot.view) ? snapshot.view : 'input';
  if (view === 'output') {
    if (Object.keys(E.validate(engineData())).length) view='input';
    else result=E.settle(engineData());
  }
  return true;
}
async function restoreSession() {
  try {
    const snapshot = await sessionStore.load();
    if (snapshot && !restoreSnapshot(snapshot)) await sessionStore.clear();
  } catch { notice='storageUnavailable'; }
  persistenceReady=true;
  render();
}

restoreSession();
