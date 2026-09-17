(async () => {
  const DB=await window.WORD_DATA_READY, days=DB.days, dates=DB.meta.dates, allWords=dates.flatMap(d=>days[d].words), $=id=>document.getElementById(id);
  const e={btn:$('randomBtn'),panel:$('randomPanel'),close:$('closeRandomBtn'),sourceLabel:$('randomSourceLabel'),total:$('randomTotal'),known:$('randomKnown'),unknown:$('randomUnknown'),word:$('randomWord'),pos:$('randomPos'),meaning:$('randomMeaning'),card:$('quizCard'),reveal:$('revealBtn'),judge:$('judgeActions'),knownBtn:$('knownBtn'),unknownBtn:$('unknownBtn'),skip:$('skipBtn'),speak:$('randomSpeakBtn'),dateInput:$('dateInput')};
  if(!e.btn||!e.panel)return;
  let source='day',current=null,previousId=null,stats={total:0,known:0,unknown:0};
  const activeDate=()=>{const v=e.dateInput?.value;return v&&days[v]?v:dates[dates.length-1]};
  const pool=()=>{const p=source==='all'?allWords:(days[activeDate()]?.words||[]);return p.length?p:allWords};
  const renderStats=()=>{e.total.textContent=stats.total;e.known.textContent=stats.known;e.unknown.textContent=stats.unknown};
  function pick(){const p=pool();if(!p.length)return;let n=p[Math.floor(Math.random()*p.length)];if(p.length>1&&n.id===previousId){for(let i=0;i<8&&n.id===previousId;i++)n=p[Math.floor(Math.random()*p.length)]}current=n;previousId=n.id;e.word.textContent=n.word;e.pos.textContent=n.pos;e.meaning.textContent=n.meaning;const d=new Date(activeDate()+'T00:00:00');e.sourceLabel.textContent=source==='all'?'全部词库':`${d.getMonth()+1}/${d.getDate()} 当天词表`;e.card.classList.remove('revealed');e.reveal.classList.remove('hidden');e.judge.classList.add('hidden')}
  function reset(){stats={total:0,known:0,unknown:0};previousId=null;renderStats();pick()}
  function open(){document.getElementById('toolsPanel')?.classList.remove('open');reset();document.body.classList.add('random-open');e.panel.classList.add('show');e.panel.setAttribute('aria-hidden','false')}
  function close(){document.body.classList.remove('random-open');e.panel.classList.remove('show');e.panel.setAttribute('aria-hidden','true');if('speechSynthesis'in window)window.speechSynthesis.cancel()}
  function reveal(){if(!current)return;e.card.classList.add('revealed');e.reveal.classList.add('hidden');e.judge.classList.remove('hidden')}
  function judge(known){if(!current)return;stats.total++;known?stats.known++:stats.unknown++;renderStats();pick()}
  function setSource(v){source=v;document.querySelectorAll('[data-random-source]').forEach(b=>b.classList.toggle('active',b.dataset.randomSource===source));reset()}
  function speak(){if(current)window.DW_SPEECH?.speak(current.word)}
  e.btn.addEventListener('click',open);e.close.addEventListener('click',close);e.reveal.addEventListener('click',reveal);e.knownBtn.addEventListener('click',()=>judge(true));e.unknownBtn.addEventListener('click',()=>judge(false));e.skip.addEventListener('click',pick);e.speak.addEventListener('click',speak);document.querySelectorAll('[data-random-source]').forEach(b=>b.addEventListener('click',()=>setSource(b.dataset.randomSource)));
  document.addEventListener('keydown',ev=>{if(!document.body.classList.contains('random-open'))return;if(ev.key==='Escape')close();else if(ev.code==='Space'&&!e.card.classList.contains('revealed')){ev.preventDefault();reveal()}});
})();
