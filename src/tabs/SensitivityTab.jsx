import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SC, CEPCI, LF, TECH, BASE_GP } from '../constants';
import { fm, fd } from '../utils/helpers';

export default function SensitivityTab({
  res, src, cr, bt, st, yr, pp, gp, tech, mode, co2Cap, plCap,
  sensPct, setSensPct, sensSliders, setSensSliders,
  use45Q, useCDRCredit, cdrCreditRate, useAvoidCredit, avoidCreditRate
}) {
  if (!res) return null;
  const v = res.vd;
  const baseCF0 = res.cf;
  const basePP0 = pp;
  const baseGP0 = gp;
  const baseCCF0 = res.discountRate;
  const baseCOC0 = res.total;

  const sBox = { background: "#fff", border: "1px solid #e0e0e0", padding: "18px 20px", marginBottom: 14 };
  const sHdr = { margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#888888", textTransform: "uppercase", letterSpacing: "0.06em" };

  const calc = (oPP, oGP, oCF, oTICmult, oCCF, oCO2mult = 1) => {
    const refCO2 = v.rco, refCF = v.cf;
    let pCO2 = refCO2 * (oCF / refCF) * oCO2mult, sRatio = oCO2mult;
    const uC = parseFloat(co2Cap), uP = parseFloat(plCap);
    if (oCO2mult === 1) {
      if (mode === "co2" && uC > 0) { pCO2 = uC; sRatio = (pCO2 / (oCF / refCF)) / refCO2; }
      else if (mode === "plant" && uP > 0) { sRatio = uP / v.rpc; pCO2 = refCO2 * sRatio * (oCF / refCF); }
    }
    const cR2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
    const lR2 = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
    const cS2 = sRatio !== 1 ? Math.pow(sRatio, 0.6) : 1;
    const rT2 = v.tic * 1e6 * oTICmult, rOwn2 = (v.toc - v.tic) * 1e6 * oTICmult;
    const sTOC2 = (rT2 + rOwn2) * cS2 * cR2 * lR2;
    const fS2 = sRatio !== 1 ? Math.pow(1 / sRatio, 0.15) : 1;
    const sFO2 = v.fo * fS2 * cR2, sVO2 = v.vo * cR2;
    const sPW2 = v.pw * sRatio;
    const pPt2 = (sPW2 * oPP * oCF * 8760) / pCO2;
    const capC2 = (sTOC2 * oCCF) / pCO2;
    const sFL2 = (v.fl || 0) * (oGP / BASE_GP);
    return capC2 + sFO2 + sVO2 + pPt2 + sFL2;
  };

  const sl = sensSliders;
  const basePP = sl.pp != null ? sl.pp : basePP0;
  const baseGP = sl.gp != null ? sl.gp : baseGP0;
  const baseCF = sl.cf != null ? sl.cf : baseCF0;
  const baseCCF = sl.ccf != null ? sl.ccf : baseCCF0;
  const baseCapexMult = sl.capex != null ? sl.capex : 1.0;
  const baseCO2mult = sl.co2 != null ? sl.co2 : 1.0;
  const baseCOC = calc(basePP, baseGP, baseCF, baseCapexMult, baseCCF, baseCO2mult);

  const pct = sensPct / 100;
  const tornado = [
    { name: "Electricity Price", low: calc(basePP*(1-pct), baseGP, baseCF, baseCapexMult, baseCCF, baseCO2mult), high: calc(basePP*(1+pct), baseGP, baseCF, baseCapexMult, baseCCF, baseCO2mult), baseL: "$"+(basePP*(1-pct)).toFixed(0), baseH: "$"+(basePP*(1+pct)).toFixed(0), baseV: "$"+basePP+"/MWh", color: "#b83a4b" },
    { name: "CAPEX Multiplier", low: calc(basePP, baseGP, baseCF, baseCapexMult*(1-pct), baseCCF, baseCO2mult), high: calc(basePP, baseGP, baseCF, baseCapexMult*(1+pct), baseCCF, baseCO2mult), baseL: (baseCapexMult*(1-pct)).toFixed(2)+"×", baseH: (baseCapexMult*(1+pct)).toFixed(2)+"×", baseV: baseCapexMult.toFixed(2)+"×", color: "#93348f" },
    { name: "Capacity Factor", low: calc(basePP, baseGP, Math.min(baseCF*(1+pct),0.99), baseCapexMult, baseCCF, baseCO2mult), high: calc(basePP, baseGP, baseCF*(1-pct), baseCapexMult, baseCCF, baseCO2mult), baseL: Math.min(Math.round(baseCF*(1+pct)*100),99)+"%", baseH: Math.round(baseCF*(1-pct)*100)+"%", baseV: Math.round(baseCF*100)+"%", color: "#58a7af" },
    { name: "WACC", low: calc(basePP, baseGP, baseCF, baseCapexMult, baseCCF*(1-pct), baseCO2mult), high: calc(basePP, baseGP, baseCF, baseCapexMult, baseCCF*(1+pct), baseCO2mult), baseL: (baseCCF*(1-pct)*100).toFixed(2)+"%", baseH: (baseCCF*(1+pct)*100).toFixed(2)+"%", baseV: (baseCCF*100).toFixed(2)+"%", color: "#f68d2e" },
    { name: "CO₂ Flow Rate", low: calc(basePP, baseGP, baseCF, baseCapexMult, baseCCF, baseCO2mult*(1+pct)), high: calc(basePP, baseGP, baseCF, baseCapexMult, baseCCF, baseCO2mult*(1-pct)), baseL: fm(Math.round(res.pCO2*baseCO2mult*(1+pct)),0)+" t/yr", baseH: fm(Math.round(res.pCO2*baseCO2mult*(1-pct)),0)+" t/yr", baseV: fm(Math.round(res.pCO2*baseCO2mult),0)+" t/yr", color: "#58a7af" },
  ];
  if (res.hasFuel) {
    tornado.push({ name: "Natural Gas Price", low: calc(basePP, baseGP*(1-pct), baseCF, baseCapexMult, baseCCF, baseCO2mult), high: calc(basePP, baseGP*(1+pct), baseCF, baseCapexMult, baseCCF, baseCO2mult), baseL: "$"+(baseGP*(1-pct)).toFixed(2), baseH: "$"+(baseGP*(1+pct)).toFixed(2), baseV: "$"+baseGP+"/MMBtu", color: "#93348f" });
  }
  tornado.forEach(t => { t.spread = t.high - t.low; t.delta = Math.max(Math.abs(t.high - baseCOC), Math.abs(baseCOC - t.low)); });
  tornado.sort((a, b) => b.spread - a.spread);

  const steps = 20;
  const mkSweep = (fn) => { const a = []; for (let i = 0; i <= steps; i++) a.push(fn(i / steps)); return a; };
  const sweepElec = mkSweep(p => ({ x: Math.round((basePP * 0.4 + basePP * 1.2 * p) * 10) / 10, coc: Math.round(calc(basePP * 0.4 + basePP * 1.2 * p, baseGP, baseCF, baseCapexMult, baseCCF, baseCO2mult) * 100) / 100 }));
  const sweepCF = mkSweep(p => { const v2 = 0.50 + 0.49 * p; return { x: Math.round(v2 * 100), coc: Math.round(calc(basePP, baseGP, v2, baseCapexMult, baseCCF, baseCO2mult) * 100) / 100 }; });
  const sweepCAPEX = mkSweep(p => { const m = 0.5 + 1.0 * p; return { x: Math.round(m * 100) / 100, coc: Math.round(calc(basePP, baseGP, baseCF, m, baseCCF, baseCO2mult) * 100) / 100 }; });
  const sweepGas = res.hasFuel ? mkSweep(p => { const v2 = baseGP * 0.3 + baseGP * 1.4 * p; return { x: Math.round(v2 * 100) / 100, coc: Math.round(calc(basePP, v2, baseCF, baseCapexMult, baseCCF, baseCO2mult) * 100) / 100 }; }) : null;
  const baseCO2 = res.pCO2 * baseCO2mult;
  const sweepCO2Detail = mkSweep(p => {
    const m = 0.3 + 1.4 * p;
    const refCO2 = v.rco, refCF = v.cf;
    let pCO2 = refCO2 * (baseCF / refCF) * m, sRatio = m;
    const cR2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
    const lR2 = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
    const cS2 = sRatio !== 1 ? Math.pow(sRatio, 0.6) : 1;
    const rT2 = v.tic * 1e6 * baseCapexMult, rOwn2 = (v.toc - v.tic) * 1e6 * baseCapexMult;
    const sTOC2 = (rT2 + rOwn2) * cS2 * cR2 * lR2;
    const fS2 = sRatio !== 1 ? Math.pow(1 / sRatio, 0.15) : 1;
    const sFO2 = v.fo * fS2 * cR2, sVO2 = v.vo * cR2;
    const sPW2 = v.pw * sRatio;
    const pPt2 = (sPW2 * basePP * baseCF * 8760) / pCO2;
    const capC2 = (sTOC2 * baseCCF) / pCO2;
    const sFL2 = (v.fl || 0) * (baseGP / BASE_GP);
    return {
      x: fm(Math.round(baseCO2 * m), 0),
      "LCOC": Math.round((capC2 + sFO2 + sVO2 + pPt2 + sFL2) * 100) / 100,
      "Capital Charge": Math.round(capC2 * 100) / 100,
      "Fixed OPEX": Math.round(sFO2 * 100) / 100,
      "Variable OPEX": Math.round(sVO2 * 100) / 100,
      "Power": Math.round(pPt2 * 100) / 100,
      ...(sFL2 > 0 ? { "Nat Gas": Math.round(sFL2 * 100) / 100 } : {})
    };
  });

  const allLow = Math.min(...tornado.map(t => t.low));
  const allHigh = Math.max(...tornado.map(t => t.high));
  const pad = (allHigh - allLow) * 0.15;
  const minCOC = allLow - pad;
  const maxCOC = allHigh + pad;
  const range = maxCOC - minCOC;

  const swpLine = { type: "monotone", strokeWidth: 2, dot: false, activeDot: { r: 3, strokeWidth: 0 } };
  const swpTT = { contentStyle: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: 0, fontSize: 11, boxShadow: "none" }, formatter: (val) => "$" + val.toFixed(2) + "/t" };
  const swpAxis = { tick: { fill: "#aaaaaa", fontSize: 9.5 } };

  return (
    <div>
      {/* Header bar */}
      <div style={{ background: "#fff", border: "1px solid #e0e0e0", padding: "14px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#aaaaaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sensitivity Analysis</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#333333", marginTop: 2 }}>{src} — {cr} {bt}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "#aaaaaa" }}>Base LCOC</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#58b947" }}>{fd(baseCOC)}<span style={{ fontSize: 11, color: "#aaaaaa", fontWeight: 400 }}>/t CO₂</span></div>
        </div>
      </div>

      {/* Interactive sliders */}
      {(() => {
        const delta = baseCOC - baseCOC0;
        const setSl = (k, val) => setSensSliders(prev => ({...prev, [k]: val}));
        const sliders = [
          { key: "pp", label: "Electricity", val: basePP, base: basePP0, min: Math.round(basePP0 * 0.3), max: Math.round(basePP0 * 2), step: 1, fmt: v => "$" + v + "/MWh", color: "#b83a4b" },
          { key: "capex", label: "CAPEX Mult", val: baseCapexMult, base: 1.0, min: 0.5, max: 2.0, step: 0.01, fmt: v => v.toFixed(2) + "×", color: "#93348f" },
          { key: "cf", label: "Capacity Factor", val: baseCF, base: baseCF0, min: 0.40, max: 0.99, step: 0.01, fmt: v => Math.round(v * 100) + "%", color: "#58a7af" },
          { key: "ccf", label: "WACC", val: baseCCF, base: baseCCF0, min: Math.round(baseCCF0 * 0.5 * 1000) / 1000, max: Math.round(baseCCF0 * 2 * 1000) / 1000, step: 0.001, fmt: v => (v * 100).toFixed(1) + "%", color: "#f68d2e" },
          { key: "co2", label: "CO₂ Flow", val: baseCO2mult, base: 1.0, min: 0.3, max: 2.0, step: 0.01, fmt: v => v.toFixed(2) + "×", color: "#58a7af" },
        ];
        if (res.hasFuel) {
          sliders.splice(1, 0, { key: "gp", label: "Nat Gas", val: baseGP, base: baseGP0, min: Math.round(baseGP0 * 0.3 * 100) / 100, max: Math.round(baseGP0 * 3 * 100) / 100, step: 0.05, fmt: v => "$" + v.toFixed(2), color: "#93348f" });
        }
        const anyChanged = sliders.some(s => s.val !== s.base);
        return (
          <div style={sBox}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <h3 style={{...sHdr,margin:0}}>What-If Sliders</h3>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {anyChanged && <button onClick={() => setSensSliders({})} style={{fontSize:9,color:"#aaaaaa",background:"none",border:"1px solid #e0e0e0",borderRadius:3,padding:"2px 8px",cursor:"pointer"}}>Reset</button>}
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9,color:"#aaaaaa"}}>Live LCOC</div>
                  <div style={{fontSize:20,fontWeight:700,color: delta === 0 ? "#58b947" : delta > 0 ? "#b83a4b" : "#58b947"}}>{fd(baseCOC)}<span style={{fontSize:10,color:"#aaaaaa",fontWeight:400}}>/t</span>
                    {delta !== 0 && <span style={{fontSize:10,fontWeight:600,marginLeft:6,color: delta > 0 ? "#b83a4b" : "#58b947"}}>{delta > 0 ? "+" : ""}{fd(delta)}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns: sliders.length > 4 ? "1fr 1fr" : "1fr",gap:"6px 20px"}}>
              {sliders.map(s => (
                <div key={s.key} style={{display:"grid",gridTemplateColumns:"90px 1fr 60px",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,fontWeight:600,color:"#555555",textAlign:"right"}}>{s.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:8,color:"#aaaaaa",minWidth:32,textAlign:"right"}}>{s.fmt(s.min)}</span>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                      onChange={e => setSl(s.key, parseFloat(e.target.value))}
                      style={{flex:1,cursor:"pointer",accentColor:s.color}} />
                    <span style={{fontSize:8,color:"#aaaaaa",minWidth:32}}>{s.fmt(s.max)}</span>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color: s.val !== s.base ? s.color : "#888888",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{s.fmt(s.val)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* LCOC Breakdown */}
      {(() => {
        const refCO2 = v.rco, refCF = v.cf;
        let pCO2 = refCO2 * (baseCF / refCF) * baseCO2mult, sRatio = baseCO2mult;
        const uC = parseFloat(co2Cap), uP = parseFloat(plCap);
        if (baseCO2mult === 1) {
          if (mode === "co2" && uC > 0) { pCO2 = uC; sRatio = (pCO2 / (baseCF / refCF)) / refCO2; }
          else if (mode === "plant" && uP > 0) { sRatio = uP / v.rpc; pCO2 = refCO2 * sRatio * (baseCF / refCF); }
        }
        const tF = TECH[tech] || TECH.amine;
        const cR2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
        const lR2 = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
        const cS2 = sRatio !== 1 ? Math.pow(sRatio, 0.6) : 1;
        const rT2 = v.tic * 1e6 * baseCapexMult, rOwn2 = (v.toc - v.tic) * 1e6 * baseCapexMult;
        const sTOC2 = (rT2 + rOwn2) * cS2 * cR2 * lR2 * tF.capex;
        const fS2 = sRatio !== 1 ? Math.pow(1 / sRatio, 0.15) : 1;
        const sFO2 = v.fo * fS2 * cR2 * tF.opex, sVO2 = v.vo * cR2 * tF.opex;
        const sPW2 = v.pw * sRatio * tF.power;
        const pPt2 = (sPW2 * basePP * baseCF * 8760) / pCO2;
        const capC2 = (sTOC2 * baseCCF) / pCO2;
        const sFL2 = (v.fl || 0) * (baseGP / BASE_GP);
        const comps = [
          { name: "Capital Charge", val: capC2, color: "#58b947" },
          { name: "Fixed OPEX", val: sFO2, color: "#58b947" },
          { name: "Variable OPEX", val: sVO2, color: "#f68d2e" },
          { name: "Power", val: pPt2, color: "#b83a4b" },
          ...(sFL2 > 0 ? [{ name: "Fuel", val: sFL2, color: "#93348f" }] : [])
        ];
        const total = comps.reduce((s, c) => s + c.val, 0);
        const barData = [comps.reduce((obj, c) => ({...obj, [c.name]: Math.round(c.val * 100) / 100}), { name: "LCOC" })];
        return (
          <div style={{...sBox, display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"center"}}>
            <div>
              <h3 style={sHdr}>LCOC Breakdown</h3>
              <ResponsiveContainer width="100%" height={48}>
                <BarChart data={barData} layout="vertical" margin={{top:0,right:0,bottom:0,left:0}}>
                  <XAxis type="number" hide domain={[0, total]} />
                  <YAxis type="category" dataKey="name" hide />
                  {comps.map(c => <Bar key={c.name} dataKey={c.name} stackId="a" fill={c.color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
              {comps.map(c => (
                <div key={c.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0"}}>
                  <span style={{fontSize:10,color:"#666666",display:"flex",alignItems:"center",gap:4}}>
                    <span style={{display:"inline-block",width:8,height:8,background:c.color,borderRadius:1}} />
                    {c.name}
                  </span>
                  <span style={{fontSize:11,fontWeight:700,color:"#333333",fontVariantNumeric:"tabular-nums"}}>{fd(c.val)} <span style={{fontSize:8,color:"#aaaaaa"}}>({(c.val/total*100).toFixed(0)}%)</span></span>
                </div>
              ))}
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #e0e0e0",paddingTop:4,display:"flex",justifyContent:"space-between",marginTop:2}}>
                <span style={{fontSize:11,fontWeight:700,color:"#333333"}}>Total LCOC</span>
                <span style={{fontSize:14,fontWeight:700,color:"#58b947"}}>{fd(total)}/t</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tornado */}
      <div style={sBox}>
        <h3 style={sHdr}>Tornado — ±{sensPct}% Parameter Variation</h3>
        {tornado.map((t, i) => {
          const leftPct = ((t.low - minCOC) / range) * 100;
          const basePctPos = ((baseCOC - minCOC) / range) * 100;
          const widthPct = ((t.high - t.low) / range) * 100;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr 60px", alignItems: "center", marginBottom: 10, gap: 10 }}>
              <div style={{ fontSize: 12, color: "#555555", fontWeight: 600, textAlign: "right" }}>{t.name}</div>
              <div style={{ position: "relative", height: 24, background: "#fafafa" }}>
                <div style={{ position: "absolute", left: basePctPos + "%", top: 0, bottom: 0, width: 1, background: "#333333", zIndex: 3 }} />
                <div style={{ position: "absolute", left: leftPct + "%", width: widthPct + "%", top: 3, bottom: 3, background: t.color, opacity: 0.7 }} />
                <div style={{ position: "absolute", left: leftPct + "%", top: "50%", transform: "translate(-100%, -50%)", fontSize: 9, color: "#666666", fontWeight: 600, paddingRight: 4, whiteSpace: "nowrap" }}>{fd(t.low)}</div>
                <div style={{ position: "absolute", left: (leftPct + widthPct) + "%", top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#666666", fontWeight: 600, paddingLeft: 4, whiteSpace: "nowrap" }}>{fd(t.high)}</div>
              </div>
              <div style={{ fontSize: 11, color: "#333333", fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>±{fd(t.spread / 2)}</div>
            </div>
          );
        })}
        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 60px", marginTop: 4, gap: 10 }}>
          <div />
          <div style={{ fontSize: 9, color: "#aaaaaa", display: "flex", justifyContent: "space-between", padding: "0 1px" }}>
            <span>{fd(minCOC)}</span>
            <span style={{ color: "#333333", fontWeight: 700, fontSize: 10 }}>Base {fd(baseCOC)}</span>
            <span>{fd(maxCOC)}</span>
          </div>
          <div />
        </div>
      </div>

      {/* Sweep charts — 2×2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {[
          { title: "Electricity Price", data: sweepElec, color: "#b83a4b", xLabel: "$/MWh", refX: Math.round(basePP * 10) / 10, labelFmt: v => "$" + v + "/MWh" },
          { title: "Capacity Factor", data: sweepCF, color: "#58a7af", xLabel: "CF %", refX: Math.round(baseCF * 100), labelFmt: v => v + "%" },
          { title: "CAPEX Multiplier", data: sweepCAPEX, color: "#93348f", xLabel: "CAPEX Mult", refX: baseCapexMult, labelFmt: v => v + "×" },
          ...(res.hasFuel && sweepGas ? [{ title: "Natural Gas Price", data: sweepGas, color: "#93348f", xLabel: "$/MMBtu", refX: Math.round(baseGP * 100) / 100, labelFmt: v => "$" + v }] : [])
        ].map((sw, idx) => (
          <div key={idx} style={sBox}>
            <h3 style={sHdr}>{sw.title}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={sw.data} margin={{ top: 4, right: 12, bottom: 14, left: 8 }}>
                <XAxis dataKey="x" {...swpAxis} label={{ value: sw.xLabel, position: "bottom", offset: 0, style: { fontSize: 9, fill: "#aaaaaa" } }} />
                <YAxis {...swpAxis} tickFormatter={v => "$" + v} domain={["auto", "auto"]} width={45} />
                <Tooltip {...swpTT} labelFormatter={sw.labelFmt} />
                <ReferenceLine x={sw.refX} stroke="#cccccc" strokeDasharray="3 3" strokeWidth={1} />
                <ReferenceLine y={Math.round(baseCOC * 100) / 100} stroke="#cccccc" strokeDasharray="3 3" strokeWidth={1} />
                <Line dataKey="coc" stroke={sw.color} {...swpLine} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* CO₂ Flow Rate — Detailed Component Breakdown */}
      <div style={sBox}>
        <h3 style={sHdr}>CO₂ Flow Rate — Cost Component Breakdown ($/t)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={sweepCO2Detail} margin={{ top: 8, right: 20, bottom: 20, left: 10 }}>
            <XAxis dataKey="x" {...swpAxis} label={{ value: "CO₂ Flow Rate (t/yr)", position: "bottom", offset: 2, style: { fontSize: 9, fill: "#aaaaaa" } }} interval={3} />
            <YAxis {...swpAxis} tickFormatter={v => "$" + v} domain={["auto", "auto"]} width={50} />
            <Tooltip {...swpTT} labelFormatter={v => v + " t/yr"} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <ReferenceLine x={fm(Math.round(baseCO2), 0)} stroke="#cccccc" strokeDasharray="3 3" strokeWidth={1} label={{ value: "Base", position: "top", style: { fontSize: 8, fill: "#aaaaaa" } }} />
            <Line dataKey="LCOC" stroke="#333333" strokeWidth={3} dot={false} activeDot={{ r: 4 }} type="monotone" />
            <Line dataKey="Capital Charge" stroke="#58b947" strokeWidth={1.5} dot={false} strokeDasharray="6 3" type="monotone" />
            <Line dataKey="Fixed OPEX" stroke="#58b947" strokeWidth={1.5} dot={false} strokeDasharray="6 3" type="monotone" />
            <Line dataKey="Variable OPEX" stroke="#f68d2e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" type="monotone" />
            <Line dataKey="Power" stroke="#b83a4b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" type="monotone" />
            {res.hasFuel && <Line dataKey="Nat Gas" stroke="#93348f" strokeWidth={1.5} dot={false} strokeDasharray="4 2" type="monotone" />}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 8, color: "#aaaaaa", textAlign: "center", marginTop: 4 }}>Bold black = total LCOC · Dashed lines = individual cost components · Capital Charge and Fixed OPEX decline with scale (economies of scale)</div>
      </div>

      {/* Impact table */}
      <div style={sBox}>
        <h3 style={sHdr}>Parameter Impact Summary</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
              <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: "left" }}>Parameter</th>
              <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: "center" }}>Base</th>
              <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#58b947", textTransform: "uppercase", textAlign: "right" }}>−20%</th>
              <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: "right" }}>LCOC Low</th>
              <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#b83a4b", textTransform: "uppercase", textAlign: "right" }}>+20%</th>
              <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: "right" }}>LCOC High</th>
              <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#333333", textTransform: "uppercase", textAlign: "right" }}>Spread</th>
            </tr>
          </thead>
          <tbody>
            {tornado.map((t, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: "#555555" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, background: t.color, marginRight: 8, verticalAlign: "middle" }} />{t.name}
                </td>
                <td style={{ padding: "8px 10px", fontSize: 11, color: "#888888", textAlign: "center" }}>{t.baseV}</td>
                <td style={{ padding: "8px 10px", fontSize: 11, color: "#58b947", textAlign: "right", fontWeight: 500 }}>{t.baseL}</td>
                <td style={{ padding: "8px 10px", fontSize: 12, color: "#444444", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fd(t.low)}/t</td>
                <td style={{ padding: "8px 10px", fontSize: 11, color: "#b83a4b", textAlign: "right", fontWeight: 500 }}>{t.baseH}</td>
                <td style={{ padding: "8px 10px", fontSize: 12, color: "#444444", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fd(t.high)}/t</td>
                <td style={{ padding: "8px 10px", fontSize: 12, color: "#333333", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fd(t.spread)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
