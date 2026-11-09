/*
 * board-layout.js: which column each card of the calculator sits in, and in
 * what order.
 *
 * Pure like price-sort.js and price-search.js: it receives a layout, gives back
 * a new one and never touches an element or localStorage. The dragging, the
 * elements and the storage all live in board.js, which is what keeps the rule
 * here provable without opening a browser.
 *
 * A layout is an array of columns, each column an array of card ids in the
 * order they are stacked: [['sale'], ['price', 'breakdown'], ['saved']].
 *
 * Narrow screens show fewer columns than wide ones, and an arrangement made for
 * three columns says nothing about how the same cards should stack in one. So
 * the layouts are kept side by side in a store keyed by column count, and a
 * count that was never arranged by hand is derived by collapsing the widest
 * one. Rearranging the phone leaves the desktop untouched, and the other way
 * round.
 *
 * Nothing here trusts what comes out of storage: it is text the user can edit
 * and a build of the site can outgrow. Anything unknown, duplicated or missing
 * is repaired rather than thrown, because a broken layout must never be the
 * reason the calculator does not paint.
 */

/** Every card the board knows, in the order they are written in the HTML. */
export const BOARD_CARD_IDS = ['sale', 'price', 'breakdown', 'saved'];

/** The arrangement a first visit sees, and the one a repair falls back to. */
const DEFAULT_COLUMNS = [['sale'], ['price', 'breakdown'], ['saved']];

/** How many columns the board has at its widest. */
export const BOARD_COLUMN_COUNT = DEFAULT_COLUMNS.length;

function clamp(value, lowest, highest) {
  return Math.min(Math.max(value, lowest), highest);
}

function emptyColumns(columnCount) {
  return Array.from({ length: columnCount }, () => []);
}

/** The column a card belongs to when nothing was arranged by hand. */
function defaultColumnOf(cardId) {
  return DEFAULT_COLUMNS.findIndex((column) => column.includes(cardId));
}

/**
 * The same cards fitted into a different number of columns.
 *
 * Shrinking pours the columns that no longer exist into the last one that does,
 * keeping their order: no card can be dropped, because a card that is in no
 * column is a card nobody can reach. Growing leaves the new columns empty.
 *
 * @param {Array<Array<string>>} layout
 * @param {number} columnCount
 * @returns {Array<Array<string>>} A new layout, the one received is untouched
 */
export function collapseLayout(layout, columnCount) {
  const count = Math.max(1, columnCount);
  const columns = emptyColumns(count);

  layout.forEach((column, index) => {
    columns[Math.min(index, count - 1)].push(...column);
  });

  return columns;
}

/**
 * A layout that is safe to paint, repaired from whatever was handed in.
 *
 * Unknown ids are dropped, a repeated id keeps its first place, a card that is
 * missing joins the column it has by default, and columns beyond the count pour
 * into the last one.
 *
 * @param {unknown} value what came out of storage, of any shape
 * @param {number} [columnCount]
 * @returns {Array<Array<string>>}
 */
export function normalizeLayout(value, columnCount = BOARD_COLUMN_COUNT) {
  const count = Math.max(1, columnCount);
  if (!Array.isArray(value)) return defaultLayout(count);

  const columns = emptyColumns(count);
  const placed = new Set();

  value.forEach((column, index) => {
    if (!Array.isArray(column)) return;
    const target = columns[Math.min(index, count - 1)];
    for (const cardId of column) {
      if (!BOARD_CARD_IDS.includes(cardId) || placed.has(cardId)) continue;
      placed.add(cardId);
      target.push(cardId);
    }
  });

  for (const cardId of BOARD_CARD_IDS) {
    if (placed.has(cardId)) continue;
    columns[clamp(defaultColumnOf(cardId), 0, count - 1)].push(cardId);
  }

  return columns;
}

/**
 * The arrangement of a first visit, in the number of columns asked for.
 *
 * @param {number} [columnCount]
 * @returns {Array<Array<string>>}
 */
export function defaultLayout(columnCount = BOARD_COLUMN_COUNT) {
  return collapseLayout(DEFAULT_COLUMNS, columnCount);
}

/**
 * The layout with one card taken from wherever it is and put somewhere else.
 *
 * The card is removed before the insert, so moving it down inside its own
 * column lands where the person saw the gap open and not one place further.
 *
 * @param {Array<Array<string>>} layout
 * @param {string} cardId
 * @param {number} targetColumn
 * @param {number} targetIndex position inside that column, clamped to its ends
 * @returns {Array<Array<string>>} A new layout, the one received is untouched
 */
export function moveCard(layout, cardId, targetColumn, targetIndex) {
  const columns = layout.map((column) => column.filter((id) => id !== cardId));
  if (!BOARD_CARD_IDS.includes(cardId)) return columns;

  const column = clamp(targetColumn, 0, columns.length - 1);
  const index = clamp(targetIndex, 0, columns[column].length);
  columns[column].splice(index, 0, cardId);

  return columns;
}

/**
 * The layout with two cards in each other's place.
 *
 * A swap, not an insert: the card that was there goes to where the dragged one
 * came from, and nothing else on the board moves. Inserting would push every
 * card below the target down a place, which is how a list behaves and not how
 * a board of panels does.
 *
 * @param {Array<Array<string>>} layout
 * @param {string} firstId
 * @param {string} secondId
 * @returns {Array<Array<string>>} A new layout, the one received is untouched
 */
export function swapCards(layout, firstId, secondId) {
  const columns = layout.map((column) => [...column]);
  const first = findCard(columns, firstId);
  const second = findCard(columns, secondId);
  if (!first || !second || firstId === secondId) return columns;

  columns[first.column][first.index] = secondId;
  columns[second.column][second.index] = firstId;

  return columns;
}

/** Where a card is right now, as { column, index }, or null if it is nowhere. */
export function findCard(layout, cardId) {
  for (const [column, cardIds] of layout.entries()) {
    const index = cardIds.indexOf(cardId);
    if (index !== -1) return { column, index };
  }

  return null;
}

/**
 * The layout to paint for a given number of columns.
 *
 * A count the person never arranged borrows the widest arrangement collapsed
 * down, which is why a phone opened for the first time already follows the
 * order chosen on the desktop.
 *
 * @param {unknown} store what was read from storage, of any shape
 * @param {number} columnCount
 * @returns {Array<Array<string>>}
 */
export function layoutFromStore(store, columnCount) {
  const count = Math.max(1, columnCount);
  const saved = store && typeof store === 'object' ? store[count] : null;
  if (Array.isArray(saved)) return normalizeLayout(saved, count);

  const widest = store && typeof store === 'object' ? store[BOARD_COLUMN_COUNT] : null;
  if (Array.isArray(widest)) {
    return collapseLayout(normalizeLayout(widest, BOARD_COLUMN_COUNT), count);
  }

  return defaultLayout(count);
}

/**
 * The store with this arrangement written down for this number of columns.
 *
 * @param {unknown} store
 * @param {number} columnCount
 * @param {Array<Array<string>>} layout
 * @returns {Object} A new store, the one received is untouched
 */
export function storeWithLayout(store, columnCount, layout) {
  const base = store && typeof store === 'object' && !Array.isArray(store) ? store : {};

  return { ...base, [Math.max(1, columnCount)]: layout.map((column) => [...column]) };
}
