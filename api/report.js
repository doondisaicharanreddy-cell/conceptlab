// Vercel serverless function: accepts a small, structured "report a mistake" note.
// No external reporting service is configured in this repository, so reports are
// written as one compact JSON line to the existing function log (Vercel Runtime Logs).
// The original image and personal details are deliberately not accepted.
const crypto = require('crypto');
const hits = new Map();
const LIMIT = 8, WINDOW = 60 * 60 * 1000;
const CONF = ['low', 'medium', 'high'];
const SOURCE = ['built-in', 'ai', 'none'];
const clip = (x, n) => String(x == null ? '' : x).trim().slice(0, n);

function validateReport(j) {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return { ok: false, error: 'Report is empty' };
  const raw = j.message == null ? '' : String(j.message);
  if (raw.length < 5) return { ok: false, error: 'Please write a little more about the mistake.' };
  if (raw.length > 500) return { ok: false, error: 'Please keep the report under 500 characters.' };
  const topicId = String(j.topic_id == null ? '' : j.topic_id);
  const simulation = String(j.simulation == null ? '' : j.simulation);
  return {
    ok: true,
    report: {
      message: clip(raw, 500),
      topic_id: /^[a-z0-9-]{1,32}$/.test(topicId) ? topicId : 'other',
      topic: clip(j.topic, 80),
      concept: clip(j.concept, 80),
      lesson: clip(j.lesson, 120),
      subject: clip(j.subject, 30),
      class_level: clip(j.class_level, 20),
      confidence: CONF.indexOf(j.confidence) >= 0 ? j.confidence : '',
      simulation: /^[a-z]{1,20}$/.test(simulation) ? simulation : 'none',
      source: SOURCE.indexOf(j.source) >= 0 ? j.source : 'none',
      kind: j.kind === 'lesson' ? 'lesson' : 'result'
    }
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const ip = (req.headers['x-forwarded-for'] || 'local').split(',')[0].trim(), now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Too many reports this hour. Please try again later.' });
  recent.push(now); hits.set(ip, recent);
  try {
    const v = validateReport(req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const id = 'CL-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    // Only sanitised context and the student's note are logged. No image, IP or stack trace.
    console.log(JSON.stringify({ type: 'conceptlab.mistake_report', id, at: new Date().toISOString(), ...v.report }));
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error('ConceptLab report failed', e && e.message ? e.message : 'unknown error');
    return res.status(500).json({ error: 'Could not send the report. Please try again.' });
  }
};
module.exports.validateReport = validateReport;
