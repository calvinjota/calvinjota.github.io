/*
 * menu.js: the hamburger drawer of narrow screens.
 *
 * The sidebar is always on screen on a wide window; below the CSS breakpoint it
 * slides in over the page, and then it needs a button to open it and a dark
 * backdrop to close it. That is all this module is.
 *
 * setMenu stays private: the menu is opened by its own button and closed by its
 * own backdrop, so there is no door for another module to come in through.
 */

const $ = (id) => document.getElementById(id);

/** Binds the hamburger button and the backdrop. Called once, at startup. */
export function attachMenu() {
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
}
