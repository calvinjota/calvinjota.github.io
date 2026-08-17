/*
 * app.js: the web calculator's interface: fields, theme and saved prices.
 * The math lives in calc.js (separate module, identical to the Android app).
 *
 * localStorage is the local cache of the saved prices, not their home: sync.js
 * fills it from Firestore and listens to the events dispatched here.
 */

import { calculate, brl, pct } from './calc.js?v=4';
import { sortPricesByName } from './price-sort.js?v=2';
import { copyText } from './clipboard.js?v=2';
import { showToast } from './toast.js?v=1';
import { escapeHtml, parseNum, fmtNum } from './format.js?v=1';
import { COPY_BUTTON_ID, focusField, attachEnterNavigation } from './field-order.js?v=1';

const $ = (id) => document.getElementById(id);

/* ===================== Reading the fields ===================== */

const PCT_KEYS = ['icms', 'icmsSt', 'ipi', 'commission', 'salesTax', 'margin'];
const MONEY_MAX = 1000000;

// The on-screen field and the stored value do not share a name: the field is
// "commissionNum" in the HTML (PCT_KEYS holds the "commission" prefix) while the
// stored key is commissionPct, the name calc.js expects. This table is the only
// bridge between the two.
const INPUT_KEY_BY_FIELD = {
  icms: 'icmsPct',
  icmsSt: 'icmsStPct',
  ipi: 'ipiPct',
  commission: 'commissionPct',
  salesTax: 'salesTaxPct',
  margin: 'marginPct',
};

function readInputs() {
  return {
    productCost: Math.min(parseNum($('productCost').value), MONEY_MAX),
    fixedFee: Math.min(parseNum($('fixedFee').value), MONEY_MAX),
    commissionPct: parseNum($('commissionNum').value),
    salesTaxPct: parseNum($('salesTaxNum').value),
    marginPct: parseNum($('marginNum').value),
    icmsPct: parseNum($('icmsNum').value),
    icmsStPct: parseNum($('icmsStNum').value),
    ipiPct: parseNum($('ipiNum').value),
  };
}

/* ===================== Rendering ===================== */

let lastCalc = null;

function render() {
  const r = calculate(readInputs());
  lastCalc = r;

  // percentage labels
  $('lbl-commission').textContent = pct(r.commissionPct);
  $('lbl-salesTax').textContent = pct(r.salesTaxPct);
  $('lbl-margin').textContent = pct(r.marginPct);
  $('lbl-icms').textContent = pct(r.icmsPct);
  $('lbl-icmsSt').textContent = pct(r.icmsStPct);
  $('lbl-ipi').textContent = pct(r.ipiPct);

  // main card
  $('hero-price').textContent = fmtNum(r.price);
  $('hero-markup').textContent = fmtNum(r.markup) + 'x';
  $('hero-revenue').textContent = brl(r.revenueAfterFees);
  $('stat-profit').textContent = brl(r.marginAmount);
  $('stat-margin-pct').textContent = pct(r.operatingMarginPct);

  // breakdown table
  $('tbl-price').textContent = brl(r.price);
  $('tbl-commission-pct').textContent = pct(r.commissionPct);
  $('tbl-commission-val').textContent = brl(r.commissionAmount);
  $('tbl-fixedFee-pct').textContent = pct(r.fixedFeePctOfPrice);
  $('tbl-fixedFee-val').textContent = brl(r.fixedFee);
  $('tbl-revenue-pct').textContent = pct(r.revenuePctOfPrice);
  $('tbl-revenue-val').textContent = brl(r.revenueAfterFees);
  $('tbl-salesTax-pct').textContent = pct(r.salesTaxPct);
  $('tbl-salesTax-val').textContent = brl(r.salesTaxAmount);
  $('tbl-productCost-pct').textContent = pct(r.productCostPctOfPrice);
  $('tbl-productCost-val').textContent = brl(r.productCost);
  $('tbl-icms-pct').textContent = pct(r.icmsPctOfPrice);
  $('tbl-icms-val').textContent = brl(r.icmsAmount);
  $('tbl-icmsSt-pct').textContent = pct(r.icmsStPctOfPrice);
  $('tbl-icmsSt-val').textContent = brl(r.icmsStAmount);
  $('tbl-ipi-pct').textContent = pct(r.ipiPctOfPrice);
  $('tbl-ipi-val').textContent = brl(r.ipiAmount);
  $('tbl-finalCost-pct').textContent = pct(r.finalCostPctOfPrice);
  $('tbl-finalCost-val').textContent = brl(r.adjustedProductCost);
  $('tbl-profit-pct').textContent = pct(r.operatingMarginPct);
  $('tbl-profit-val').textContent = brl(r.marginAmount);

  // composition bar and legend
  const bar = $('compBar');
  bar.innerHTML = '';
  const segments = [
    { v: r.productCostPctOfPrice, c: 'var(--grey)' },
    { v: r.commissionPct, c: 'var(--amber)' },
    { v: r.fixedFeePctOfPrice, c: 'var(--orange)' },
    { v: r.salesTaxPct, c: 'var(--pink)' },
    { v: r.icmsPctOfPrice, c: 'var(--purple)' },
    { v: r.icmsStPctOfPrice, c: 'var(--sky)' },
    { v: r.ipiPctOfPrice, c: 'var(--rose)' },
    { v: r.operatingMarginPct, c: 'var(--teal)' },
  ];
  for (const s of segments) {
    if (s.v > 0) {
      const d = document.createElement('div');
      d.style.width = Math.max(0, Math.min(100, s.v)) + '%';
      d.style.background = s.c;
      bar.appendChild(d);
    }
  }
  document.querySelector('.legend').innerHTML = `
    <span><i class="dot dot-grey"></i>Custo do Produto</span>
    <span><i class="dot dot-amber"></i>Comissão</span>
    <span><i class="dot dot-orange"></i>Taxa fixa</span>
    <span><i class="dot dot-pink"></i>Imposto</span>
    <span><i class="dot dot-purple"></i>ICMS</span>
    <span><i class="dot dot-sky"></i>ST</span>
    <span><i class="dot dot-rose"></i>IPI</span>
    <span><i class="dot dot-teal"></i>Lucro Operacional</span>`;
}

/* ===================== Copying the price ===================== */

// Enter on the button does two things in sequence: the first press copies, the
// next one goes back to the cost field and restarts the form. Since it is the
// same key on the same button, the visual feedback is what tells the user the
// rule has changed.
let priceCopiedSinceFocus = false;
let copyFeedbackTimer = null;
const COPY_FEEDBACK_MS = 2000;

// The format a marketplace price field accepts when pasted as is: decimal
// comma, no "R$" and no thousands separator.
function priceForClipboard() {
  const price = lastCalc ? lastCalc.price : 0;
  return price.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

function showCopyFeedback() {
  const button = $(COPY_BUTTON_ID);
  button.classList.add('copied');
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = setTimeout(() => {
    button.classList.remove('copied');
    copyFeedbackTimer = null;
  }, COPY_FEEDBACK_MS);
}

async function copyPrice() {
  priceCopiedSinceFocus = true;
  const copied = await copyText(priceForClipboard());
  if (copied) {
    showCopyFeedback();
    showToast('Copiado para a área de transferência');
  } else {
    showToast('Não foi possível copiar o preço');
  }
}

const copyPriceButton = $(COPY_BUTTON_ID);
copyPriceButton.addEventListener('click', copyPrice);
copyPriceButton.addEventListener('focus', () => {
  priceCopiedSinceFocus = false;
});
copyPriceButton.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  // Without this the browser would still turn Enter into a click, copying twice.
  e.preventDefault();
  if (priceCopiedSinceFocus) {
    focusField('productCost');
    return;
  }
  copyPrice();
});

/* ===================== Slider and number field sync ===================== */

for (const key of PCT_KEYS) {
  const slider = $(key + 'Slider');
  const numEl = $(key + 'Num');

  slider.addEventListener('input', () => {
    numEl.value = fmtNum(parseFloat(slider.value));
    render();
  });

  numEl.addEventListener('input', () => {
    let v = parseNum(numEl.value);
    const max = parseFloat(slider.max);
    if (v > max) v = max;
    if (v < 0) v = 0;
    slider.value = v;
    render();
  });

  numEl.addEventListener('blur', () => {
    numEl.value = fmtNum(Math.max(0, Math.min(parseNum(numEl.value), parseFloat(slider.max))));
    render();
  });

  numEl.addEventListener('focus', () => numEl.select());
}

// Drag overlay with reduced sensitivity (same as the app): dragging the native
// slider directly is too sensitive to land on an exact value, so an invisible
// overlay on top scales the pointer movement by a factor below 1, meaning the
// user has to move further to change the value.
function attachSliderSensitivity(sliderId, sensitivity) {
  const slider = $(sliderId);
  const overlay = slider.nextElementSibling;
  let dragging = false;
  let startX = 0;
  let startValue = 0;

  overlay.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX;
    startValue = parseFloat(slider.value);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    overlay.setPointerCapture(e.pointerId);
  });
  overlay.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const step = parseFloat(slider.step) || 1;
    const width = overlay.getBoundingClientRect().width;
    const deltaValue = ((e.clientX - startX) / width) * (max - min) * sensitivity;
    let v = Math.round((startValue + deltaValue) / step) * step;
    if (v < min) v = min;
    if (v > max) v = max;
    if (v !== parseFloat(slider.value)) {
      slider.value = v;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  function endDrag(e) {
    dragging = false;
    if (overlay.hasPointerCapture(e.pointerId)) overlay.releasePointerCapture(e.pointerId);
  }
  overlay.addEventListener('pointerup', endDrag);
  overlay.addEventListener('pointercancel', endDrag);
}
for (const key of PCT_KEYS) {
  attachSliderSensitivity(key + 'Slider', 0.35);
}

// ▲▼ arrows next to the value, for fine tuning in 0.01 steps (same as the app)
document.querySelectorAll('[data-step-key]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.stepKey;
    const delta = parseFloat(btn.dataset.stepDelta);
    const numEl = $(key + 'Num');
    const slider = $(key + 'Slider');
    const max = parseFloat(slider.max);
    let v = parseNum(numEl.value) + delta;
    if (v < 0) v = 0;
    if (v > max) v = max;
    numEl.value = fmtNum(v);
    slider.value = v;
    render();
  });
});

for (const id of ['productCost', 'fixedFee']) {
  const el = $(id);
  el.addEventListener('input', render);
  el.addEventListener('blur', () => {
    el.value = fmtNum(Math.max(0, Math.min(parseNum(el.value), MONEY_MAX)));
    render();
  });
  el.addEventListener('focus', () => el.select());
}

/* ===================== Reset ===================== */

$('btnReset').addEventListener('click', () => {
  $('productCost').value = '0,00';
  $('fixedFee').value = '0,00';
  for (const key of PCT_KEYS) {
    $(key + 'Slider').value = 0;
    $(key + 'Num').value = '0,00';
  }
  render();
  clearLoadedPrice();
});

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

  // load into the calculator
  $('productCost').value = fmtNum(price.inputs.productCost);
  $('fixedFee').value = fmtNum(price.inputs.fixedFee);
  for (const field of PCT_KEYS) {
    const value = price.inputs[INPUT_KEY_BY_FIELD[field]];
    $(field + 'Slider').value = value;
    $(field + 'Num').value = fmtNum(value);
  }
  render();
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
  if (!name || !lastCalc) return;
  const inputs = readInputs();
  const price = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    name,
    inputs,
    display: {
      adjustedProductCost: lastCalc.adjustedProductCost,
      price: lastCalc.price,
      operatingMarginPct: lastCalc.operatingMarginPct,
      marginAmount: lastCalc.marginAmount,
    },
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
  if (!lastCalc) return;
  const list = loadSaved();
  const idx = list.findIndex((p) => p.id === loadedPriceId);
  if (idx === -1) {
    $('saveChoiceOverlay').hidden = true;
    return;
  }
  list[idx].inputs = readInputs();
  list[idx].display = {
    adjustedProductCost: lastCalc.adjustedProductCost,
    price: lastCalc.price,
    operatingMarginPct: lastCalc.operatingMarginPct,
    marginAmount: lastCalc.marginAmount,
  };
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

// close popups by clicking outside or pressing Esc
const DISMISSABLE_OVERLAYS = [
  'saveOverlay',
  'deleteOverlay',
  'loadOverlay',
  'legalOverlay',
  'saveChoiceOverlay',
  'editNameOverlay',
];
for (const ov of DISMISSABLE_OVERLAYS) {
  $(ov).addEventListener('click', (e) => {
    if (e.target === $(ov)) {
      if (ov === 'legalOverlay') closeLegal();
      else $(ov).hidden = true;
    }
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    for (const ov of DISMISSABLE_OVERLAYS) {
      if (ov === 'legalOverlay') closeLegal();
      else $(ov).hidden = true;
    }
  }
});

/* ===================== Legal documents (popup) ===================== */

// Opens the legal page inside a popup (iframe), same as the app. The plain link
// stays in the href as a fallback: if the JS fails or the user opens a new tab
// (Ctrl+click), the page still loads normally.
const LEGAL_DOCS = {
  politica: '../politica-privacidade.html',
  termos: '../termos-servico.html',
  excluir: '../deletar-conta.html',
};

function openLegal(key) {
  const src = LEGAL_DOCS[key];
  if (!src) return;
  $('legalFrame').src = src;
  $('legalOverlay').hidden = false;
}
function closeLegal() {
  $('legalOverlay').hidden = true;
  $('legalFrame').src = 'about:blank'; // unloads the content on close
}

document.querySelectorAll('[data-legal]').forEach((a) => {
  a.addEventListener('click', (e) => {
    // respects Ctrl/Cmd+click and middle click (open in a new tab)
    if (e.ctrlKey || e.metaKey || e.button === 1) return;
    e.preventDefault();
    openLegal(a.dataset.legal);
  });
});
$('legalClose').addEventListener('click', closeLegal);

/* ===================== Theme ===================== */

// Day/night switch, same as the app: checked = day (light), unchecked = night (dark)
const themeSwitch = $('themeSwitch');
themeSwitch.checked = document.documentElement.getAttribute('data-theme') === 'light';
themeSwitch.addEventListener('change', () => {
  const theme = themeSwitch.checked ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Private browsing can deny storage; the theme still applies for this visit.
  }
});

/* ===================== Hamburger menu (narrow screens) ===================== */

const sidebar = $('sidebar');
const menuToggle = $('menuToggle');
const backdrop = $('menuBackdrop');

function setMenu(open) {
  sidebar.classList.toggle('open', open);
  backdrop.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
}
menuToggle.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
backdrop.addEventListener('click', () => setMenu(false));

/* ===================== Startup ===================== */

attachEnterNavigation();
render();
renderSavedList();
