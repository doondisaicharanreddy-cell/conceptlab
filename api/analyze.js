// Vercel serverless function: reads a textbook photo, returns the concept, a teaching pack,
// and either a built-in simulation id or a validated spec for the generic model engine.
const SYL = require('./_syllabus');
const { match } = require('./_matcher');
const hits = new Map();
const LIMIT = 20, WINDOW = 60 * 60 * 1000;

const PROMPT = `You are a kind, clear teacher for ICSE students (Class 6 to 10, with Class 11 foundations) in India. Look at this textbook photo.
Reply with ONLY JSON in this shape:
{"is_textbook":true,"subject":"Physics","class_level":"8","concept":"short name","formula":"main formula or empty","summary":"one simple sentence",
"simulation":"force | speed | reflection | circuit | projectile | freefall | fractions | current | atom | custom | none",
"spec":{"title":"Density","level":"Class 8","formula":"D = m / V","note":"one sentence",
 "vars":[{"k":"m","label":"Mass","unit":"g","min":10,"max":200,"step":10,"val":80}],
 "outs":[{"k":"D","label":"Density","unit":"g/cm3","expr":"m / V"}],
 "xvar":"m"},
"learn":{"predict":{"q":"","options":["","",""],"answer":0,"why":""},"notice":["","",""],"real_life":"",
 "challenge":{"text":"","out":"D","target":2,"tol":0.1},"quiz":{"q":"","options":["","",""],"answer":0,"why":""}}}
Rules:
- Built-ins: force = F=ma and Newton's laws; speed = d=v*t; reflection = laws of reflection; circuit = V=IR with current, voltage, resistance; projectile = projectile motion, launch angle, range; freefall = free fall and acceleration due to gravity; fractions = fractions and equivalent fractions; current = electric charge, electrons and current flow (I=Q/t); atom = atomic structure, protons, neutrons, electrons and shells.
- Use "custom" for any other topic with a formula or a relationship between quantities, and include "spec". Use "none" if nothing is quantitative. Include "spec" only for custom.
- spec: 1 to 4 vars with short letter-only keys; 1 to 3 outs; each expr uses only var keys or earlier out keys, numbers, + - * / ^ ( ), sqrt, abs, sin, cos, tan (degrees), pi. "xvar" is a var key.
- learn: simple short sentences for the student's class. Quiz must differ from predict. The challenge target must be reachable with the slider ranges. For built-ins, challenge.out must be F (force), d (speed), r (reflection), I (circuit), R (projectile), v (freefall), pct (fractions), I (current) or valence (atom).`;

const EXTRA = `\nAlso add "topic_id": the id from this syllabus list that best matches the page, or "other":\n` + SYL.map(x => x.id + ': ' + x.subject + ' - ' + x.topic).join('\n') + `\nInside "learn" also add "summary" (2 to 3 very simple sentences), "formulas" (array of {"f":"formula","m":"what it means"}) and "remember" (3 to 5 short things to remember).`;
const MODELS = [process.env.GROQ_MODEL || 'qwen/qwen3.8-27b', 'meta-llama/llama-4-scout-17b-16e-instruct'];
const str = (x, n) => String(x == null ? '' : x).slice(0, n);
const mcq = (m) => {
  if (!m || !Array.isArray(m.options)) return undefined;
  const o = m.options.slice(0, 4).map(x => str(x, 80)), a = Number(m.answer);
  if (o.length < 2 || !(a >= 0 && a < o.length)) return undefined;
  return { q: str(m.q, 200), options: o, answer: Math.floor(a), why: str(m.why, 200) };
};

function clean(j) {
  const out = { is_textbook: j.is_textbook !== false, subject: str(j.subject, 30), class_level: str(j.class_level, 20), concept: str(j.concept, 80), formula: str(j.formula, 60), summary: str(j.summary, 200),
    simulation: ['force', 'speed', 'reflection', 'circuit', 'projectile', 'freefall', 'fractions', 'current', 'atom', 'custom'].includes(j.simulation) ? j.simulation : 'none' };
  const L = j.learn || {};
  out.learn = { predict: mcq(L.predict), quiz: mcq(L.quiz), notice: Array.isArray(L.notice) ? L.notice.slice(0, 4).map(x => str(x, 120)) : [], real_life: str(L.real_life, 160) };
  out.learn.summary = str(L.summary, 300);
  out.learn.formulas = Array.isArray(L.formulas) ? L.formulas.slice(0, 5).map(x => ({ f: str(x && x.f, 60), m: str(x && x.m, 100) })) : [];
  out.learn.remember = Array.isArray(L.remember) ? L.remember.slice(0, 5).map(x => str(x, 120)) : [];
  const c = L.challenge;
  if (c && /^\w{1,8}$/.test(String(c.out)) && Number.isFinite(+c.target)) out.learn.challenge = { text: str(c.text, 120), out: String(c.out), target: +c.target, tol: +c.tol > 0 ? +c.tol : Math.abs(+c.target) * 0.01 + 0.001 };
  if (out.simulation === 'custom') {
    const sp = j.spec || {}, key = /^[A-Za-z]\w{0,5}$/;
    const vars = (Array.isArray(sp.vars) ? sp.vars : []).slice(0, 4).filter(v => key.test(String(v.k)) && Number.isFinite(+v.min) && Number.isFinite(+v.max) && +v.max > +v.min)
      .map(v => { const min = +v.min, max = +v.max; return { k: String(v.k), label: str(v.label, 30), unit: str(v.unit, 12), min, max, step: +v.step > 0 ? +v.step : (max - min) / 20, val: Math.min(max, Math.max(min, Number.isFinite(+v.val) ? +v.val : min)) }; });
    const outs = (Array.isArray(sp.outs) ? sp.outs : []).slice(0, 3).filter(o => key.test(String(o.k)) && /^[\w\s+\-*/^().,]{1,120}$/.test(String(o.expr)))
      .map(o => ({ k: String(o.k), label: str(o.label, 30), unit: str(o.unit, 12), expr: String(o.expr) }));
    if (vars.length && outs.length) out.spec = { title: str(sp.title || j.concept, 60), level: str(sp.level || 'Class ' + out.class_level, 30), formula: str(sp.formula || j.formula, 60), note: str(sp.note || j.summary, 200), vars, outs, xvar: vars.some(v => v.k === sp.xvar) ? sp.xvar : vars[0].k };
    else out.simulation = 'none';
  }
  const m = match([j.concept, j.subject, j.formula, j.summary, L.summary].join(' '), 3);
  let topic = SYL.find(x => x.id === j.topic_id), conf = 'low';
  if (topic) conf = m.some(x => x.id === topic.id && x.score > 0.12) ? 'high' : 'medium';
  else if (m[0] && m[0].score >= 0.3) { topic = SYL.find(x => x.id === m[0].id); conf = 'medium'; }
  out.confidence = conf;
  out.suggestions = m.filter(x => x.score > 0.12).map(x => { const y = SYL.find(z => z.id === x.id); return { id: y.id, topic: y.topic, sim: y.sim, score: +x.score.toFixed(2) }; });
  out.topic_id = topic ? topic.id : 'other'; out.topic = topic ? topic.topic : '';
  if (topic && topic.sim && topic.sim !== 'ai') { out.simulation = topic.sim; delete out.spec; } // syllabus map decides built-in simulations
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const key = process.env.GROQ_API_KEY || process.env.XAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'Server is missing its API key' });
  const ip = (req.headers['x-forwarded-for'] || 'local').split(',')[0].trim(), now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Too many photos this hour. Try again later.' });
  recent.push(now); hits.set(ip, recent);
  try {
    const image = (req.body && req.body.image) || '';
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) return res.status(400).json({ error: 'Please send a JPG, PNG or WebP image' });
    if (image.length > 4_000_000) return res.status(413).json({ error: 'Image is too large' });
    let lastErr = '';
    for (const model of MODELS) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({ model, max_tokens: 3000, temperature: 0.2, messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT + EXTRA }, { type: 'image_url', image_url: { url: image } }] }] }) });
      if (!r.ok) { lastErr = 'AI error ' + r.status + ' (' + model + '): ' + (await r.text()).slice(0, 200); if (r.status === 400 || r.status === 404) continue; return res.status(502).json({ error: lastErr }); }
      const data = await r.json();
      let text = ((data.choices && data.choices[0] && data.choices[0].message.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '');
      const m = text.match(/\{[\s\S]*\}/);
      const j = JSON.parse(m ? m[0] : text);
      if (j.is_textbook === false) return res.status(422).json({ error: 'This does not look like a textbook page. Try a clearer photo.' });
      return res.status(200).json(clean(j));
    }
    return res.status(502).json({ error: lastErr || 'No AI model available' });
  } catch (e) { return res.status(500).json({ error: 'Could not read that page. Try a clearer photo.' }); }
};
module.exports.clean = clean;
