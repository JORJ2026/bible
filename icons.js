// Swaps text glyphs used as icons (☰ × ⌄ ‹ › ← → ☆ ★ ☐ ☑ ♫ ▶ Ⅱ + ? ⬇) for crisp inline SVG icons.
// Watches the page so glyphs that app code writes later are swapped as well.
const PATHS = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevronDown: '<path d="M6 9.5l6 6 6-6"/>',
  chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  star: '<path d="M12 3.8l2.5 5.1 5.6.8-4.05 3.95.96 5.57L12 16.5l-5.01 2.72.96-5.57L3.9 9.7l5.6-.8z"/>',
  starSolid: '<path d="M12 3.8l2.5 5.1 5.6.8-4.05 3.95.96 5.57L12 16.5l-5.01 2.72.96-5.57L3.9 9.7l5.6-.8z"/>',
  box: '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/>',
  boxChecked: '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/>',
  note: '<path d="M9.5 17.5V6.2l9.5-2v11.3"/><circle cx="7" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  play: '<path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.4-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.4 2.4 0 1 1 3.3 2.2c-.6.3-.9.8-.9 1.4v.5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  download: '<path d="M12 4.5v10.5M7.5 11l4.5 4.5 4.5-4.5M5 19.5h14"/>',
};
const GLYPHS = {
  '☰': ['menu'], '×': ['close'], '＋': ['plus'], '+': ['plus'],
  '⌄': ['chevronDown'], '▾': ['chevronDown'], '▼': ['chevronDown'],
  '‹': ['chevronLeft'], '›': ['chevronRight'],
  '←': ['arrowLeft'], '→': ['arrowRight'],
  '☆': ['star'], '★': ['starSolid', 'solid'],
  '☐': ['box'], '☑': ['boxChecked'],
  '♫': ['note'], '▶': ['play', 'solid'], 'Ⅱ': ['pause', 'solid'],
  '?': ['question'], '⬇': ['download'],
};
const SOLID = new Set(['starSolid', 'play', 'pause']);
const CANDIDATES = 'button, summary, span, a, label, h2, h3, p, div';
const ICON_CLASS = 'ico';

function svgFor(glyph) {
  const [name, mode] = GLYPHS[glyph];
  const solid = mode === 'solid' || SOLID.has(name);
  const fill = solid ? 'currentColor' : 'none';
  const stroke = solid ? 'none' : 'currentColor';
  return '<svg class="' + ICON_CLASS + (solid ? ' ico-solid' : '') + ' ico-' + name.toLowerCase() +
    '" viewBox="0 0 24 24" fill="' + fill + '" stroke="' + stroke + '" aria-hidden="true" focusable="false">' +
    PATHS[name] + '</svg>';
}
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function iconify(el) {
  if (!el || el.nodeType !== 1 || el.children.length || el.closest('select, option, script, style')) return;
  if (el.closest('.ico')) return;
  const text = el.textContent.trim();
  if (!text || text.length > 40) return;
  if (GLYPHS[text]) {
    el.innerHTML = svgFor(text);
    el.classList.add('has-icon');
    return;
  }
  // Glyph beside a word, on buttons and labels only: "★ Favorited", "‹ Previous", "Next ›", "0 ☆".
  if (!el.matches('button, summary, a, .saved-summary')) return;
  const lead = [...text][0], tail = [...text][[...text].length - 1];
  if (GLYPHS[lead] && text.length > 1 && text.slice(1, 2) === ' ') {
    el.innerHTML = svgFor(lead) + ' ' + esc(text.slice(2));
  } else if (GLYPHS[tail] && text.length > 1 && text.slice(-2, -1) === ' ') {
    el.innerHTML = esc(text.slice(0, -2)) + ' ' + svgFor(tail);
  } else {
    return;
  }
  el.classList.add('has-icon');
}

function scan(root) {
  if (!root || root.nodeType !== 1) return;
  if (root.matches && root.matches(CANDIDATES)) iconify(root);
  root.querySelectorAll && root.querySelectorAll(CANDIDATES).forEach(iconify);
}

let queued = new Set(), frame = 0;
function flush() {
  frame = 0;
  const items = [...queued];
  queued = new Set();
  items.forEach((node) => { if (node.isConnected) scan(node); });
}
function queue(node) {
  if (node.nodeType !== 1) node = node.parentElement;
  if (!node) return;
  queued.add(node);
  if (!frame) frame = requestAnimationFrame(flush);
}

new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === 'characterData') queue(r.target);
    else {
      queue(r.target);
      r.addedNodes.forEach((n) => queue(n));
    }
  }
}).observe(document.body, { childList: true, subtree: true, characterData: true });

scan(document.body);
