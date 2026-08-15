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
      productCost: 100,
      fixedFee: 26,
      commissionPct: 11.5,
      salesTaxPct: 8.47,
      marginPct: 10,
      icmsPct: 0,
      icmsStPct: 0,
      ipiPct: 0,
    },
    expected: {
      price: 179.9229,
      markup: 1.4279,
      commissionAmount: 20.6911,
      salesTaxAmount: 15.2395,
      marginAmount: 17.9923,
      revenueAfterFees: 133.2318,
      adjustedProductCost: 100,
      operatingMarginPct: 10,
    },
  },
  {
    name: 'everything at zero returns zero',
    inputs: {
      productCost: 0,
      fixedFee: 0,
      commissionPct: 0,
      salesTaxPct: 0,
      marginPct: 0,
      icmsPct: 0,
      icmsStPct: 0,
      ipiPct: 0,
    },
    expected: {
      price: 0,
      markup: 0,
      commissionAmount: 0,
      salesTaxAmount: 0,
      marginAmount: 0,
      revenueAfterFees: 0,
      adjustedProductCost: 0,
      operatingMarginPct: 0,
    },
  },
  {
    name: 'product taxes (ICMS, ICMS-ST, IPI) increase the product cost',
    inputs: {
      productCost: 100,
      fixedFee: 0,
      commissionPct: 0,
      salesTaxPct: 0,
      marginPct: 0,
      icmsPct: 18,
      icmsStPct: 5,
      ipiPct: 10,
    },
    expected: {
      // 100 + 18 + 5 + 10 = 133; with no percentages taken out, price equals cost
      adjustedProductCost: 133,
      price: 133,
      icmsAmount: 18,
      icmsStAmount: 5,
      ipiAmount: 10,
      markup: 1,
    },
  },
  {
    name: 'cost plus fixed fee with no percentages',
    inputs: {
      productCost: 50,
      fixedFee: 10,
      commissionPct: 0,
      salesTaxPct: 0,
      marginPct: 0,
      icmsPct: 0,
      icmsStPct: 0,
      ipiPct: 0,
    },
    expected: {
      price: 60,
      markup: 1,
      revenueAfterFees: 50,
      adjustedProductCost: 50,
    },
  },
  {
    name: 'margin only: 50% margin doubles the price',
    inputs: {
      productCost: 100,
      fixedFee: 0,
      commissionPct: 0,
      salesTaxPct: 0,
      marginPct: 50,
      icmsPct: 0,
      icmsStPct: 0,
      ipiPct: 0,
    },
    expected: {
      price: 200,
      marginAmount: 100,
      markup: 2,
      operatingMarginPct: 50,
    },
  },
  {
    name: 'percentages summing exactly 100% are guarded (no infinite price)',
    inputs: {
      productCost: 100,
      fixedFee: 0,
      commissionPct: 50,
      salesTaxPct: 50,
      marginPct: 0,
      icmsPct: 0,
      icmsStPct: 0,
      ipiPct: 0,
    },
    expected: {
      // Division by zero would be infinite, so the calculation falls back to 0
      price: 0,
      markup: 0,
    },
  },
  {
    name: 'percentages above 100% produce a negative price (invalid setup, shown to the user)',
    inputs: {
      productCost: 100,
      fixedFee: 0,
      commissionPct: 40,
      salesTaxPct: 40,
      marginPct: 40,
      icmsPct: 0,
      icmsStPct: 0,
      ipiPct: 0,
    },
    expected: {
      price: -500,
    },
  },
  {
    name: 'full setup with product taxes and all percentages',
    inputs: {
      productCost: 200,
      fixedFee: 15,
      commissionPct: 12,
      salesTaxPct: 8,
      marginPct: 20,
      icmsPct: 10,
      icmsStPct: 0,
      ipiPct: 5,
    },
    expected: {
      // 200 + 20 (ICMS) + 10 (IPI) = 230 adjusted cost; + 15 fixed = 245 fixed cost
      // percentages total 40% -> 245 / 0.6
      adjustedProductCost: 230,
      price: 408.3333,
      commissionAmount: 49,
      salesTaxAmount: 32.6667,
      marginAmount: 81.6667,
      revenueAfterFees: 344.3333,
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
    inputs: { productCost: '100', fixedFee: '26', commissionPct: '11,5', salesTaxPct: '8,47', marginPct: '10' },
    expected: { price: 179.9229 },
  },
  {
    name: 'missing fields count as zero',
    inputs: { productCost: 100 },
    expected: { price: 100, adjustedProductCost: 100 },
  },
  {
    name: 'invalid values count as zero instead of breaking the calculation',
    inputs: {
      productCost: 100,
      fixedFee: null,
      commissionPct: undefined,
      salesTaxPct: NaN,
      marginPct: 'abc',
      icmsPct: '',
      icmsStPct: Infinity,
      ipiPct: 0,
    },
    expected: { price: 100 },
  },
];
