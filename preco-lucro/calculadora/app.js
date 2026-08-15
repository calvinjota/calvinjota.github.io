/*
 * app.js: interface da calculadora web: liga campos, tema, preços salvos.
 * A matemática vive em calc.js (módulo separado, idêntico ao app Android).
 *
 * Fase atual: página aberta, preços salvos apenas neste navegador (localStorage).
 * Fases seguintes: login Google (Firebase) + checagem de assinatura (Cloudflare
 * Worker + RevenueCat) + sincronização dos preços com o Firestore do app.
 */

import { calculate, brl, pct } from './calc.js?v=3';
import { sortPricesByName } from './price-sort.js?v=1';
import { copyText } from './clipboard.js?v=1';
import { showToast } from './toast.js?v=1';

const $ = (id) => document.getElementById(id);

/* ===================== Utilidades ===================== */

// Proteção contra injeção de HTML em nomes digitados pelo usuário (XSS)
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseNum(raw) {
  const v = parseFloat(String(raw).replace(',', '.'));
  return isFinite(v) ? v : 0;
}

// Preço salvo antes da tradução dos nomes (etapa 4.1) não tem os campos novos,
// e sem esta guarda o undefined derrubava o carregamento inteiro em vez de
// apenas zerar os campos, que é o combinado.
function fmtNum(v) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ===================== Leitura dos campos ===================== */

const PCT_KEYS = ['icms', 'icmsSt', 'ipi', 'commission', 'salesTax', 'margin'];
const MONEY_MAX = 1000000;

// O id do campo na tela e o nome do dado guardado são coisas diferentes: o campo
// se chama "commission" no HTML e o dado se chama commissionPct, que é o nome que
// o cálculo usa. Esta tabela é a única ponte entre os dois.
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

/* ===================== Renderização ===================== */

let lastCalc = null;

function render() {
  const r = calculate(readInputs());
  lastCalc = r;

  // labels dos percentuais
  $('lbl-commission').textContent = pct(r.commissionPct);
  $('lbl-salesTax').textContent = pct(r.salesTaxPct);
  $('lbl-margin').textContent = pct(r.marginPct);
  $('lbl-icms').textContent = pct(r.icmsPct);
  $('lbl-icmsSt').textContent = pct(r.icmsStPct);
  $('lbl-ipi').textContent = pct(r.ipiPct);

  // card principal
  $('hero-price').textContent = fmtNum(r.price);
  $('hero-markup').textContent = fmtNum(r.markup) + 'x';
  $('hero-revenue').textContent = brl(r.revenueAfterFees);
  $('stat-profit').textContent = brl(r.marginAmount);
  $('stat-margin-pct').textContent = pct(r.operatingMarginPct);

  // tabela de detalhamento
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

  // barra de composição + legenda
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

/* ===================== Sincronização slider ↔ número ===================== */

// Enter pula pro próximo campo: quem só usa teclado consegue preencher tudo
// apertando Enter em sequência, sem precisar clicar em nada. Ordem = ordem
// visual da tela (aqui os impostos estão sempre à vista, diferente do app, onde
// o painel dobrável faz a ordem depender de estar aberto ou fechado).
// A margem termina no botão de copiar: o preço é um <span> e não recebe foco.
const COPY_BUTTON_ID = 'copyPriceBtn';
const ENTER_NEXT = {
  productCost: 'icmsNum',
  icmsNum: 'icmsStNum',
  icmsStNum: 'ipiNum',
  ipiNum: 'fixedFee',
  fixedFee: 'commissionNum',
  commissionNum: 'salesTaxNum',
  salesTaxNum: 'marginNum',
  marginNum: COPY_BUTTON_ID,
};
function focusField(id) {
  const el = $(id);
  if (!el) return;
  el.focus();
  // Um botão não tem o que selecionar, por isso a pergunta em vez da suposição.
  if (el.select) el.select();
}
function goToNextField(e, nextId) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  focusField(nextId);
}
document.querySelectorAll('input[id]').forEach((el) => {
  const nextId = ENTER_NEXT[el.id];
  if (nextId) el.addEventListener('keydown', (e) => goToNextField(e, nextId));
});

/* ===================== Copiar o preço ===================== */

// O Enter no botão faz duas coisas em sequência: a primeira copia, a seguinte
// volta pro custo e recomeça o formulário. Como é a mesma tecla no mesmo botão,
// o retorno visual é o que avisa o usuário de que a regra mudou.
let priceCopiedSinceFocus = false;
let copyFeedbackTimer = null;
const COPY_FEEDBACK_MS = 2000;

// Formato que campo de preço de marketplace aceita colado direto: vírgula
// decimal, sem "R$" e sem separador de milhar.
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
  // Sem isto o navegador ainda transformaria o Enter num clique, copiando duas vezes.
  e.preventDefault();
  if (priceCopiedSinceFocus) {
    focusField('productCost');
    return;
  }
  copyPrice();
});

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

// Overlay de arrasto com sensibilidade reduzida (igual ao app): em vez de
// arrastar o slider nativo direto (muito sensível, difícil de acertar um
// valor exato), um overlay invisível por cima escala o movimento do
// mouse/dedo por um fator < 1, então precisa mover mais pra mudar o valor.
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

// Setinhas ▲▼ ao lado do valor, para ajuste fino de 0,01 em 0,01 (igual ao app)
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

/* ===================== Resetar ===================== */

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

/* ===================== Preços salvos (localStorage) ===================== */

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

// Renderiza a lista nos dois lugares: coluna "Preços Salvos" e popup "Carregar"
export function renderSavedList() {
  // A ordem é decidida aqui, nunca no array guardado: aquele array é da
  // sincronia com a nuvem e chega na ordem que o Firestore devolver.
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
    </div>`
          )
          .join('');
  $('savedList').innerHTML = html;
  $('loadList').innerHTML = html;
}

/* ---- estado do preço carregado (banner no topo da coluna 1, igual ao app) ---- */

let loadedPriceId = null;

function showLoadedBanner(name) {
  $('loadedPriceName').textContent = name;
  $('loadedPriceBanner').hidden = false;
}
function clearLoadedPrice() {
  loadedPriceId = null;
  $('loadedPriceBanner').hidden = true;
}

// carregar / excluir via delegação de eventos (mesma lógica nas duas listas)
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

  // carregar na calculadora
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

/* ---- popup carregar ---- */

$('btnLoad').addEventListener('click', () => {
  renderSavedList();
  $('loadOverlay').hidden = false;
});
$('loadClose').addEventListener('click', () => ($('loadOverlay').hidden = true));

/* ---- popup salvar (preço novo, sem nada carregado) ---- */

function openSavePopup() {
  $('saveName').value = '';
  $('saveNameCount').textContent = '0';
  $('saveOverlay').hidden = false;
  $('saveName').focus();
}

// Se já tem um preço carregado, pergunta "salvar por cima ou como novo?"
// (igual ao app); senão, pede o nome de um preço novo direto.
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
  // Avisa quem quiser sincronizar isso com a nuvem (ver sync.js)
  document.dispatchEvent(new CustomEvent('price-saved', { detail: price }));
});

/* ---- popup: salvar por cima ou como novo ---- */

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
  // Avisa quem quiser sincronizar isso com a nuvem (ver sync.js) — atualização, não criação
  document.dispatchEvent(new CustomEvent('price-updated', { detail: list[idx] }));
});

/* ---- popup: editar nome do preço carregado ---- */

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

/* ---- popup excluir ---- */

let pendingDeleteId = null;

$('deleteCancel').addEventListener('click', () => ($('deleteOverlay').hidden = true));

$('deleteConfirm').addEventListener('click', () => {
  if (pendingDeleteId) {
    const deletedId = pendingDeleteId;
    persistSaved(loadSaved().filter((p) => p.id !== deletedId));
    pendingDeleteId = null;
    renderSavedList();
    if (deletedId === loadedPriceId) clearLoadedPrice();
    // Avisa quem quiser sincronizar isso com a nuvem (ver sync.js)
    document.dispatchEvent(new CustomEvent('price-deleted', { detail: { id: deletedId } }));
  }
  $('deleteOverlay').hidden = true;
});

// fechar popups clicando fora ou com Esc
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

/* ===================== Documentos legais (popup) ===================== */

// Abre a página legal dentro de um popup (iframe), igual ao app. O link normal
// continua no href como reserva: se o JS falhar ou o usuário abrir em nova aba
// (Ctrl+clique), a página ainda carrega normalmente.
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
  $('legalFrame').src = 'about:blank'; // descarrega o conteúdo ao fechar
}

document.querySelectorAll('[data-legal]').forEach((a) => {
  a.addEventListener('click', (e) => {
    // respeita Ctrl/Cmd+clique e clique do meio (abrir em nova aba)
    if (e.ctrlKey || e.metaKey || e.button === 1) return;
    e.preventDefault();
    openLegal(a.dataset.legal);
  });
});
$('legalClose').addEventListener('click', closeLegal);

/* ===================== Tema ===================== */

// Switch dia/noite igual ao app: marcado = dia (tema claro), desmarcado = noite (escuro)
const themeSwitch = $('themeSwitch');
themeSwitch.checked = document.documentElement.getAttribute('data-theme') === 'light';
themeSwitch.addEventListener('change', () => {
  const theme = themeSwitch.checked ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch {}
});

/* ===================== Menu hambúrguer (telas estreitas) ===================== */

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

/* ===================== Início ===================== */

render();
renderSavedList();
