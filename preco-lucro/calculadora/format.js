/*
 * format.js: turning values into the text the screen shows, and back.
 *
 * These three are the leaves of the calculator: they know nothing about the
 * page, they touch no element and they call nobody. That is why they come out
 * of app.js first in the split of step 9. Everything else in app.js depends on
 * them, so with them already in place the later moves have one less thing to
 * carry.
 *
 * The money and percentage formatters (brl, pct) are not here on purpose: they
 * live in calc.js, which is mirrored byte for byte with the Android app, and
 * splitting them off would break that mirror.
 */

/** Guards against HTML injection through user-typed names (XSS). */
export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** Reads a typed field, where the decimal separator is a comma. */
export function parseNum(raw) {
  const v = parseFloat(String(raw).replace(',', '.'));
  return isFinite(v) ? v : 0;
}

// Prices saved before the field names were translated (step 4.1) lack the new
// keys, and without this guard the resulting undefined broke the whole load
// instead of just zeroing the fields, which is the agreed behaviour.
export function fmtNum(v) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
