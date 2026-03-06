import { SC } from '../constants';

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
    // Linear interpolation: 90% = 1.0, 99% = 1.10 (10% cost increase per 9% CR increase)
    const crDiff = crNum - baseCRNum;
    crAdj = 1 + (crDiff / 9) * 0.10;
  }

  if (!hasBT) {
    estBT = true;
    if (bt === "Greenfield" && baseBT === "Retrofit") btAdj = 0.93;
    else if (bt === "Retrofit" && baseBT === "Greenfield") btAdj = 1.08;
  }

  const adj = crAdj * btAdj;
  const pwAdj = !hasCR ? (1 + (crNum - baseCRNum) / 9 * 0.08) : 1;
  const rcoAdj = !hasCR ? (crNum / baseCRNum) : 1;

  return {
    ...base,
    tic: base.tic * adj,
    toc: base.toc * adj,
    fo:  base.fo  * adj,
    vo:  base.vo  * adj,
    pw:  base.pw  * pwAdj,
    rco: base.rco * rcoAdj,
    estCR,
    estBT,
    isEst: estCR || estBT,
    crNumeric: crNum
  };
}
