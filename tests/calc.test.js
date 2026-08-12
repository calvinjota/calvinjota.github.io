/*
 * Tests for the website pricing calculation.
 *
 * These run the canonical scenarios (shared with the Android app) against the
 * website's calc module. The Android app has an identical test file pointing at
 * its own module, so any divergence between app and website is caught here
 * before it reaches a user.
 */

import { describe, it, expect } from 'vitest';
import { calcular, brl, pct } from '../preco-lucro/calculadora/calc.js';
import { scenarios, inputParsingScenarios } from './calc.scenarios.js';

// Money is compared to the cent: two decimal places is what the user sees.
const CENT_PRECISION = 2;

describe('calcular: canonical pricing scenarios', () => {
  for (const scenario of scenarios) {
    it(scenario.name, () => {
      const result = calcular(scenario.inputs);

      for (const [field, expectedValue] of Object.entries(scenario.expected)) {
        expect(result[field], `field "${field}"`).toBeCloseTo(expectedValue, CENT_PRECISION);
      }
    });
  }
});

describe('calcular: user input parsing', () => {
  for (const scenario of inputParsingScenarios) {
    it(scenario.name, () => {
      const result = calcular(scenario.inputs);

      for (const [field, expectedValue] of Object.entries(scenario.expected)) {
        expect(result[field], `field "${field}"`).toBeCloseTo(expectedValue, CENT_PRECISION);
      }
    });
  }
});

describe('calcular: internal consistency', () => {
  const inputs = {
    custoProduto: 100,
    taxaFixa: 26,
    comissao: 11.5,
    imposto: 8.47,
    margem: 10,
    icms: 5,
    icmsSt: 2,
    ipi: 3,
  };

  it('price equals the sum of its parts', () => {
    const r = calcular(inputs);
    const sumOfParts =
      r.custoProdutoAjustado + r.taxaFixa + r.valorComissao + r.valorImposto + r.valorMargem;

    expect(sumOfParts).toBeCloseTo(r.preco, CENT_PRECISION);
  });

  it('component percentages of the price add up to 100%', () => {
    const r = calcular(inputs);
    const sumOfPercentages =
      r.custoFinalPctOfPreco + r.taxaFixaPctOfPreco + r.comissaoPct + r.impostoPct + r.margemPct;

    expect(sumOfPercentages).toBeCloseTo(100, CENT_PRECISION);
  });

  it('adjusted product cost equals base cost plus its taxes', () => {
    const r = calcular(inputs);

    expect(r.custoProdutoAjustado).toBeCloseTo(
      r.custoProduto + r.icmsValor + r.icmsStValor + r.ipiValor,
      CENT_PRECISION
    );
  });

  it('markup is the price divided by the total cost', () => {
    const r = calcular(inputs);
    const totalCost = r.custoProdutoAjustado + r.taxaFixa;

    expect(r.markup).toBeCloseTo(r.preco / totalCost, 4);
  });

  it('never returns a non-finite price', () => {
    const extremes = [
      { custoProduto: 1e6, taxaFixa: 1e6, comissao: 100, imposto: 100, margem: 100 },
      { custoProduto: 0, taxaFixa: 0, comissao: 100, imposto: 0, margem: 0 },
      { custoProduto: 1, taxaFixa: 0, comissao: 33.33, imposto: 33.33, margem: 33.34 },
    ];

    for (const inputs of extremes) {
      expect(Number.isFinite(calcular(inputs).preco)).toBe(true);
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
