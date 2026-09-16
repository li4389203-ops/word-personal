(async () => {
  const DB = await window.WORD_DATA_READY;
  const days = DB.days;
  const dates = DB.meta.dates;
  const allWords = dates.flatMap(date => days[date].words);
  const $ = id => document.getElementById(id);
  const els = {
    btn:$('randomBtn'), overlay:$('randomOverlay'), panel:$('randomPanel'), close:$('closeRandomBtn'),
    sourceLabel:$('randomSourceLabel'), total:$('randomTotal'), known:$('randomKnown'), unknown:$('randomUnknown'),
    word:$('randomWord'), pos:$('randomPos'), meaning:$('randomMeaning'), card:$('quizCard'), reveal:$('revealBtn'),
    judge:$('judgeActions'), knownBtn:$('knownBtn'), unknownBtn:$('unknownBtn'), skip:$('skipBtn'), speak:$('randomSpeakBtn'), dateInput:$('dateInput')
  };
  if (!els.btn || !els.panel) return;

  let source = 'day';
  let current = null;
  let previousId = null;
  let stats = {total:0,known:0,unknown:0};

  function activeDate(){
    const v = els.dateInput?.value;
    return v && days[v] ? v : dates[dates.length - 1];
  }
  function pool(){
    const p = source === 'all' ? allWords : (days[activeDate()]?.words || []);
    return p.length ? p : allWords;
  }
  function parseDate(iso){const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d)}
  function renderStats(){els.total.textContent=stats.total;els.known.textContent=stats.known;els.unknown.textContent=stats.unknown}
  function pick(){
    const p=pool(); if(!p.length) return;
    let next=p[Math.floor(Math.random()*p.length)];
    if(p.length>1 && next.id===previousId){for(let i=0;i<8&&next.id===previousId;i++)next=p[Math.floor(Math.random()*p.length)]}
    current=next;previousId=next.id;
    els.word.textContent=next.word;els.pos.textContent=next.pos;els.meaning.textContent=next.meaning;
    const d=parseDate(activeDate());els.sourceLabel.textContent=source==='all'?'全部词库':`${d.getMonth()+1}/${d.getDate()} 当天词表`;
    els.card.classList.remove('revealed');els.reveal.classList.remove('hidden');els.judge.classList.add('hidden');
  }
  function reset(){stats={total:0,known:0,unknown:0};previousId=null;renderStats();pick()}
  function open(){
    document.getElementById('toolsPanel')?.classList.remove('open');
    reset();document.body.classList.add('random-open');els.overlay.classList.add('show');els.panel.classList.add('show');els.panel.setAttribute('aria-hidden','false');
  }
  function close(){
    document.body.classList.remove('random-open');els.overlay.classList.remove('show');els.panel.classList.remove('show');els.panel.setAttribute('aria-hidden','true');
    if('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
  function reveal(){if(!current)return;els.card.classList.add('revealed');els.reveal.classList.add('hidden');els.judge.classList.remove('hidden')}
  function judge(known){if(!current)return;stats.total++;known?stats.known++:stats.unknown++;renderStats();pick()}
  function setSource(next){source=next;document.querySelectorAll('[data-random-source]').forEach(b=>b.classList.toggle('active',b.dataset.randomSource===source));reset()}
  function speak(){
    if(!current||!('speechSynthesis' in window))return;
    window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(current.word);u.lang='en-US';u.rate=.88;
    const voices=window.speechSynthesis.getVoices();u.voice=voices.find(v=>/^en-US/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;window.speechSynthesis.speak(u);
  }

  els.btn.addEventListener('click',open);els.close.addEventListener('click',close);els.overlay.addEventListener('click',close);
  els.reveal.addEventListener('click',reveal);els.knownBtn.addEventListener('click',()=>judge(true));els.unknownBtn.addEventListener('click',()=>judge(false));els.skip.addEventListener('click',pick);els.speak.addEventListener('click',speak);
  document.querySelectorAll('[data-random-source]').forEach(b=>b.addEventListener('click',()=>setSource(b.dataset.randomSource)));
  document.addEventListener('keydown',e=>{
    if(!document.body.classList.contains('random-open'))return;
    if(e.key==='Escape')close();
    else if(e.code==='Space'&&!els.card.classList.contains('revealed')){e.preventDefault();reveal()}
  });
})();
