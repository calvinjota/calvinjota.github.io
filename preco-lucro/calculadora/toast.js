/*
 * toast.js: the floating message that announces something and fades by itself.
 *
 * Mirrored between the app and the site. Written in HTML and CSS rather than
 * through @capacitor/toast so that both share one component: the native Android
 * toast would look nothing like the app and does not exist in a browser.
 *
 * The element is built here instead of living in index.html because it belongs
 * to no card on the screen, and the app should read the same whether or not a
 * message is showing.
 */

const TOAST_ID = 'appToast';

/** How long the message stays before fading out. */
const TOAST_DURATION_MS = 2200;

let hideTimer = null;

/** The single toast element, created on first use. */
function toastElement() {
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = 'toast';
    // Announced by a screen reader without stealing the focus.
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  return toast;
}

/**
 * Shows a message for a couple of seconds.
 *
 * A second call replaces the message and restarts the clock, so a quick double
 * tap does not leave the first message hanging.
 *
 * @param {string} message
 */
export function showToast(message) {
  const toast = toastElement();
  toast.textContent = message;
  toast.classList.add('show');

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(function () {
    toast.classList.remove('show');
    hideTimer = null;
  }, TOAST_DURATION_MS);
}
