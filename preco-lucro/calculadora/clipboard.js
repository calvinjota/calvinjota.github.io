/*
 * clipboard.js: copying a piece of text to the system clipboard.
 *
 * Mirrored between the app and the site, like calc.js: the same file has to
 * work in a desktop browser and inside the Android WebView, which do not agree
 * on how copying is allowed.
 *
 * navigator.clipboard is the modern API and needs a secure context, which both
 * have (the app runs on https://localhost through androidScheme: "https"). That
 * is still not enough on Android: the WebView asks the native side for the
 * clipboard-write permission through onPermissionRequest, and Capacitor's
 * BridgeWebChromeClient only answers for camera and microphone, so the promise
 * can reject with NotAllowedError. The hidden field below is the way out: it
 * copies through the old selection API, which asks nobody for permission.
 *
 * document.execCommand is deprecated and still implemented by every browser and
 * WebView in use. If a version ever drops it, the replacement is the native
 * @capacitor/clipboard plugin, and this file is the single place to change.
 */

/**
 * Puts text on the clipboard, without disturbing whatever has the focus.
 *
 * @param {string} text
 * @returns {Promise<boolean>} False when neither path was allowed to copy
 */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // The WebView refused the permission: the hidden field still works.
    }
  }
  return copyThroughHiddenField(text);
}

/**
 * The legacy path: select text nobody can see and let the browser copy it.
 *
 * @param {string} text
 * @returns {boolean}
 */
function copyThroughHiddenField(text) {
  const previousFocus = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  // Off screen rather than display:none, which cannot be selected.
  field.style.position = 'fixed';
  field.style.top = '-1000px';
  field.style.opacity = '0';
  document.body.appendChild(field);

  let copied = false;
  try {
    field.select();
    field.setSelectionRange(0, field.value.length);
    copied = document.execCommand('copy');
  } catch (_) {
    copied = false;
  }

  field.remove();
  // Selecting the field stole the focus, and copying must not move it.
  if (previousFocus && previousFocus.focus) previousFocus.focus();
  return copied;
}
