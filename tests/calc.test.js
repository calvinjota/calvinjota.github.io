/*
 * Tests for the website pricing calculation.
 *
 * These run the canonical scenarios (shared with the Android app) against the
 * website's calc module. The Android app has an identical test file pointing at
 * its own module, so any divergence between app and website is caught here
 * before it reaches a user.
 */

import { describe, it, expect } from 'vitest';
import { calculate, brl, pct } from '../preco-lucro/calculadora/calc.js';
import { scenarios, inputParsingScenarios } from './calc.scenarios.js';

// Money is compared to the cent: two decimal places is what the user sees.
const CENT_PRECISION = 2;

describe('calculate: canonical pricing scenarios', () => {
  for (const scenario of scenarios) {
    it(scenario.name, () => {
      const result = calculate(scenario.inputs);

      for (const [field, expectedValue] of Object.entries(scenario.expected)) {
        expect(result[field], `field "${field}"`).toBeCloseTo(expectedValue, CENT_PRECISION);
      }
    });
  }
});

describe('calculate: user input parsing', () => {
  for (const scenario of inputParsingScenarios) {
    it(scenario.name, () => {
      const result = calculate(scenario.inputs);

      for (const [field, expectedValue] of Object.entries(scenario.expected)) {
        expect(result[field], `field "${field}"`).toBeCloseTo(expectedValue, CENT_PRECISION);
      }
    });
  }
});

describe('calculate: internal consistency', () => {
  const inputs = {
    productCost: 100,
    fixedFee: 26,
    commissionPct: 11.5,
    salesTaxPct: 8.47,
    marginPct: 10,
    icmsPct: 5,
    icmsStPct: 2,
    ipiPct: 3,
  };

  it('price equals the sum of its parts', () => {
    const r = calculate(inputs);
    const sumOfParts =
      r.adjustedProductCost + r.fixedFee + r.commissionAmount + r.salesTaxAmount + r.marginAmount;

    expect(sumOfParts).toBeCloseTo(r.price, CENT_PRECISION);
  });

  it('component percentages of the price add up to 100%', () => {
    const r = calculate(inputs);
    const sumOfPercentages =
      r.finalCostPctOfPrice + r.fixedFeePctOfPrice + r.commissionPct + r.salesTaxPct + r.marginPct;

    expect(sumOfPercentages).toBeCloseTo(100, CENT_PRECISION);
  });

  it('adjusted product cost equals base cost plus its taxes', () => {
    const r = calculate(inputs);

    expect(r.adjustedProductCost).toBeCloseTo(
      r.productCost + r.icmsAmount + r.icmsStAmount + r.ipiAmount,
      CENT_PRECISION
    );
  });

  it('markup is the price divided by the total cost', () => {
    const r = calculate(inputs);
    const totalCost = r.adjustedProductCost + r.fixedFee;

    expect(r.markup).toBeCloseTo(r.price / totalCost, 4);
  });

  it('never returns a non-finite price', () => {
    const extremes = [
      { productCost: 1e6, fixedFee: 1e6, commissionPct: 100, salesTaxPct: 100, marginPct: 100 },
      { productCost: 0, fixedFee: 0, commissionPct: 100, salesTaxPct: 0, marginPct: 0 },
      { productCost: 1, fixedFee: 0, commissionPct: 33.33, salesTaxPct: 33.33, marginPct: 33.34 },
    ];

    for (const inputs of extremes) {
      expect(Number.isFinite(calculate(inputs).price)).toBe(true);
    }
  });
});

describe('brl: Brazilian currency formatting', () => {
  it('formats whole and fractional values with two decimals', () => {
    expect(brl(0)).toBe('R$ 0,00');
    expect(brl(1234.5)).toBe('R$ 1.234,50');
    expect(brl(179.9229)).toBe('R$ 179,92');
  });

  it('formats negative values (invalid pricing setups)', () => {
    expect(brl(-500)).toBe('R$ -500,00');
  });

  it('falls back to zero for non-finite values', () => {
    expect(brl(NaN)).toBe('R$ 0,00');
    expect(brl(Infinity)).toBe('R$ 0,00');
  });
});

describe('pct: Brazilian percentage formatting', () => {
  it('formats percentages with two decimals', () => {
    expect(pct(0)).toBe('0,00%');
    expect(pct(11.5)).toBe('11,50%');
    expect(pct(8.475)).toBe('8,48%');
  });

  it('falls back to zero for non-finite values', () => {
    expect(pct(NaN)).toBe('0,00%');
    expect(pct(Infinity)).toBe('0,00%');
  });
});
