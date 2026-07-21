/*
 * calc.js: lógica de cálculo da precificação (módulo puro, sem interface).
 * A matemática é idêntica à do app Android (função recalc), mantida em um
 * módulo separado para garantir que app e site nunca divirjam no resultado.
 */

/**
 * Calcula a precificação completa a partir dos dados informados.
 * @param {Object} inputs
 * @param {number} inputs.custoProduto  Custo do produto (R$)
 * @param {number} inputs.taxaFixa      Taxa fixa (R$)
 * @param {number} inputs.comissao      Comissão (%)
 * @param {number} inputs.imposto       Imposto sobre a venda (%)
 * @param {number} inputs.margem        Margem de lucro desejada (%)
 * @param {number} inputs.icms          ICMS sobre o produto (%)
 * @param {number} inputs.icmsSt        ICMS-ST sobre o produto (%)
 * @param {number} inputs.ipi           IPI sobre o produto (%)
 * @returns {Object} todos os valores calculados
 */
export function calcular(inputs) {
  const custoProduto = num(inputs.custoProduto);
  const taxaFixa = num(inputs.taxaFixa);
  const comissaoPct = num(inputs.comissao);
  const impostoPct = num(inputs.imposto);
  const margemPct = num(inputs.margem);
  const icmsPct = num(inputs.icms);
  const icmsStPct = num(inputs.icmsSt);
  const ipiPct = num(inputs.ipi);

  // ICMS, ICMS-ST e IPI aumentam o custo do produto (não descontam do preço de venda)
  const icmsValor = custoProduto * (icmsPct / 100);
  const icmsStValor = custoProduto * (icmsStPct / 100);
  const ipiValor = custoProduto * (ipiPct / 100);
  const custoProdutoAjustado = custoProduto + icmsValor + icmsStValor + ipiValor;

  const custoFixo = custoProdutoAjustado + taxaFixa;

  const percentualTotal = (comissaoPct + impostoPct + margemPct) / 100;
  let preco = percentualTotal === 1 ? Infinity : custoFixo / (1 - percentualTotal);
  if (!isFinite(preco)) preco = 0;

  const valorComissao = preco * (comissaoPct / 100);
  const valorImposto = preco * (impostoPct / 100);
  const valorMargem = preco * (margemPct / 100);
  const receitaAposTaxas = preco - valorComissao - taxaFixa;
  const margemOperacionalPct = preco > 0 ? (valorMargem / preco) * 100 : 0;
  const markup = custoFixo > 0 ? preco / custoFixo : 0;

  const pctOfPreco = (v) => (preco > 0 ? (v / preco) * 100 : 0);

  return {
    preco,
    markup,
    valorComissao,
    valorImposto,
    valorMargem,
    receitaAposTaxas,
    margemOperacionalPct,
    icmsValor,
    icmsStValor,
    ipiValor,
    custoProdutoAjustado,
    custoProduto,
    taxaFixa,
    comissaoPct,
    impostoPct,
    margemPct,
    icmsPct,
    icmsStPct,
    ipiPct,
    // percentuais de cada componente em relação ao preço de venda
    custoProdPctOfPreco: pctOfPreco(custoProduto),
    taxaFixaPctOfPreco: pctOfPreco(taxaFixa),
    receitaPctOfPreco: pctOfPreco(receitaAposTaxas),
    icmsPctOfPreco: pctOfPreco(icmsValor),
    icmsStPctOfPreco: pctOfPreco(icmsStValor),
    ipiPctOfPreco: pctOfPreco(ipiValor),
    custoFinalPctOfPreco:
      pctOfPreco(custoProduto) + pctOfPreco(icmsValor) + pctOfPreco(icmsStValor) + pctOfPreco(ipiValor),
  };
}

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return isFinite(n) ? n : 0;
}

/** Formata um número como moeda brasileira: R$ 1.234,56 */
export function brl(v) {
  return 'R$ ' + (isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formata um número como percentual brasileiro: 12,34% */
export function pct(v) {
  return (isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}
