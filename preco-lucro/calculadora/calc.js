/*
 * calc.js: the pricing math (pure module, no interface).
 *
 * Extracted from the recalc() that lived inside index.html, so it could be
 * tested on its own. It is the exact mirror of the same module on the website:
 * both run the same battery of scenarios (tests/calc.scenarios.js), so any
 * divergence between app and site is caught before publishing.
 */

/**
 * Calculates the full pricing from the values informed by the user.
 * @param {Object} inputs
 * @param {number} inputs.productCost    Product cost (R$)
 * @param {number} inputs.fixedFee       Fixed fee (R$)
 * @param {number} inputs.commissionPct  Marketplace commission (%)
 * @param {number} inputs.salesTaxPct    Tax on the sale (%)
 * @param {number} inputs.marginPct      Desired profit margin (%)
 * @param {number} inputs.icmsPct        ICMS on the product (%)
 * @param {number} inputs.icmsStPct      ICMS-ST on the product (%)
 * @param {number} inputs.ipiPct         IPI on the product (%)
 * @returns {Object} every calculated value
 */
export function calculate(inputs) {
  const productCost = toNumber(inputs.productCost);
  const fixedFee = toNumber(inputs.fixedFee);
  const commissionPct = toNumber(inputs.commissionPct);
  const salesTaxPct = toNumber(inputs.salesTaxPct);
  const marginPct = toNumber(inputs.marginPct);
  const icmsPct = toNumber(inputs.icmsPct);
  const icmsStPct = toNumber(inputs.icmsStPct);
  const ipiPct = toNumber(inputs.ipiPct);

  // ICMS, ICMS-ST and IPI raise the product cost (they are not taken out of the selling price)
  const icmsAmount = productCost * (icmsPct / 100);
  const icmsStAmount = productCost * (icmsStPct / 100);
  const ipiAmount = productCost * (ipiPct / 100);
  const adjustedProductCost = productCost + icmsAmount + icmsStAmount + ipiAmount;

  const fixedCost = adjustedProductCost + fixedFee;

  const totalPct = (commissionPct + salesTaxPct + marginPct) / 100;
  let price = totalPct === 1 ? Infinity : fixedCost / (1 - totalPct);
  if (!isFinite(price)) price = 0;

  const commissionAmount = price * (commissionPct / 100);
  const salesTaxAmount = price * (salesTaxPct / 100);
  const marginAmount = price * (marginPct / 100);
  const revenueAfterFees = price - commissionAmount - fixedFee;
  const operatingMarginPct = price > 0 ? (marginAmount / price) * 100 : 0;
  const markup = fixedCost > 0 ? price / fixedCost : 0;

  const pctOfPrice = (v) => (price > 0 ? (v / price) * 100 : 0);

  return {
    price,
    markup,
    commissionAmount,
    salesTaxAmount,
    marginAmount,
    revenueAfterFees,
    operatingMarginPct,
    icmsAmount,
    icmsStAmount,
    ipiAmount,
    adjustedProductCost,
    productCost,
    fixedFee,
    commissionPct,
    salesTaxPct,
    marginPct,
    icmsPct,
    icmsStPct,
    ipiPct,
    // share of each component in the selling price
    productCostPctOfPrice: pctOfPrice(productCost),
    fixedFeePctOfPrice: pctOfPrice(fixedFee),
    revenuePctOfPrice: pctOfPrice(revenueAfterFees),
    icmsPctOfPrice: pctOfPrice(icmsAmount),
    icmsStPctOfPrice: pctOfPrice(icmsStAmount),
    ipiPctOfPrice: pctOfPrice(ipiAmount),
    finalCostPctOfPrice:
      pctOfPrice(productCost) +
      pctOfPrice(icmsAmount) +
      pctOfPrice(icmsStAmount) +
      pctOfPrice(ipiAmount),
  };
}

function toNumber(v) {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return isFinite(n) ? n : 0;
}

/** Formats a number as Brazilian currency: R$ 1.234,56 */
export function brl(v) {
  return (
    'R$ ' +
    (isFinite(v) ? v : 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Formats a number as a Brazilian percentage: 12,34% */
export function pct(v) {
  return (
    (isFinite(v) ? v : 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '%'
  );
}
