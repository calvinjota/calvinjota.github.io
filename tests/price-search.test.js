/*
 * Tests the search box over the saved prices.
 *
 * The module is pure and touches no DOM, so what a person expects to find can
 * be proven here instead of by typing on the real page. The case and the accent
 * tests are the ones that matter: they are exactly what a plain `includes`
 * gets wrong, and the reason the names are normalized at all.
 */

import { describe, it, expect } from 'vitest';
import { filterPricesByQuery } from '../preco-lucro/calculadora/price-search.js';

/** Turns names into the price shape the list works with. */
function pricesNamed(...names) {
  return names.map((name, index) => ({ id: String(index), name: name }));
}

/** The names that survived the search, in the order they came back. */
function namesOf(prices) {
  return prices.map((price) => price.name);
}

describe('what the search finds', () => {
  it('finds a name by a piece of it', () => {
    const found = filterPricesByQuery(
      pricesNamed('Tramontina Panela', 'Caneca', 'Bolsa'),
      'panela',
    );

    expect(namesOf(found)).toEqual(['Tramontina Panela']);
  });

  it('ignores the case of what was typed', () => {
    const found = filterPricesByQuery(pricesNamed('Tramontina', 'Caneca'), 'trAMONTIna');

    expect(namesOf(found)).toEqual(['Tramontina']);
  });

  it('reads the accent and the plain letter as the same letter', () => {
    const found = filterPricesByQuery(pricesNamed('Café torrado', 'Caneca'), 'cafe');

    expect(namesOf(found)).toEqual(['Café torrado']);
  });

  it('finds an unaccented name when the accent is the one typed', () => {
    const found = filterPricesByQuery(pricesNamed('Cafe torrado', 'Caneca'), 'café');

    expect(namesOf(found)).toEqual(['Cafe torrado']);
  });

  it('requires every word typed, in any order', () => {
    const list = pricesNamed('Panela Tramontina 20cm', 'Panela Rochedo', 'Faca Tramontina');

    const found = filterPricesByQuery(list, 'tramontina panela');

    expect(namesOf(found)).toEqual(['Panela Tramontina 20cm']);
  });

  it('brings back every name that matches, not just the first', () => {
    const found = filterPricesByQuery(
      pricesNamed('Tramontina Panela', 'Faca Tramontina', 'Caneca'),
      'tramontina',
    );

    expect(namesOf(found)).toEqual(['Tramontina Panela', 'Faca Tramontina']);
  });

  it('keeps the order it received', () => {
    const found = filterPricesByQuery(pricesNamed('Zebra azul', 'Abacaxi azul'), 'azul');

    expect(namesOf(found)).toEqual(['Zebra azul', 'Abacaxi azul']);
  });
});

describe('what the search gives back when there is nothing to filter', () => {
  it('gives back the whole list when nothing was typed', () => {
    const found = filterPricesByQuery(pricesNamed('Caneca', 'Bolsa'), '');

    expect(namesOf(found)).toEqual(['Caneca', 'Bolsa']);
  });

  it('gives back the whole list when only spaces were typed', () => {
    const found = filterPricesByQuery(pricesNamed('Caneca', 'Bolsa'), '   ');

    expect(namesOf(found)).toEqual(['Caneca', 'Bolsa']);
  });

  it('gives back nothing when no name matches', () => {
    expect(filterPricesByQuery(pricesNamed('Caneca', 'Bolsa'), 'parafuso')).toEqual([]);
  });

  it('accepts an empty list', () => {
    expect(filterPricesByQuery([], 'caneca')).toEqual([]);
  });
});

describe('what it does not break', () => {
  it('leaves the array it received untouched', () => {
    const original = pricesNamed('Caneca', 'Bolsa');

    filterPricesByQuery(original, 'caneca');

    expect(namesOf(original)).toEqual(['Caneca', 'Bolsa']);
  });

  it('does not throw on a price saved without a name', () => {
    const list = [{ id: '1', name: 'Bolsa' }, { id: '2' }];

    expect(filterPricesByQuery(list, 'bolsa')).toHaveLength(1);
    expect(filterPricesByQuery(list, '')).toHaveLength(2);
  });
});
