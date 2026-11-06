/*
 * price-search.js: which saved prices survive what was typed in the search box.
 *
 * Pure like price-sort.js and calc.js: it receives the list and the text, gives
 * back a new list and touches no element. The box that collects the text lives
 * in saved-prices.js, which is what keeps this file testable without a browser.
 *
 * Searching is done on a normalized copy of the name, never on the name itself.
 * "Tramontina" and "trMONTIna" are the same word to a person and a different
 * string to JavaScript, and so are "Café" and "cafe": NFD splits the accented
 * letter into letter plus accent mark, and dropping the marks leaves the plain
 * letter behind. Doing it on the fly costs nothing at this size and spares us a
 * second copy of every name to keep in sync.
 *
 * Several typed words are all required, in any order: "tramontina panela" finds
 * "Panela Tramontina 20cm". Requiring the order would make the search fail for
 * the one reason a person cannot guess, the order the name happened to be saved
 * in, and matching any one word instead would bring back the whole list as soon
 * as a common word is typed.
 */

/** Accent marks, the range NFD moves them to. */
const DIACRITICS = /[̀-ͯ]/g;

/** The form two names are compared in: no accent, no case, no edge spaces. */
function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim();
}

/**
 * The saved prices whose name contains every word typed.
 *
 * @param {Array<Object>} prices
 * @param {string} query what the user typed, raw
 * @returns {Array<Object>} A new array — the one received is left untouched
 */
export function filterPricesByQuery(prices, query) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...prices];

  return prices.filter((price) => {
    const name = normalize(price.name);
    return terms.every((term) => name.includes(term));
  });
}
