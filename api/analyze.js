
// Vercel serverless function: reads a textbook photo with Groq and returns the concept.
const hits = new Map();
const LIMIT = 20, WINDOW = 60 * 60 * 1000;
 
const PROMPT = `You are helping ICSE students (Class 1 to 10, plus Class 11 foundations) in India. Look at this textbook photo.
Identify the main concept taught. Reply with ONLY a JSON object, no other text:
{
 "is_textbook": true or false,
 "subject": "Physics | Chemistry | Biology | Maths | Other",
 "class_level": "best guess like 7, or unknown",
 "concept": "short name, e.g. Reflection of light",
 "formula": "main formula or empty string",
 "variables": ["list of key variables"],
 "summary": "one simple sentence a child can understand",
 "simulation": one of "force","speed","reflection","circuit","gravity","velocity","projectile","circular_motion","none"
}
Use "force" for F = ma, Newton's laws, pushes and pulls. Use "speed" for speed, distance, time and d = v x t. Use "reflection" for laws of reflection, mirrors and rays. Use "circuit" for simple electric circuits, current, voltage, resistance and Ohm's law. Use "none" if the topic matches none of these.`;
 
const MODELS = [
  process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
  'meta-llama/llama-4-scout-17b-16e-instruct'
];
 
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const key = process.env.GROQ_API_KEY || process.env.XAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'Server is missing its API key' });
 
  const ip = (req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Too many photos this hour. Try again later.' });
  recent.push(now); hits.set(ip, recent);
 
  try {
    const image = (req.body && req.body.image) || '';
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) return res.status(400).json({ error: 'Please send a JPG, PNG or WebP image' });
    if (image.length > 4_000_000) return res.status(413).json({ error: 'Image is too large' });
 
    let lastErr = '';
    for (const model of MODELS) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          temperature: 0.2,
          messages: [{ role: 'user', content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: image } }
          ] }]
        })
      });
      if (!r.ok) {
        lastErr = 'AI error ' + r.status + ' (' + model + '): ' + (await r.text()).slice(0, 200);
        if (r.status === 400 || r.status === 404) continue;
        return res.status(502).json({ error: lastErr });
      }
      const data = await r.json();
      let text = (data.choices && data.choices[0] && data.choices[0].message.content) || '';
      text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
      const match = text.match(/\{[\s\S]*\}/);
      const json = JSON.parse(match ? match[0] : text);
      if (json.is_textbook === false) return res.status(422).json({ error: 'This does not look like a textbook page. Try a clearer photo.' });
      return res.status(200).json(json);
    }
    return res.status(502).json({ error: lastErr || 'No AI model available' });
  } catch (e) {
    return res.status(500).json({ error: 'Could not read that page. Try a clearer photo.' });
  }
};
