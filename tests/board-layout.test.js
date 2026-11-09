/*
 * Tests where each card of the calculator ends up on the board.
 *
 * The module is pure and touches no element, so the whole rule of dragging can
 * be proven here instead of by dragging with the mouse: what moves where, what
 * happens to the arrangement when the window narrows, and above all what a
 * damaged saved layout turns into. That last one is the reason this file
 * exists. The layout is text in localStorage, which a person can edit and a new
 * build of the site can outgrow, and a card that falls out of every column is a
 * card nobody can reach again.
 */

import { describe, it, expect } from 'vitest';
import {
  BOARD_CARD_IDS,
  BOARD_COLUMN_COUNT,
  collapseLayout,
  defaultLayout,
  findCard,
  layoutFromStore,
  moveCard,
  normalizeLayout,
  storeWithLayout,
  swapCards,
} from '../preco-lucro/calculadora/board-layout.js';

/** Every card the layout holds, column by column. */
function cardsIn(layout) {
  return layout.flat();
}

describe('the arrangement of a first visit', () => {
  it('spreads every card over the three columns', () => {
    const layout = defaultLayout();

    expect(layout).toHaveLength(BOARD_COLUMN_COUNT);
    expect(cardsIn(layout).sort()).toEqual([...BOARD_CARD_IDS].sort());
  });

  it('keeps every card when the board has a single column', () => {
    expect(defaultLayout(1)).toEqual([BOARD_CARD_IDS]);
  });
});

describe('fitting the cards into another number of columns', () => {
  it('pours the columns that no longer exist into the last one that does', () => {
    const narrow = collapseLayout([['sale'], ['price', 'breakdown'], ['saved']], 2);

    expect(narrow).toEqual([['sale'], ['price', 'breakdown', 'saved']]);
  });

  it('leaves the new columns empty when the board grows', () => {
    expect(collapseLayout([['sale', 'price']], 3)).toEqual([['sale', 'price'], [], []]);
  });

  it('never loses a card, whatever the count', () => {
    for (const count of [1, 2, 3]) {
      expect(cardsIn(collapseLayout(defaultLayout(), count)).sort()).toEqual(
        [...BOARD_CARD_IDS].sort(),
      );
    }
  });
});

describe('repairing a layout that came out of storage', () => {
  it('falls back to the default when it is not a layout at all', () => {
    for (const broken of [null, undefined, 'sale', 42, { 0: 'sale' }]) {
      expect(normalizeLayout(broken)).toEqual(defaultLayout());
    }
  });

  it('drops a card id the site no longer has', () => {
    const repaired = normalizeLayout([['sale', 'weather'], ['price', 'breakdown'], ['saved']]);

    expect(cardsIn(repaired)).not.toContain('weather');
    expect(repaired[0]).toEqual(['sale']);
  });

  it('keeps the first place of a card written twice', () => {
    const repaired = normalizeLayout([['sale', 'saved'], ['price', 'breakdown'], ['saved']]);

    expect(cardsIn(repaired).filter((id) => id === 'saved')).toHaveLength(1);
    expect(repaired[0]).toEqual(['sale', 'saved']);
  });

  it('brings back a card that was missing, in the column it has by default', () => {
    const repaired = normalizeLayout([['sale'], ['price', 'breakdown'], []]);

    expect(repaired[2]).toEqual(['saved']);
  });

  it('survives a column that is not an array', () => {
    const repaired = normalizeLayout([['sale'], 'price', ['saved']]);

    expect(cardsIn(repaired).sort()).toEqual([...BOARD_CARD_IDS].sort());
  });
});

describe('moving a card', () => {
  const layout = [['sale'], ['price', 'breakdown'], ['saved']];

  it('takes it out of the old column and puts it in the new one', () => {
    const moved = moveCard(layout, 'saved', 0, 0);

    expect(moved[0]).toEqual(['saved', 'sale']);
    expect(moved[2]).toEqual([]);
  });

  it('lands where the gap was seen when it moves down its own column', () => {
    const moved = moveCard(layout, 'price', 1, 1);

    expect(moved[1]).toEqual(['breakdown', 'price']);
  });

  it('leaves the layout it received untouched', () => {
    moveCard(layout, 'saved', 0, 0);

    expect(layout).toEqual([['sale'], ['price', 'breakdown'], ['saved']]);
  });

  it('clamps a position past the end of the column', () => {
    const moved = moveCard(layout, 'sale', 2, 99);

    expect(moved[2]).toEqual(['saved', 'sale']);
  });

  it('clamps a column that does not exist', () => {
    const moved = moveCard(layout, 'sale', 9, 0);

    expect(moved[BOARD_COLUMN_COUNT - 1][0]).toBe('sale');
  });

  it('ignores a card the board does not know', () => {
    expect(moveCard(layout, 'weather', 0, 0)).toEqual(layout);
  });
});

describe('swapping two cards', () => {
  const layout = [['sale'], ['price', 'breakdown'], ['saved']];

  it('puts each one where the other was', () => {
    const swapped = swapCards(layout, 'sale', 'breakdown');

    expect(swapped[0]).toEqual(['breakdown']);
    expect(swapped[1]).toEqual(['price', 'sale']);
  });

  it('moves nobody else, which is the whole difference from inserting', () => {
    const swapped = swapCards(layout, 'saved', 'price');

    expect(swapped[1]).toEqual(['saved', 'breakdown']);
    expect(swapped[2]).toEqual(['price']);
    expect(swapped[0]).toEqual(['sale']);
  });

  it('swaps two cards that share a column', () => {
    expect(swapCards(layout, 'price', 'breakdown')[1]).toEqual(['breakdown', 'price']);
  });

  it('does nothing when a card is dropped on itself', () => {
    expect(swapCards(layout, 'sale', 'sale')).toEqual(layout);
  });

  it('does nothing when one of them is not on the board', () => {
    expect(swapCards(layout, 'sale', 'weather')).toEqual(layout);
  });

  it('leaves the layout it received untouched', () => {
    swapCards(layout, 'sale', 'saved');

    expect(layout).toEqual([['sale'], ['price', 'breakdown'], ['saved']]);
  });

  it('never loses or duplicates a card', () => {
    const swapped = swapCards(layout, 'sale', 'saved');

    expect(cardsIn(swapped).sort()).toEqual([...BOARD_CARD_IDS].sort());
  });
});

describe('finding where a card is', () => {
  it('gives the column and the position', () => {
    expect(findCard([['sale'], ['price', 'breakdown'], ['saved']], 'breakdown')).toEqual({
      column: 1,
      index: 1,
    });
  });

  it('gives nothing for a card that is nowhere', () => {
    expect(findCard([['sale'], [], []], 'saved')).toBeNull();
  });
});

describe('the arrangements kept side by side, one per column count', () => {
  it('reads back the arrangement saved for that count', () => {
    const store = storeWithLayout({}, 2, [['saved'], ['sale', 'price', 'breakdown']]);

    expect(layoutFromStore(store, 2)).toEqual([['saved'], ['sale', 'price', 'breakdown']]);
  });

  it('borrows the widest arrangement for a count never arranged by hand', () => {
    const store = storeWithLayout({}, 3, [['saved'], ['sale'], ['price', 'breakdown']]);

    expect(layoutFromStore(store, 2)).toEqual([['saved'], ['sale', 'price', 'breakdown']]);
  });

  it('does not let one count overwrite another', () => {
    const wide = storeWithLayout({}, 3, [['saved'], ['sale'], ['price', 'breakdown']]);
    const both = storeWithLayout(wide, 1, [['price', 'sale', 'breakdown', 'saved']]);

    expect(layoutFromStore(both, 3)).toEqual([['saved'], ['sale'], ['price', 'breakdown']]);
    expect(layoutFromStore(both, 1)).toEqual([['price', 'sale', 'breakdown', 'saved']]);
  });

  it('falls back to the default when nothing was ever saved', () => {
    for (const empty of [null, undefined, {}, 'nonsense']) {
      expect(layoutFromStore(empty, 3)).toEqual(defaultLayout());
    }
  });

  it('repairs what it reads back instead of trusting it', () => {
    expect(layoutFromStore({ 3: [['sale', 'weather'], [], []] }, 3)).toEqual([
      ['sale'],
      ['price', 'breakdown'],
      ['saved'],
    ]);
  });

  it('copies the columns it writes down, so a later move cannot reach them', () => {
    const layout = [['sale'], ['price', 'breakdown'], ['saved']];
    const store = storeWithLayout({}, 3, layout);
    layout[0].push('saved');

    expect(store[3][0]).toEqual(['sale']);
  });
});
