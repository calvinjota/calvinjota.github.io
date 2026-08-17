/*
 * legal.js: the privacy policy, the terms and the account deletion page, opened
 * in a popup instead of taking the user away from the calculator.
 *
 * The plain link stays in the href as a fallback: if the JS fails or the user
 * opens a new tab (Ctrl+click), the page still loads normally.
 *
 * Closing needs more than hiding the popup, the iframe has to be unloaded, so
 * this module hands overlays.js its own closer and lets the backdrop and Esc
 * keep working through the same path as every other popup.
 */

import { registerOverlayCloser } from './overlays.js?v=1';

const $ = (id) => document.getElementById(id);

const LEGAL_OVERLAY_ID = 'legalOverlay';

const LEGAL_DOCS = {
  politica: '../politica-privacidade.html',
  termos: '../termos-servico.html',
  excluir: '../deletar-conta.html',
};

function openLegal(key) {
  const src = LEGAL_DOCS[key];
  if (!src) return;
  $('legalFrame').src = src;
  $(LEGAL_OVERLAY_ID).hidden = false;
}

function closeLegal() {
  $(LEGAL_OVERLAY_ID).hidden = true;
  $('legalFrame').src = 'about:blank'; // unloads the content on close
}

/** Binds the legal links and the close button. Called once, at startup. */
export function attachLegalLinks() {
  registerOverlayCloser(LEGAL_OVERLAY_ID, closeLegal);

  document.querySelectorAll('[data-legal]').forEach((link) => {
    link.addEventListener('click', (event) => {
      // respects Ctrl/Cmd+click and middle click (open in a new tab)
      if (event.ctrlKey || event.metaKey || event.button === 1) return;
      event.preventDefault();
      openLegal(link.dataset.legal);
    });
  });

  $('legalClose').addEventListener('click', closeLegal);
}
