import { useState, Fragment } from 'react';
import { SC, CEPCI, LF, BASE_GP, TECH } from '../constants';
import { fm, fd } from '../utils/helpers';
import { cd, ch } from '../utils/styles';

export default function BatchModelTab({ batchResults }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!batchResults || !batchResults.rows) return (
    <div style={{ padding: 24, color: "#888", fontSize: 13 }}>
      Run a batch first (Batch Run tab), then come here to inspect individual row calculations.
    </div>
  );

  const okRows = batchResults.rows.filter(r => r._status === "OK" && r._calcResult);
  if (okRows.length === 0) return (
    <div style={{ padding: 24, color: "#888", fontSize: 13 }}>
      No successfully processed rows with calculation data. Run the batch model first.
    </div>
  );

  const row = okRows[selectedIdx] || okRows[0];
  const res = row._calcResult;
  const v = row._vd;
  const inp = row._inputs;
  const tech = res.tF || TECH[inp.techKey] || TECH.amine;
  const techName = tech.n || "Amine (MEA)";

  // ═══════════════════════════════════════════════════════
  // STYLE HELPERS (same as ModelTab)
  // ═══════════════════════════════════════════════════════
  const stepHeader = (num, title, color, sub) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: num === 1 ? 0 : 20 }}>
      <div style={{ minWidth: 28, height: 28, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, borderRadius: 2 }}>{num}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, height: 1, background: color + "44" }} />
    </div>
  );

  const calcCard = (label, formula, result, note, color, isInput) => (
    <div style={{
      background: isInput ? "#fffdf5" : "#fff",
      border: isInput ? "2px solid #f5a623" : "1px solid #e8e8e8",
      borderLeft: `3px solid ${isInput ? "#f5a623" : color}`,
      borderRadius: 2, padding: "10px 12px", marginBottom: 8
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: isInput ? "#c47d00" : "#555", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {label}
          {isInput && <span style={{ marginLeft: 6, fontSize: 9, background: "#fff3cc", color: "#c47d00", padding: "1px 5px", borderRadius: 2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>from spreadsheet</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{result}</div>
      </div>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10.5, color: "#666", background: isInput ? "#fef9e7" : "#f7f7f7", padding: "6px 8px", borderRadius: 2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{formula}</div>
      {note && <div style={{ fontSize: 9, color: "#aaa", marginTop: 4, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );

  const dataRow = (label, value, unit, hl) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ fontSize: 10.5, color: hl ? "#58b947" : "#888", fontWeight: hl ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 10.5, color: hl ? "#58b947" : "#333", fontWeight: hl ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>{value}{unit ? ` ${unit}` : ""}</span>
    </div>
  );

  const flowArrow = (label) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 0", gap: 8 }}>
      <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #ccc" }} />
      {label && <span style={{ fontSize: 9, color: "#aaa", fontStyle: "italic" }}>{label}</span>}
    </div>
  );

  const refTag = (label, value, color) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: `1px solid ${color}33`, padding: "2px 8px", fontSize: 9.5, marginRight: 4, marginBottom: 3 }}>
      <span style={{ width: 5, height: 5, background: color, borderRadius: 1 }} />
      <span style={{ color: "#999" }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );

  // ═══════════════════════════════════════════════════════
  // DERIVED VALUES
  // ═══════════════════════════════════════════════════════
  const pw = v ? (v.pw || 0) : 0;
  const crDec = inp.crCustom / 100;
  const cfDec = inp.cf;
  const cfPct = (cfDec * 100).toFixed(1);
  const refCF = v ? v.cf : 0.85;
  const refCfPct = (refCF * 100).toFixed(0);
  const rpc = v ? v.rpc : 0;
  const rawS = SC[inp.srcName];
  const raw = v?._raw || {};
  const a = v?._adj || {};
  const co2Prod = crDec > 0 ? res.pCO2 / crDec : 0;
  const plantCapVal = res.sR * rpc;
  const plantCapUnit = v ? v.rpu : "units";
  const expOutVal = plantCapVal * cfDec;
  const expOutUnit = v ? v.rpu : "units";
  const hasCustomCO2 = inp.rawCO2 > 0;

  return (
    <div>
      {/* ═══════ ROW SELECTOR ═══════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 14px", background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Inspect Row:</div>
        <select
          value={selectedIdx}
          onChange={e => setSelectedIdx(parseInt(e.target.value))}
          style={{ padding: "4px 8px", fontSize: 11, border: "1px solid #ccc", borderRadius: 2, minWidth: 300 }}
        >
          {okRows.map((r, i) => (
            <option key={i} value={i}>
              Row {i + 1}: {r._srcResolved} / {r._stateResolved} — {r["LCOC $/t"]} $/t — {fm(r["CO2 Captured tpa"], 0)} t/yr
            </option>
          ))}
        </select>
        <div style={{ fontSize: 10, color: "#888" }}>{okRows.length} rows available</div>
      </div>

      {/* ═══════ QUICK SUMMARY ═══════ */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {refTag("Source", inp.srcName, "#58b947")}
        {refTag("State", inp.stCode, "#58a7af")}
        {refTag("Config", `${inp.crCustom}% ${inp.bt}`, "#58b947")}
        {refTag("Tech", techName, "#93348f")}
        {refTag("CEPCI", `${res.cR.toFixed(3)}x`, "#93348f")}
        {refTag("Location", `${inp.stCode} ${res.lR.toFixed(3)}x`, "#58a7af")}
        {res.sR !== 1 && refTag("Scale", `${res.sR.toFixed(3)}x`, "#f68d2e")}
        {refTag("LCOC", `${fd(res.total)}/t`, "#58b947")}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 1: PLANT CAPACITY & CO2 VOLUME                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(1, "Plant Capacity & CO\u2082 Volume", "#58a7af", "Batch: CO\u2082 comes from spreadsheet or NETL default. Plant capacity and sR are derived.")}

      <div style={{ padding: "6px 10px", background: hasCustomCO2 ? "#fff8e1" : "#f5f5f5", border: `1px solid ${hasCustomCO2 ? "#ffe082" : "#e0e0e0"}`, borderRadius: 2, marginBottom: 10, fontSize: 10, color: hasCustomCO2 ? "#e65100" : "#888" }}>
        <span style={{ fontWeight: 700 }}>Derivation chain: </span>
        {hasCustomCO2
          ? `Spreadsheet CO2 (${fm(inp.rawCO2, 0)} t/yr) -> pCO2 = ${fm(res.pCO2, 0)} t/yr -> sR back-calculated -> Plant Capacity derived`
          : `No CO2 in spreadsheet -> NETL default: pCO2 = Ref_CO2 x (CF/Ref_CF) = ${fm(res.pCO2, 0)} t/yr -> sR = 1.0`}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>CO2 Captured (pCO2)</h3>
          {calcCard("CO2 Captured",
            hasCustomCO2
              ? `FROM SPREADSHEET\n= ${fm(inp.rawCO2, 0)} t/yr`
              : `NETL DEFAULT\n= Ref_CO2 x (CF / Ref_CF)\n= ${fm(v ? v.rco : 0, 0)} x (${cfPct}% / ${refCfPct}%)\n= ${fm(res.pCO2, 0)} t/yr`,
            `${fm(res.pCO2, 0)} t/yr`,
            "The LCOC denominator — all $/t calculations divide by this",
            "#58b947", hasCustomCO2
          )}
          {calcCard("CO2 Produced",
            `= CO2 Captured / Capture Rate\n= ${fm(res.pCO2, 0)} / ${(crDec * 100).toFixed(0)}%\n= ${fm(co2Prod, 0)} t/yr`,
            `${fm(co2Prod, 0)} t/yr`,
            "Total CO2 emitted before capture",
            "#f68d2e"
          )}
        </div>

        <div style={cd}>
          <h3 style={ch}>Size Ratio (sR)</h3>
          {calcCard("Size Ratio",
            hasCustomCO2
              ? `= (pCO2 / (CF / Ref_CF)) / Ref_CO2\n= (${fm(res.pCO2, 0)} / (${cfPct}% / ${refCfPct}%))\n  / ${fm(v ? v.rco : 0, 0)}\n= ${res.sR.toFixed(4)}`
              : `= 1.0000 (NETL default — no CO2 in spreadsheet)`,
            `${res.sR.toFixed(4)}x`,
            "How large this facility is vs the NETL reference plant",
            "#f68d2e", !hasCustomCO2
          )}
          {calcCard("Plant Capacity (back-calc)",
            `= sR x Ref_Plant_Cap\n= ${res.sR.toFixed(4)} x ${rpc.toLocaleString()}\n= ${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1})} ${plantCapUnit}`,
            `${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 0})} ${plantCapUnit}`,
            "Derived from sR — not entered by user in batch mode",
            "#888"
          )}
          {calcCard("Expected Output",
            `= Plant Cap x CF\n= ${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1})} x ${cfPct}%\n= ${expOutVal.toLocaleString('en-US', {maximumFractionDigits: 1})} ${expOutUnit}`,
            `${fm(expOutVal, 0)} ${expOutUnit}`,
            "Effective annual throughput",
            "#58a7af"
          )}
        </div>

        <div style={cd}>
          <h3 style={ch}>Size-Based Scale Factors</h3>
          {calcCard("CAPEX Scale (cS)",
            `= sR ^ 0.6   (six-tenths rule)\n= ${res.sR.toFixed(4)} ^ 0.6\n= ${res.cS.toFixed(4)}`,
            `${res.cS.toFixed(4)}x`,
            "Economies of scale", "#f68d2e"
          )}
          {calcCard("FOM Scale (fS)",
            `= (1/sR) ^ 0.15\n= (1/${res.sR.toFixed(4)}) ^ 0.15\n= ${res.fS.toFixed(4)}`,
            `${res.fS.toFixed(4)}x`,
            "Larger plant = lower $/t fixed cost", "#f68d2e"
          )}
        </div>

        <div style={cd}>
          <h3 style={ch}>Capacity Factor</h3>
          {calcCard("CF",
            `= ${cfPct}% (from Model Settings)\nRef CF = ${refCfPct}%\nCF ratio = ${cfPct}% / ${refCfPct}% = ${(cfDec / refCF).toFixed(4)}`,
            `${cfPct}%`,
            "Same CF applied to all batch rows",
            "#58a7af"
          )}
        </div>
      </div>

      {flowArrow("plant metrics feed into Step 2 (reference data) and Steps 3-7 (cost calculation)")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 2: NETL REFERENCE DATA & CR/BT ADJUSTMENTS       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(2, "NETL Reference Data & CR/BT Adjustments", "#888", `Source: ${inp.srcName} | Base data from NETL 2018 Baseline Report`)}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>NETL Raw Reference Values (before CR/BT adjustments)</h3>
          {dataRow("Total Installed Cost (TIC)", `$${raw.tic ? raw.tic.toFixed(3) : (v ? v.tic.toFixed(3) : 0)}M`)}
          {dataRow("Total Overnight Cost (TOC)", `$${raw.toc ? raw.toc.toFixed(3) : (v ? v.toc.toFixed(3) : 0)}M`)}
          {dataRow("Owner's Costs", `$${raw.toc ? (raw.toc - raw.tic).toFixed(3) : (v ? (v.toc - v.tic).toFixed(3) : 0)}M`, "(TOC - TIC)")}
          <div style={{ height: 4 }} />
          {dataRow("Reference CO2 Captured", `${fm(raw.rco || (v ? v.rco : 0), 0)}`, "t/yr")}
          {dataRow("Reference Capacity Factor", `${((v ? v.cf : 0.85) * 100).toFixed(0)}%`)}
          {dataRow("Reference Plant Capacity", `${rpc?.toLocaleString() || "—"}`, plantCapUnit)}
          {dataRow("Base State", v ? v.bs : "LA")}
          <div style={{ height: 4 }} />
          {dataRow("Fixed OPEX (FOM)", `$${raw.fo ? raw.fo.toFixed(2) : (v ? v.fo.toFixed(2) : 0)}`, "/t CO2")}
          {dataRow("Variable OPEX (VOM)", `$${raw.vo ? raw.vo.toFixed(2) : (v ? v.vo.toFixed(2) : 0)}`, "/t CO2")}
          {dataRow("Parasitic Power", `${raw.pw ? raw.pw.toFixed(2) : pw.toFixed(2)}`, "MW")}
          {res.hasFuel && dataRow("Fuel Cost", `$${res.bfl.toFixed(2)}`, "/t CO2")}
          {dataRow("Available CRs", v?.cr?.join(", ") || "—")}
          {dataRow("Available BTs", v?.bt?.join(", ") || "—")}
        </div>

        <div style={cd}>
          <h3 style={ch}>Capture Rate & Build Type Adjustments</h3>
          {(() => {
            if (!rawS || !a.thermoRatio) return null;
            const crNum = inp.crCustom;
            const thermoBase = a.hasCR ? 1 : -Math.log(1 - a.baseCRNum / 100);
            const thermoNew = a.hasCR ? 1 : -Math.log(1 - crNum / 100);

            return (
              <>
                {calcCard("Capture Rate",
                  `User CR:  ${crNum}%\nNETL CR:  ${a.baseCRNum}% (available: ${rawS.cr?.join(", ") || "—"})`,
                  `${crNum}%`, null, a.hasCR ? "#4aa63b" : "#f68d2e"
                )}
                {calcCard("Thermodynamic Difficulty Ratio",
                  a.hasCR
                    ? `CR ${crNum}% matches NETL exactly\nthermoRatio = 1.0000`
                    : `thermoBase = -ln(1 - ${a.baseCRNum}/100) = ${thermoBase.toFixed(4)}\nthermoNew  = -ln(1 - ${crNum}/100)  = ${thermoNew.toFixed(4)}\nthermoRatio = ${thermoNew.toFixed(4)} / ${thermoBase.toFixed(4)} = ${a.thermoRatio.toFixed(4)}`,
                  a.thermoRatio.toFixed(4), null, "#f68d2e"
                )}
                {calcCard("CO2 Volume (rcoAdj)", a.hasCR ? `= 1.0000` : `= ${crNum} / ${a.baseCRNum} = ${a.rcoAdj.toFixed(4)}`, `${a.rcoAdj.toFixed(4)}x`, null, "#58a7af")}
                {calcCard("CAPEX (crCapexAdj)", `= 1.0000\nEquipment sized for CO2 produced (gas flow),\nnot capture rate — CAPEX unchanged by CR`, `${a.crCapexAdj.toFixed(4)}x`, null, "#58b947")}
                {calcCard("Fixed OPEX (crFomAdj)", a.hasCR ? `= 1.0000` : `= 1 / ${a.rcoAdj.toFixed(4)} = ${a.crFomAdj.toFixed(4)}`, `${a.crFomAdj.toFixed(4)}x`, null, "#58b947")}
                {calcCard("Variable OPEX (crVomAdj)", a.hasCR ? `= 1.0000` : `= ${a.thermoRatio.toFixed(4)} ^ 0.2 = ${a.crVomAdj.toFixed(4)}`, `${a.crVomAdj.toFixed(4)}x`, null, "#f68d2e")}
                {calcCard("Power (pwAdj)", a.hasCR ? `= 1.0000` : `= ${a.thermoRatio.toFixed(4)} ^ 0.4 = ${a.pwAdj.toFixed(4)}`, `${a.pwAdj.toFixed(4)}x`, null, "#b83a4b")}
                {calcCard("Build Type (btAdj)",
                  `User: ${inp.bt}  |  NETL: ${a.baseBT}\n${a.hasBT ? "Exact match — btAdj = 1.0000" : `btAdj = ${a.btAdj.toFixed(4)}`}`,
                  `${a.btAdj.toFixed(4)}x`, null, a.hasBT ? "#4aa63b" : "#93348f"
                )}

                {/* Summary Table */}
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8f5ff", border: "1px solid #d1c4e9", borderRadius: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6a1b9a", marginBottom: 4 }}>Adjustment Factor Summary</div>
                  {dataRow("rcoAdj (CO2 volume)", `${a.rcoAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("crCapexAdj (CAPEX)", `${a.crCapexAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("crFomAdj (Fixed OPEX)", `${a.crFomAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("crVomAdj (Variable OPEX)", `${a.crVomAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("pwAdj (Power)", `${a.pwAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("btAdj (Build Type)", `${a.btAdj.toFixed(4)}x`, null, !a.hasBT)}
                </div>

                {/* Before/After Comparison */}
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0faf0", border: "1px solid #c8e6c9", borderRadius: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#58b947", marginBottom: 4 }}>NETL Raw vs Adjusted</div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: "2px 8px", fontSize: 10 }}>
                    <div style={{ fontWeight: 700, color: "#888" }}>Field</div>
                    <div style={{ fontWeight: 700, color: "#888", textAlign: "right" }}>Raw</div>
                    <div style={{ fontWeight: 700, color: "#888", textAlign: "right" }}>Factor</div>
                    <div style={{ fontWeight: 700, color: "#58b947", textAlign: "right" }}>Adjusted</div>
                    {[
                      ["TIC", `$${raw.tic.toFixed(3)}M`, (a.crCapexAdj * a.btAdj), `$${(raw.tic * a.crCapexAdj * a.btAdj).toFixed(3)}M`],
                      ["TOC", `$${raw.toc.toFixed(3)}M`, (a.crCapexAdj * a.btAdj), `$${(raw.toc * a.crCapexAdj * a.btAdj).toFixed(3)}M`],
                      ["FOM", `$${raw.fo.toFixed(2)}/t`, (a.crFomAdj * a.btAdj), `$${(raw.fo * a.crFomAdj * a.btAdj).toFixed(2)}/t`],
                      ["VOM", `$${raw.vo.toFixed(2)}/t`, (a.crVomAdj * a.btAdj), `$${(raw.vo * a.crVomAdj * a.btAdj).toFixed(2)}/t`],
                      ["Power", `${raw.pw.toFixed(2)} MW`, a.pwAdj, `${(raw.pw * a.pwAdj).toFixed(2)} MW`],
                      ["CO2", `${fm(raw.rco, 0)} t/yr`, a.rcoAdj, `${fm(Math.round(raw.rco * a.rcoAdj), 0)} t/yr`],
                    ].map(([field, rawVal, factor, adj], i) => (
                      <Fragment key={i}>
                        <div style={{ color: "#666" }}>{field}</div>
                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{rawVal}</div>
                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#93348f" }}>x{factor.toFixed(4)}</div>
                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#58b947" }}>{adj}</div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {flowArrow("adjusted reference data and plant metrics feed into Steps 3-7")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 3: COST SCALING FACTORS                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(3, "Cost Scaling Factors", "#93348f", "CEPCI (time), location, and technology — independent of plant size")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>CEPCI Escalation (cR)</h3>
          {calcCard("CEPCI Ratio",
            `= CEPCI[${inp.yr}] / CEPCI[2018]\n= ${CEPCI[inp.yr] || CEPCI[2026]} / ${CEPCI[2018]}\n= ${res.cR.toFixed(4)}`,
            `${res.cR.toFixed(4)}x`,
            `Inflates 2018 USD to ${inp.yr} USD`, "#93348f"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Location Factor (lR)</h3>
          {calcCard("Location Ratio",
            `= LF[${inp.stCode}] / LF[${v ? v.bs : "LA"}]\n= ${(LF[inp.stCode] ? LF[inp.stCode].f.toFixed(3) : "1.000")} / ${(v && LF[v.bs] ? LF[v.bs].f.toFixed(3) : "0.970")}\n= ${res.lR.toFixed(4)}`,
            `${res.lR.toFixed(4)}x`,
            `${LF[inp.stCode] ? LF[inp.stCode].n : inp.stCode} vs ${v ? v.bs : "LA"}`,
            "#58a7af"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Technology (tF)</h3>
          {calcCard("Tech Multipliers",
            `Technology: ${techName}\n\nCAPEX mult = ${tech.capex.toFixed(2)}\nOPEX mult  = ${tech.opex.toFixed(2)}\nPower mult = ${tech.power.toFixed(2)}`,
            techName, "Relative to baseline Amine (MEA) = 1.00", "#93348f"
          )}
        </div>
      </div>

      {flowArrow("all scaling factors feed into CAPEX and OPEX")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 4: CAPEX                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(4, "CAPEX & Capital Charge", "#58b947", "Scale reference costs and annualize with WACC")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Scaled CAPEX</h3>
          {calcCard("Reference TIC (rT)",
            `= TIC_adjusted x 1,000,000\n= $${v ? v.tic.toFixed(3) : 0}M x 1e6\n= $${fm(res.rT, 0)}`,
            `$${fm(res.rT, 0)}`, null, "#888"
          )}
          {calcCard("Reference Owner's (rOwn)",
            `= (TOC - TIC) x 1,000,000\n= ($${v ? v.toc.toFixed(3) : 0}M - $${v ? v.tic.toFixed(3) : 0}M) x 1e6\n= $${fm(res.rOwn, 0)}`,
            `$${fm(res.rOwn, 0)}`, null, "#888"
          )}
          {calcCard("Scaled TIC (sT)",
            `= rT x cS x cR x lR x tF.capex\n= $${fm(res.rT, 0)}\n  x ${res.cS.toFixed(4)}  (size)\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${res.lR.toFixed(4)}  (location)\n  x ${tech.capex.toFixed(2)}      (tech)\n= $${fm(res.sT, 0)}`,
            `$${fd(res.sT / 1e6, 2)}M`, null, "#58b947"
          )}
          {calcCard("Scaled Owner's (sOwn)",
            `= rOwn x cS x cR x lR x tF.capex\n= $${fm(res.rOwn, 0)}\n  x ${res.cS.toFixed(4)}  (size)\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${res.lR.toFixed(4)}  (location)\n  x ${tech.capex.toFixed(2)}      (tech)\n= $${fm(res.sOwn, 0)}`,
            `$${fd(res.sOwn / 1e6, 2)}M`, null, "#93348f"
          )}
          {calcCard("Total Overnight Cost (sTOC)",
            `= sT + sOwn\n= $${fd(res.sT / 1e6, 2)}M + $${fd(res.sOwn / 1e6, 2)}M\n= $${fd(res.sTOC / 1e6, 2)}M`,
            `$${fd(res.sTOC / 1e6, 2)}M`, null, "#58b947"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Capital Charge ($/t CO2)</h3>
          {calcCard("WACC (Discount Rate)",
            `= ${(inp.discountRate * 100).toFixed(3)}%`,
            `${(inp.discountRate * 100).toFixed(2)}%`,
            "From Model Settings (shared across all batch rows)", "#58a7af"
          )}
          {calcCard("Capital Charge",
            `= (sTOC x WACC) / pCO2\n\n= ($${fd(res.sTOC / 1e6, 2)}M x ${(inp.discountRate * 100).toFixed(2)}%)\n  / ${fm(res.pCO2, 0)} t/yr\n\n= $${fm(res.sTOC * inp.discountRate, 0)}/yr\n  / ${fm(res.pCO2, 0)} t/yr\n\n= ${fd(res.capC)}/t CO2`,
            `${fd(res.capC)}/t`, null, "#58b947"
          )}
          <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8f8f8", border: "1px solid #e8e8e8", borderRadius: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 4 }}>CAPEX Per-Tonne</div>
            {dataRow("TIC per tonne", fd(res.tpt) + "/t")}
            {dataRow("Owner's per tonne", fd(res.opt) + "/t")}
            {dataRow("TOC per tonne", fd(res.tocpt) + "/t")}
            {dataRow("Capital Charge", fd(res.capC) + "/t", null, true)}
          </div>
        </div>
      </div>

      {flowArrow("Capital Charge feeds into Total LCOC")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 5: OPEX                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(5, "Operating Costs (OPEX)", "#f68d2e", "Fixed and variable operating expenses")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Fixed OPEX</h3>
          {calcCard("Fixed OPEX (sFO)",
            `= FOM_ref x fS x cR x tF.opex\n= $${v ? v.fo.toFixed(2) : 0}/t\n  x ${res.fS.toFixed(4)}  (size)\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${tech.opex.toFixed(2)}      (tech)\n= ${fd(res.sFO)}/t CO2`,
            `${fd(res.sFO)}/t`, null, "#58b947"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Variable OPEX</h3>
          {calcCard("Variable OPEX (sVO)",
            `= VOM_ref x cR x tF.opex\n= $${v ? v.vo.toFixed(2) : 0}/t\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${tech.opex.toFixed(2)}      (tech)\n= ${fd(res.sVO)}/t CO2`,
            `${fd(res.sVO)}/t`, "No size scaling — scales 1:1 with throughput", "#f68d2e"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Total OPEX</h3>
          {dataRow("Fixed OPEX", fd(res.sFO) + "/t")}
          {dataRow("Variable OPEX", fd(res.sVO) + "/t")}
          <div style={{ height: 4 }} />
          {dataRow("Total OPEX", fd(res.tOM) + "/t", null, true)}
          {dataRow("Annual OPEX", fd(res.tOM * res.pCO2 / 1e6, 2) + "M/yr")}
        </div>
      </div>

      {flowArrow("OPEX feeds into Total LCOC")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 6: ENERGY COSTS                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(6, "Energy Costs", "#b83a4b", "Electricity and natural gas")}

      <div style={{ display: "grid", gridTemplateColumns: res.hasFuel ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Power Cost</h3>
          {calcCard("Parasitic Power (sPW)",
            `= pw_ref x sR x tF.power\n= ${v ? v.pw.toFixed(2) : 0} MW x ${res.sR.toFixed(4)} x ${tech.power.toFixed(2)}\n= ${res.sPW.toFixed(2)} MW`,
            `${res.sPW.toFixed(2)} MW`, null, "#b83a4b"
          )}
          {calcCard("Annual Power Cost (aPwr)",
            `= sPW x Price x CF x 8,760\n= ${res.sPW.toFixed(2)} MW x $${inp.pp}/MWh\n  x ${cfDec.toFixed(2)} x 8,760\n= $${fm(res.aPwr, 0)}/yr`,
            `$${fd(res.aPwr / 1e6, 2)}M/yr`, `Elec: $${inp.pp}/MWh (from Model Settings)`, "#b83a4b"
          )}
          {calcCard("Power per Tonne",
            `= aPwr / pCO2\n= $${fm(res.aPwr, 0)} / ${fm(res.pCO2, 0)}\n= ${fd(res.pPt)}/t`,
            `${fd(res.pPt)}/t`, null, "#b83a4b"
          )}
        </div>
        {res.hasFuel && (
          <div style={cd}>
            <h3 style={ch}>Fuel Cost</h3>
            {calcCard("Fuel (sFL)",
              `= fuel_ref x (gas_price / base_price)\n= $${res.bfl.toFixed(2)}/t x ($${inp.gp} / $${BASE_GP})\n= ${fd(res.sFL)}/t`,
              `${fd(res.sFL)}/t`, `Gas: $${inp.gp}/MMBtu vs base $${BASE_GP}`, "#93348f"
            )}
          </div>
        )}
      </div>

      {flowArrow("Energy costs feed into Total LCOC")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 7: TOTAL LCOC                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(7, "Total LCOC", "#58b947", "Sum of all cost components")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>LCOC Formula</h3>
          {calcCard("LCOC",
            `= Capital + Fixed OPEX + Var OPEX + Power${res.hasFuel ? " + Fuel" : ""}\n\n= ${fd(res.capC)}\n+ ${fd(res.sFO)}\n+ ${fd(res.sVO)}\n+ ${fd(res.pPt)}${res.hasFuel ? "\n+ " + fd(res.sFL) : ""}\n\n= ${fd(res.total)}/t CO2`,
            `${fd(res.total)}/t CO2`, null, "#58b947"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Cost Breakdown</h3>
          {[
            { n: "Capital Charge", v: res.capC, c: "#58b947", f: "(sTOC x WACC) / pCO2" },
            { n: "Fixed OPEX", v: res.sFO, c: "#58b947", f: "FOM x fS x cR x tF" },
            { n: "Variable OPEX", v: res.sVO, c: "#f68d2e", f: "VOM x cR x tF" },
            { n: "Power", v: res.pPt, c: "#b83a4b", f: "(MW x $/MWh x CF x 8760) / pCO2" },
            ...(res.hasFuel ? [{ n: "Fuel", v: res.sFL, c: "#93348f", f: "fuel x (gp / base)" }] : [])
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderBottom: "1px solid #f0f0f0", background: i % 2 ? "#fafafa" : "#fff" }}>
              <div>
                <span style={{ display: "inline-block", width: 8, height: 8, background: item.c, marginRight: 6, verticalAlign: "middle", borderRadius: 1 }} />
                <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>{item.n}</span>
                <span style={{ fontSize: 8.5, color: "#bbb", marginLeft: 6, fontFamily: "monospace" }}>{item.f}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#333", fontVariantNumeric: "tabular-nums" }}>{fd(item.v)}/t</span>
                <span style={{ fontSize: 9, color: "#aaa", marginLeft: 4 }}>({(item.v / res.total * 100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 8px", borderTop: "2px solid #58b947", marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#58b947" }}>Total LCOC</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#58b947" }}>{fd(res.total)}/t CO2</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ALL INPUTS SUMMARY                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(8, "Input Summary", "#888", "All inputs that went into this row's calculation")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={cd}>
          <h3 style={ch}>From Spreadsheet (per-row)</h3>
          {dataRow("Source (raw)", row[Object.keys(row).find(k => !k.startsWith("_") && !["CAPEX $MM", "Capital $/t", "Fixed OPEX $/t", "Variable OPEX $/t", "Power $/t", "Nat Gas $/t", "LCOC $/t", "CO2 Captured tpa", "sR", "CEPCI Ratio", "Location Factor", "Cap Scale (0.6)", "WACC %", "Elec $/MWh", "Gas $/MMBtu", "CF"].includes(k)) || ""] || "—")}
          {dataRow("Source (resolved)", inp.srcName)}
          {dataRow("State (resolved)", inp.stCode)}
          {dataRow("CO2 from spreadsheet", hasCustomCO2 ? fm(inp.rawCO2, 0) + " t/yr" : "— (not provided)")}
        </div>
        <div style={cd}>
          <h3 style={ch}>From Model Settings (shared)</h3>
          {dataRow("Capture Rate", inp.crCustom + "%")}
          {dataRow("Build Type", inp.bt)}
          {dataRow("Technology", techName)}
          {dataRow("Cost Year", inp.yr)}
          {dataRow("Capacity Factor", cfPct + "%")}
          {dataRow("WACC", (inp.discountRate * 100).toFixed(2) + "%")}
        </div>
        <div style={cd}>
          <h3 style={ch}>Prices (shared)</h3>
          {dataRow("Electricity", "$" + inp.pp + "/MWh")}
          {dataRow("Natural Gas", "$" + inp.gp + "/MMBtu")}
          {dataRow("Base Gas (NETL)", "$" + BASE_GP + "/MMBtu")}
        </div>
      </div>
    </div>
  );
}
