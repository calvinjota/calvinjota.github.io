/*
 * app.js: interface da calculadora web: liga campos, tema, preços salvos.
 * A matemática vive em calc.js (módulo separado, idêntico ao app Android).
 *
 * Fase atual: página aberta, preços salvos apenas neste navegador (localStorage).
 * Fases seguintes: login Google (Firebase) + checagem de assinatura (Cloudflare
 * Worker + RevenueCat) + sincronização dos preços com o Firestore do app.
 */

import { calcular, brl, pct } from './calc.js?v=2';

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

function fmtNum(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ===================== Leitura dos campos ===================== */

const PCT_KEYS = ['icms', 'icmsSt', 'ipi', 'comissao', 'imposto', 'margem'];
const MONEY_MAX = 1000000;

function readInputs() {
  return {
    custoProduto: Math.min(parseNum($('custoProduto').value), MONEY_MAX),
    taxaFixa: Math.min(parseNum($('taxaFixa').value), MONEY_MAX),
    comissao: parseNum($('comissaoNum').value),
    imposto: parseNum($('impostoNum').value),
    margem: parseNum($('margemNum').value),
    icms: parseNum($('icmsNum').value),
    icmsSt: parseNum($('icmsStNum').value),
    ipi: parseNum($('ipiNum').value),
  };
}

/* ===================== Renderização ===================== */

let lastCalc = null;

function render() {
  const r = calcular(readInputs());
  lastCalc = r;

  // labels dos percentuais
  $('lbl-comissao').textContent = pct(r.comissaoPct);
  $('lbl-imposto').textContent = pct(r.impostoPct);
  $('lbl-margem').textContent = pct(r.margemPct);
  $('lbl-icms').textContent = pct(r.icmsPct);
  $('lbl-icmsSt').textContent = pct(r.icmsStPct);
  $('lbl-ipi').textContent = pct(r.ipiPct);

  // card principal
  $('hero-preco').textContent = fmtNum(r.preco);
  $('hero-markup').textContent = fmtNum(r.markup) + 'x';
  $('hero-voce-recebe').textContent = brl(r.receitaAposTaxas);
  $('stat-lucro').textContent = brl(r.valorMargem);
  $('stat-margem-pct').textContent = pct(r.margemOperacionalPct);

  // tabela de detalhamento
  $('tbl-preco').textContent = brl(r.preco);
  $('tbl-comissao-pct').textContent = pct(r.comissaoPct);
  $('tbl-comissao-val').textContent = brl(r.valorComissao);
  $('tbl-taxaFixa-pct').textContent = pct(r.taxaFixaPctOfPreco);
  $('tbl-taxaFixa-val').textContent = brl(r.taxaFixa);
  $('tbl-receita-pct').textContent = pct(r.receitaPctOfPreco);
  $('tbl-receita-val').textContent = brl(r.receitaAposTaxas);
  $('tbl-custoprod-pct').textContent = pct(r.custoProdPctOfPreco);
  $('tbl-custoprod-val').textContent = brl(r.custoProduto);
  $('tbl-icms-pct').textContent = pct(r.icmsPctOfPreco);
  $('tbl-icms-val').textContent = brl(r.icmsValor);
  $('tbl-icmsst-pct').textContent = pct(r.icmsStPctOfPreco);
  $('tbl-icmsst-val').textContent = brl(r.icmsStValor);
  $('tbl-ipi-pct').textContent = pct(r.ipiPctOfPreco);
  $('tbl-ipi-val').textContent = brl(r.ipiValor);
  $('tbl-custofinal-pct').textContent = pct(r.custoFinalPctOfPreco);
  $('tbl-custofinal-val').textContent = brl(r.custoProdutoAjustado);
  $('tbl-lucro-pct').textContent = pct(r.margemOperacionalPct);
  $('tbl-lucro-val').textContent = brl(r.valorMargem);

  // barra de composição + legenda
  const bar = $('compBar');
  bar.innerHTML = '';
  const segments = [
    { v: r.custoProdPctOfPreco, c: 'var(--grey)' },
    { v: r.comissaoPct, c: 'var(--amber)' },
    { v: r.taxaFixaPctOfPreco, c: 'var(--orange)' },
    { v: r.impostoPct, c: 'var(--pink)' },
    { v: r.icmsPctOfPreco, c: 'var(--purple)' },
    { v: r.icmsStPctOfPreco, c: 'var(--sky)' },
    { v: r.ipiPctOfPreco, c: 'var(--rose)' },
    { v: r.margemOperacionalPct, c: 'var(--teal)' },
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

for (const id of ['custoProduto', 'taxaFixa']) {
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
  $('custoProduto').value = '0,00';
  $('taxaFixa').value = '0,00';
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
  const list = loadSaved();
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
        <span>Custo final: <strong>${brl(p.display.custoFinal)}</strong></span>
        <span>Venda: <strong>${brl(p.display.valorVenda)}</strong></span>
        <span>Margem: <strong>${pct(p.display.margem)}</strong></span>
        <span>Lucro: <strong>${brl(p.display.lucro)}</strong></span>
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
  $('custoProduto').value = fmtNum(price.inputs.custoProduto);
  $('taxaFixa').value = fmtNum(price.inputs.taxaFixa);
  for (const key of PCT_KEYS) {
    $(key + 'Slider').value = price.inputs[key];
    $(key + 'Num').value = fmtNum(price.inputs[key]);
  }
  render();
  loadedPriceId = id;
  showLoadedBanner(price.name);
  $('loadOverlay').hidden = true;
}
$('savedList').addEventListener('click', handleSavedListClick);
$('loadList').addEventListener('click', handleSavedListClick);

/* ---- popup carregar ---- */

$('btnCarregar').addEventListener('click', () => {
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
$('btnSalvar').addEventListener('click', () => {
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
      custoFinal: lastCalc.custoProdutoAjustado,
      valorVenda: lastCalc.preco,
      margem: lastCalc.margemOperacionalPct,
      lucro: lastCalc.valorMargem,
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
    custoFinal: lastCalc.custoProdutoAjustado,
    valorVenda: lastCalc.preco,
    margem: lastCalc.margemOperacionalPct,
    lucro: lastCalc.valorMargem,
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
