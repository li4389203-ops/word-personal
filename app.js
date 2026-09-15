(async () => {
  const DB = await window.WORD_DATA_READY;
  const days = DB.days;
  const dates = DB.meta.dates;
  const fmtWeek = ['日','一','二','三','四','五','六'];

  const $ = (id) => document.getElementById(id);
  const els = {
    dateInput: $('dateInput'), todayBtn: $('todayBtn'), eyebrow: $('eyebrow'), dateTitle: $('dateTitle'), daySummary: $('daySummary'),
    progressRing: $('progressRing'), progressPercent: $('progressPercent'), doneCount: $('doneCount'), remainCount: $('remainCount'), totalCount: $('totalCount'),
    dateStrip: $('dateStrip'), prevDay: $('prevDay'), nextDay: $('nextDay'), searchInput: $('searchInput'), filters: $('filters'), resultCount: $('resultCount'),
    wordGrid: $('wordGrid'), emptyState: $('emptyState'), emptyTitle: $('emptyTitle'), emptyText: $('emptyText'), meaningToggle: $('meaningToggle'), continueBtn: $('continueBtn'), footerRange: $('footerRange'),
    themeToggle: $('themeToggle'), themeLabel: $('themeLabel'), settingsBtn: $('settingsBtn'), settingsPanel: $('settingsPanel'), closeSettingsBtn: $('closeSettingsBtn'), overlay: $('overlay'),
    uiScaleInput: $('uiScaleInput'), uiScaleValue: $('uiScaleValue'), wordScaleInput: $('wordScaleInput'), wordScaleValue: $('wordScaleValue'),
    cardMinInput: $('cardMinInput'), cardMinValue: $('cardMinValue'), cardPaddingInput: $('cardPaddingInput'), cardPaddingValue: $('cardPaddingValue'),
    resetDisplayBtn: $('resetDisplayBtn'), toggleMeaningInPanel: $('toggleMeaningInPanel')
  };

  let activeDate = pickInitialDate();
  let activeFilter = 'all';
  let query = '';
  let meaningsHidden = false;

  const defaultDisplay = { uiScale: 108, wordScale: 108, cardMin: 310, cardPadding: 22 };
  let displaySettings = loadDisplaySettings();

  applyTheme(currentTheme());
  applyDisplaySettings(displaySettings, false);

  els.dateInput.min = DB.meta.startDate;
  els.dateInput.max = DB.meta.endDate;
  els.totalCount.textContent = DB.meta.totalWords;
  els.footerRange.textContent = `${displayDate(DB.meta.startDate)} — ${displayDate(DB.meta.endDate)}`;

  function currentTheme() {
    return document.documentElement.dataset.theme || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('daily-words:theme', theme);
    els.themeLabel.textContent = theme === 'dark' ? '浅色' : '深色';
    els.themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
  }

  function loadDisplaySettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('daily-words:display-v2') || '{}');
      return {
        uiScale: clampNum(saved.uiScale ?? defaultDisplay.uiScale, 90, 130),
        wordScale: clampNum(saved.wordScale ?? defaultDisplay.wordScale, 95, 145),
        cardMin: clampNum(saved.cardMin ?? defaultDisplay.cardMin, 250, 460),
        cardPadding: clampNum(saved.cardPadding ?? defaultDisplay.cardPadding, 16, 34),
      };
    } catch {
      return { ...defaultDisplay };
    }
  }

  function saveDisplaySettings() {
    localStorage.setItem('daily-words:display-v2', JSON.stringify(displaySettings));
  }

  function clampNum(v, min, max) {
    v = Number(v);
    if (Number.isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  function applyDisplaySettings(settings, persist = true) {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', (settings.uiScale / 100).toFixed(2));
    root.style.setProperty('--word-scale', (settings.wordScale / 100).toFixed(2));
    root.style.setProperty('--card-min', settings.cardMin + 'px');
    root.style.setProperty('--card-pad', settings.cardPadding + 'px');
    els.uiScaleInput.value = settings.uiScale;
    els.wordScaleInput.value = settings.wordScale;
    els.cardMinInput.value = settings.cardMin;
    els.cardPaddingInput.value = settings.cardPadding;
    els.uiScaleValue.textContent = `${settings.uiScale}%`;
    els.wordScaleValue.textContent = `${settings.wordScale}%`;
    els.cardMinValue.textContent = `${settings.cardMin} px`;
    els.cardPaddingValue.textContent = `${settings.cardPadding} px`;
    if (persist) saveDisplaySettings();
  }

  function openSettings() {
    document.body.classList.add('panel-open');
    els.overlay.classList.add('show');
    els.settingsPanel.classList.add('show');
    els.settingsPanel.setAttribute('aria-hidden', 'false');
  }

  function closeSettings() {
    document.body.classList.remove('panel-open');
    els.overlay.classList.remove('show');
    els.settingsPanel.classList.remove('show');
    els.settingsPanel.setAttribute('aria-hidden', 'true');
  }

  function localISODate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function pickInitialDate() {
    const t = localISODate();
    if (days[t]) return t;
    if (t < DB.meta.startDate) return DB.meta.startDate;
    if (t > DB.meta.endDate) return DB.meta.endDate;
    return dates.reduce((best, d) => Math.abs(new Date(d) - new Date(t)) < Math.abs(new Date(best) - new Date(t)) ? d : best, dates[0]);
  }

  function displayDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
  }

  function parseDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function getLearned(date) {
    try { return new Set(JSON.parse(localStorage.getItem(`daily-words:${date}`) || '[]')); }
    catch { return new Set(); }
  }

  function saveLearned(date, set) {
    localStorage.setItem(`daily-words:${date}`, JSON.stringify([...set]));
  }

  function toggleLearned(id) {
    const set = getLearned(activeDate);
    set.has(id) ? set.delete(id) : set.add(id);
    saveLearned(activeDate, set);
    renderWords();
    renderProgress();
  }

  function renderDay() {
    const day = days[activeDate];
    const d = parseDate(activeDate);
    els.dateInput.value = activeDate;
    els.eyebrow.textContent = day.day ? `DAY ${day.day} · ${day.stage}` : 'REST DAY · 休息日';
    els.dateTitle.innerHTML = `${d.getMonth() + 1}月${d.getDate()}日 <span>星期${fmtWeek[d.getDay()]}</span>`;
    els.daySummary.textContent = day.type === '休息'
      ? '今天不安排新词。适当休息，也可以只做轻量回顾。'
      : `今天需要学习 ${day.count} 个新词。已针对平板做了更大的按钮和更清晰的卡片排版。`;
    renderStrip();
    renderProgress();
    renderWords();
    updateNav();
  }

  function renderStrip() {
    const idx = dates.indexOf(activeDate);
    let start = Math.max(0, idx - 3);
    let end = Math.min(dates.length, start + 7);
    start = Math.max(0, end - 7);
    els.dateStrip.innerHTML = dates.slice(start, end).map(iso => {
      const day = days[iso];
      const d = parseDate(iso);
      const cls = ['day-chip', iso === activeDate ? 'active' : '', day.type === '休息' ? 'rest' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-date="${iso}"><strong>${d.getMonth() + 1}/${d.getDate()}</strong><span>${day.type === '休息' ? '休息' : `${day.count} 词`}</span></button>`;
    }).join('');
  }

  function renderProgress() {
    const day = days[activeDate];
    const learned = getLearned(activeDate);
    const total = day.words.length;
    const done = day.words.filter(w => learned.has(w.id)).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    els.progressRing.style.setProperty('--progress', pct);
    els.progressPercent.textContent = `${pct}%`;
    els.doneCount.textContent = done;
    els.remainCount.textContent = Math.max(0, total - done);
  }

  function renderWords() {
    const day = days[activeDate];
    const learned = getLearned(activeDate);
    document.body.classList.toggle('hide-meanings', meaningsHidden);
    els.meaningToggle.textContent = meaningsHidden ? '显示释义' : '隐藏释义';

    if (!day.words.length) {
      els.wordGrid.innerHTML = '';
      els.wordGrid.style.display = 'none';
      els.emptyState.classList.remove('hidden');
      els.emptyTitle.textContent = day.type === '休息' ? '今天是休息日' : '这一天没有新词';
      els.emptyText.textContent = day.type === '休息' ? '不安排新词，保持轻量复习即可。' : '可以切换到其他学习日期。';
      els.resultCount.textContent = '0 个单词';
      return;
    }

    els.wordGrid.style.display = 'grid';
    els.emptyState.classList.add('hidden');
    const q = query.trim().toLowerCase();
    const list = day.words.filter(w => {
      const matchQuery = !q || w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q);
      const matchFilter = activeFilter === 'all' || (activeFilter === 'unlearned' ? !learned.has(w.id) : w.levelCode === activeFilter);
      return matchQuery && matchFilter;
    });

    els.resultCount.textContent = `${list.length} 个单词`;
    els.wordGrid.innerHTML = list.map(w => wordCard(w, learned.has(w.id))).join('');
    if (!list.length) {
      els.wordGrid.style.display = 'none';
      els.emptyState.classList.remove('hidden');
      els.emptyTitle.textContent = '没有匹配结果';
      els.emptyText.textContent = '试试调整搜索内容或筛选条件。';
    }
  }

  function wordCard(w, isLearned) {
    const freq = w.frequency ? `真题频次 ${w.frequency}` : '频次 —';
    return `
      <article class="word-card ${isLearned ? 'learned' : ''}" data-id="${w.id}">
        <div class="card-top">
          <div>
            <div class="word-index">#${String(w.id).padStart(4, '0')}</div>
            <div class="word-main">
              <div class="word-headline">
                <h3>${escapeHTML(w.word)}</h3>
                <span class="pos-chip">${escapeHTML(w.pos)}</span>
              </div>
            </div>
          </div>
          <div class="card-actions">
            <button class="icon-button speak" type="button" data-word="${escapeAttr(w.word)}" aria-label="朗读 ${escapeAttr(w.word)}" title="朗读">
              <svg viewBox="0 0 24 24"><path d="M5 10v4h4l5 4V6L9 10H5Z"/><path d="M17 9c1 .8 1.5 1.8 1.5 3S18 14.2 17 15"/><path d="M19 6.5c1.7 1.4 2.5 3.2 2.5 5.5S20.7 16.1 19 17.5"/></svg>
            </button>
            <button class="icon-button learn-toggle ${isLearned ? 'active' : ''}" type="button" data-learn="${w.id}" aria-label="${isLearned ? '取消掌握' : '标记掌握'}" title="${isLearned ? '已掌握' : '标记掌握'}">
              <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 7"/></svg>
            </button>
          </div>
        </div>
        <p class="meaning">${escapeHTML(w.meaning)}</p>
        <div class="card-meta">
          <span class="badge level-${w.levelCode || 'X'}">${escapeHTML(w.level)}</span>
          <span class="badge">${freq}</span>
        </div>
      </article>`;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[s]));
  }
  function escapeAttr(str) { return escapeHTML(str); }

  function speak(word) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    utter.rate = .88;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /Microsoft.*(Aria|Jenny|Guy)|Samantha|Google US English/i.test(v.name) && /^en/i.test(v.lang)) || voices.find(v => /^en-US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
    if (preferred) utter.voice = preferred;
    window.speechSynthesis.speak(utter);
  }

  function goDate(iso) {
    if (!days[iso]) return;
    activeDate = iso;
    query = '';
    els.searchInput.value = '';
    renderDay();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function moveDate(offset) {
    const idx = dates.indexOf(activeDate);
    const next = dates[idx + offset];
    if (next) goDate(next);
  }

  function updateNav() {
    const idx = dates.indexOf(activeDate);
    els.prevDay.disabled = idx <= 0;
    els.nextDay.disabled = idx >= dates.length - 1;
  }

  els.dateStrip.addEventListener('click', e => {
    const btn = e.target.closest('[data-date]');
    if (btn) goDate(btn.dataset.date);
  });
  els.prevDay.addEventListener('click', () => moveDate(-1));
  els.nextDay.addEventListener('click', () => moveDate(1));
  els.dateInput.addEventListener('change', e => {
    const selected = e.target.value;
    if (days[selected]) goDate(selected);
    else {
      const target = parseDate(selected);
      const nearest = dates.reduce((best, d) => Math.abs(parseDate(d) - target) < Math.abs(parseDate(best) - target) ? d : best, dates[0]);
      goDate(nearest);
    }
  });
  els.todayBtn.addEventListener('click', () => goDate(pickInitialDate()));
  els.themeToggle.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  els.settingsBtn.addEventListener('click', openSettings);
  els.closeSettingsBtn.addEventListener('click', closeSettings);
  els.overlay.addEventListener('click', closeSettings);
  els.searchInput.addEventListener('input', e => { query = e.target.value; renderWords(); });
  els.filters.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    [...els.filters.querySelectorAll('.filter')].forEach(b => b.classList.toggle('active', b === btn));
    renderWords();
  });
  els.wordGrid.addEventListener('click', e => {
    const speakBtn = e.target.closest('.speak');
    if (speakBtn) return speak(speakBtn.dataset.word);
    const learnBtn = e.target.closest('[data-learn]');
    if (learnBtn) toggleLearned(Number(learnBtn.dataset.learn));
  });
  els.meaningToggle.addEventListener('click', () => { meaningsHidden = !meaningsHidden; renderWords(); });
  els.toggleMeaningInPanel.addEventListener('click', () => { meaningsHidden = !meaningsHidden; renderWords(); });
  els.continueBtn.addEventListener('click', () => {
    const day = days[activeDate];
    const learned = getLearned(activeDate);
    const next = day.words.find(w => !learned.has(w.id));
    if (!next) return;
    const card = document.querySelector(`[data-id="${next.id}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  const updateDisplayFromInputs = () => {
    displaySettings = {
      uiScale: clampNum(els.uiScaleInput.value, 90, 130),
      wordScale: clampNum(els.wordScaleInput.value, 95, 145),
      cardMin: clampNum(els.cardMinInput.value, 250, 460),
      cardPadding: clampNum(els.cardPaddingInput.value, 16, 34),
    };
    applyDisplaySettings(displaySettings, true);
  };
  ['input', 'change'].forEach(evt => {
    els.uiScaleInput.addEventListener(evt, updateDisplayFromInputs);
    els.wordScaleInput.addEventListener(evt, updateDisplayFromInputs);
    els.cardMinInput.addEventListener(evt, updateDisplayFromInputs);
    els.cardPaddingInput.addEventListener(evt, updateDisplayFromInputs);
  });
  els.resetDisplayBtn.addEventListener('click', () => {
    displaySettings = { ...defaultDisplay };
    applyDisplaySettings(displaySettings, true);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSettings();
    if (e.target.matches('input')) return;
    if (e.key === 'ArrowLeft') moveDate(-1);
    if (e.key === 'ArrowRight') moveDate(1);
  });

  renderDay();
})();
