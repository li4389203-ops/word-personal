window.WORD_DATA_READY = (async () => {
  const parts = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      fetch(`./data/words-${String(i).padStart(2, '0')}.txt`).then((r) => {
        if (!r.ok) throw new Error(`词库加载失败：${r.status}`);
        return r.text();
      })
    )
  );
  const encoded = parts.join('').trim();
  const binary = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (!("DecompressionStream" in window)) {
    throw new Error('当前浏览器版本过旧，请使用最新版 Edge / Chrome / Firefox / Safari。');
  }
  const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream('gzip'));
  const c = JSON.parse(await new Response(stream).text());
  const levelName = { A: 'A 高频', B: 'B 核心', C: 'C 中频', D: 'D 认读' };
  const days = {};
  for (const [date, x] of Object.entries(c.d)) {
    const words = x[3].map((w) => ({
      id: w[0],
      word: w[1],
      pos: w[2],
      meaning: w[3],
      levelCode: w[4],
      level: levelName[w[4]] || w[4],
      frequency: w[5],
    }));
    days[date] = {
      date,
      type: x[0],
      day: x[1],
      stage: x[2],
      count: words.length,
      words,
    };
  }
  return {
    meta: {
      totalWords: c.m[0],
      startDate: c.m[1],
      endDate: c.m[2],
      dates: c.m[3],
    },
    days,
  };
})();
