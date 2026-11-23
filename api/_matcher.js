// Small TF-IDF + cosine-similarity matcher: scores free text against every syllabus topic.
// Classical information retrieval (no training data needed). Used to double-check the vision AI.
const SYL = require('./_syllabus');
const STOP = new Set('the a an of and or to in is are for on with by as at from that this it its be can how what'.split(' '));
const tok = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
const docs = SYL.map(x => tok([x.topic, x.topic, x.subject, x.kw].join(' ')));
const df = new Map(); docs.forEach(d => new Set(d).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
const idf = w => Math.log((docs.length + 1) / ((df.get(w) || 0) + 1)) + 1;
const vec = ws => { const v = new Map(); ws.forEach(w => v.set(w, (v.get(w) || 0) + 1)); let n = 0; v.forEach((c, w) => { const x = c * idf(w); v.set(w, x); n += x * x; }); return { v, n: Math.sqrt(n) || 1 }; };
const dv = docs.map(vec);
function match(text, k = 3) {
  const q = vec(tok(text));
  return dv.map((d, i) => { let dot = 0; q.v.forEach((x, w) => { if (d.v.has(w)) dot += x * d.v.get(w); }); return { id: SYL[i].id, score: dot / (q.n * d.n) }; })
    .sort((a, b) => b.score - a.score).slice(0, k);
}
module.exports = { match, tok };
