/*
 * Canonical pricing scenarios: the single source of truth for what the
 * calculation must return.
 *
 * IMPORTANT: this exact file is mirrored in the Android app project. Both the
 * app and the website run their own calc module against these same scenarios,
 * so if either side ever changes the math, its test suite fails immediately.
 * That is what guarantees a saved price shows the same numbers on the phone
 * and on the computer.
 *
 * When adding a scenario here, copy the file to the app project as well.
 */

export const scenarios = [
  {
    name: 'reference case (validated against the published app)',
    inputs: {
      custoProduto: 100,
      taxaFixa: 26,
      comissao: 11.5,
      imposto: 8.47,
      margem: 10,
      icms: 0,
      icmsSt: 0,
      ipi: 0,
    },
    expected: {
      preco: 179.9229,
      markup: 1.4279,
      valorComissao: 20.6911,
      valorImposto: 15.2395,
      valorMargem: 17.9923,
      receitaAposTaxas: 133.2318,
      custoProdutoAjustado: 100,
      margemOperacionalPct: 10,
    },
  },
  {
    name: 'everything at zero returns zero',
    inputs: {
      custoProduto: 0,
      taxaFixa: 0,
      comissao: 0,
      imposto: 0,
      margem: 0,
      icms: 0,
      icmsSt: 0,
      ipi: 0,
    },
    expected: {
      preco: 0,
      markup: 0,
      valorComissao: 0,
      valorImposto: 0,
      valorMargem: 0,
      receitaAposTaxas: 0,
      custoProdutoAjustado: 0,
      margemOperacionalPct: 0,
    },
  },
  {
    name: 'product taxes (ICMS, ICMS-ST, IPI) increase the product cost',
    inputs: {
      custoProduto: 100,
      taxaFixa: 0,
      comissao: 0,
      imposto: 0,
      margem: 0,
      icms: 18,
      icmsSt: 5,
      ipi: 10,
    },
    expected: {
      // 100 + 18 + 5 + 10 = 133; with no percentages taken out, price equals cost
      custoProdutoAjustado: 133,
      preco: 133,
      icmsValor: 18,
      icmsStValor: 5,
      ipiValor: 10,
      markup: 1,
    },
  },
  {
    name: 'cost plus fixed fee with no percentages',
    inputs: {
      custoProduto: 50,
      taxaFixa: 10,
      comissao: 0,
      imposto: 0,
      margem: 0,
      icms: 0,
      icmsSt: 0,
      ipi: 0,
    },
    expected: {
      preco: 60,
      markup: 1,
      receitaAposTaxas: 50,
      custoProdutoAjustado: 50,
    },
  },
  {
    name: 'margin only: 50% margin doubles the price',
    inputs: {
      custoProduto: 100,
      taxaFixa: 0,
      comissao: 0,
      imposto: 0,
      margem: 50,
      icms: 0,
      icmsSt: 0,
      ipi: 0,
    },
    expected: {
      preco: 200,
      valorMargem: 100,
      markup: 2,
      margemOperacionalPct: 50,
    },
  },
  {
    name: 'percentages summing exactly 100% are guarded (no infinite price)',
    inputs: {
      custoProduto: 100,
      taxaFixa: 0,
      comissao: 50,
      imposto: 50,
      margem: 0,
      icms: 0,
      icmsSt: 0,
      ipi: 0,
    },
    expected: {
      // Division by zero would be infinite, so the calculation falls back to 0
      preco: 0,
      markup: 0,
    },
  },
  {
    name: 'percentages above 100% produce a negative price (invalid setup, shown to the user)',
    inputs: {
      custoProduto: 100,
      taxaFixa: 0,
      comissao: 40,
      imposto: 40,
      margem: 40,
      icms: 0,
      icmsSt: 0,
      ipi: 0,
    },
    expected: {
      preco: -500,
    },
  },
  {
    name: 'full setup with product taxes and all percentages',
    inputs: {
      custoProduto: 200,
      taxaFixa: 15,
      comissao: 12,
      imposto: 8,
      margem: 20,
      icms: 10,
      icmsSt: 0,
      ipi: 5,
    },
    expected: {
      // 200 + 20 (ICMS) + 10 (IPI) = 230 adjusted cost; + 15 fixed = 245 fixed cost
      // percentages total 40% -> 245 / 0.6
      custoProdutoAjustado: 230,
      preco: 408.3333,
      valorComissao: 49,
      valorImposto: 32.6667,
      valorMargem: 81.6667,
      receitaAposTaxas: 344.3333,
    },
  },
];

/*
 * Scenarios for input parsing: the calculation accepts numbers typed by the
 * user, which arrive as Brazilian-formatted strings or as invalid values.
 */
export const inputParsingScenarios = [
  {
    name: 'comma decimal separator is accepted',
    inputs: { custoProduto: '100', taxaFixa: '26', comissao: '11,5', imposto: '8,47', margem: '10' },
    expected: { preco: 179.9229 },
  },
  {
    name: 'missing fields count as zero',
    inputs: { custoProduto: 100 },
    expected: { preco: 100, custoProdutoAjustado: 100 },
  },
  {
    name: 'invalid values count as zero instead of breaking the calculation',
    inputs: {
      custoProduto: 100,
      taxaFixa: null,
      comissao: undefined,
      imposto: NaN,
      margem: 'abc',
      icms: '',
      icmsSt: Infinity,
      ipi: 0,
    },
    expected: { preco: 100 },
  },
];
