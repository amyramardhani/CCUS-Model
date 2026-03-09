import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SC, CEPCI, LF, TECH, BASE_GP, NETL_FIN, NETL_DEFAULT } from '../constants';
import { fd, fm } from '../utils/helpers';
import { fi } from '../utils/styles';

export default function SimulationTab({
  res, src, cr, bt, st, yr, pp, gp, tech, mode, co2Cap, plCap,
  use45Q, useCDRCredit, cdrCreditRate, useAvoidCredit, avoidCreditRate,
  use48C, itcPct, grantAmt, projLife, fedTax, stateTax,
  simMode, setSimMode, mcRuns, setMcRuns, mcResults, setMcResults,
  mcRunning, setMcRunning, mcParams, setMcParams,
  scenarios, setScenarios
}) {
  if (!res) return null;

  const v = res.vd;
  const baseCOC = res.total;
  const basePP = pp;
  const baseGP = gp;
  const baseCF = res.cf;
  const baseCCF = res.discountRate;
  const srcCat = SC[src]?.cat || "Industrial";
  const isDac = srcCat === "CDR";
  const base45Q = isDac ? 180 : 85;
  const projectLife = projLife;
  const effTaxRate = (fedTax + stateTax - fedTax * stateTax / 100) / 100;

  /* ── Shared calc helper (same as sensitivity) ── */
  const calcLCOC = (oPP, oGP, oCF, oTICmult, oCCF) => {
    const refCO2 = v.rco, refCF = v.cf;
    let pCO2_2 = refCO2 * (oCF / refCF), sRatio2 = 1.0;
    const uC2 = parseFloat(co2Cap), uP2 = parseFloat(plCap);
    if (mode === "co2" && uC2 > 0) { pCO2_2 = uC2; sRatio2 = (pCO2_2 / (oCF / refCF)) / refCO2; }
    else if (mode === "plant" && uP2 > 0) { sRatio2 = uP2 / v.rpc; pCO2_2 = refCO2 * sRatio2 * (oCF / refCF); }
    const tF2 = TECH[tech] || TECH.amine;
    const cR2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
    const lR2 = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
    const cS2 = sRatio2 !== 1 ? Math.pow(sRatio2, 0.6) : 1;
    const rT2 = v.tic * 1e6 * oTICmult, rOwn2 = (v.toc - v.tic) * 1e6 * oTICmult;
    const sTOC2 = (rT2 + rOwn2) * cS2 * cR2 * lR2 * tF2.capex;
    const fS2 = sRatio2 !== 1 ? Math.pow(1 / sRatio2, 0.15) : 1;
    const sFO2 = v.fo * fS2 * cR2 * tF2.opex, sVO2 = v.vo * cR2 * tF2.opex;
    const sPW2 = v.pw * sRatio2 * tF2.power;
    const pPt2 = (sPW2 * oPP * oCF * 8760) / pCO2_2;
    const capC2 = (sTOC2 * oCCF) / pCO2_2;
    const sFL2 = (v.fl || 0) * (oGP / BASE_GP);
    return { lcoc: capC2 + sFO2 + sVO2 + pPt2 + sFL2, capex: capC2, fom: sFO2, vom: sVO2, power: pPt2, fuel: sFL2, toc: sTOC2, pCO2: pCO2_2 };
  };

  /* ── Full project metrics calc ── */
  const calcProject = (oPP, oGP, oCF, oTICmult, oCCF, o45Q, oCDR, oAvoid) => {
    const r2 = calcLCOC(oPP, oGP, oCF, oTICmult, oCCF);
    const lcocFull = r2.lcoc;
    const annCO2 = r2.pCO2;
    const rev45q = o45Q * annCO2;
    const revCDR = oCDR * annCO2;
    const revAvoid = oAvoid * annCO2;
    const totalRev = rev45q + revCDR + revAvoid;
    const annOPEX = (r2.fom + r2.vom + r2.power + r2.fuel) * annCO2;
    const ebitda = totalRev - annOPEX;
    const revenuePerT = annCO2 > 0 ? totalRev / annCO2 : 0;
    const margin = revenuePerT - lcocFull;
    const capex2 = r2.toc;
    const itcVal = use48C ? capex2 * (itcPct / 100) : 0;
    const grantVal = grantAmt * 1e6;
    const netCapex = capex2 - itcVal - grantVal;
    const disc = res.discountRate;
    let npv2 = -netCapex;
    for (let t2 = 1; t2 <= projectLife; t2++) npv2 += (ebitda - Math.max(0, ebitda * effTaxRate)) / Math.pow(1 + disc, t2);
    let irr2 = 0.10;
    const annCF2 = ebitda - Math.max(0, ebitda * effTaxRate);
    for (let iter = 0; iter < 50; iter++) {
      let npvC = -netCapex, dnpv = 0;
      for (let t3 = 1; t3 <= projectLife; t3++) { npvC += annCF2 / Math.pow(1 + irr2, t3); dnpv -= t3 * annCF2 / Math.pow(1 + irr2, t3 + 1); }
      if (Math.abs(npvC) < 1000) break;
      irr2 = irr2 - npvC / dnpv;
      if (irr2 < -0.5) irr2 = -0.5; if (irr2 > 2) irr2 = 2;
    }
    return { lcoc: lcocFull, capex: r2.capex, fom: r2.fom, vom: r2.vom, power: r2.power, fuel: r2.fuel, toc: r2.toc, pCO2: annCO2, ebitda, npv: npv2, irr: irr2, margin, revenue: totalRev, annOPEX };
  };

  /* ── Lazy-init scenarios from current model state ── */
  if (!scenarios) {
    setScenarios([
      { name: "Base Case", pp: basePP, gp: baseGP, cf: Math.round(baseCF * 100), capexMult: 1.0, ccf: baseCCF, q45: use45Q ? base45Q : 0, cdr: useCDRCredit ? cdrCreditRate : 0, avoid: useAvoidCredit ? avoidCreditRate : 0 },
      { name: "Optimistic", pp: basePP * 0.8, gp: baseGP * 0.8, cf: Math.min(95, Math.round(baseCF * 100) + 5), capexMult: 0.85, ccf: baseCCF, q45: use45Q ? base45Q : 0, cdr: useCDRCredit ? cdrCreditRate * 1.2 : 0, avoid: useAvoidCredit ? avoidCreditRate * 1.5 : 0 },
      { name: "Pessimistic", pp: basePP * 1.3, gp: baseGP * 1.4, cf: Math.max(60, Math.round(baseCF * 100) - 10), capexMult: 1.3, ccf: baseCCF * 1.1, q45: use45Q ? base45Q * 0.5 : 0, cdr: useCDRCredit ? cdrCreditRate * 0.5 : 0, avoid: 0 }
    ]);
  }

  /* ── Random samplers ── */
  const sampleUniform = (lo, hi) => lo + Math.random() * (hi - lo);
  const sampleTriangular = (lo, hi) => { const mid = (lo + hi) / 2; const u = Math.random(); if (u < 0.5) return lo + Math.sqrt(u * (hi - lo) * (mid - lo)); return hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mid)); };
  const sample = (p) => p.dist === "triangular" ? sampleTriangular(p.low, p.high) : sampleUniform(p.low, p.high);

  /* ── Run Monte Carlo ── */
  const runMC = () => {
    setMcRunning(true);
    setTimeout(() => {
      const results = [];
      const p = mcParams;
      for (let i = 0; i < mcRuns; i++) {
        const ePP = p.elecPrice.enabled ? sample(p.elecPrice) : basePP;
        const eGP = p.gasPrice.enabled ? sample(p.gasPrice) : baseGP;
        const eCF = p.capFactor.enabled ? (sample(p.capFactor) / 100) : baseCF;
        const eCapex = p.capexMult.enabled ? sample(p.capexMult) : 1.0;
        const eCCF = p.ccfMult.enabled ? sample(p.ccfMult) : baseCCF;
        const e45Q = p.q45Rate.enabled ? sample(p.q45Rate) : (use45Q ? base45Q : 0);
        const eCDR = p.cdrRate.enabled ? sample(p.cdrRate) : (useCDRCredit ? cdrCreditRate : 0);
        const eAvoid = p.avoidRate.enabled ? sample(p.avoidRate) : (useAvoidCredit ? avoidCreditRate : 0);
        const r3 = calcProject(ePP, eGP, eCF, eCapex, eCCF, e45Q, eCDR, eAvoid);
        results.push({ ...r3, inputs: { pp: ePP, gp: eGP, cf: eCF, capex: eCapex, ccf: eCCF, q45: e45Q, cdr: eCDR, avoid: eAvoid } });
      }
      results.sort((a, b) => a.lcoc - b.lcoc);
      const lcocArr = results.map(r3 => r3.lcoc);
      const npvArr = results.map(r3 => r3.npv);
      const irrArr = results.map(r3 => r3.irr);
      const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
      const pctl = (arr, p2) => { const sorted = [...arr].sort((a, b) => a - b); const idx = Math.floor(p2 / 100 * sorted.length); return sorted[Math.min(idx, sorted.length - 1)]; };
      const std = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((s, v2) => s + (v2 - m) ** 2, 0) / arr.length); };

      /* Build histogram bins */
      const minL = pctl(lcocArr, 1), maxL = pctl(lcocArr, 99);
      const binCount = 40;
      const binW = (maxL - minL) / binCount;
      const bins = Array.from({ length: binCount }, (_, i2) => ({ x: +(minL + (i2 + 0.5) * binW).toFixed(2), count: 0, xLow: minL + i2 * binW, xHigh: minL + (i2 + 1) * binW }));
      lcocArr.forEach(lc => { const idx = Math.min(Math.floor((lc - minL) / binW), binCount - 1); if (idx >= 0 && idx < binCount) bins[idx].count++; });

      /* NPV histogram */
      const minN = pctl(npvArr, 2), maxN = pctl(npvArr, 98);
      const binWN = (maxN - minN) / binCount;
      const binsNPV = Array.from({ length: binCount }, (_, i2) => ({ x: +((minN + (i2 + 0.5) * binWN) / 1e6).toFixed(1), count: 0 }));
      npvArr.forEach(n2 => { const idx = Math.min(Math.floor((n2 - minN) / binWN), binCount - 1); if (idx >= 0 && idx < binCount) binsNPV[idx].count++; });

      /* Tornado sensitivity (correlation-based) */
      const paramNames = [
        { key: "pp", label: "Electricity Price", color: "#b83a4b" },
        { key: "gp", label: "Natural Gas", color: "#93348f" },
        { key: "cf", label: "Capacity Factor", color: "#58a7af" },
        { key: "capex", label: "CAPEX Multiplier", color: "#93348f" },
        { key: "ccf", label: "WACC", color: "#f68d2e" },
        { key: "q45", label: "45Q Credit Rate", color: "#58b947" },
        { key: "cdr", label: "CDR Credit Rate", color: "#58a7af" },
        { key: "avoid", label: "Avoidance Credit", color: "#f68d2e" }
      ];
      const corrTornado = paramNames.map(pn => {
        const xArr = results.map(r3 => r3.inputs[pn.key]);
        const yArr = lcocArr;
        const mx = mean(xArr), my = mean(yArr);
        const sx = std(xArr), sy = std(yArr);
        if (sx === 0 || sy === 0) return { ...pn, corr: 0 };
        const cov = results.reduce((s, r3, idx2) => s + (r3.inputs[pn.key] - mx) * (yArr[idx2] - my), 0) / results.length;
        return { ...pn, corr: cov / (sx * sy) };
      }).filter(t2 => Math.abs(t2.corr) > 0.01).sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));

      setMcResults({
        results, bins, binsNPV, corrTornado,
        stats: {
          lcoc: { mean: mean(lcocArr), std: std(lcocArr), p5: pctl(lcocArr, 5), p25: pctl(lcocArr, 25), p50: pctl(lcocArr, 50), p75: pctl(lcocArr, 75), p95: pctl(lcocArr, 95), min: Math.min(...lcocArr), max: Math.max(...lcocArr) },
          npv: { mean: mean(npvArr), std: std(npvArr), p5: pctl(npvArr, 5), p50: pctl(npvArr, 50), p95: pctl(npvArr, 95), pctPositive: +(npvArr.filter(n2 => n2 >= 0).length / npvArr.length * 100).toFixed(1) },
          irr: { mean: mean(irrArr), std: std(irrArr), p5: pctl(irrArr, 5), p50: pctl(irrArr, 50), p95: pctl(irrArr, 95) }
        }
      });
      setMcRunning(false);
    }, 50);
  };

  /* ── styles ── */
  const sBox = { background: "#fff", border: "1px solid #e0e0e0", padding: "18px 20px", marginBottom: 14 };
  const sHdr = { margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#888888", textTransform: "uppercase", letterSpacing: "0.06em" };
  const paramRow = { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f0f0f0" };
  const paramLabel = { fontSize: 11, color: "#555555", fontWeight: 500, width: 150 };
  const paramInput = { ...fi, width: 65, fontSize: 10, padding: "4px 6px" };
  const modeBtn = (active) => ({ padding: "8px 18px", fontSize: 12, fontWeight: 600, border: "1px solid #e0e0e0", cursor: "pointer", background: active ? "#444444" : "#fff", color: active ? "#fff" : "#888888", borderBottom: active ? "2px solid #58b947" : "2px solid transparent" });

  return (
    <div>
      {/* Mode toggle header */}
      <div style={{ background: "#fff", border: "1px solid #e0e0e0", padding: "14px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#aaaaaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Simulation Engine</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#333333", marginTop: 2 }}>{src} — {cr} {bt} — {LF[st]?.n || st} · {yr}</div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          <button onClick={() => setSimMode("monte_carlo")} style={modeBtn(simMode === "monte_carlo")}>Monte Carlo</button>
          <button onClick={() => setSimMode("scenarios")} style={modeBtn(simMode === "scenarios")}>Scenarios</button>
        </div>
      </div>

      {/* ══════════ MONTE CARLO MODE ══════════ */}
      {simMode === "monte_carlo" && (<div>
        {/* Parameter configuration */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div style={sBox}>
            <h3 style={sHdr}>Input Distributions</h3>
            <div style={{ fontSize: 9, color: "#aaaaaa", marginBottom: 10 }}>Toggle parameters on/off. Set low/high bounds for each distribution.</div>
            {[
              { key: "elecPrice", label: "Electricity ($/MWh)", base: basePP, fmt: v2 => "$" + v2.toFixed(0) },
              { key: "gasPrice", label: "Nat Gas ($/MMBtu)", base: baseGP, fmt: v2 => "$" + v2.toFixed(2), hide: !res.hasFuel },
              { key: "capFactor", label: "Capacity Factor (%)", base: Math.round(baseCF * 100), fmt: v2 => v2.toFixed(0) + "%" },
              { key: "capexMult", label: "CAPEX Multiplier", base: 1.0, fmt: v2 => v2.toFixed(2) + "×" },
              { key: "ccfMult", label: "WACC", base: baseCCF, fmt: v2 => (v2 * 100).toFixed(2) + "%" },
              { key: "q45Rate", label: "45Q Rate ($/t)", base: base45Q, fmt: v2 => "$" + v2.toFixed(0), hide: !use45Q },
              { key: "cdrRate", label: "CDR Credit ($/t)", base: cdrCreditRate, fmt: v2 => "$" + v2.toFixed(0), hide: !useCDRCredit },
              { key: "avoidRate", label: "Avoidance ($/t)", base: avoidCreditRate, fmt: v2 => "$" + v2.toFixed(0), hide: !useAvoidCredit }
            ].filter(p2 => !p2.hide).map(p2 => (
              <div key={p2.key} style={paramRow}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", width: 16 }}>
                  <input type="checkbox" checked={mcParams[p2.key].enabled} onChange={(e) => setMcParams(prev => ({ ...prev, [p2.key]: { ...prev[p2.key], enabled: e.target.checked } }))} style={{ margin: 0, width: 11, height: 11 }} />
                </label>
                <span style={{ ...paramLabel, opacity: mcParams[p2.key].enabled ? 1 : 0.4 }}>{p2.label}</span>
                <input type="number" value={+mcParams[p2.key].low.toFixed(2)} onChange={(e) => setMcParams(prev => ({ ...prev, [p2.key]: { ...prev[p2.key], low: parseFloat(e.target.value) || 0 } }))} disabled={!mcParams[p2.key].enabled} style={{ ...paramInput, opacity: mcParams[p2.key].enabled ? 1 : 0.35 }} />
                <span style={{ fontSize: 9, color: "#aaaaaa" }}>to</span>
                <input type="number" value={+mcParams[p2.key].high.toFixed(2)} onChange={(e) => setMcParams(prev => ({ ...prev, [p2.key]: { ...prev[p2.key], high: parseFloat(e.target.value) || 0 } }))} disabled={!mcParams[p2.key].enabled} style={{ ...paramInput, opacity: mcParams[p2.key].enabled ? 1 : 0.35 }} />
                <select value={mcParams[p2.key].dist} onChange={(e) => setMcParams(prev => ({ ...prev, [p2.key]: { ...prev[p2.key], dist: e.target.value } }))} disabled={!mcParams[p2.key].enabled} style={{ ...fi, width: 78, fontSize: 9, padding: "3px 4px", cursor: "pointer", opacity: mcParams[p2.key].enabled ? 1 : 0.35 }}>
                  <option value="uniform">Uniform</option>
                  <option value="triangular">Triangular</option>
                </select>
              </div>
            ))}
          </div>

          <div style={sBox}>
            <h3 style={sHdr}>Run Configuration</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#555555", fontWeight: 500 }}>Iterations</span>
              <select value={mcRuns} onChange={(e) => setMcRuns(parseInt(e.target.value))} style={{ ...fi, width: 100, textAlign: "left", cursor: "pointer", fontSize: 12 }}>
                {[500, 1000, 2000, 5000, 10000].map(n2 => <option key={n2} value={n2}>{n2.toLocaleString()}</option>)}
              </select>
              <button onClick={runMC} disabled={mcRunning} style={{ padding: "8px 24px", fontSize: 12, fontWeight: 700, background: mcRunning ? "#aaaaaa" : "#58b947", color: "#fff", border: "none", cursor: mcRunning ? "wait" : "pointer", letterSpacing: "0.03em" }}>
                {mcRunning ? "RUNNING…" : "▶ RUN SIMULATION"}
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#888888", lineHeight: 1.7, padding: "10px 0", borderTop: "1px solid #f0f0f0" }}>
              Each iteration randomly samples from the configured distributions, recalculates the full LCOC and project economics (NPV, IRR, margin), and records the outcome. Results are then aggregated into probability distributions and ranked by impact.
            </div>
            {mcResults && (
              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 12, marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#888888", textTransform: "uppercase", marginBottom: 8 }}>Summary Statistics</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "LCOC", items: [
                      { k: "Mean", v: fd(mcResults.stats.lcoc.mean) + "/t" },
                      { k: "Std Dev", v: fd(mcResults.stats.lcoc.std) },
                      { k: "P5", v: fd(mcResults.stats.lcoc.p5) },
                      { k: "P50", v: fd(mcResults.stats.lcoc.p50) },
                      { k: "P95", v: fd(mcResults.stats.lcoc.p95) }
                    ], color: "#58b947" },
                    { label: "NPV", items: [
                      { k: "Mean", v: fd(mcResults.stats.npv.mean / 1e6, 1) + "M" },
                      { k: "P5", v: fd(mcResults.stats.npv.p5 / 1e6, 1) + "M" },
                      { k: "P50", v: fd(mcResults.stats.npv.p50 / 1e6, 1) + "M" },
                      { k: "P95", v: fd(mcResults.stats.npv.p95 / 1e6, 1) + "M" },
                      { k: "% Positive", v: mcResults.stats.npv.pctPositive + "%" }
                    ], color: "#58b947" },
                    { label: "IRR", items: [
                      { k: "Mean", v: (mcResults.stats.irr.mean * 100).toFixed(1) + "%" },
                      { k: "Std Dev", v: (mcResults.stats.irr.std * 100).toFixed(1) + "%" },
                      { k: "P5", v: (mcResults.stats.irr.p5 * 100).toFixed(1) + "%" },
                      { k: "P50", v: (mcResults.stats.irr.p50 * 100).toFixed(1) + "%" },
                      { k: "P95", v: (mcResults.stats.irr.p95 * 100).toFixed(1) + "%" }
                    ], color: "#58a7af" }
                  ].map(grp => (
                    <div key={grp.label} style={{ background: "#fafafa", border: "1px solid #f0f0f0", padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: grp.color, textTransform: "uppercase", marginBottom: 4, borderBottom: "1px solid " + grp.color + "33", paddingBottom: 3 }}>{grp.label}</div>
                      {grp.items.map(item => (
                        <div key={item.k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 10 }}>
                          <span style={{ color: "#aaaaaa" }}>{item.k}</span>
                          <span style={{ color: "#444444", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results section */}
        {mcResults && (<div>
          {/* Key metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Expected LCOC", value: fd(mcResults.stats.lcoc.mean) + "/t", sub: "±" + fd(mcResults.stats.lcoc.std), color: "#58b947" },
              { label: "P50 LCOC", value: fd(mcResults.stats.lcoc.p50) + "/t", sub: "P5–P95: " + fd(mcResults.stats.lcoc.p5) + "–" + fd(mcResults.stats.lcoc.p95), color: "#333333" },
              { label: "NPV Positive", value: mcResults.stats.npv.pctPositive + "%", sub: "of " + mcRuns.toLocaleString() + " runs", color: mcResults.stats.npv.pctPositive >= 50 ? "#4aa63b" : "#b83a4b" },
              { label: "Expected NPV", value: fd(mcResults.stats.npv.mean / 1e6, 1) + "M", sub: "P50: " + fd(mcResults.stats.npv.p50 / 1e6, 1) + "M", color: mcResults.stats.npv.mean >= 0 ? "#4aa63b" : "#b83a4b" },
              { label: "Expected IRR", value: (mcResults.stats.irr.mean * 100).toFixed(1) + "%", sub: "P50: " + (mcResults.stats.irr.p50 * 100).toFixed(1) + "%", color: mcResults.stats.irr.mean >= res.discountRate ? "#4aa63b" : "#b83a4b" }
            ].map((card, i2) => (
              <div key={i2} style={{ background: "#fff", border: "1px solid #e0e0e0", padding: "14px 16px", borderTop: "3px solid " + card.color }}>
                <div style={{ fontSize: 9, color: "#aaaaaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: card.color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{card.value}</div>
                <div style={{ fontSize: 9, color: "#aaaaaa", marginTop: 2 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* LCOC Histogram + Tornado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={sBox}>
              <h3 style={sHdr}>LCOC Distribution — {mcRuns.toLocaleString()} Iterations</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={mcResults.bins} margin={{ top: 8, right: 12, bottom: 20, left: 8 }}>
                  <XAxis dataKey="x" tick={{ fill: "#aaaaaa", fontSize: 9 }} angle={-30} textAnchor="end" interval={3} label={{ value: "LCOC ($/t CO₂)", position: "bottom", offset: 4, style: { fontSize: 9, fill: "#aaaaaa" } }} />
                  <YAxis tick={{ fill: "#aaaaaa", fontSize: 9 }} label={{ value: "Frequency", angle: -90, position: "insideLeft", offset: 4, style: { fontSize: 9, fill: "#aaaaaa" } }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 0, fontSize: 10 }} formatter={(val) => [val + " runs", "Count"]} labelFormatter={(v2) => "$" + v2 + "/t"} />
                  <ReferenceLine x={+baseCOC.toFixed(2)} stroke="#333333" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "Base", position: "top", style: { fontSize: 9, fill: "#333333", fontWeight: 700 } }} />
                  <ReferenceLine x={+mcResults.stats.lcoc.mean.toFixed(2)} stroke="#58b947" strokeDasharray="3 3" strokeWidth={1} label={{ value: "μ", position: "top", style: { fontSize: 10, fill: "#58b947", fontWeight: 700 } }} />
                  <Bar dataKey="count" fill="#58b947" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4, fontSize: 9, color: "#888888" }}>
                <span><span style={{ display: "inline-block", width: 16, height: 2, background: "#333333", verticalAlign: "middle", marginRight: 4 }} />Base: {fd(baseCOC)}</span>
                <span><span style={{ display: "inline-block", width: 16, height: 2, background: "#58b947", verticalAlign: "middle", marginRight: 4, borderTop: "1px dashed #58b947" }} />Mean: {fd(mcResults.stats.lcoc.mean)}</span>
                <span>P5: {fd(mcResults.stats.lcoc.p5)}</span>
                <span>P95: {fd(mcResults.stats.lcoc.p95)}</span>
              </div>
            </div>

            {/* Correlation Tornado */}
            <div style={sBox}>
              <h3 style={sHdr}>Sensitivity Tornado — Rank Correlation to LCOC</h3>
              <div style={{ fontSize: 9, color: "#aaaaaa", marginBottom: 12 }}>Pearson correlation: positive = increases LCOC, negative = decreases LCOC. Magnitude = impact strength.</div>
              {mcResults.corrTornado.map((t2, i2) => {
                const maxCorr = Math.max(...mcResults.corrTornado.map(c2 => Math.abs(c2.corr)));
                const barPct = (Math.abs(t2.corr) / maxCorr) * 40;
                const isPos = t2.corr > 0;
                return (
                  <div key={i2} style={{ display: "grid", gridTemplateColumns: "130px 1fr 55px", alignItems: "center", marginBottom: 6, gap: 8 }}>
                    <div style={{ fontSize: 11, color: "#555555", fontWeight: 500, textAlign: "right" }}>{t2.label}</div>
                    <div style={{ position: "relative", height: 18, background: "#fafafa" }}>
                      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#e0e0e0" }} />
                      <div style={{
                        position: "absolute",
                        left: isPos ? "50%" : (50 - barPct) + "%",
                        width: barPct + "%",
                        top: 2, bottom: 2,
                        background: isPos ? "#b83a4b" : "#58b947",
                        opacity: 0.7
                      }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isPos ? "#b83a4b" : "#58b947", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t2.corr > 0 ? "+" : ""}{t2.corr.toFixed(3)}</div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#aaaaaa", marginTop: 8, padding: "0 130px 0 0" }}>
                <span style={{ paddingLeft: 138, color: "#58b947" }}>← Reduces LCOC</span>
                <span style={{ color: "#b83a4b" }}>Increases LCOC →</span>
              </div>
            </div>
          </div>

          {/* NPV Histogram + CDF */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={sBox}>
              <h3 style={sHdr}>NPV Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mcResults.binsNPV} margin={{ top: 8, right: 12, bottom: 20, left: 8 }}>
                  <XAxis dataKey="x" tick={{ fill: "#aaaaaa", fontSize: 9 }} angle={-30} textAnchor="end" interval={3} label={{ value: "NPV ($M)", position: "bottom", offset: 4, style: { fontSize: 9, fill: "#aaaaaa" } }} />
                  <YAxis tick={{ fill: "#aaaaaa", fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 0, fontSize: 10 }} formatter={(val) => [val + " runs", "Count"]} labelFormatter={(v2) => "$" + v2 + "M"} />
                  <ReferenceLine x={0} stroke="#333333" strokeDasharray="4 2" strokeWidth={1.5} />
                  <Bar dataKey="count" fill="#58b947" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: 9, color: "#888888" }}>
                <span style={{ fontWeight: 600, color: mcResults.stats.npv.pctPositive >= 50 ? "#4aa63b" : "#b83a4b" }}>{mcResults.stats.npv.pctPositive}% of runs are NPV-positive</span>
              </div>
            </div>

            {/* CDF (cumulative) */}
            <div style={sBox}>
              <h3 style={sHdr}>LCOC Cumulative Distribution (CDF)</h3>
              {(() => {
                const sorted = [...mcResults.results].sort((a, b) => a.lcoc - b.lcoc);
                const step2 = Math.max(1, Math.floor(sorted.length / 100));
                const cdfData = sorted.filter((_, idx2) => idx2 % step2 === 0 || idx2 === sorted.length - 1).map((r3, idx2, arr2) => ({
                  lcoc: +r3.lcoc.toFixed(2),
                  pct: +((idx2 / (arr2.length - 1)) * 100).toFixed(1)
                }));
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={cdfData} margin={{ top: 8, right: 12, bottom: 20, left: 8 }}>
                      <XAxis dataKey="lcoc" tick={{ fill: "#aaaaaa", fontSize: 9 }} label={{ value: "LCOC ($/t)", position: "bottom", offset: 4, style: { fontSize: 9, fill: "#aaaaaa" } }} />
                      <YAxis tick={{ fill: "#aaaaaa", fontSize: 9 }} domain={[0, 100]} tickFormatter={v2 => v2 + "%"} label={{ value: "Cumulative %", angle: -90, position: "insideLeft", offset: 4, style: { fontSize: 9, fill: "#aaaaaa" } }} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 0, fontSize: 10 }} formatter={(val) => [val + "%", "Percentile"]} labelFormatter={(v2) => "$" + v2 + "/t"} />
                      <ReferenceLine y={50} stroke="#cccccc" strokeDasharray="3 3" />
                      <ReferenceLine x={+baseCOC.toFixed(2)} stroke="#333333" strokeDasharray="4 2" label={{ value: "Base", position: "top", style: { fontSize: 8, fill: "#333333" } }} />
                      <Line dataKey="pct" stroke="#58a7af" strokeWidth={2} dot={false} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>

          {/* Percentile table */}
          <div style={sBox}>
            <h3 style={sHdr}>Percentile Summary</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                  {["Metric", "Min", "P5", "P10", "P25", "P50 (Median)", "P75", "P90", "P95", "Max", "Mean", "Std Dev"].map(h2 => (
                    <th key={h2} style={{ padding: "6px 8px", fontSize: 9, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: h2 === "Metric" ? "left" : "right" }}>{h2}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const pctl2 = (arr, p2) => { const s2 = [...arr].sort((a, b) => a - b); return s2[Math.min(Math.floor(p2 / 100 * s2.length), s2.length - 1)]; };
                  const rows2 = [
                    { name: "LCOC ($/t)", arr: mcResults.results.map(r3 => r3.lcoc), fmt: v2 => fd(v2) },
                    { name: "NPV ($M)", arr: mcResults.results.map(r3 => r3.npv / 1e6), fmt: v2 => fd(v2, 1) },
                    { name: "IRR (%)", arr: mcResults.results.map(r3 => r3.irr * 100), fmt: v2 => v2.toFixed(1) + "%" },
                    { name: "EBITDA ($M/yr)", arr: mcResults.results.map(r3 => r3.ebitda / 1e6), fmt: v2 => fd(v2, 1) },
                    { name: "Margin ($/t)", arr: mcResults.results.map(r3 => r3.margin), fmt: v2 => fd(v2) }
                  ];
                  return rows2.map(row2 => {
                    const mean2 = row2.arr.reduce((a, b) => a + b, 0) / row2.arr.length;
                    const std2 = Math.sqrt(row2.arr.reduce((s2, v2) => s2 + (v2 - mean2) ** 2, 0) / row2.arr.length);
                    return (
                      <tr key={row2.name} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "6px 8px", fontSize: 11, fontWeight: 600, color: "#555555" }}>{row2.name}</td>
                        {[0, 5, 10, 25, 50, 75, 90, 95, 100].map(p2 => (
                          <td key={p2} style={{ padding: "6px 8px", fontSize: 11, color: "#444444", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: p2 === 50 ? 700 : 400, background: p2 === 50 ? "#fafafa" : "transparent" }}>
                            {row2.fmt(p2 === 0 ? Math.min(...row2.arr) : p2 === 100 ? Math.max(...row2.arr) : pctl2(row2.arr, p2))}
                          </td>
                        ))}
                        <td style={{ padding: "6px 8px", fontSize: 11, color: "#58b947", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row2.fmt(mean2)}</td>
                        <td style={{ padding: "6px 8px", fontSize: 11, color: "#aaaaaa", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row2.fmt(std2)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>)}
      </div>)}

      {/* ══════════ SCENARIO COMPARISON MODE ══════════ */}
      {simMode === "scenarios" && scenarios && (<div>
        {/* Scenario editor */}
        <div style={sBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ ...sHdr, margin: 0 }}>Scenario Definitions</h3>
            <button onClick={() => setScenarios(prev => [...(prev || []), {
              name: "Scenario " + ((prev || []).length + 1), pp: basePP, gp: baseGP, cf: Math.round(baseCF * 100), capexMult: 1.0, ccf: baseCCF,
              q45: use45Q ? base45Q : 0, cdr: useCDRCredit ? cdrCreditRate : 0, avoid: useAvoidCredit ? avoidCreditRate : 0
            }])} style={{ padding: "5px 14px", fontSize: 10, fontWeight: 600, background: "#fafafa", border: "1px solid #e0e0e0", cursor: "pointer", color: "#58b947" }}>+ Add Scenario</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                  {["Name", "Elec ($/MWh)", "Gas ($/MMBtu)", "CF (%)", "CAPEX Mult", "WACC", "45Q ($/t)", "CDR ($/t)", "Avoid ($/t)", ""].map(h2 => (
                    <th key={h2} style={{ padding: "6px 8px", fontSize: 9, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: "left" }}>{h2}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc2, idx2) => (
                  <tr key={idx2} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "4px 4px" }}>
                      <input type="text" value={sc2.name} onChange={(e) => { const next = [...scenarios]; next[idx2] = { ...next[idx2], name: e.target.value }; setScenarios(next); }} style={{ ...fi, width: 110, fontSize: 11, padding: "4px 6px", textAlign: "left", fontWeight: 600 }} />
                    </td>
                    {[
                      { key: "pp", step: 5 }, { key: "gp", step: 0.5 }, { key: "cf", step: 5 },
                      { key: "capexMult", step: 0.05 }, { key: "ccf", step: 0.005 },
                      { key: "q45", step: 5 }, { key: "cdr", step: 25 }, { key: "avoid", step: 5 }
                    ].map(col => (
                      <td key={col.key} style={{ padding: "4px 4px" }}>
                        <input type="number" value={sc2[col.key]} onChange={(e) => { const next = [...scenarios]; next[idx2] = { ...next[idx2], [col.key]: parseFloat(e.target.value) || 0 }; setScenarios(next); }} step={col.step} style={{ ...paramInput, width: 60 }} />
                      </td>
                    ))}
                    <td style={{ padding: "4px 4px" }}>
                      {scenarios.length > 1 && <button onClick={() => setScenarios(prev => prev.filter((_, i2) => i2 !== idx2))} style={{ fontSize: 10, color: "#aaaaaa", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scenario Results */}
        {(() => {
          const scResults = scenarios.map(sc2 => {
            const r4 = calcProject(sc2.pp, sc2.gp, sc2.cf / 100, sc2.capexMult, sc2.ccf, sc2.q45, sc2.cdr, sc2.avoid);
            return { ...sc2, ...r4 };
          });
          const bestLCOC = Math.min(...scResults.map(r4 => r4.lcoc));
          const bestNPV = Math.max(...scResults.map(r4 => r4.npv));

          const barData = scResults.map(r4 => ({
            name: r4.name,
            Capital: +r4.capex.toFixed(2),
            "Fixed OPEX": +r4.fom.toFixed(2),
            "Var OPEX": +r4.vom.toFixed(2),
            Power: +r4.power.toFixed(2),
            Fuel: +r4.fuel.toFixed(2),
            total: +r4.lcoc.toFixed(2)
          }));

          return (<div>
            {/* Metric cards per scenario */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(" + Math.min(scenarios.length, 4) + ", 1fr)", gap: 10, marginBottom: 14 }}>
              {scResults.map((r4, i2) => (
                <div key={i2} style={{ background: "#fff", border: "1px solid #e0e0e0", padding: "14px 16px", borderTop: "3px solid " + (i2 === 0 ? "#58b947" : i2 === 1 ? "#58b947" : i2 === 2 ? "#f68d2e" : "#93348f") }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#333333", marginBottom: 10 }}>{r4.name}</div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {[
                      { k: "LCOC", v: fd(r4.lcoc) + "/t", best: r4.lcoc === bestLCOC, color: "#58b947" },
                      { k: "CAPEX", v: fd(r4.toc / 1e6, 1) + "M", color: "#93348f" },
                      { k: "EBITDA", v: fd(r4.ebitda / 1e6, 1) + "M/yr", color: r4.ebitda >= 0 ? "#4aa63b" : "#b83a4b" },
                      { k: "NPV", v: fd(r4.npv / 1e6, 1) + "M", best: r4.npv === bestNPV, color: r4.npv >= 0 ? "#4aa63b" : "#b83a4b" },
                      { k: "IRR", v: (r4.irr * 100).toFixed(1) + "%", color: r4.irr >= res.discountRate ? "#4aa63b" : "#b83a4b" },
                      { k: "Margin", v: fd(r4.margin) + "/t", color: r4.margin >= 0 ? "#4aa63b" : "#b83a4b" }
                    ].map(item => (
                      <div key={item.k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #fafafa" }}>
                        <span style={{ fontSize: 10, color: "#aaaaaa" }}>{item.k}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: item.color, fontVariantNumeric: "tabular-nums" }}>
                          {item.v}
                          {item.best && <span style={{ fontSize: 8, color: "#4aa63b", marginLeft: 3, fontWeight: 700 }}>★</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={sBox}>
                <h3 style={sHdr}>LCOC Stack Comparison</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                    <XAxis dataKey="name" tick={{ fill: "#444444", fontSize: 11, fontWeight: 600 }} />
                    <YAxis tick={{ fill: "#888888", fontSize: 10 }} tickFormatter={v2 => "$" + v2} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 0, fontSize: 11 }} formatter={(val) => fd(val)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Capital" stackId="a" fill="#58b947" />
                    <Bar dataKey="Fixed OPEX" stackId="a" fill="#58b947" />
                    <Bar dataKey="Var OPEX" stackId="a" fill="#f68d2e" />
                    <Bar dataKey="Power" stackId="a" fill="#b83a4b" />
                    <Bar dataKey="Fuel" stackId="a" fill="#93348f" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={sBox}>
                <h3 style={sHdr}>NPV & IRR Comparison</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={scResults.map(r4 => ({ name: r4.name, "NPV ($M)": +(r4.npv / 1e6).toFixed(1), "IRR (%)": +(r4.irr * 100).toFixed(1) }))} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                    <XAxis dataKey="name" tick={{ fill: "#444444", fontSize: 11, fontWeight: 600 }} />
                    <YAxis yAxisId="left" tick={{ fill: "#888888", fontSize: 10 }} tickFormatter={v2 => "$" + v2 + "M"} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#58a7af", fontSize: 10 }} tickFormatter={v2 => v2 + "%"} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 0, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <ReferenceLine yAxisId="left" y={0} stroke="#cccccc" strokeDasharray="3 3" />
                    <Bar yAxisId="left" dataKey="NPV ($M)" fill="#58b947" opacity={0.8} />
                    <Bar yAxisId="right" dataKey="IRR (%)" fill="#58a7af" opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Full results table */}
            <div style={sBox}>
              <h3 style={sHdr}>Detailed Comparison</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                    <th style={{ padding: "6px 10px", fontSize: 9, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: "left" }}>Metric</th>
                    {scResults.map((r4, i2) => (
                      <th key={i2} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#444444", textAlign: "right" }}>{r4.name}</th>
                    ))}
                    <th style={{ padding: "6px 10px", fontSize: 9, fontWeight: 700, color: "#aaaaaa", textAlign: "right" }}>Δ Range</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "LCOC ($/t)", fn: r4 => r4.lcoc, fmt: v2 => fd(v2), lowBest: true },
                    { name: "Capital Charge ($/t)", fn: r4 => r4.capex, fmt: v2 => fd(v2) },
                    { name: "Fixed OPEX ($/t)", fn: r4 => r4.fom, fmt: v2 => fd(v2) },
                    { name: "Variable OPEX ($/t)", fn: r4 => r4.vom, fmt: v2 => fd(v2) },
                    { name: "Power ($/t)", fn: r4 => r4.power, fmt: v2 => fd(v2) },
                    { name: "Fuel ($/t)", fn: r4 => r4.fuel, fmt: v2 => fd(v2), hide: !res.hasFuel },
                    { name: "Total CAPEX ($M)", fn: r4 => r4.toc / 1e6, fmt: v2 => fd(v2, 1) },
                    { name: "CO₂ Captured (t/yr)", fn: r4 => r4.pCO2, fmt: v2 => fm(v2, 0) },
                    { name: "Revenue ($M/yr)", fn: r4 => r4.revenue / 1e6, fmt: v2 => fd(v2, 1) },
                    { name: "OPEX ($M/yr)", fn: r4 => r4.annOPEX / 1e6, fmt: v2 => fd(v2, 1) },
                    { name: "EBITDA ($M/yr)", fn: r4 => r4.ebitda / 1e6, fmt: v2 => fd(v2, 1) },
                    { name: "Margin ($/t)", fn: r4 => r4.margin, fmt: v2 => fd(v2) },
                    { name: "NPV ($M)", fn: r4 => r4.npv / 1e6, fmt: v2 => fd(v2, 1), highBest: true },
                    { name: "IRR (%)", fn: r4 => r4.irr * 100, fmt: v2 => v2.toFixed(1) + "%", highBest: true }
                  ].filter(row2 => !row2.hide).map((row2, ri) => {
                    const vals = scResults.map(r4 => row2.fn(r4));
                    const rng = Math.max(...vals) - Math.min(...vals);
                    return (
                      <tr key={ri} style={{ borderBottom: "1px solid #f0f0f0", background: row2.name === "LCOC ($/t)" ? "#fafafa" : "transparent" }}>
                        <td style={{ padding: "6px 10px", fontSize: 11, fontWeight: row2.name.startsWith("LCOC") || row2.name.startsWith("NPV") || row2.name.startsWith("IRR") ? 700 : 500, color: "#555555" }}>{row2.name}</td>
                        {vals.map((v2, vi) => (
                          <td key={vi} style={{ padding: "6px 10px", fontSize: 11, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: row2.name.startsWith("LCOC") ? 700 : 500, color: (row2.lowBest && v2 === Math.min(...vals)) || (row2.highBest && v2 === Math.max(...vals)) ? "#4aa63b" : "#444444" }}>
                            {row2.fmt(v2)}
                          </td>
                        ))}
                        <td style={{ padding: "6px 10px", fontSize: 10, textAlign: "right", color: "#aaaaaa", fontVariantNumeric: "tabular-nums" }}>{row2.fmt(rng)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>);
        })()}
      </div>)}
    </div>
  );
}
