// Vercel serverless function: reads a textbook photo with Claude and returns the concept.
const hits = new Map(); // simple per-IP rate limit (best effort, resets on cold start)
const LIMIT = 20, WINDOW = 60 * 60 * 1000;

const PROMPT = `You are helping ICSE students (Class 1 to 10) in India. Look at this textbook photo.
Identify the main concept taught. Reply with ONLY a JSON object, no other text:
{
 "is_textbook": true or false,
 "subject": "Physics | Chemistry | Biology | Maths | Other",
 "class_level": "best guess like 9, or unknown",
 "concept": "short name, e.g. Force and acceleration",
 "formula": "main formula or empty string",
 "variables": ["list of key variables"],
 "summary": "one simple sentence a child can understand",
 "simulation": one of "force","gravity","velocity","projectile","circular_motion","none"
}
Use "force" for F = ma, Newton's laws and pushes/pulls. Use "none" if the topic does not match a listed simulation.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'Server is missing its API key' });

  const ip = (req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Too many photos this hour. Try again later.' });
  recent.push(now); hits.set(ip, recent);

  try {
    const image = (req.body && req.body.image) || '';
    const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'Please send a JPG, PNG or WebP image' });
    if (m[2].length > 4_000_000) return res.status(413).json({ error: 'Image is too large' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: PROMPT }
        ] }]
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'The AI service had a problem. Try again.' });
    const data = await r.json();
    const text = (data.content || []).map(c => c.text || '').join('');
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (json.is_textbook === false) return res.status(422).json({ error: 'This does not look like a textbook page. Try a clearer photo.' });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: 'Could not read that page. Try a clearer photo.' });
  }
};
