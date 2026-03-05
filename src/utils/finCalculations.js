import { MACRS } from '../constants';

/**
 * Bisection root-finder.
 * Returns the x in [lo, hi] where fn(x) ≈ 0, or null if no sign change exists.
 */
export function bisect(fn, lo, hi, tol = 0.01, maxIter = 80) {
  let fLo = fn(lo), fHi = fn(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    if (Math.abs(hi - lo) < tol) return mid;
    const fMid = fn(mid);
    if (fMid * fLo < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

/**
 * Build a depreciation schedule array from a MACRS method string.
 * @param {string} deprMethod  e.g. "MACRS 7-yr", "Bonus 100%", "Straight-line"
 * @param {number} projLife    project life in years (used for straight-line)
 * @returns {number[]} annual depreciation fractions (sum ≈ 1)
 */
export function buildDeprSchedule(deprMethod, projLife) {
  if (deprMethod === "Bonus 100%") return MACRS["bonus"];
  if (deprMethod === "Straight-line") return Array(projLife).fill(1 / projLife);
  const key = deprMethod.replace("MACRS ", "");
  return MACRS[key] || MACRS["7-yr"];
}

/**
 * Newton-Raphson IRR solver.
 * @param {number[]} cashFlows  array of cash flows: [CF_0, CF_1, ..., CF_n]
 *                              CF_0 is typically negative (initial investment)
 * @returns {number} IRR as a decimal (e.g. 0.12 = 12%)
 */
export function calcIRR(cashFlows) {
  let irr = 0.10;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv  += cashFlows[t] / Math.pow(1 + irr, t);
      if (t > 0) dnpv -= t * cashFlows[t] / Math.pow(1 + irr, t + 1);
    }
    if (Math.abs(npv) < 100) break;
    const next = irr - npv / dnpv;
    irr = Math.min(Math.max(next, -0.5), 2.0);
  }
  return irr;
}

/**
 * Calculate Capital Charge Factor (annuity factor of WACC over n years).
 * CCF = r / (1 − (1+r)^{−n})
 */
export function calcCCF(discountRate, projLife) {
  return discountRate / (1 - Math.pow(1 + discountRate, -projLife));
}

/**
 * Compute the full year-by-year cash flow rows for the Model tab table.
 *
 * @param {object} p  parameters object with all required inputs
 * @returns {object[]} cfRows array
 */
export function calcCFRows(p) {
  const {
    res, src, codYear, projLife, grantAmt, use45Q, q45Duration, q45Inflation, q45StartYear,
    useCDRCredit, cdrCreditRate, useAvoidCredit, avoidCreditRate, vcmDuration,
    fedTax, stateTax, deprMethod, use48C, itcPct, gpO, gp, st,
    NETL_FIN, NETL_DEFAULT, BASE_GP, hhStripPrice
  } = p;

  const netl = NETL_FIN[src] || NETL_DEFAULT;
  const constructionYears = netl.constructionYrs;
  const capexDist = netl.capexDist;
  const totalYears = constructionYears + projLife;

  const capex = res.sTOC;
  const tascTocFactor = netl.tascToc;
  const totalCapex = capex * tascTocFactor;
  const grantValue = grantAmt * 1e6;
  const annualCO2 = res.pCO2;
  const isDac = (res.vd?.cat || "") === "CDR";
  const base45Q = use45Q ? (isDac ? 180 : 85) : 0;
  const effTaxRate = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
  const r = res.discountRate;

  const deprSchedule = buildDeprSchedule(deprMethod, projLife);
  const itcDepr = use48C ? capex * (itcPct / 100) * 0.5 : 0;
  const deprBasis = capex - itcDepr;

  const cfRows = [];
  let cumCF = 0;

  for (let i = 0; i < totalYears; i++) {
    let year, phase;
    let capexCF = 0, revenue = 0, fixedOpex = 0, varOpex = 0;
    let powerCost = 0, fuelCost = 0, opex = 0, ebitda = 0;
    let depr = 0, taxableIncome = 0, taxes = 0, netCF = 0, co2Yr = 0;

    if (i < constructionYears) {
      year  = "C" + (i + 1);
      phase = "Construction";
      capexCF = -totalCapex * capexDist[i];
      netCF = capexCF;
    } else {
      const opYear = i - constructionYears + 1;
      year  = "Y" + opYear;
      phase = "Steady-State";

      const calYear = codYear + (opYear - 1);

      let q45Rate = 0;
      if (use45Q && calYear >= q45StartYear && calYear < q45StartYear + q45Duration) {
        const q45Yr = calYear - q45StartYear;
        q45Rate = base45Q * Math.pow(1 + q45Inflation / 100, q45Yr);
      }

      const cdrRate   = (useCDRCredit   && opYear <= vcmDuration) ? cdrCreditRate   : 0;
      const avoidRate = (useAvoidCredit && opYear <= vcmDuration) ? avoidCreditRate : 0;

      co2Yr = annualCO2;

      const yearGP = gpO ? gp : hhStripPrice(calYear, st);
      const yearFL = res.bfl * (yearGP / BASE_GP);

      const totalRevenueRate = q45Rate + cdrRate + avoidRate;
      revenue = totalRevenueRate * co2Yr;

      fixedOpex  = res.sFO  * co2Yr;
      varOpex    = res.sVO  * co2Yr;
      powerCost  = res.pPt  * co2Yr;
      fuelCost   = yearFL   * co2Yr;
      opex       = fixedOpex + varOpex + powerCost + fuelCost;
      ebitda     = revenue - opex;

      depr          = (opYear - 1) < deprSchedule.length ? deprBasis * deprSchedule[opYear - 1] : 0;
      taxableIncome = ebitda - depr;
      taxes         = Math.max(0, taxableIncome * effTaxRate);
      netCF         = ebitda - taxes;
    }

    cumCF += netCF;
    const discountFactor = Math.pow(1 + r, i + 1);

    cfRows.push({
      year, phase,
      capex: capexCF, revenue, fixedOpex, varOpex, powerCost, fuelCost,
      opex, ebitda, depr, taxableIncome, taxes, netCF, cumCF,
      pvCF:  netCF  / discountFactor,
      pvCO2: co2Yr  / discountFactor,
      co2Yr,
      calYear: i < constructionYears
        ? codYear - constructionYears + i
        : codYear + (i - constructionYears),
      yearGP: i >= constructionYears
        ? (gpO ? gp : hhStripPrice(codYear + (i - constructionYears), st))
        : 0
    });
  }

  return cfRows;
}
