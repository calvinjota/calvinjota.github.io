/*
 * board-bar.js: the row of views above the board, and the dialog that renames
 * the profile.
 *
 * It paints what it is told and reports what was clicked, nothing else: which
 * view is open, which one is pinned and what the profile is called are all
 * owned by board.js, the way saved-prices.js owns its list. The dependency goes
 * one way, board.js imports this file and hears back through the callbacks it
 * handed over, so neither file has to import the other back.
 *
 * The pin is a button of its own beside each view rather than a single switch
 * for the row: with two views, "pin this one" is one click and says what it
 * does, while a single switch would have to be read together with whichever tab
 * happens to be open to mean anything.
 */

import { PROFILE_NAME_MAX } from './board-views.js?v=1';

const $ = (id) => document.getElementById(id);

/** What board.js asked to be told about. Replaced whole on attach. */
let handlers = { onSelect: () => {}, onPin: () => {}, onRename: () => {} };

/** The last state painted, so the rename dialog opens on the name in view. */
let shown = { activeView: '', pinnedView: '', profileName: '' };

/** Shows the row the way the state says it should look. */
export function renderViewBar(state) {
  shown = state;
  $('viewProfileName').textContent = state.profileName;

  for (const chip of document.querySelectorAll('.view-chip')) {
    const viewId = chip.dataset.view;
    const active = viewId === state.activeView;
    const pinned = viewId === state.pinnedView;

    chip.dataset.active = String(active);
    chip.querySelector('.view-tab').setAttribute('aria-pressed', String(active));

    const pin = chip.querySelector('.view-pin');
    pin.dataset.pinned = String(pinned);
    pin.setAttribute('aria-pressed', String(pinned));
    pin.title = pinned
      ? 'Esta é a visualização que abre sozinha'
      : 'Fixar: abrir nesta visualização';
  }
}

function openRename() {
  const input = $('viewNameInput');
  input.value = shown.profileName;
  $('viewNameCount').textContent = String(input.value.length);
  $('renameViewOverlay').hidden = false;
  input.focus();
  input.select();
}

function closeRename() {
  $('renameViewOverlay').hidden = true;
}

function confirmRename() {
  const name = $('viewNameInput').value.trim();
  // An empty name is not a rename: the dialog stays open on the box to fix.
  if (name === '') {
    $('viewNameInput').focus();
    return;
  }

  closeRename();
  handlers.onRename(name);
}

function onBarClick(event) {
  const chip = event.target.closest('.view-chip');
  if (!chip) return;

  if (event.target.closest('.view-pin')) handlers.onPin(chip.dataset.view);
  else if (event.target.closest('.view-rename')) openRename();
  else if (event.target.closest('.view-tab')) handlers.onSelect(chip.dataset.view);
}

/**
 * Binds the row and the rename dialog.
 *
 * @param {{onSelect: Function, onPin: Function, onRename: Function}} nextHandlers
 */
export function attachViewBar(nextHandlers) {
  handlers = { ...handlers, ...nextHandlers };

  $('viewBar').addEventListener('click', onBarClick);
  $('renameViewCancel').addEventListener('click', closeRename);
  $('renameViewConfirm').addEventListener('click', confirmRename);

  const input = $('viewNameInput');
  input.maxLength = PROFILE_NAME_MAX;
  input.addEventListener('input', () => {
    $('viewNameCount').textContent = String(input.value.length);
  });
  // Enter confirms, the same as every other dialog of the calculator.
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') confirmRename();
  });
}
