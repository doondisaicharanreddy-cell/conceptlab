// Versioned visual scene specification for AI-configured models.
// A scene is pure configuration: no formulas, HTML, CSS or executable code.
// The AI may only choose allowlisted primitives and reference values that were
// already validated in the formula spec. The same rules are checked again in
// the browser before anything is rendered (public/index.html).
const VERSION = 1;
const TYPES = ['bar', 'ball', 'arrow', 'block', 'label'];
const COLORS = ['blue', 'green', 'gold', 'red', 'grey', 'ink'];
const MAX_PRIMITIVES = 6, MAX_CAPTION = 120, MAX_LABEL = 24, MAX_ABS = 1e6;
const KEY = /^[A-Za-z]\w{0,5}$/;

const isNum = x => typeof x === 'number' && Number.isFinite(x);
const isText = x => typeof x === 'string';

function validateScene(raw, valueKeys) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'scene must be an object' };
  const keys = valueKeys instanceof Set ? valueKeys : new Set(valueKeys || []);
  for (const k of Object.keys(raw)) {
    if (k !== 'version' && k !== 'caption' && k !== 'primitives') return { ok: false, reason: 'unknown scene field' };
  }
  if (raw.version !== VERSION) return { ok: false, reason: 'unsupported scene version' };
  const caption = raw.caption == null ? '' : raw.caption;
  if (!isText(caption) || caption.length > MAX_CAPTION) return { ok: false, reason: 'caption is too long' };
  if (!Array.isArray(raw.primitives) || !raw.primitives.length || raw.primitives.length > MAX_PRIMITIVES) {
    return { ok: false, reason: 'scene needs 1 to ' + MAX_PRIMITIVES + ' primitives' };
  }
  const primitives = [];
  for (const p of raw.primitives) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, reason: 'primitive must be an object' };
    for (const k of Object.keys(p)) {
      if (['type', 'label', 'value', 'min', 'max', 'color'].indexOf(k) < 0) return { ok: false, reason: 'unknown primitive field' };
    }
    if (TYPES.indexOf(p.type) < 0) return { ok: false, reason: 'primitive type is not allowed' };
    if (!isText(p.label) || !p.label.trim() || p.label.length > MAX_LABEL) return { ok: false, reason: 'primitive label is invalid' };
    const out = { type: p.type, label: p.label.trim() };
    if (p.type === 'label') {
      if (p.value != null || p.min != null || p.max != null) return { ok: false, reason: 'static labels cannot have values' };
      if (p.color != null && COLORS.indexOf(p.color) < 0) return { ok: false, reason: 'color is not allowed' };
      if (p.color) out.color = p.color;
      primitives.push(out);
      continue;
    }
    if (!isText(p.value) || !KEY.test(p.value) || !keys.has(p.value)) return { ok: false, reason: 'primitive value is not a known quantity' };
    if (!isNum(p.max) || p.max > MAX_ABS || p.max <= 0) return { ok: false, reason: 'primitive max is invalid' };
    const min = p.min == null ? 0 : p.min;
    if (!isNum(min) || Math.abs(min) > MAX_ABS || min >= p.max) return { ok: false, reason: 'primitive min is invalid' };
    if (p.color != null && COLORS.indexOf(p.color) < 0) return { ok: false, reason: 'color is not allowed' };
    out.value = p.value;
    out.min = min;
    out.max = p.max;
    out.color = p.color || 'blue';
    primitives.push(out);
  }
  return { ok: true, scene: { version: VERSION, caption: caption.trim(), primitives } };
}

module.exports = { validateScene, VERSION, TYPES, COLORS, MAX_PRIMITIVES };
