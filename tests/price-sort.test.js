/*
 * Tests the order of the saved prices list.
 *
 * The module is pure and touches no DOM, so the whole order can be proven here
 * instead of on a phone. The accent and the case tests are the ones that matter:
 * they are exactly what a plain JavaScript sort gets wrong, and the reason
 * Intl.Collator is used at all.
 */

import { describe, it, expect } from 'vitest';
import { sortPricesByName } from '../preco-lucro/calculadora/price-sort.js';

/** Turns names into the price shape the list works with. */
function pricesNamed(...names) {
  return names.map((name, index) => ({ id: String(index), name: name }));
}

/** The names of a sorted list, in order. */
function namesOf(prices) {
  return prices.map((price) => price.name);
}

describe('alphabetical order', () => {
  it('sorts plain names', () => {
    const sorted = sortPricesByName(pricesNamed('Caneca', 'Almofada', 'Bolsa'));

    expect(namesOf(sorted)).toEqual(['Almofada', 'Bolsa', 'Caneca']);
  });

  it('puts an accented name where the letter belongs, not after Z', () => {
    const sorted = sortPricesByName(pricesNamed('Zebra', 'Ácido', 'Melancia'));

    expect(namesOf(sorted)).toEqual(['Ácido', 'Melancia', 'Zebra']);
  });

  it('ignores case, so lowercase names do not fall to the end', () => {
    const sorted = sortPricesByName(pricesNamed('Zebra', 'banana', 'Abacaxi'));

    expect(namesOf(sorted)).toEqual(['Abacaxi', 'banana', 'Zebra']);
  });

  it('reads the accent and the case as the same letter', () => {
    const sorted = sortPricesByName(pricesNamed('cafe', 'Café', 'CAFE'));

    // All three compare as equal, so the only promise is that none is lost.
    expect(sorted).toHaveLength(3);
    expect(namesOf(sorted).sort()).toEqual(['CAFE', 'Café', 'cafe'].sort());
  });
});

describe('what it does not break', () => {
  it('leaves the array it received untouched', () => {
    const original = pricesNamed('Caneca', 'Almofada');

    sortPricesByName(original);

    expect(namesOf(original)).toEqual(['Caneca', 'Almofada']);
  });

  it('accepts an empty list', () => {
    expect(sortPricesByName([])).toEqual([]);
  });

  it('does not throw on a price saved without a name', () => {
    const sorted = sortPricesByName([{ id: '1', name: 'Bolsa' }, { id: '2' }]);

    expect(sorted).toHaveLength(2);
    expect(sorted[0].name).toBeUndefined();
  });
});
