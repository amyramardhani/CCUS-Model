import { SC, CEPCI, LF, TECH, BASE_GP } from '../constants';

// Power plant capacity / emission defaults by source — used to pre-populate plant-size inputs
export const PP_DEFAULTS = {
  "NGCC F-Frame":   { mw: 641,    cf: 57, hr: 6.722 },
  "NGCC H-Frame":   { mw: 878,    cf: 60, hr: 6.333 },
  "Coal SC":        { mw: 550,    cf: 47, hr: 8.800 },
  "Coal Sub-C":     { mw: 500,    cf: 47, hr: 10.000 },
  "Biomass":        { mw: 50,     cf: 80, hr: 13.500 },
  "NG Processing":  { mw: 330,    cf: 85, hr: 0 },
  "Ammonia":        { mw: 394000, cf: 85, hr: 0 },
  "Ethylene Oxide": { mw: 364500, cf: 85, hr: 0 },
  "Ethanol":        { mw: 50,     cf: 85, hr: 0 },
  "Refinery H\u2082":{ mw: 87000,  cf: 85, hr: 0 },
  "Cement":         { mw: 1.3,    cf: 85, hr: 0 },
  "Steel & Iron":   { mw: 2.54,   cf: 85, hr: 0 },
  "Pulp & Paper":   { mw: 0.4,    cf: 85, hr: 0 },
  "Coal-to-Liquids":{ mw: 50000,  cf: 85, hr: 0 },
  "Gas-to-Liquids": { mw: 50000,  cf: 85, hr: 0 },
};

/**
 * gv — Get Variant data for a given source / capture-rate / build-type combination.
 *
 * Handles:
 *  - Sources with a single data set (no .vr)
 *  - Sources with variants keyed as "90%", "99%|Retrofit", etc.
 *  - Interpolated adjustments when the exact CR or BT is not in NETL data:
 *      · Capture rate: ±10% cost per ±9% CR change (linear interpolation)
 *      · Build type:   Greenfield = −7% vs Retrofit baseline
 *
 * Returns the merged data object with adjustment flags (estCR, estBT, isEst).
 */
export function gv(src, crInput, bt) {
  const s = SC[src];
  if (!s) return null;

  const crNum = parseFloat(crInput);
  const crStr = crInput;

  let d, estCR = false, estBT = false;
  const hasCR = s.cr.includes(crStr);
  const hasBT = s.bt.includes(bt);

  if (s.vr) {
    // Try exact match first
    d = s.vr[`${crStr}|${bt}`] || s.vr[crStr];
    if (!d) {
      const keys = Object.keys(s.vr);
      const crMatch = keys.find(k => k.startsWith(crStr));
      const btMatch = keys.find(k => k.endsWith(bt));
      d = s.vr[crMatch] || s.vr[btMatch] || Object.values(s.vr)[0];
    }
  } else {
    d = s;
  }

  const base = { ...s, ...d };

  let crAdj = 1, btAdj = 1;
  const baseCR = d
    ? (Object.keys(s.vr || {}).find(k => s.vr[k] === d) || "").split("|")[0] || s.cr[0]
    : s.cr[0];
  const baseBT = d
    ? (Object.keys(s.vr || {}).find(k => s.vr[k] === d) || "").split("|")[1] || s.bt[0]
    : s.bt[0];
  const baseCRNum = parseFloat(baseCR);

  if (!hasCR) {
    estCR = true;
  }

  if (!hasBT) {
    estBT = true;
    if (bt === "Greenfield" && baseBT === "Retrofit") btAdj = 0.93;
    else if (bt === "Retrofit" && baseBT === "Greenfield") btAdj = 1.08;
  }

  // CO₂ captured scales linearly with capture rate
  const rcoAdj = !hasCR ? (crNum / baseCRNum) : 1;

  // ── Capture rate adjustments ──────────────────────────────────────
  // Equipment is sized by plant capacity (flue gas volume), NOT capture rate.
  // The six-tenths rule applies to plant size scaling (sR in the main calc).
  // CR changes affect cost through thermodynamic difficulty, not equipment size.
  //
  // Thermodynamic difficulty: -ln(1 - CR) represents the minimum separation
  // work. Going from 90% to 99% doubles the thermodynamic load because
  // -ln(0.01) / -ln(0.10) = 2.0.
  const thermoBase = !hasCR ? -Math.log(1 - baseCRNum / 100) : 1;
  const thermoNew  = !hasCR ? -Math.log(1 - crNum / 100) : 1;
  const thermoRatio = thermoNew / thermoBase;

  // CAPEX: capture equipment is sized for CO₂ produced (total gas flow),
  // not CO₂ captured. Changing capture rate doesn't change equipment size —
  // it changes how hard the equipment runs (energy, solvent, chemicals).
  const crCapexAdj = 1;

  // FOM (per-tonne): total fixed costs ~constant (same equipment, same crew).
  // More CO₂ captured → lower per-tonne fixed cost.
  const crFomAdj = !hasCR ? (1 / rcoAdj) : 1;

  // VOM (per-tonne): solvent degradation, chemical consumption, and water
  // treatment increase with deeper capture (more aggressive solvent cycling).
  const crVomAdj = !hasCR ? Math.pow(thermoRatio, 0.2) : 1;

  // Power: reboiler duty + compression scale with thermodynamic difficulty.
  // Dampened from pure thermo (real systems have heat integration).
  const pwAdj = !hasCR ? Math.pow(thermoRatio, 0.4) : 1;

  return {
    ...base,
    tic: base.tic * crCapexAdj * btAdj,
    toc: base.toc * crCapexAdj * btAdj,
    fo:  base.fo  * crFomAdj * btAdj,
    vo:  base.vo  * crVomAdj * btAdj,
    pw:  base.pw  * pwAdj,
    rco: base.rco * rcoAdj,
    estCR,
    estBT,
    isEst: estCR || estBT,
    crNumeric: crNum,
    // Raw base values (before CR/BT adjustments) for display
    _raw: { tic: base.tic, toc: base.toc, fo: base.fo, vo: base.vo, pw: base.pw, rco: base.rco },
    // Adjustment factors for display
    _adj: { thermoRatio, rcoAdj, crCapexAdj, crFomAdj, crVomAdj, pwAdj, btAdj, baseCRNum, baseBT, hasCR, hasBT },
  };
}

/**
 * calcLCOC — Single centralized LCOC calculation used by both the dashboard and batch model.
 *
 * @param {object} params
 * @param {object} params.vd        — variant data from gv()
 * @param {number} params.pCO2      — annual CO₂ captured (t/yr), already CF-adjusted
 * @param {number} params.sR        — size ratio vs NETL reference (1.0 = reference)
 * @param {string} params.techKey   — technology key (e.g. "amine")
 * @param {number} params.yr        — cost year for CEPCI escalation
 * @param {string} params.st        — 2-letter state code for location factor
 * @param {number} params.pp        — electricity price $/MWh
 * @param {number} params.gp        — natural gas price $/MMBtu
 * @param {number} params.cf        — capacity factor (0–1)
 * @param {number} params.discountRate — WACC or fixed hurdle (decimal, e.g. 0.08)
 *
 * @returns {object} full cost breakdown
 */
export function calcLCOC({ vd, pCO2, sR, techKey, yr, st, pp, gp, cf, discountRate }) {
  const tF = TECH[techKey] || TECH.amine;
  const cR = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
  const lR = (LF[st] ? LF[st].f : 1) / (LF[vd.bs] ? LF[vd.bs].f : 0.97);
  const cS = (sR !== 1) ? Math.pow(sR, 0.6) : 1;

  const rT = vd.tic * 1e6, rOwn = (vd.toc - vd.tic) * 1e6;
  const sT = rT * cS * cR * lR * tF.capex;
  const sOwn = rOwn * cS * cR * lR * tF.capex;
  const sTOC = sT + sOwn;

  const capC = (sTOC * discountRate) / pCO2;

  const fS = (sR !== 1) ? Math.pow(1 / sR, 0.15) : 1;
  const sFO = vd.fo * fS * cR * tF.opex;
  const sVO = vd.vo * cR * tF.opex;

  const sPW = vd.pw * sR * tF.power;
  const aPwr = sPW * pp * cf * 8760;
  const pPt = aPwr / pCO2;

  const bfl = vd.fl || 0;
  const sFL = bfl * (gp / BASE_GP);

  const total = capC + sFO + sVO + pPt + sFL;

  return {
    vd, pCO2, sR, cR, lR, cS, fS, tF,
    rT, rOwn, sT, sOwn, sTOC,
    tpt: sT / pCO2, opt: sOwn / pCO2, tocpt: sTOC / pCO2,
    sFO, sVO, tOM: sFO + sVO,
    sPW, aPwr, pPt, capC,
    sFL, bfl, hasFuel: bfl > 0,
    total, discountRate,
  };
}
