/*
 * field-order.js: the path Enter walks through the form.
 *
 * Enter jumps to the next field, so a keyboard-only user can fill the whole
 * form by pressing Enter over and over without clicking anything. The order
 * follows the visual order of the screen (taxes are always visible here, unlike
 * the app, where the collapsible panel makes the order depend on being open or
 * closed). Margin ends on the copy button: the price is a <span> and takes no
 * focus.
 *
 * The wiring is a function the startup calls rather than something that happens
 * on import. A module that reaches for the page the moment it is imported binds
 * handlers from a line nobody reads, and the order of the imports silently
 * becomes the order of the wiring: exactly what step 9 exists to undo.
 */

const $ = (id) => document.getElementById(id);

export const COPY_BUTTON_ID = 'copyPriceBtn';

export const ENTER_NEXT = {
  productCost: 'icmsNum',
  icmsNum: 'icmsStNum',
  icmsStNum: 'ipiNum',
  ipiNum: 'fixedFee',
  fixedFee: 'commissionNum',
  commissionNum: 'salesTaxNum',
  salesTaxNum: 'marginNum',
  marginNum: COPY_BUTTON_ID,
};

export function focusField(id) {
  const el = $(id);
  if (!el) return;
  el.focus();
  // A button has nothing to select, hence the check instead of a blind call.
  if (el.select) el.select();
}

function goToNextField(e, nextId) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  focusField(nextId);
}

/** Binds Enter on every field that has a next one. Called once, at startup. */
export function attachEnterNavigation() {
  document.querySelectorAll('input[id]').forEach((el) => {
    const nextId = ENTER_NEXT[el.id];
    if (nextId) el.addEventListener('keydown', (e) => goToNextField(e, nextId));
  });
}
