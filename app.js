(async () => {
  const DB = await window.WORD_DATA_READY;
  const days = DB.days;
  const dates = DB.meta.dates;
  const $ = id => document.getElementById(id);

  const els = {
    focusDate:$('focusDate'), focusMeta:$('focusMeta'), focusProgressFill:$('focusProgressFill'), focusProgressText:$('focusProgressText'),
    toolsToggle:$('toolsToggle'), toolsBtn:$('toolsBtn'), toolsPanel:$('toolsPanel'), meaningToggle:$('meaningToggle'), settingsBtn:$('settingsBtn'),
    prevDay:$('prevDay'), nextDay:$('nextDay'), dateStrip:$('dateStrip'), searchInput:$('searchInput'), filters:$('filters'), dateInput:$('dateInput'), todayBtn:$('todayBtn'), continueBtn:$('continueBtn'),
    doneCount:$('doneCount'), remainCount:$('remainCount'), resultCount:$('resultCount'), wordGrid:$('wordGrid'), emptyState:$('emptyState'), emptyTitle:$('emptyTitle'), emptyText:$('emptyText'),
    overlay:$('overlay'), settingsPanel:$('settingsPanel'), closeSettingsBtn:$('closeSettingsBtn'), resetDisplayBtn:$('resetDisplayBtn'),
    uiScaleInput:$('uiScaleInput'), uiScaleValue:$('uiScaleValue'), wordScaleInput:$('wordScaleInput'), wordScaleValue:$('wordScaleValue'), cardMinInput:$('cardMinInput'), cardMinValue:$('cardMinValue'), cardPaddingInput:$('cardPaddingInput'), cardPaddingValue:$('cardPaddingValue')
  };

  const defaults = {uiScale:108,wordScale:108,cardMin:310,cardPadding:22};
  let displaySettings = loadDisplaySettings();
  let activeDate = pickInitialDate();
  let activeFilter = 'all';
  let query = '';
  let meaningsHidden = false;
  let toolsOpen = false;

  els.dateInput.min = DB.meta.startDate;
  els.dateInput.max = DB.meta.endDate;
  applyDisplaySettings(displaySettings,false);
  applyTheme(document.documentElement.dataset.theme || 'dark');

  function localISODate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function parseDate(iso){const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d)}
  function pickInitialDate(){const t=localISODate();if(days[t])return t;if(t<DB.meta.startDate)return DB.meta.startDate;if(t>DB.meta.endDate)return DB.meta.endDate;return dates.reduce((best,d)=>Math.abs(parseDate(d)-parseDate(t))<Math.abs(parseDate(best)-parseDate(t))?d:best,dates[0])}
  function getLearned(date){try{return new Set(JSON.parse(localStorage.getItem(`daily-words:${date}`)||'[]'))}catch{return new Set()}}
  function saveLearned(date,set){localStorage.setItem(`daily-words:${date}`,JSON.stringify([...set]))}
  function toggleLearned(id){const set=getLearned(activeDate);set.has(id)?set.delete(id):set.add(id);saveLearned(activeDate,set);renderWords();renderHeader()}

  function renderAll(){renderHeader();renderStrip();renderWords();updateNav();els.dateInput.value=activeDate}
  function renderHeader(){
    const day=days[activeDate]; const d=parseDate(activeDate); const learned=getLearned(activeDate); const total=day.words.length; const done=day.words.filter(w=>learned.has(w.id)).length; const pct=total?Math.round(done/total*100):0;
    els.focusDate.textContent=`${d.getMonth()+1}月${d.getDate()}日`;
    els.focusMeta.textContent=day.type==='休息'?'休息日':`Day ${day.day} · ${day.count}词`;
    els.focusProgressFill.style.width=`${pct}%`; els.focusProgressText.textContent=`${done} / ${total}`;
    els.doneCount.textContent=done; els.remainCount.textContent=Math.max(0,total-done);
  }
  function renderStrip(){
    const idx=dates.indexOf(activeDate);let start=Math.max(0,idx-3);let end=Math.min(dates.length,start+7);start=Math.max(0,end-7);
    els.dateStrip.innerHTML=dates.slice(start,end).map(iso=>{const day=days[iso];const d=parseDate(iso);const cls=['day-chip',iso===activeDate?'active':'',day.type==='休息'?'rest':''].filter(Boolean).join(' ');return `<button type="button" class="${cls}" data-date="${iso}"><strong>${d.getMonth()+1}/${d.getDate()}</strong><span>${day.type==='休息'?'休息':`${day.count}词`}</span></button>`}).join('');
  }
  function renderWords(){
    const day=days[activeDate];const learned=getLearned(activeDate);document.body.classList.toggle('hide-meanings',meaningsHidden);els.meaningToggle.classList.toggle('active',meaningsHidden);els.meaningToggle.setAttribute('aria-label',meaningsHidden?'显示释义':'隐藏释义');
    if(!day.words.length){els.wordGrid.innerHTML='';els.wordGrid.style.display='none';els.emptyState.classList.remove('hidden');els.emptyTitle.textContent=day.type==='休息'?'今天是休息日':'这一天没有新词';els.emptyText.textContent='可以打开工具切换到其他学习日期。';els.resultCount.textContent='0';return}
    const q=query.trim().toLowerCase(); const list=day.words.filter(w=>{const mq=!q||w.word.toLowerCase().includes(q)||w.meaning.toLowerCase().includes(q);const mf=activeFilter==='all'||(activeFilter==='unlearned'?!learned.has(w.id):w.levelCode===activeFilter);return mq&&mf});
    els.resultCount.textContent=list.length;els.wordGrid.style.display='grid';els.emptyState.classList.add('hidden');els.wordGrid.innerHTML=list.map(w=>wordCard(w,learned.has(w.id))).join('');
    if(!list.length){els.wordGrid.style.display='none';els.emptyState.classList.remove('hidden');els.emptyTitle.textContent='没有匹配结果';els.emptyText.textContent='打开工具调整搜索或筛选条件。'}
  }
  function wordCard(w,isLearned){const freq=w.frequency?`真题频次 ${w.frequency}`:'频次 —';return `<article class="word-card ${isLearned?'learned':''}" data-id="${w.id}"><div class="card-top"><div><div class="word-index">#${String(w.id).padStart(4,'0')}</div><div class="word-main"><div class="word-headline"><h3>${escapeHTML(w.word)}</h3><span class="pos-chip">${escapeHTML(w.pos)}</span></div></div></div><div class="card-actions"><button class="icon-button speak" type="button" data-word="${escapeAttr(w.word)}" aria-label="朗读 ${escapeAttr(w.word)}"><svg viewBox="0 0 24 24"><path d="M5 10v4h4l5 4V6L9 10H5Z"/><path d="M17 9c1 .8 1.5 1.8 1.5 3S18 14.2 17 15"/><path d="M19 6.5c1.7 1.4 2.5 3.2 2.5 5.5S20.7 16.1 19 17.5"/></svg></button><button class="icon-button learn-toggle ${isLearned?'active':''}" type="button" data-learn="${w.id}" aria-label="${isLearned?'取消掌握':'标记掌握'}"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 7"/></svg></button></div></div><p class="meaning">${escapeHTML(w.meaning)}</p><div class="card-meta"><span class="badge level-${w.levelCode||'X'}">${escapeHTML(w.level)}</span><span class="badge">${freq}</span></div></article>`}
  function escapeHTML(str){return String(str).replace(/[&<>'"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[s]))} function escapeAttr(str){return escapeHTML(str)}
  function speak(word){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=.88;const voices=window.speechSynthesis.getVoices();const preferred=voices.find(v=>/Microsoft.*(Aria|Jenny|Guy)|Samantha|Google US English/i.test(v.name)&&/^en/i.test(v.lang))||voices.find(v=>/^en-US/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));if(preferred)u.voice=preferred;window.speechSynthesis.speak(u)}
  function goDate(iso){if(!days[iso])return;activeDate=iso;query='';els.searchInput.value='';renderAll();window.scrollTo({top:0,behavior:'smooth'})}
  function moveDate(offset){const idx=dates.indexOf(activeDate);const next=dates[idx+offset];if(next)goDate(next)}
  function updateNav(){const idx=dates.indexOf(activeDate);els.prevDay.disabled=idx<=0;els.nextDay.disabled=idx>=dates.length-1}
  function setTools(open){toolsOpen=open;els.toolsPanel.classList.toggle('open',open);els.toolsPanel.setAttribute('aria-hidden',String(!open));els.toolsBtn.classList.toggle('active',open);els.toolsBtn.setAttribute('aria-expanded',String(open));els.toolsToggle.setAttribute('aria-expanded',String(open))}
  function openSettings(){document.body.classList.add('panel-open');els.overlay.classList.add('show');els.settingsPanel.classList.add('show');els.settingsPanel.setAttribute('aria-hidden','false')}
  function closeSettings(){document.body.classList.remove('panel-open');els.overlay.classList.remove('show');els.settingsPanel.classList.remove('show');els.settingsPanel.setAttribute('aria-hidden','true')}

  function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem('daily-words:theme',theme);document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===theme))}
  function clamp(v,min,max){v=Number(v);return Number.isFinite(v)?Math.min(max,Math.max(min,v)):min}
  function loadDisplaySettings(){try{const s=JSON.parse(localStorage.getItem('daily-words:display-v2')||'{}');return{uiScale:clamp(s.uiScale??defaults.uiScale,90,130),wordScale:clamp(s.wordScale??defaults.wordScale,95,145),cardMin:clamp(s.cardMin??defaults.cardMin,250,460),cardPadding:clamp(s.cardPadding??defaults.cardPadding,16,34)}}catch{return{...defaults}}}
  function applyDisplaySettings(s,persist=true){document.documentElement.style.setProperty('--ui-scale',(s.uiScale/100).toFixed(2));document.documentElement.style.setProperty('--word-scale',(s.wordScale/100).toFixed(2));document.documentElement.style.setProperty('--card-min',`${s.cardMin}px`);document.documentElement.style.setProperty('--card-pad',`${s.cardPadding}px`);els.uiScaleInput.value=s.uiScale;els.wordScaleInput.value=s.wordScale;els.cardMinInput.value=s.cardMin;els.cardPaddingInput.value=s.cardPadding;els.uiScaleValue.textContent=`${s.uiScale}%`;els.wordScaleValue.textContent=`${s.wordScale}%`;els.cardMinValue.textContent=`${s.cardMin} px`;els.cardPaddingValue.textContent=`${s.cardPadding} px`;if(persist)localStorage.setItem('daily-words:display-v2',JSON.stringify(s))}
  function updateDisplay(){displaySettings={uiScale:clamp(els.uiScaleInput.value,90,130),wordScale:clamp(els.wordScaleInput.value,95,145),cardMin:clamp(els.cardMinInput.value,250,460),cardPadding:clamp(els.cardPaddingInput.value,16,34)};applyDisplaySettings(displaySettings,true)}

  els.toolsBtn.addEventListener('click',()=>setTools(!toolsOpen));els.toolsToggle.addEventListener('click',()=>setTools(!toolsOpen));
  els.prevDay.addEventListener('click',()=>moveDate(-1));els.nextDay.addEventListener('click',()=>moveDate(1));els.todayBtn.addEventListener('click',()=>goDate(pickInitialDate()));
  els.dateStrip.addEventListener('click',e=>{const b=e.target.closest('[data-date]');if(b)goDate(b.dataset.date)});
  els.dateInput.addEventListener('change',e=>{const selected=e.target.value;if(days[selected])goDate(selected);else{const target=parseDate(selected);const nearest=dates.reduce((best,d)=>Math.abs(parseDate(d)-target)<Math.abs(parseDate(best)-target)?d:best,dates[0]);goDate(nearest)}});
  els.searchInput.addEventListener('input',e=>{query=e.target.value;renderWords()});els.filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;activeFilter=b.dataset.filter;[...els.filters.querySelectorAll('.filter')].forEach(x=>x.classList.toggle('active',x===b));renderWords()});
  els.wordGrid.addEventListener('click',e=>{const s=e.target.closest('.speak');if(s)return speak(s.dataset.word);const l=e.target.closest('[data-learn]');if(l)toggleLearned(Number(l.dataset.learn))});
  els.meaningToggle.addEventListener('click',()=>{meaningsHidden=!meaningsHidden;renderWords()});
  els.continueBtn.addEventListener('click',()=>{const day=days[activeDate],learned=getLearned(activeDate),next=day.words.find(w=>!learned.has(w.id));if(!next)return;setTools(false);requestAnimationFrame(()=>document.querySelector(`[data-id="${next.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}))});
  els.settingsBtn.addEventListener('click',openSettings);els.closeSettingsBtn.addEventListener('click',closeSettings);els.overlay.addEventListener('click',closeSettings);document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.themeChoice)));
  ['input','change'].forEach(evt=>{els.uiScaleInput.addEventListener(evt,updateDisplay);els.wordScaleInput.addEventListener(evt,updateDisplay);els.cardMinInput.addEventListener(evt,updateDisplay);els.cardPaddingInput.addEventListener(evt,updateDisplay)});els.resetDisplayBtn.addEventListener('click',()=>{displaySettings={...defaults};applyDisplaySettings(displaySettings,true)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){setTools(false);closeSettings()}if(e.target.matches('input'))return;if(e.key==='ArrowLeft')moveDate(-1);if(e.key==='ArrowRight')moveDate(1)});

  renderAll();
})();
