/*
 * price-sort.js: the order the saved prices are shown in.
 *
 * Mirrored between the app and the site, like calc.js: both read the same
 * userPrices collection and a list that comes out in a different order on each
 * one looks like a bug to whoever uses the two.
 *
 * The order is decided when the list is drawn, never on the stored array. That
 * array belongs to the merge and to the sync, and sorting it there would mean
 * two owners for the same data — plus the order would have to be redone anyway
 * on any path that did not go through the cloud.
 *
 * Intl.Collator is what makes the order the one a person expects. A plain
 * comparison sorts by Unicode code point, where "Ácido" falls after "Zebra"
 * because the accented letter lives far up the table, and every lowercase name
 * falls after every uppercase one. sensitivity: 'base' treats accent and case as
 * the same letter, which fixes both.
 */

/** Built once: creating a Collator per comparison is the expensive part. */
const NAME_COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/**
 * The saved prices in alphabetical order by name.
 *
 * @param {Array<Object>} prices
 * @returns {Array<Object>} A new array — the one received is left untouched
 */
export function sortPricesByName(prices) {
  return [...prices].sort((first, second) =>
    NAME_COLLATOR.compare(first.name || '', second.name || '')
  );
}
