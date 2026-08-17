/*
 * app.js: the startup of the web calculator, and nothing else.
 *
 * Every module keeps to itself and binds its own controls, so what is left here
 * is the order in which they are switched on. Reading this file is meant to be
 * enough to know what the page is made of.
 *
 * Nothing is exported: sync.js used to import the saved prices from here and
 * now asks saved-prices.js directly, so this file is a leaf that nobody else
 * depends on.
 */

import { attachEnterNavigation } from './field-order.js?v=1';
import { attachThemeSwitch } from './theme.js?v=1';
import { attachMenu } from './menu.js?v=1';
import { attachOverlayDismissal } from './overlays.js?v=1';
import { attachLegalLinks } from './legal.js?v=1';
import { attachCalculator } from './calculator.js?v=1';
import { attachSavedPrices } from './saved-prices.js?v=1';

attachEnterNavigation();
attachOverlayDismissal();
attachLegalLinks();
attachThemeSwitch();
attachMenu();
attachCalculator();
attachSavedPrices();
