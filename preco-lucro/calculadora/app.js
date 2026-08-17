/*
 * app.js: the saved prices of the web calculator, plus the startup that wires
 * every module together.
 *
 * The calculator screen itself lives in calculator.js and the math in calc.js.
 * What is left here is the list of saved prices, its popups and the banner of
 * the price loaded into the form.
 *
 * localStorage is the local cache of the saved prices, not their home: sync.js
 * fills it from Firestore and listens to the events dispatched here.
 */

import { brl, pct } from './calc.js?v=4';
import { sortPricesByName } from './price-sort.js?v=2';
import { escapeHtml } from './format.js?v=1';
import { attachEnterNavigation } from './field-order.js?v=1';
import { attachThemeSwitch } from './theme.js?v=1';
import { attachMenu } from './menu.js?v=1';
import { attachOverlayDismissal } from './overlays.js?v=1';
import { attachLegalLinks } from './legal.js?v=1';
import {
  attachCalculator,
  readInputs,
  getLastCalc,
  loadInputs,
  setOnReset,
} from './calculator.js?v=1';

const $ = (id) => document.getElementById(id);

/* ===================== Saved prices (localStorage) ===================== */

const STORAGE_KEY = 'savedPrices';

function loadSaved() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function persistSaved(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// What a saved price keeps of the result on screen, the four numbers the list
// shows. Same shape in the Android app, so a price crosses over intact.
function displayOf(calc) {
  return {
    adjustedProductCost: calc.adjustedProductCost,
    price: calc.price,
    operatingMarginPct: calc.operatingMarginPct,
    marginAmount: calc.marginAmount,
  };
}

// Renders the list in both places: the "Preços Salvos" column and the load popup
export function renderSavedList() {
  // The order is decided here, never in the stored array: that array belongs to
  // the cloud sync and arrives in whatever order Firestore returns.
  const list = sortPricesByName(loadSaved());
  const html =
    list.length === 0
      ? '<p class="saved-empty">Nenhum preço salvo ainda.</p>'
      : list
          .map(
            (p) => `
    <div class="saved-item" data-id="${escapeHtml(p.id)}">
      <div class="saved-item-head">
        <span class="saved-item-name">${escapeHtml(p.name)}</span>
        <button class="saved-item-del" type="button" aria-label="Excluir ${escapeHtml(p.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
      <div class="saved-item-info">
        <span>Custo final: <strong>${brl(p.display.adjustedProductCost)}</strong></span>
        <span>Venda: <strong>${brl(p.display.price)}</strong></span>
        <span>Margem: <strong>${pct(p.display.operatingMarginPct)}</strong></span>
        <span>Lucro: <strong>${brl(p.display.marginAmount)}</strong></span>
      </div>
    </div>`,
          )
          .join('');
  $('savedList').innerHTML = html;
  $('loadList').innerHTML = html;
}

/* ---- loaded price state (banner on top of column 1, same as the app) ---- */

let loadedPriceId = null;

function showLoadedBanner(name) {
  $('loadedPriceName').textContent = name;
  $('loadedPriceBanner').hidden = false;
}
function clearLoadedPrice() {
  loadedPriceId = null;
  $('loadedPriceBanner').hidden = true;
}

// load and delete through event delegation (same logic for both lists)
function handleSavedListClick(e) {
  const item = e.target.closest('.saved-item');
  if (!item) return;
  const id = item.dataset.id;
  const list = loadSaved();
  const price = list.find((p) => p.id === id);
  if (!price) return;

  if (e.target.closest('.saved-item-del')) {
    pendingDeleteId = id;
    $('deleteMsg').textContent = `"${price.name}" será removido dos preços salvos.`;
    $('deleteOverlay').hidden = false;
    return;
  }

  // The fields belong to the calculator, which knows how to fill and repaint them
  loadInputs(price.inputs);
  loadedPriceId = id;
  showLoadedBanner(price.name);
  $('loadOverlay').hidden = true;
}
$('savedList').addEventListener('click', handleSavedListClick);
$('loadList').addEventListener('click', handleSavedListClick);

/* ---- load popup ---- */

$('btnLoad').addEventListener('click', () => {
  renderSavedList();
  $('loadOverlay').hidden = false;
});
$('loadClose').addEventListener('click', () => ($('loadOverlay').hidden = true));

/* ---- save popup (new price, nothing loaded) ---- */

function openSavePopup() {
  $('saveName').value = '';
  $('saveNameCount').textContent = '0';
  $('saveOverlay').hidden = false;
  $('saveName').focus();
}

// With a price already loaded, ask whether to overwrite it or save as new (same
// as the app); otherwise go straight to asking for the new price's name.
$('btnSave').addEventListener('click', () => {
  if (loadedPriceId && loadSaved().some((p) => p.id === loadedPriceId)) {
    const loaded = loadSaved().find((p) => p.id === loadedPriceId);
    $('saveChoiceName').textContent = loaded.name;
    $('saveChoiceOverlay').hidden = false;
  } else {
    openSavePopup();
  }
});

$('saveName').addEventListener('input', () => {
  $('saveNameCount').textContent = String($('saveName').value.length);
});

$('saveCancel').addEventListener('click', () => ($('saveOverlay').hidden = true));

$('saveConfirm').addEventListener('click', () => {
  const name = $('saveName').value.trim();
  const lastCalc = getLastCalc();
  if (!name || !lastCalc) return;
  const price = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    name,
    inputs: readInputs(),
    display: displayOf(lastCalc),
    lastModified: Date.now(),
  };
  const list = loadSaved();
  list.unshift(price);
  persistSaved(list);
  renderSavedList();
  loadedPriceId = price.id;
  showLoadedBanner(price.name);
  $('saveOverlay').hidden = true;
  // Notifies whoever syncs this to the cloud (see sync.js)
  document.dispatchEvent(new CustomEvent('price-saved', { detail: price }));
});

/* ---- popup: overwrite or save as new ---- */

$('btnCancelChoice').addEventListener('click', () => ($('saveChoiceOverlay').hidden = true));

$('btnSaveAsNew').addEventListener('click', () => {
  $('saveChoiceOverlay').hidden = true;
  openSavePopup();
});

$('btnOverwrite').addEventListener('click', () => {
  const lastCalc = getLastCalc();
  if (!lastCalc) return;
  const list = loadSaved();
  const idx = list.findIndex((p) => p.id === loadedPriceId);
  if (idx === -1) {
    $('saveChoiceOverlay').hidden = true;
    return;
  }
  list[idx].inputs = readInputs();
  list[idx].display = displayOf(lastCalc);
  list[idx].lastModified = Date.now();
  persistSaved(list);
  renderSavedList();
  $('saveChoiceOverlay').hidden = true;
  // Notifies whoever syncs this to the cloud (see sync.js): update, not creation
  document.dispatchEvent(new CustomEvent('price-updated', { detail: list[idx] }));
});

/* ---- popup: rename the loaded price ---- */

$('btnEditLoadedName').addEventListener('click', () => {
  const loaded = loadSaved().find((p) => p.id === loadedPriceId);
  if (!loaded) return;
  $('editPriceNameInput').value = loaded.name;
  $('editNameOverlay').hidden = false;
  $('editPriceNameInput').focus();
  $('editPriceNameInput').select();
});

$('editNameCancel').addEventListener('click', () => ($('editNameOverlay').hidden = true));

$('editNameConfirm').addEventListener('click', () => {
  const name = $('editPriceNameInput').value.trim();
  if (!name || !loadedPriceId) return;
  const list = loadSaved();
  const idx = list.findIndex((p) => p.id === loadedPriceId);
  if (idx !== -1) {
    list[idx].name = name;
    list[idx].lastModified = Date.now();
    persistSaved(list);
    renderSavedList();
    showLoadedBanner(name);
    document.dispatchEvent(new CustomEvent('price-updated', { detail: list[idx] }));
  }
  $('editNameOverlay').hidden = true;
});

$('btnClearLoaded').addEventListener('click', clearLoadedPrice);

/* ---- delete popup ---- */

let pendingDeleteId = null;

$('deleteCancel').addEventListener('click', () => ($('deleteOverlay').hidden = true));

$('deleteConfirm').addEventListener('click', () => {
  if (pendingDeleteId) {
    const deletedId = pendingDeleteId;
    persistSaved(loadSaved().filter((p) => p.id !== deletedId));
    pendingDeleteId = null;
    renderSavedList();
    if (deletedId === loadedPriceId) clearLoadedPrice();
    // Notifies whoever syncs this to the cloud (see sync.js)
    document.dispatchEvent(new CustomEvent('price-deleted', { detail: { id: deletedId } }));
  }
  $('deleteOverlay').hidden = true;
});

/* ===================== Startup ===================== */

// Resetting the form also drops the loaded price, and the banner is ours.
setOnReset(clearLoadedPrice);

attachEnterNavigation();
attachOverlayDismissal();
attachLegalLinks();
attachThemeSwitch();
attachMenu();
attachCalculator();
renderSavedList();
