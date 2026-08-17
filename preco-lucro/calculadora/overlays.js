/*
 * overlays.js: the two ways every popup of the calculator closes, the click on
 * the dark background and the Esc key.
 *
 * Hiding a popup is just setting `hidden`, except when the popup has to undo
 * something on the way out: the legal one also has to unload its iframe. Rather
 * than knowing about that case by name, this module keeps a table of closers
 * that whoever owns the popup fills in. The dependency only goes one way, the
 * owner imports this file and never the other way round.
 */

const $ = (id) => document.getElementById(id);

export const DISMISSABLE_OVERLAYS = [
  'saveOverlay',
  'deleteOverlay',
  'loadOverlay',
  'legalOverlay',
  'saveChoiceOverlay',
  'editNameOverlay',
];

/** Popups that close by more than `hidden`, by id. */
const closers = new Map();

/**
 * Registers a custom way of closing a popup, used instead of hiding it.
 *
 * @param {string} id id of the overlay element
 * @param {() => void} close what to run in place of setting `hidden`
 */
export function registerOverlayCloser(id, close) {
  closers.set(id, close);
}

export function closeOverlay(id) {
  const close = closers.get(id);
  if (close) close();
  else $(id).hidden = true;
}

/** Binds the backdrop click on every popup and Esc on the page. Called at startup. */
export function attachOverlayDismissal() {
  for (const id of DISMISSABLE_OVERLAYS) {
    // Only a click on the overlay itself is the dark background: a click on the
    // dialog inside it bubbles up here and must not close anything.
    $(id).addEventListener('click', (event) => {
      if (event.target === $(id)) closeOverlay(id);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const id of DISMISSABLE_OVERLAYS) closeOverlay(id);
  });
}
