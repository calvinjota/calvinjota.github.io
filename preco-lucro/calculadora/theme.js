/*
 * theme.js: the day/night switch of the menu.
 *
 * The theme is already applied before this module loads: an inline script in
 * the <head> of index.html reads localStorage and sets data-theme, so the page
 * never paints in the wrong colour first. What is left here is the switch that
 * changes it and writes the new choice down.
 *
 * The wiring is a function the startup calls rather than something that happens
 * on import, the same rule field-order.js follows: a module that binds handlers
 * the moment it is imported turns the order of the imports into the order of
 * the wiring.
 *
 * Unlike the app, there is no native side to tell: the browser window has no
 * keyboard flash to fix.
 */

const $ = (id) => document.getElementById(id);

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Private browsing can deny storage; the theme still applies for this visit.
  }
}

/** Binds the switch and puts it in the position of the theme in use. */
export function attachThemeSwitch() {
  const themeSwitch = $('themeSwitch');
  themeSwitch.checked = currentTheme() === 'light';
  themeSwitch.addEventListener('change', () => {
    applyTheme(themeSwitch.checked ? 'light' : 'dark');
  });
}
