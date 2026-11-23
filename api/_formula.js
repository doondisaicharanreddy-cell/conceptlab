// Small allowlist formula grammar used to validate AI expressions on the server.
// This does not evaluate anything. The browser's existing safe parser (public/index.html)
// compiles the same grammar again before rendering, so no AI code is ever executed.
const FUNCTIONS = new Set(['sqrt', 'abs', 'min', 'max', 'sin', 'cos', 'tan']);
const TOKEN = /[A-Za-z_]\w*|\d*\.?\d+|[-+*\/^(),]/g;
const NUM = /^(?:\d+\.?\d*|\.\d+)$/;

function tokenize(src) {
  const tokens = src.match(TOKEN) || [];
  if (tokens.join('') !== src.replace(/\s+/g, '')) return null;
  return tokens;
}

// allowed: Set of variable keys and already-accepted earlier output keys.
function validateExpr(src, allowed) {
  const raw = String(src == null ? '' : src).trim();
  if (!raw || raw.length > 120) return false;
  const tokens = tokenize(raw);
  if (!tokens) return false;
  const keys = allowed instanceof Set ? allowed : new Set(allowed || []);
  let p = 0;
  const peek = () => tokens[p];
  const eat = x => (tokens[p] === x ? (p++, true) : false);

  function expr() {
    if (!term()) return false;
    while (peek() === '+' || peek() === '-') { p++; if (!term()) return false; }
    return true;
  }
  function term() {
    if (!unary()) return false;
    while (peek() === '*' || peek() === '/') { p++; if (!unary()) return false; }
    return true;
  }
  function unary() {
    if (eat('-')) return unary();
    return power();
  }
  function power() {
    if (!atom()) return false;
    if (eat('^')) return unary();
    return true;
  }
  function atom() {
    const k = tokens[p++];
    if (k === undefined) return false;
    if (k === '(') { if (!expr()) return false; return eat(')'); }
    if (NUM.test(k)) return true;
    if (k === 'pi') return peek() !== '(';
    if (FUNCTIONS.has(k)) {
      if (!eat('(')) return false;
      if (eat(')')) return false; // at least one argument
      let args = 0;
      do { if (!expr()) return false; args++; } while (eat(','));
      if (!eat(')')) return false;
      return args >= 1;
    }
    return keys.has(k);
  }

  return expr() && p === tokens.length;
}

module.exports = { validateExpr, tokenize, FUNCTIONS };
