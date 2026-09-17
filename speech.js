(() => {
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const synth = supported ? window.speechSynthesis : null;
  let voices = [];

  function refreshVoices(){
    if(!synth) return [];
    try{ voices = synth.getVoices() || []; }catch(_){ voices = []; }
    return voices;
  }
  function chooseVoice(){
    refreshVoices();
    const en = voices.filter(v => /^en([_-]|$)/i.test(v.lang || ''));
    const preferred = [
      /Samantha/i,/Ava/i,/Allison/i,/Susan/i,/Tom/i,/Daniel/i,/Karen/i,/Moira/i,/Serena/i,
      /Microsoft.*(Aria|Jenny|Guy)/i,/Google US English/i
    ];
    for(const pattern of preferred){const hit=en.find(v=>pattern.test(v.name||''));if(hit)return hit;}
    return en.find(v=>/^en-US/i.test(v.lang||'')) || en[0] || null;
  }
  function speak(text){
    if(!supported || !text) return false;
    const utter = new SpeechSynthesisUtterance(String(text));
    utter.lang = 'en-US';
    utter.rate = .9;
    utter.pitch = 1;
    const voice = chooseVoice();
    if(voice) utter.voice = voice;
    try{
      if(synth.speaking || synth.pending) synth.cancel();
      if(synth.paused) synth.resume();
      synth.speak(utter);
      return true;
    }catch(_){ return false; }
  }
  refreshVoices();
  if(synth){
    if(typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', refreshVoices);
    else synth.onvoiceschanged = refreshVoices;
  }
  document.addEventListener('touchstart', refreshVoices, {once:true,passive:true});
  document.addEventListener('pointerdown', refreshVoices, {once:true,passive:true});
  window.DW_SPEECH = { supported, speak, refreshVoices };
})();
