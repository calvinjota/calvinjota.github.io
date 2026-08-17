/*
 * calculator.js: the calculator screen itself: reading the fields, painting the
 * result, the sliders, the arrows, the reset and the copy button.
 *
 * The math is not here. calc.js does the arithmetic and this module only turns
 * the page into its input and its output, which is why calc.js can be tested
 * without a browser and stays identical to the Android app's copy.
 *
 * The last result is kept private and asked for by getLastCalc(): saved prices
 * need it to store what is on screen, and a shared variable would give the same
 * data two owners.
 */

import { calculate, brl, pct } from './calc.js?v=4';
import { copyText } from './clipboard.js?v=2';
import { showToast } from './toast.js?v=1';
import { parseNum, fmtNum } from './format.js?v=1';
import { COPY_BUTTON_ID, focusField } from './field-order.js?v=1';

const $ = (id) => document.getElementById(id);

/* ===================== Reading the fields ===================== */

const PCT_KEYS = ['icms', 'icmsSt', 'ipi', 'commission', 'salesTax', 'margin'];
const MONEY_KEYS = ['productCost', 'fixedFee'];
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

export function readInputs() {
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

/** The result on screen right now, or null before the first render. */
export function getLastCalc() {
  return lastCalc;
}

export function render() {
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

/* ===================== Filling the fields from outside ===================== */

/**
 * Puts a saved price back on screen and renders it.
 *
 * Whoever calls this hands over the stored `inputs` object and never touches
 * the fields: the field ids and the bridge table stay inside this module.
 *
 * @param {object} inputs the eight keys calc.js expects
 */
export function loadInputs(inputs) {
  $('productCost').value = fmtNum(inputs.productCost);
  $('fixedFee').value = fmtNum(inputs.fixedFee);
  for (const field of PCT_KEYS) {
    const value = inputs[INPUT_KEY_BY_FIELD[field]];
    $(field + 'Slider').value = value;
    $(field + 'Num').value = fmtNum(value);
  }
  render();
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

function attachCopyButton() {
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
}

/* ===================== Slider and number field sync ===================== */

function attachPercentFields() {
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
}

// Drag overlay with reduced sensitivity (same as the app): dragging the native
// slider directly is too sensitive to land on an exact value, so an invisible
// overlay on top scales the pointer movement by a factor below 1, meaning the
// user has to move further to change the value.
const SLIDER_SENSITIVITY = 0.35;

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

// ▲▼ arrows next to the value, for fine tuning in 0.01 steps (same as the app)
function attachStepArrows() {
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
}

function attachMoneyFields() {
  for (const id of MONEY_KEYS) {
    const el = $(id);
    el.addEventListener('input', render);
    el.addEventListener('blur', () => {
      el.value = fmtNum(Math.max(0, Math.min(parseNum(el.value), MONEY_MAX)));
      render();
    });
    el.addEventListener('focus', () => el.select());
  }
}

/* ===================== Reset ===================== */

// Resetting also drops the price loaded into the form, but that banner belongs
// to the saved prices, above this module. It subscribes here instead of being
// called by name, so the dependency keeps running one way only.
let onReset = () => {};

/** @param {() => void} callback runs after the fields are cleared */
export function setOnReset(callback) {
  onReset = callback;
}

function attachReset() {
  $('btnReset').addEventListener('click', () => {
    $('productCost').value = '0,00';
    $('fixedFee').value = '0,00';
    for (const key of PCT_KEYS) {
      $(key + 'Slider').value = 0;
      $(key + 'Num').value = '0,00';
    }
    render();
    onReset();
  });
}

/* ===================== Wiring ===================== */

/** Binds every control of the calculator and paints the first result. */
export function attachCalculator() {
  attachCopyButton();
  attachPercentFields();
  for (const key of PCT_KEYS) {
    attachSliderSensitivity(key + 'Slider', SLIDER_SENSITIVITY);
  }
  attachStepArrows();
  attachMoneyFields();
  attachReset();
  render();
}
