import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { SC, CEPCI, LF, BASE_GP, NETL_FIN, NETL_DEFAULT, MACRS, CDR_TYPES, AVOID_TYPES, EMIT_FACTORS } from '../constants';
import { fm, fd, hhStripPrice } from '../utils/helpers';
import { cd, ch } from '../utils/styles';

export default function ModelTab({
  res, src, cr, bt, st, yr, pp, ppO, gp, gpO, codYear,
  use45Q, q45Duration, q45Inflation, q45StartYear,
  useCDRCredit, cdrCreditRate, cdrCreditType,
  useAvoidCredit, avoidCreditRate, avoidCreditType, vcmDuration,
  use48C, itcPct, grantAmt,
  fedTax, stateTax, deprMethod, projLife,
  useFixedHurdle, debtPct, costDebt, costEquity, mode,
  heatRateBtu, plantMW, plantCFpct, hasCombustion, derivedCO2,
  lastInputBox
}) {
  if (!res) return null;

  const v = res.vd;
  const tech = res.tF || { capex: 1, opex: 1, power: 1 };
  const techName = tech.n || "Amine (MEA)";

  // ═══════════════════════════════════════════════════════
  // STYLE HELPERS
  // ═══════════════════════════════════════════════════════

  // Section header with step number
  const stepHeader = (num, title, color, sub) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: num === 1 ? 0 : 20 }}>
      <div style={{ minWidth: 28, height: 28, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, borderRadius: 2 }}>
        {num}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, height: 1, background: color + "44" }} />
    </div>
  );

  // Calculation card — shows formula with actual numbers
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
          {isInput && <span style={{ marginLeft: 6, fontSize: 9, background: "#fff3cc", color: "#c47d00", padding: "1px 5px", borderRadius: 2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>user input</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{result}</div>
      </div>
      <div style={{
        fontFamily: "'Courier New', monospace", fontSize: 10.5, color: "#666",
        background: isInput ? "#fef9e7" : "#f7f7f7", padding: "6px 8px",
        borderRadius: 2, lineHeight: 1.6, whiteSpace: "pre-wrap"
      }}>{formula}</div>
      {note && <div style={{ fontSize: 9, color: "#aaa", marginTop: 4, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );

  // Simple row in a data table
  const dataRow = (label, value, unit, hl, indent) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "4px 0", paddingLeft: indent ? 12 : 0,
      borderBottom: "1px solid #f0f0f0"
    }}>
      <span style={{ fontSize: 10.5, color: hl ? "#58b947" : "#888", fontWeight: hl ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 10.5, color: hl ? "#58b947" : "#333", fontWeight: hl ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>
        {value}{unit ? ` ${unit}` : ""}
      </span>
    </div>
  );

  // Flow arrow between sections
  const flowArrow = (label) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 0", gap: 8 }}>
      <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #ccc" }} />
      {label && <span style={{ fontSize: 9, color: "#aaa", fontStyle: "italic" }}>{label}</span>}
    </div>
  );

  // Reference value tag
  const refTag = (label, value, color) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#fff", border: `1px solid ${color}33`, padding: "2px 8px",
      fontSize: 9.5, marginRight: 4, marginBottom: 3
    }}>
      <span style={{ width: 5, height: 5, background: color, borderRadius: 1 }} />
      <span style={{ color: "#999" }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );

  // ═══════════════════════════════════════════════════════
  // DERIVED VALUES
  // ═══════════════════════════════════════════════════════
  const crDec = parseInt(cr) / 100;
  const cfDec = res.cf;
  const refCF = v ? v.cf : 0.85;
  const efT = EMIT_FACTORS[src] || 0;
  const grossRef = v ? (v.rpc + (v.pw || 0)) : 0;
  const pw = v ? (v.pw || 0) : 0;
  const isCombustion = res.isCombustion;

  return (
    <div>
      {/* ═══════ QUICK SUMMARY BAR ═══════ */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {refTag("Source", src, "#58b947")}
        {refTag("Config", `${cr} ${bt}`, "#58b947")}
        {refTag("Tech", techName, "#93348f")}
        {refTag("CEPCI", `${res.cR.toFixed(3)}x`, "#93348f")}
        {refTag("Location", `${st} ${res.lR.toFixed(3)}x`, "#58a7af")}
        {res.cust && refTag("Scale", `${res.sR.toFixed(3)}x`, "#f68d2e")}
        {refTag("LCOC", `${fd(res.total)}/t`, "#58b947")}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 1: PLANT CAPACITY & CO2 VOLUME                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(1, "Plant Capacity & CO\u2082 Volume", "#58a7af", "Determine plant capacity, CO\u2082 produced, CO\u2082 captured, and size ratio \u2014 these drive all downstream scaling")}

      {(() => {
        const cfPct = (cfDec * 100).toFixed(1);
        const refCfPct = (refCF * 100).toFixed(0);
        const rpc = v ? v.rpc : 0;
        const hr = heatRateBtu;
        const crRef = parseInt(cr) / 100;
        const refCO2Prod = v ? v.rco / crRef : 0;

        // Derived values (same logic as SummaryTab 4-box)
        const plantCapVal = isCombustion ? res.sR * grossRef : res.sR * rpc;
        const plantCapUnit = isCombustion ? "MW gross" : (v ? v.rpu : "units");
        const expOutVal = isCombustion ? plantCapVal * cfDec * 8760 : plantCapVal * cfDec;
        const expOutUnit = isCombustion ? "MWh/yr" : (v ? v.rpu : "units");
        const co2Prod = derivedCO2 > 0 ? derivedCO2 : (crDec > 0 ? res.pCO2 / crDec : 0);
        const co2Capt = res.pCO2;

        // Which box did user enter? null = no custom input (NETL defaults)
        const entered = lastInputBox; // 'plant' | 'expOut' | 'co2Prod' | 'co2Capt' | null

        // Direction labels
        const isEntered = (box) => entered === box;
        const isDerived = (box) => entered && entered !== box;
        const isDefault = !entered && !res.cust;

        // Build the "how was this derived" formula for each box
        // when user enters one value, the other three are back-calculated

        // ── Plant Capacity formulas ──
        let plantCapFormula;
        if (isEntered('plant')) {
          plantCapFormula = `USER ENTERED\n= ${isCombustion ? plantCapVal.toFixed(1) + " " + plantCapUnit : plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1}) + " " + plantCapUnit}`;
        } else if (isEntered('expOut')) {
          plantCapFormula = isCombustion
            ? `DERIVED from Expected Output:\n= Expected Output / (CF x 8,760)\n= ${fm(expOutVal, 0)} / (${cfPct}% x 8,760)\n= ${plantCapVal.toFixed(1)} ${plantCapUnit}`
            : `DERIVED from Expected Output:\n= Expected Output / CF\n= ${expOutVal.toLocaleString('en-US', {maximumFractionDigits: 1})} / ${cfPct}%\n= ${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1})} ${plantCapUnit}`;
        } else if (isEntered('co2Prod')) {
          plantCapFormula = isCombustion
            ? `DERIVED from CO2 Produced:\n= CO2_Prod / (CF x 8,760 x HR x EF)\n= ${fm(co2Prod, 0)}\n  / (${cfPct}% x 8,760 x ${hr.toFixed(3)} x ${(efT*1000).toFixed(2)}/1000)\n= ${plantCapVal.toFixed(1)} ${plantCapUnit}`
            : `DERIVED from CO2 Produced:\n= CO2_Prod x (Ref_Cap x Ref_CF)\n  / (Ref_CO2_Prod x CF)\n= ${fm(co2Prod, 0)} x (${rpc.toLocaleString()} x ${refCfPct}%)\n  / (${fm(refCO2Prod, 0)} x ${cfPct}%)\n= ${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1})} ${plantCapUnit}`;
        } else if (isEntered('co2Capt')) {
          plantCapFormula = isCombustion
            ? `DERIVED from CO2 Captured:\n= (CO2_Capt / CR) / (CF x 8,760 x HR x EF)\n= (${fm(co2Capt, 0)} / ${(crDec*100).toFixed(0)}%)\n  / (${cfPct}% x 8,760 x ${hr.toFixed(3)} x ${(efT*1000).toFixed(2)}/1000)\n= ${plantCapVal.toFixed(1)} ${plantCapUnit}`
            : `DERIVED from CO2 Captured:\n= (CO2_Capt / CR) x (Ref_Cap x Ref_CF)\n  / (Ref_CO2_Prod x CF)\n= (${fm(co2Capt, 0)} / ${(crDec*100).toFixed(0)}%)\n  x (${rpc.toLocaleString()} x ${refCfPct}%)\n  / (${fm(refCO2Prod, 0)} x ${cfPct}%)\n= ${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1})} ${plantCapUnit}`;
        } else {
          plantCapFormula = `NETL REFERENCE (no user input)\n= ${isCombustion ? `${rpc} net + ${pw.toFixed(1)} CCS = ${grossRef.toFixed(1)} ${plantCapUnit}` : `${rpc.toLocaleString()} ${plantCapUnit}`}`;
        }

        // ── Expected Output formulas ──
        let expOutFormula;
        if (isEntered('expOut')) {
          expOutFormula = `USER ENTERED\n= ${fm(expOutVal, 0)} ${expOutUnit}`;
        } else {
          expOutFormula = isCombustion
            ? `DERIVED from Plant Capacity:\n= Plant Cap x CF x 8,760\n= ${plantCapVal.toFixed(1)} MW x ${cfPct}% x 8,760\n= ${fm(expOutVal, 0)} ${expOutUnit}`
            : `DERIVED from Plant Capacity:\n= Plant Cap x CF\n= ${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1})} x ${cfPct}%\n= ${expOutVal.toLocaleString('en-US', {maximumFractionDigits: 1})} ${expOutUnit}`;
        }

        // ── CO2 Produced formulas ──
        let co2ProdFormula;
        if (isEntered('co2Prod')) {
          co2ProdFormula = `USER ENTERED\n= ${fm(co2Prod, 0)} t/yr`;
        } else {
          co2ProdFormula = isCombustion
            ? `DERIVED from Expected Output:\n= Exp Output x Heat Rate x Emission Factor\n= ${fm(expOutVal, 0)} MWh/yr\n  x ${hr.toFixed(3)} MMBtu/MWh\n  x ${(efT*1000).toFixed(2)} kg/MMBtu / 1,000\n= ${fm(co2Prod, 0)} t/yr`
            : `DERIVED from Expected Output:\n= Exp Output x Ref_CO2_Prod / (Ref_Cap x Ref_CF)\n= ${expOutVal.toLocaleString('en-US', {maximumFractionDigits: 1})}\n  x ${fm(refCO2Prod, 0)} / (${rpc.toLocaleString()} x ${refCfPct}%)\n= ${fm(co2Prod, 0)} t/yr`;
        }

        // ── CO2 Captured formulas ──
        let co2CaptFormula;
        if (isEntered('co2Capt')) {
          co2CaptFormula = `USER ENTERED\n= ${fm(co2Capt, 0)} t/yr`;
        } else {
          co2CaptFormula = `DERIVED from CO2 Produced:\n= CO2 Produced x Capture Rate\n= ${fm(co2Prod, 0)} x ${(crDec*100).toFixed(0)}%\n= ${fm(co2Capt, 0)} t/yr`;
        }

        // ── Size Ratio formula ──
        const grossRef2 = rpc + pw;
        const refVal = isCombustion ? grossRef2 : rpc;
        let sRFormula;
        if (isDefault) {
          sRFormula = `= 1.0000 (NETL reference size)\nNo custom input — using reference plant`;
        } else if (isCombustion) {
          sRFormula = `= Plant Cap / NETL Ref Gross MW\n= ${plantCapVal.toFixed(1)} / (${rpc} net + ${pw.toFixed(1)} CCS)\n= ${plantCapVal.toFixed(1)} / ${refVal.toFixed(1)}\n= ${res.sR.toFixed(4)}`;
        } else {
          sRFormula = `= Plant Cap / NETL Ref Cap\n= ${plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 1})} / ${rpc.toLocaleString()}\n= ${res.sR.toFixed(4)}`;
        }

        // Derivation chain label
        const chainLabel = entered
          ? entered === 'plant' ? `You entered Plant Capacity -> Expected Output -> CO2 Produced -> CO2 Captured`
            : entered === 'expOut' ? `You entered Expected Output -> Plant Capacity (back-calc) -> CO2 Produced -> CO2 Captured`
            : entered === 'co2Prod' ? `You entered CO2 Produced -> Plant Capacity (back-calc) -> Expected Output -> CO2 Captured`
            : `You entered CO2 Captured -> CO2 Produced (/ CR) -> Plant Capacity (back-calc) -> Expected Output`
          : `No custom input — all values from NETL reference at ${cfPct}% CF`;

        return (
          <>
            {/* Derivation chain indicator */}
            <div style={{ padding: "6px 10px", background: entered ? "#fff8e1" : "#f5f5f5", border: `1px solid ${entered ? "#ffe082" : "#e0e0e0"}`, borderRadius: 2, marginBottom: 10, fontSize: 10, color: entered ? "#e65100" : "#888" }}>
              <span style={{ fontWeight: 700 }}>Derivation chain: </span>{chainLabel}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
              {/* Column 1: Plant Capacity + CF + Expected Output */}
              <div style={cd}>
                <h3 style={ch}>Plant Capacity</h3>
                {calcCard("Plant Capacity",
                  plantCapFormula,
                  `${isCombustion ? plantCapVal.toFixed(1) + " MW" : plantCapVal.toLocaleString('en-US', {maximumFractionDigits: 0}) + " " + plantCapUnit}`,
                  null, isEntered('plant') ? "#e65100" : "#888", isEntered('plant')
                )}
                {calcCard("Capacity Factor (CF)",
                  `= ${cfPct}%\nRef CF = ${refCfPct}%\nCF ratio = ${cfPct}% / ${refCfPct}% = ${(cfDec / refCF).toFixed(4)}`,
                  `${cfPct}%`,
                  "Fraction of the year the plant operates. CF changes utilization, not equipment size.",
                  "#58a7af"
                )}
                {calcCard("Expected Output",
                  expOutFormula,
                  `${fm(expOutVal, 0)} ${expOutUnit}`,
                  isCombustion
                    ? `Annual gross energy output at ${cfPct}% capacity factor`
                    : `Effective annual throughput at ${cfPct}% utilization`,
                  isEntered('expOut') ? "#e65100" : "#58a7af", isEntered('expOut')
                )}
              </div>

              {/* Column 2: CO2 Produced + CO2 Captured */}
              <div style={cd}>
                <h3 style={ch}>CO2 Volume</h3>
                {calcCard("CO2 Produced",
                  co2ProdFormula,
                  `${fm(co2Prod, 0)} t/yr`,
                  "Total CO2 emitted before capture",
                  isEntered('co2Prod') ? "#e65100" : "#f68d2e", isEntered('co2Prod')
                )}
                {calcCard("CO2 Captured (pCO2)",
                  co2CaptFormula,
                  `${fm(co2Capt, 0)} t/yr`,
                  "The LCOC denominator — all $/t calculations divide by this value",
                  isEntered('co2Capt') ? "#e65100" : "#58b947", isEntered('co2Capt')
                )}
              </div>

              {/* Column 3: Size Ratio */}
              <div style={cd}>
                <h3 style={ch}>Size Ratio (sR)</h3>
                {calcCard("Size Ratio",
                  sRFormula,
                  `${res.sR.toFixed(4)}x`,
                  "How large the user's plant is relative to the NETL reference. Drives CAPEX and OPEX scaling.",
                  "#f68d2e", isDefault
                )}
                <div style={{ fontSize: 9, color: "#999", marginTop: 4, padding: "4px 8px", background: "#f8f8f8", borderRadius: 2 }}>
                  sR = 1.0 means same size as NETL reference.
                  sR &gt; 1.0 means larger. sR &lt; 1.0 means smaller.
                </div>
              </div>

              {/* Column 4: Size-Based Scale Factors */}
              <div style={cd}>
                <h3 style={ch}>Size-Based Scale Factors</h3>
                <div style={{ fontSize: 9, color: "#999", marginBottom: 6 }}>
                  Derived from sR — these are used in CAPEX and OPEX calculations.
                </div>
                {calcCard("CAPEX Scale (cS)",
                  `= sR ^ 0.6   (six-tenths rule)\n= ${res.sR.toFixed(4)} ^ 0.6\n= ${res.cS.toFixed(4)}`,
                  `${res.cS.toFixed(4)}x`,
                  "Economies of scale: 2x plant costs only 1.52x (not 2x)",
                  "#f68d2e"
                )}
                {calcCard("FOM Scale (fS)",
                  `= (1/sR) ^ 0.15\n= (1/${res.sR.toFixed(4)}) ^ 0.15\n= ${res.fS.toFixed(4)}`,
                  `${res.fS.toFixed(4)}x`,
                  "Larger plant = lower $/t fixed cost (same crew, more CO2)",
                  "#f68d2e"
                )}
              </div>
            </div>
          </>
        );
      })()}

      {flowArrow("plant metrics feed into Step 2 (reference data) and Steps 3-7 (cost calculation)")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 2: NETL REFERENCE DATA & CR/BT ADJUSTMENTS       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(2, "NETL Reference Data & CR/BT Adjustments", "#888", `Source: ${src} | Base data from NETL 2018 Baseline Report`)}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>NETL Raw Reference Values (before CR/BT adjustments)</h3>
          <div style={{ fontSize: 9, color: "#aaa", marginBottom: 8 }}>
            Starting values from the NETL Cost & Performance Baseline.
            All costs are in 2018 USD at the reference plant size.
          </div>
          {dataRow("Total Installed Cost (TIC)", `$${v?._raw ? v._raw.tic.toFixed(3) : (v ? v.tic.toFixed(3) : 0)}M`, null)}
          {dataRow("Total Overnight Cost (TOC)", `$${v?._raw ? v._raw.toc.toFixed(3) : (v ? v.toc.toFixed(3) : 0)}M`, null)}
          {dataRow("Owner's Costs", `$${v?._raw ? (v._raw.toc - v._raw.tic).toFixed(3) : (v ? (v.toc - v.tic).toFixed(3) : 0)}M`, "(TOC - TIC)")}
          <div style={{ height: 6 }} />
          {dataRow("Reference CO2 Captured", `${fm(v?._raw ? v._raw.rco : (v ? v.rco : 0), 0)}`, "t/yr")}
          {dataRow("Reference Capacity Factor", `${((v ? v.cf : 0.85) * 100).toFixed(0)}%`, null)}
          {dataRow("Reference Plant Capacity", `${v ? v.rpc?.toLocaleString() : "—"}`, v?.rpu || "")}
          {dataRow("Base State", v ? v.bs : "LA", null)}
          <div style={{ height: 6 }} />
          {dataRow("Fixed OPEX (FOM)", `$${v?._raw ? v._raw.fo.toFixed(2) : (v ? v.fo.toFixed(2) : 0)}`, "/t CO2")}
          {dataRow("Variable OPEX (VOM)", `$${v?._raw ? v._raw.vo.toFixed(2) : (v ? v.vo.toFixed(2) : 0)}`, "/t CO2")}
          {dataRow("Parasitic Power", `${v?._raw ? v._raw.pw.toFixed(2) : (v ? pw.toFixed(2) : 0)}`, "MW")}
          {res.hasFuel && dataRow("Fuel Cost", `$${res.bfl.toFixed(2)}`, "/t CO2")}
          {dataRow("Available Capture Rates", v ? v.cr?.join(", ") : "—", null)}
          {dataRow("Available Build Types", v ? v.bt?.join(", ") : "—", null)}
        </div>

        <div style={cd}>
          <h3 style={ch}>Capture Rate & Build Type Adjustments</h3>
          <div style={{ fontSize: 9, color: "#aaa", marginBottom: 8 }}>
            Adjusts NETL reference costs for the user's capture rate and build type
            using thermodynamic relationships. All factors = 1.0 when CR/BT match NETL exactly.
          </div>

          {(() => {
            // Use authoritative raw base and adjustment factors from gv()
            const rawS = SC[src];
            if (!rawS || !v?._raw || !v?._adj) return null;
            const raw = v._raw;
            const a = v._adj;
            const crNum = parseInt(cr);
            const thermoBase = a.hasCR ? 1 : -Math.log(1 - a.baseCRNum / 100);
            const thermoNew = a.hasCR ? 1 : -Math.log(1 - crNum / 100);

            return (
              <>
                {/* CR Match Status */}
                {calcCard("Capture Rate",
                  `User CR:  ${crNum}%\nNETL CR:  ${a.baseCRNum}% (available: ${rawS.cr?.join(", ") || "—"})`,
                  `${crNum}%`,
                  null, a.hasCR ? "#4aa63b" : "#f68d2e"
                )}

                {/* Thermodynamic Ratio */}
                {calcCard("Thermodynamic Difficulty Ratio",
                  a.hasCR
                    ? `CR matches NETL data exactly\nthermoRatio = 1.0000 (no interpolation needed)`
                    : `Minimum separation work = -ln(1 - CR/100)\n\nthermoBase = -ln(1 - ${a.baseCRNum}/100)\n           = -ln(${(1-a.baseCRNum/100).toFixed(4)})\n           = ${thermoBase.toFixed(4)}\n\nthermoNew  = -ln(1 - ${crNum}/100)\n           = -ln(${(1-crNum/100).toFixed(4)})\n           = ${thermoNew.toFixed(4)}\n\nthermoRatio = ${thermoNew.toFixed(4)} / ${thermoBase.toFixed(4)}\n            = ${a.thermoRatio.toFixed(4)}`,
                  a.thermoRatio.toFixed(4),
                  "Ratio of thermodynamic work: deeper capture is exponentially harder. -ln(0.01)/-ln(0.10) = 2.0",
                  "#f68d2e"
                )}

                {/* CO2 Volume Adjustment */}
                {calcCard("CO2 Volume Adjustment (rcoAdj)",
                  a.hasCR
                    ? `CR matches exactly\nrcoAdj = 1.0000`
                    : `CO2 captured scales linearly with capture rate:\n\nrcoAdj = userCR / baseCR\n       = ${crNum} / ${a.baseCRNum}\n       = ${a.rcoAdj.toFixed(4)}`,
                  `${a.rcoAdj.toFixed(4)}x`,
                  `Applied to: rco (${fm(raw.rco, 0)} -> ${fm(raw.rco * a.rcoAdj, 0)} t/yr)`,
                  "#58a7af"
                )}

                {/* CAPEX Adjustment */}
                {calcCard("CAPEX Adjustment (crCapexAdj)",
                  `crCapexAdj = 1.0000\n\nEquipment is sized for CO2 produced (total gas flow),\nnot capture rate. Changing CR doesn't change equipment\nsize — it changes how hard the equipment runs\n(energy, solvent, chemicals).`,
                  `${a.crCapexAdj.toFixed(4)}x`,
                  `CAPEX unchanged by CR — only btAdj (${a.btAdj.toFixed(4)}) applies to tic/toc`,
                  "#58b947"
                )}

                {/* Fixed OPEX Adjustment */}
                {calcCard("Fixed OPEX Adjustment (crFomAdj)",
                  a.hasCR
                    ? `CR matches exactly\ncrFomAdj = 1.0000`
                    : `Total fixed costs are constant (same equipment, crew).\nLess CO2 captured -> higher per-tonne fixed cost:\n\ncrFomAdj = 1 / rcoAdj\n         = 1 / ${a.rcoAdj.toFixed(4)}\n         = ${a.crFomAdj.toFixed(4)}`,
                  `${a.crFomAdj.toFixed(4)}x`,
                  `Applied to: fo ($${raw.fo.toFixed(2)}/t -> $${(raw.fo * a.crFomAdj).toFixed(2)}/t)`,
                  "#58b947"
                )}

                {/* Variable OPEX Adjustment */}
                {calcCard("Variable OPEX Adjustment (crVomAdj)",
                  a.hasCR
                    ? `CR matches exactly\ncrVomAdj = 1.0000`
                    : `Solvent degradation and chemical consumption scale\nwith thermodynamic difficulty (dampened by 0.2 exponent):\n\ncrVomAdj = thermoRatio ^ 0.2\n         = ${a.thermoRatio.toFixed(4)} ^ 0.2\n         = ${a.crVomAdj.toFixed(4)}`,
                  `${a.crVomAdj.toFixed(4)}x`,
                  `Applied to: vo ($${raw.vo.toFixed(2)}/t -> $${(raw.vo * a.crVomAdj * a.btAdj).toFixed(2)}/t)`,
                  "#f68d2e"
                )}

                {/* Power Adjustment */}
                {calcCard("Power Adjustment (pwAdj)",
                  a.hasCR
                    ? `CR matches exactly\npwAdj = 1.0000`
                    : `Reboiler duty + compression scale with thermodynamic\ndifficulty (dampened by 0.4 exponent for heat integration):\n\npwAdj = thermoRatio ^ 0.4\n      = ${a.thermoRatio.toFixed(4)} ^ 0.4\n      = ${a.pwAdj.toFixed(4)}`,
                  `${a.pwAdj.toFixed(4)}x`,
                  `Applied to: pw (${raw.pw.toFixed(2)} MW -> ${(raw.pw * a.pwAdj).toFixed(2)} MW)`,
                  "#b83a4b"
                )}

                {/* Build Type Adjustment */}
                {calcCard("Build Type Adjustment (btAdj)",
                  `User BT:  ${bt}\nNETL BT:  ${a.baseBT} (available: ${rawS.bt?.join(", ") || "—"})\n\n${a.hasBT
                    ? `BT matches exactly\nbtAdj = 1.0000`
                    : bt === "Greenfield"
                      ? `Greenfield is cheaper than Retrofit (no demolition,\nno tie-ins to existing equipment):\nbtAdj = 0.93 (-7%)`
                      : `Retrofit is more expensive than Greenfield\n(demolition, tie-ins, space constraints):\nbtAdj = 1.08 (+8%)`}`,
                  `${a.btAdj.toFixed(4)}x`,
                  `Applied to: tic, toc (CAPEX), fo (Fixed OPEX), vo (Variable OPEX)`,
                  a.hasBT ? "#4aa63b" : "#93348f"
                )}

                {/* Summary Table */}
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8f5ff", border: "1px solid #d1c4e9", borderRadius: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6a1b9a", marginBottom: 6 }}>Adjustment Factor Summary</div>
                  {dataRow("rcoAdj (CO2 volume)", `${a.rcoAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("crCapexAdj (CAPEX)", `${a.crCapexAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("crFomAdj (Fixed OPEX)", `${a.crFomAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("crVomAdj (Variable OPEX)", `${a.crVomAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("pwAdj (Power)", `${a.pwAdj.toFixed(4)}x`, null, !a.hasCR)}
                  {dataRow("btAdj (Build Type)", `${a.btAdj.toFixed(4)}x`, null, !a.hasBT)}
                </div>

                {/* Before/After Comparison */}
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0faf0", border: "1px solid #c8e6c9", borderRadius: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#58b947", marginBottom: 6 }}>NETL Raw vs Adjusted Values</div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: "2px 8px", fontSize: 10 }}>
                    <div style={{ fontWeight: 700, color: "#888" }}>Field</div>
                    <div style={{ fontWeight: 700, color: "#888", textAlign: "right" }}>NETL Raw</div>
                    <div style={{ fontWeight: 700, color: "#888", textAlign: "right" }}>Factor</div>
                    <div style={{ fontWeight: 700, color: "#58b947", textAlign: "right" }}>Adjusted</div>

                    <div style={{ color: "#666" }}>TIC</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${raw.tic.toFixed(3)}M</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#93348f" }}>x{(a.crCapexAdj * a.btAdj).toFixed(4)}</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#58b947" }}>${(raw.tic * a.crCapexAdj * a.btAdj).toFixed(3)}M</div>

                    <div style={{ color: "#666" }}>TOC</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${raw.toc.toFixed(3)}M</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#93348f" }}>x{(a.crCapexAdj * a.btAdj).toFixed(4)}</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#58b947" }}>${(raw.toc * a.crCapexAdj * a.btAdj).toFixed(3)}M</div>

                    <div style={{ color: "#666" }}>FOM</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${raw.fo.toFixed(2)}/t</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#93348f" }}>x{(a.crFomAdj * a.btAdj).toFixed(4)}</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#58b947" }}>${(raw.fo * a.crFomAdj * a.btAdj).toFixed(2)}/t</div>

                    <div style={{ color: "#666" }}>VOM</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${raw.vo.toFixed(2)}/t</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#93348f" }}>x{(a.crVomAdj * a.btAdj).toFixed(4)}</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#58b947" }}>${(raw.vo * a.crVomAdj * a.btAdj).toFixed(2)}/t</div>

                    <div style={{ color: "#666" }}>Power</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{raw.pw.toFixed(2)} MW</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#93348f" }}>x{a.pwAdj.toFixed(4)}</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#58b947" }}>{(raw.pw * a.pwAdj).toFixed(2)} MW</div>

                    <div style={{ color: "#666" }}>CO2</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fm(raw.rco, 0)} t/yr</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#93348f" }}>x{a.rcoAdj.toFixed(4)}</div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#58b947" }}>{fm(Math.round(raw.rco * a.rcoAdj), 0)} t/yr</div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {flowArrow("adjusted reference data and plant metrics feed into Steps 3-7")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 3: OTHER SCALING FACTORS                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(3, "Cost Scaling Factors", "#93348f", "CEPCI (time), location, and technology adjustments — independent of plant size")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>CEPCI Escalation (cR)</h3>
          {calcCard("CEPCI Ratio",
            `= CEPCI[${yr}] / CEPCI[2018]\n= ${CEPCI[yr] || CEPCI[2026]} / ${CEPCI[2018]}\n= ${res.cR.toFixed(4)}`,
            `${res.cR.toFixed(4)}x`,
            `Inflates 2018 USD to ${yr} USD using Chemical Engineering Plant Cost Index`,
            "#93348f"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Location Factor (lR)</h3>
          {calcCard("Location Ratio",
            `= LF[${st}] / LF[${v ? v.bs : "LA"}]\n= ${(LF[st] ? LF[st].f.toFixed(3) : "1.000")} / ${(v && LF[v.bs] ? LF[v.bs].f.toFixed(3) : "0.970")}\n= ${res.lR.toFixed(4)}`,
            `${res.lR.toFixed(4)}x`,
            `${LF[st] ? LF[st].n : st} vs ${v ? v.bs : "LA"} construction cost ratio`,
            "#58a7af"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Technology (tF)</h3>
          {calcCard("Tech Multipliers",
            `Technology: ${techName}\n\nCAPEX mult = ${tech.capex.toFixed(2)}\nOPEX mult  = ${tech.opex.toFixed(2)}\nPower mult = ${tech.power.toFixed(2)}`,
            techName,
            "Multipliers relative to baseline Amine (MEA) = 1.00",
            "#93348f"
          )}
        </div>
      </div>

      {flowArrow("all scaling factors (cS, fS, cR, lR, tF) feed into CAPEX and OPEX")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 4: CAPEX                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(4, "CAPEX & Capital Charge", "#58b947", "Scale reference costs and annualize with WACC")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Scaled CAPEX</h3>

          {calcCard("Reference TIC (rT)",
            `= TIC_adjusted x 1,000,000\n= $${v ? v.tic.toFixed(3) : 0}M x 1e6\n= $${fm(res.rT, 0)}`,
            `$${fm(res.rT, 0)}`,
            null, "#888"
          )}

          {calcCard("Reference Owner's Costs (rOwn)",
            `= (TOC - TIC) x 1,000,000\n= ($${v ? v.toc.toFixed(3) : 0}M - $${v ? v.tic.toFixed(3) : 0}M) x 1e6\n= $${fm(res.rOwn, 0)}`,
            `$${fm(res.rOwn, 0)}`,
            "Pre-production, inventory, financing, land, and other owner expenses", "#888"
          )}

          <div style={{ height: 4 }} />

          {calcCard("Scaled TIC (sT)",
            `= rT x cS x cR x lR x tF.capex\n= $${fm(res.rT, 0)}\n  x ${res.cS.toFixed(4)}  (size scale)\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${res.lR.toFixed(4)}  (location)\n  x ${tech.capex.toFixed(2)}      (tech)\n= $${fm(res.sT, 0)}`,
            `$${fd(res.sT / 1e6, 2)}M`,
            null, "#58b947"
          )}

          {calcCard("Scaled Owner's (sOwn)",
            `= rOwn x cS x cR x lR x tF.capex\n= $${fm(res.rOwn, 0)}\n  x ${res.cS.toFixed(4)}  (size scale)\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${res.lR.toFixed(4)}  (location)\n  x ${tech.capex.toFixed(2)}      (tech)\n= $${fm(res.sOwn, 0)}`,
            `$${fd(res.sOwn / 1e6, 2)}M`,
            null, "#93348f"
          )}

          {calcCard("Total Overnight Cost (sTOC)",
            `= sT + sOwn\n= $${fd(res.sT / 1e6, 2)}M + $${fd(res.sOwn / 1e6, 2)}M\n= $${fd(res.sTOC / 1e6, 2)}M`,
            `$${fd(res.sTOC / 1e6, 2)}M`,
            "Total CAPEX after all scaling adjustments", "#58b947"
          )}

          {(() => {
            const netl = NETL_FIN[src] || NETL_DEFAULT;
            const tascFactor = netl.tascToc;
            const tasc = res.sTOC * tascFactor;
            const idcAmt = tasc - res.sTOC;
            const distStr = netl.capexDist.map((d, i) => `Y${i+1}: ${(d*100).toFixed(0)}%`).join(", ");
            return calcCard("TASC (for cash flow only)",
              `= sTOC x TASC/TOC factor\n= $${fd(res.sTOC / 1e6, 2)}M x ${tascFactor.toFixed(3)}\n= $${fd(tasc / 1e6, 2)}M\n\nIDC = $${fd(idcAmt / 1e6, 2)}M\nConstruction: ${netl.constructionYrs} yrs (${distStr})`,
              `$${fd(tasc / 1e6, 2)}M`,
              "Total As-Spent Capital — includes escalation + interest during construction. Used in cash flow projection, NOT in LCOC.",
              "#b83a4b"
            );
          })()}
        </div>

        <div style={cd}>
          <h3 style={ch}>Capital Charge ($/t CO2)</h3>

          {calcCard("WACC (Discount Rate)",
            `Debt:   ${debtPct}% x ${costDebt.toFixed(2)}% = ${(debtPct / 100 * costDebt).toFixed(3)}%\nEquity: ${100 - debtPct}% x ${costEquity.toFixed(1)}%  = ${((100 - debtPct) / 100 * costEquity).toFixed(3)}%\n\nWACC = ${(debtPct / 100 * costDebt).toFixed(3)} + ${((100 - debtPct) / 100 * costEquity).toFixed(3)}\n     = ${(res.discountRate * 100).toFixed(3)}%`,
            `${(res.discountRate * 100).toFixed(2)}%`,
            useFixedHurdle ? `Overridden by fixed hurdle rate` : "Weighted Average Cost of Capital",
            "#58a7af"
          )}

          <div style={{ height: 4 }} />

          {calcCard("Capital Charge",
            `= (sTOC x WACC) / pCO2\n\n= ($${fd(res.sTOC / 1e6, 2)}M x ${(res.discountRate * 100).toFixed(2)}%)\n  / ${fm(res.pCO2, 0)} t/yr\n\n= $${fm(res.sTOC * res.discountRate, 0)}/yr\n  / ${fm(res.pCO2, 0)} t/yr\n\n= ${fd(res.capC)}/t CO2`,
            `${fd(res.capC)}/t`,
            "Annual capital cost per tonne of CO2 captured",
            "#58b947"
          )}

          <div style={{ marginTop: 12, padding: "8px 10px", background: "#f8f8f8", border: "1px solid #e8e8e8", borderRadius: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 4 }}>CAPEX Per-Tonne Breakdown</div>
            {dataRow("TIC per tonne", fd(res.tpt) + "/t", null)}
            {dataRow("Owner's per tonne", fd(res.opt) + "/t", null)}
            {dataRow("TOC per tonne", fd(res.tocpt) + "/t", null)}
            {dataRow("Capital Charge", fd(res.capC) + "/t", null, true)}
          </div>
        </div>
      </div>

      {flowArrow("Capital Charge feeds into Total LCOC")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 5: OPEX                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(5, "Operating Costs (OPEX)", "#f68d2e", "Fixed and variable operating expenses scaled from NETL reference")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Fixed OPEX ($/t CO2)</h3>
          {calcCard("Fixed OPEX (sFO)",
            `= FOM_ref x fS x cR x tF.opex\n\n= $${v ? v.fo.toFixed(2) : 0}/t\n  x ${res.fS.toFixed(4)}  (size scale)\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${tech.opex.toFixed(2)}      (tech)\n\n= ${fd(res.sFO)}/t CO2`,
            `${fd(res.sFO)}/t`,
            "Labor, maintenance materials, admin, insurance, taxes",
            "#58b947"
          )}
          {dataRow("Annual Fixed OPEX", fd(res.sFO * res.pCO2 / 1e6, 2) + "M", "/yr")}
        </div>

        <div style={cd}>
          <h3 style={ch}>Variable OPEX ($/t CO2)</h3>
          {calcCard("Variable OPEX (sVO)",
            `= VOM_ref x cR x tF.opex\n\n= $${v ? v.vo.toFixed(2) : 0}/t\n  x ${res.cR.toFixed(4)}  (CEPCI)\n  x ${tech.opex.toFixed(2)}      (tech)\n\n= ${fd(res.sVO)}/t CO2`,
            `${fd(res.sVO)}/t`,
            "Solvent make-up, chemicals, water treatment, waste. No size scaling (fS) — scales 1:1 with throughput.",
            "#f68d2e"
          )}
          {dataRow("Annual Variable OPEX", fd(res.sVO * res.pCO2 / 1e6, 2) + "M", "/yr")}
        </div>

        <div style={cd}>
          <h3 style={ch}>Total OPEX</h3>
          <div style={{ marginTop: 8 }}>
            {dataRow("Fixed OPEX", fd(res.sFO) + "/t")}
            {dataRow("Variable OPEX", fd(res.sVO) + "/t")}
            <div style={{ height: 4 }} />
            {dataRow("Total OPEX", fd(res.tOM) + "/t", null, true)}
            {dataRow("Annual OPEX", fd(res.tOM * res.pCO2 / 1e6, 2) + "M", "/yr")}
          </div>
        </div>
      </div>

      {flowArrow("OPEX feeds into Total LCOC")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 6: ENERGY COSTS                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(6, "Energy Costs", "#b83a4b", "Electricity and natural gas costs for CCS operation")}

      <div style={{ display: "grid", gridTemplateColumns: res.hasFuel ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Power Cost ($/t CO2)</h3>
          {calcCard("Parasitic Power (sPW)",
            `= pw_ref x sR x tF.power\n= ${v ? v.pw.toFixed(2) : 0} MW x ${res.sR.toFixed(4)} x ${tech.power.toFixed(2)}\n= ${res.sPW.toFixed(2)} MW`,
            `${res.sPW.toFixed(2)} MW`,
            "Power consumed by CCS: fans, pumps, compressor, reboiler",
            "#b83a4b"
          )}
          {calcCard("Annual Power Cost (aPwr)",
            `= sPW x Price x CF x 8,760\n= ${res.sPW.toFixed(2)} MW\n  x $${pp}/MWh\n  x ${cfDec.toFixed(2)} CF\n  x 8,760 hrs/yr\n= $${fm(res.aPwr, 0)}/yr`,
            `$${fd(res.aPwr / 1e6, 2)}M/yr`,
            `Electricity: $${pp}/MWh (${ppO ? "manual entry" : "EIA " + (LF[st] ? LF[st].n : st)})`,
            "#b83a4b"
          )}
          {calcCard("Power per Tonne (pPt)",
            `= aPwr / pCO2\n= $${fm(res.aPwr, 0)} / ${fm(res.pCO2, 0)}\n= ${fd(res.pPt)}/t CO2`,
            `${fd(res.pPt)}/t`,
            null, "#b83a4b"
          )}
        </div>

        {res.hasFuel && (
          <div style={cd}>
            <h3 style={ch}>Fuel Cost ($/t CO2)</h3>
            {calcCard("Fuel Cost (sFL)",
              `= fuel_ref x (gas_price / base_price)\n= $${res.bfl.toFixed(2)}/t\n  x ($${gp} / $${BASE_GP})\n= ${fd(res.sFL)}/t CO2`,
              `${fd(res.sFL)}/t`,
              `Gas: $${gp}/MMBtu (${gpO ? "manual entry" : "Bloomberg strip"}) vs base $${BASE_GP}/MMBtu`,
              "#93348f"
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
          {calcCard("LCOC (Levelized Cost of Capture)",
            `= Capital + Fixed OPEX + Var OPEX + Power${res.hasFuel ? " + Fuel" : ""}\n\n= ${fd(res.capC)}\n+ ${fd(res.sFO)}\n+ ${fd(res.sVO)}\n+ ${fd(res.pPt)}${res.hasFuel ? "\n+ " + fd(res.sFL) : ""}\n\n= ${fd(res.total)}/t CO2`,
            `${fd(res.total)}/t CO2`,
            "All-in levelized cost per tonne of CO2 captured",
            "#58b947"
          )}
        </div>
        <div style={cd}>
          <h3 style={ch}>Cost Breakdown</h3>
          {[
            { n: "Capital Charge", v: res.capC, c: "#58b947", f: `(sTOC x WACC) / pCO2` },
            { n: "Fixed OPEX", v: res.sFO, c: "#58b947", f: `FOM x fS x cR x tF` },
            { n: "Variable OPEX", v: res.sVO, c: "#f68d2e", f: `VOM x cR x tF` },
            { n: "Power", v: res.pPt, c: "#b83a4b", f: `(MW x $/MWh x CF x 8760) / pCO2` },
            ...(res.hasFuel ? [{ n: "Fuel", v: res.sFL, c: "#93348f", f: `fuel x (gp / base)` }] : [])
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 8px", borderBottom: "1px solid #f0f0f0", background: i % 2 ? "#fafafa" : "#fff"
            }}>
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

      {flowArrow("LCOC feeds into Revenue & Project Economics")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 8: CAPITAL STRUCTURE                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(8, "Capital Structure & Financing", "#58a7af", "Tax rates, incentives, and net capital for project economics")}

      {(() => {
        const effTaxM = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
        const itcValM = use48C ? res.sTOC * (itcPct / 100) : 0;
        const grantValM = grantAmt * 1e6;
        const netCapexM = res.sTOC - itcValM - grantValM;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 4 }}>
            <div style={cd}>
              <h3 style={ch}>WACC</h3>
              {calcCard("WACC Calculation",
                `D/E Split: ${debtPct}% / ${100 - debtPct}%\n\n= D% x Kd + E% x Ke\n= ${debtPct}% x ${costDebt.toFixed(2)}%\n+ ${100 - debtPct}% x ${costEquity.toFixed(1)}%\n= ${(res.wacc * 100).toFixed(2)}%`,
                `${(res.wacc * 100).toFixed(2)}%`,
                useFixedHurdle ? `Overridden by fixed hurdle: ${(res.discountRate * 100).toFixed(2)}%` : "Used as discount rate throughout",
                "#58a7af"
              )}
              {dataRow("Cost of Debt (Kd)", costDebt.toFixed(2) + "%")}
              {dataRow("Cost of Equity (Ke)", costEquity.toFixed(1) + "%")}
              {dataRow("Discount Rate", (res.discountRate * 100).toFixed(2) + "%", null, true)}
            </div>
            <div style={cd}>
              <h3 style={ch}>Net CAPEX</h3>
              {calcCard("Net CAPEX",
                `= CAPEX${use48C ? " - ITC" : ""}${grantAmt > 0 ? " - Grant" : ""}\n= $${fd(res.sTOC / 1e6, 2)}M${use48C ? `\n- $${fd(itcValM / 1e6, 2)}M (ITC ${itcPct}%)` : ""}${grantAmt > 0 ? `\n- $${fd(grantValM / 1e6, 2)}M (Grant)` : ""}\n= $${fd(netCapexM / 1e6, 2)}M`,
                `$${fd(netCapexM / 1e6, 2)}M`,
                "Capital outlay after incentives",
                "#93348f"
              )}
              {dataRow("Gross CAPEX", fd(res.sTOC / 1e6, 2) + "M")}
              {use48C && dataRow("ITC (48C)", "-" + fd(itcValM / 1e6, 2) + "M", `${itcPct}%`)}
              {grantAmt > 0 && dataRow("Grant", "-" + fd(grantValM / 1e6, 2) + "M")}
              {dataRow("Net CAPEX", fd(netCapexM / 1e6, 2) + "M", null, true)}
            </div>
            <div style={cd}>
              <h3 style={ch}>Tax Rate</h3>
              {calcCard("Effective Tax Rate",
                `= Fed + State - Fed x State\n= ${fedTax}% + ${stateTax.toFixed(1)}%\n  - ${fedTax}% x ${stateTax.toFixed(1)}%\n= ${(effTaxM * 100).toFixed(1)}%`,
                `${(effTaxM * 100).toFixed(1)}%`,
                "Combined marginal rate (avoids double-taxation)",
                "#f68d2e"
              )}
              {dataRow("Federal Tax", fedTax + "%")}
              {dataRow("State Tax", stateTax.toFixed(1) + "%")}
              {dataRow("Effective Rate", (effTaxM * 100).toFixed(1) + "%", null, true)}
              {dataRow("Project Life", projLife + " yrs")}
              {dataRow("Depreciation", deprMethod)}
            </div>
          </div>
        );
      })()}

      {flowArrow("capital structure feeds into Revenue & NPV")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 9: REVENUE                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(9, "Revenue & Credits", "#58a7af", "Tax credits and carbon market revenue sources")}

      {(() => {
        const srcCat3 = SC[src]?.cat || "Industrial";
        const isDac3 = srcCat3 === "CDR";
        const q45r = use45Q ? (isDac3 ? 180 : 85) : 0;
        const cdrR = useCDRCredit ? cdrCreditRate : 0;
        const avdR = useAvoidCredit ? avoidCreditRate : 0;
        const totRev = q45r + cdrR + avdR;
        const annRev7 = totRev * res.pCO2;
        const margin7 = totRev - res.total;

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <div style={cd}>
              <h3 style={ch}>Revenue Sources</h3>
              {use45Q && calcCard("45Q Tax Credit",
                `= ${isDac3 ? "$180" : "$85"}/t CO2\n${isDac3 ? "(DAC enhanced rate)" : "(Industrial point-source rate)"}\n\nAnnual = $${isDac3 ? 180 : 85}/t x ${fm(res.pCO2, 0)} t\n= $${fd(q45r * res.pCO2 / 1e6, 2)}M/yr`,
                `$${isDac3 ? 180 : 85}/t`,
                `IRC Sec 45Q — ${q45Duration}-year credit, ${q45Inflation}% inflation`,
                "#58b947"
              )}
              {useCDRCredit && calcCard("CDR Credit",
                `= $${cdrR}/t CO2\n\nAnnual = $${cdrR}/t x ${fm(res.pCO2, 0)} t\n= $${fd(cdrR * res.pCO2 / 1e6, 2)}M/yr`,
                `$${cdrR}/t`,
                "Voluntary carbon market — CDR removal credits",
                "#58a7af"
              )}
              {useAvoidCredit && calcCard("Avoidance Credit",
                `= $${avdR}/t CO2\n\nAnnual = $${avdR}/t x ${fm(res.pCO2, 0)} t\n= $${fd(avdR * res.pCO2 / 1e6, 2)}M/yr`,
                `$${avdR}/t`,
                "VCM — industrial avoidance credits",
                "#f68d2e"
              )}
              {totRev === 0 && <div style={{ fontSize: 10, color: "#aaa", padding: "12px 0" }}>No revenue sources enabled.</div>}
              {totRev > 0 && (
                <div style={{ marginTop: 4 }}>
                  {dataRow("Total Revenue", fd(totRev) + "/t", null, true)}
                  {dataRow("Annual Revenue", fd(annRev7 / 1e6, 2) + "M/yr")}
                </div>
              )}
            </div>
            <div style={cd}>
              <h3 style={ch}>Margin Analysis</h3>
              {calcCard("Margin per Tonne",
                `= Revenue - LCOC\n= ${fd(totRev)}/t - ${fd(res.total)}/t\n= ${fd(margin7)}/t CO2`,
                `${fd(margin7)}/t`,
                margin7 >= 0 ? "Project is cash-flow positive per tonne" : "LCOC exceeds revenue per tonne",
                margin7 >= 0 ? "#4aa63b" : "#b83a4b"
              )}
              {dataRow("Revenue", fd(totRev) + "/t")}
              {dataRow("LCOC", fd(res.total) + "/t")}
              {dataRow("Margin", fd(margin7) + "/t", null, true)}
              {dataRow("Annual Margin", fd(margin7 * res.pCO2 / 1e6, 2) + "M/yr")}
            </div>
          </div>
        );
      })()}

      {flowArrow("revenue and costs feed into Project Economics")}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STEP 10: PROJECT ECONOMICS                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {stepHeader(10, "Project Economics (NPV / IRR)", "#4aa63b", "Full project-level financial analysis")}

      {(() => {
        const srcCat4 = SC[src]?.cat || "Industrial";
        const isDac4 = srcCat4 === "CDR";
        const q45r2 = use45Q ? (isDac4 ? 180 : 85) : 0;
        const cdrR2 = useCDRCredit ? cdrCreditRate : 0;
        const avdR2 = useAvoidCredit ? avoidCreditRate : 0;
        const totRev2 = q45r2 + cdrR2 + avdR2;

        const effTax2 = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
        const itcV2 = use48C ? res.sTOC * (itcPct / 100) : 0;
        const grantV2 = grantAmt * 1e6;
        const netCap2 = res.sTOC - itcV2 - grantV2;
        const disc2 = res.discountRate;
        const life2 = projLife;
        const pvAn2 = disc2 > 0 ? (1 - Math.pow(1 + disc2, -life2)) / disc2 : life2;
        const annOp2 = (res.sFO + res.sVO + res.pPt + res.sFL) * res.pCO2;
        const annRev2 = totRev2 * res.pCO2;
        const ebitda2 = annRev2 - annOp2;
        const tax2 = Math.max(0, ebitda2 * effTax2);
        const atCF2 = ebitda2 - tax2;
        const npv2 = -netCap2 + atCF2 * pvAn2;
        let irr2 = 0.10;
        for (let it = 0; it < 50; it++) { let nC = -netCap2, dN = 0; for (let t = 1; t <= life2; t++) { nC += atCF2 / Math.pow(1 + irr2, t); dN -= t * atCF2 / Math.pow(1 + irr2, t + 1); } if (Math.abs(nC) < 1000) break; irr2 -= nC / dN; if (irr2 < -0.5) irr2 = -0.5; if (irr2 > 2) irr2 = 2; }
        const payback = atCF2 > 0 ? netCap2 / atCF2 : null;

        const bisect2 = (fn, lo, hi) => { let fL = fn(lo), fH = fn(hi); if (fL * fH > 0) return null; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Math.abs(hi - lo) < 0.01) return m; const fM = fn(m); if (fM * fL < 0) { hi = m; fH = fM; } else { lo = m; fL = fM; } } return (lo + hi) / 2; };
        const npvAtR = (rpt) => { const eb = rpt * res.pCO2 - annOp2; const cf = eb - Math.max(0, eb * effTax2); return -netCap2 + cf * pvAn2; };
        const beR = totRev2 > 0 ? bisect2(x => npvAtR(x), 0, 2000) : null;

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 4 }}>
            <div style={cd}>
              <h3 style={ch}>Annual Cash Flow</h3>
              {calcCard("EBITDA",
                `= Revenue - OPEX\n= $${fd(annRev2 / 1e6, 2)}M - $${fd(annOp2 / 1e6, 2)}M\n= $${fd(ebitda2 / 1e6, 2)}M/yr`,
                `$${fd(ebitda2 / 1e6, 2)}M/yr`,
                null, "#4aa63b"
              )}
              {calcCard("After-Tax Cash Flow",
                `= EBITDA - Tax\n= $${fd(ebitda2 / 1e6, 2)}M\n- max(0, $${fd(ebitda2 / 1e6, 2)}M x ${(effTax2 * 100).toFixed(0)}%)\n= $${fd(ebitda2 / 1e6, 2)}M - $${fd(tax2 / 1e6, 2)}M\n= $${fd(atCF2 / 1e6, 2)}M/yr`,
                `$${fd(atCF2 / 1e6, 2)}M/yr`,
                null, "#4aa63b"
              )}
              {dataRow("Revenue", fd(annRev2 / 1e6, 2) + "M/yr")}
              {dataRow("OPEX", fd(annOp2 / 1e6, 2) + "M/yr")}
              {dataRow("EBITDA", fd(ebitda2 / 1e6, 2) + "M/yr", null, true)}
              {dataRow("Tax", fd(tax2 / 1e6, 2) + "M/yr", `(${(effTax2 * 100).toFixed(0)}%)`)}
              {dataRow("After-Tax CF", fd(atCF2 / 1e6, 2) + "M/yr", null, true)}
            </div>
            <div style={cd}>
              <h3 style={ch}>NPV & IRR</h3>
              {calcCard("NPV",
                `= -Net_CAPEX + ATCF x PV_annuity\n\nPV_annuity = (1-(1+r)^-n) / r\n= (1-(1+${(disc2*100).toFixed(1)}%)^-${life2}) / ${(disc2*100).toFixed(1)}%\n= ${pvAn2.toFixed(3)}\n\nNPV = -$${fd(netCap2 / 1e6, 2)}M\n    + $${fd(atCF2 / 1e6, 2)}M x ${pvAn2.toFixed(3)}\n    = $${fd(npv2 / 1e6, 2)}M`,
                `$${fd(npv2 / 1e6, 2)}M`,
                null,
                npv2 >= 0 ? "#4aa63b" : "#b83a4b"
              )}
              {dataRow("Net CAPEX", fd(netCap2 / 1e6, 2) + "M")}
              {dataRow("Discount Rate", (disc2 * 100).toFixed(2) + "%")}
              {dataRow("PV Annuity Factor", pvAn2.toFixed(3), `(${life2} yrs)`)}
              {dataRow("NPV", fd(npv2 / 1e6, 2) + "M", null, true)}
              {dataRow("IRR", (irr2 * 100).toFixed(1) + "%", null, true)}
              {payback != null && dataRow("Simple Payback", payback.toFixed(1) + " yrs")}
            </div>
            <div style={cd}>
              <h3 style={ch}>Breakeven (NPV = 0)</h3>
              {totRev2 === 0 ? (
                <div style={{ fontSize: 10, color: "#aaa", padding: "12px 0" }}>Enable revenue sources to see breakevens.</div>
              ) : (
                <>
                  {calcCard("Min Carbon Price",
                    beR != null
                      ? `Revenue needed for NPV = 0:\n= ${fd(beR)}/t CO2\n\nCurrent:  ${fd(totRev2)}/t\nHeadroom: ${totRev2 >= beR ? "+" : ""}${fd(totRev2 - beR)}/t`
                      : "= Not solvable in range",
                    beR != null ? `${fd(beR)}/t` : "N/A",
                    `At ${(disc2 * 100).toFixed(1)}% discount, ${life2}yr life, ${(effTax2 * 100).toFixed(0)}% tax`,
                    beR != null && totRev2 >= beR ? "#4aa63b" : "#b83a4b"
                  )}
                  {dataRow("Min Carbon Price", beR != null ? fd(beR) + "/t" : "—")}
                  {dataRow("Current Revenue", fd(totRev2) + "/t")}
                  {dataRow("Headroom", beR != null ? (totRev2 >= beR ? "+" : "") + fd(totRev2 - beR) + "/t" : "—")}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CASH FLOW PROJECTION                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {(() => {
        const srcCat = SC[src]?.cat || "Industrial";
        const isDac = srcCat === "CDR";

        const netl = NETL_FIN[src] || NETL_DEFAULT;
        const constructionYears = netl.constructionYrs;
        const capexDist = netl.capexDist;
        const projectLife = projLife;
        const totalYears = constructionYears + projectLife;

        const capex = res.sTOC;
        const tascTocFactor = netl.tascToc;
        const totalCapex = capex * tascTocFactor;
        const grantValue = grantAmt * 1e6;
        const annualCO2 = res.pCO2;

        const base45Q = use45Q ? (isDac ? 180 : 85) : 0;
        const effTaxRate = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
        const r = res.discountRate;
        let cumCF = 0;

        const deprKey = deprMethod.replace("MACRS ", "");
        let deprSchedule = [];
        if (deprMethod === "Bonus 100%") {
          deprSchedule = MACRS["bonus"];
        } else if (deprMethod === "Straight-line") {
          deprSchedule = Array(projLife).fill(1 / projLife);
        } else {
          deprSchedule = MACRS[deprKey] || MACRS["7-yr"];
        }
        const itcDepr = use48C ? capex * (itcPct / 100) * 0.5 : 0;
        const deprBasis = capex - itcDepr;

        const cfRows = [];
        for (let i = 0; i < totalYears; i++) {
          let year, phase, capexCF = 0, revenue = 0, fixedOpex = 0, varOpex = 0, powerCost = 0, fuelCost = 0, opex = 0, ebitda = 0, depr = 0, taxableIncome = 0, taxes = 0, netCF = 0, co2Yr = 0;

          if (i < constructionYears) {
            year = "C" + (i + 1);
            phase = "Construction";
            capexCF = -totalCapex * capexDist[i];
            netCF = capexCF;
          } else {
            const opYear = i - constructionYears + 1;
            year = "Y" + opYear;

            let q45Rate = 0;
            const calYear = codYear + (opYear - 1);
            if (use45Q && calYear >= q45StartYear && calYear < q45StartYear + q45Duration) {
              const q45Yr = calYear - q45StartYear;
              q45Rate = base45Q * Math.pow(1 + q45Inflation / 100, q45Yr);
            }

            let cdrRate = 0, avoidRate = 0;
            if (useCDRCredit && opYear <= vcmDuration) cdrRate = cdrCreditRate;
            if (useAvoidCredit && opYear <= vcmDuration) avoidRate = avoidCreditRate;

            co2Yr = annualCO2;
            const yearGP = gpO ? gp : hhStripPrice(calYear, st);
            const yearFL = res.bfl * (yearGP / BASE_GP);
            const totalRevenueRate = q45Rate + cdrRate + avoidRate;
            const yearRevenue = totalRevenueRate * co2Yr;

            phase = "Steady-State";
            revenue = yearRevenue;
            fixedOpex = res.sFO * co2Yr;
            varOpex = res.sVO * co2Yr;
            powerCost = res.pPt * co2Yr;
            fuelCost = yearFL * co2Yr;
            opex = fixedOpex + varOpex + powerCost + fuelCost;
            ebitda = revenue - opex;
            depr = (opYear - 1) < deprSchedule.length ? deprBasis * deprSchedule[opYear - 1] : 0;
            taxableIncome = ebitda - depr;
            taxes = Math.max(0, taxableIncome * effTaxRate);
            netCF = ebitda - taxes;
          }

          cumCF += netCF;
          const discountFactor = Math.pow(1 + r, i + 1);
          const pvCF = netCF / discountFactor;
          const pvCO2 = co2Yr / discountFactor;

          cfRows.push({ year, phase, capex: capexCF, revenue, fixedOpex, varOpex, powerCost, fuelCost, opex, ebitda, depr, taxableIncome, taxes, netCF, cumCF, pvCF, co2Yr, pvCO2, calYear: i < constructionYears ? codYear - constructionYears + i : codYear + (i - constructionYears), yearGP: i >= constructionYears ? (gpO ? gp : hhStripPrice(codYear + (i - constructionYears), st)) : 0 });
        }

        const cellStyle = { padding: "3px 6px", fontSize: 9, borderBottom: "1px solid #f0f0f0", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
        const negStyle = { ...cellStyle, color: "#b83a4b" };
        const posStyle = { ...cellStyle, color: "#4aa63b" };
        const fmtM = (val) => val === 0 ? "—" : (val < 0 ? "(" + fd(Math.abs(val)/1e6, 1) + ")" : fd(val/1e6, 1));
        const thS = { ...cellStyle, fontWeight: 600, color: "#666666", fontSize: 8 };
        const thL = { ...thS, textAlign: "left" };
        const phaseColors = { "Construction": "#fafafa", "Steady-State": "#f0f0f0" };
        const capexDistStr = capexDist.map((d, i) => `Y${i+1}: ${(d*100).toFixed(0)}%`).join(" / ");

        const totalPVCF = cfRows.reduce((sum, rw) => sum + rw.pvCF, 0);
        const totalPVCO2 = cfRows.reduce((sum, rw) => sum + rw.pvCO2, 0);
        const totalCO2 = cfRows.reduce((sum, rw) => sum + rw.co2Yr, 0);
        const pvDollarPerTonne = totalPVCO2 > 0 ? totalPVCF / totalPVCO2 : 0;
        const npv = totalPVCF;
        const paybackYr = cfRows.find(rw => rw.cumCF >= 0 && rw.phase !== "Construction")?.year || "N/A";

        const totalRevRate = (use45Q ? (isDac ? 180 : 85) : 0) + (useCDRCredit ? cdrCreditRate : 0) + (useAvoidCredit ? avoidCreditRate : 0);

        const cdrShort = CDR_TYPES[cdrCreditType]?.name?.split(" ")[0] || "CDR";
        const avoidShort = AVOID_TYPES[avoidCreditType]?.name?.split(" ")[0] || "Avoid";

        return (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>Cash Flow Projection</div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 10, padding: "2px 8px", background: npv >= 0 ? "#e8f5e9" : "#fafafa", color: npv >= 0 ? "#3d8f32" : "#b83a4b", fontWeight: 600 }}>
                  NPV: {npv >= 0 ? "" : "("}{fd(Math.abs(npv)/1e6, 1)}M{npv >= 0 ? "" : ")"}
                </span>
                <span style={{ fontSize: 10, padding: "2px 8px", background: "#fafafa", color: "#93348f", fontWeight: 600 }}>
                  Nominal: {totalCO2 > 0 ? fd(cfRows.reduce((s,rw) => s + rw.netCF, 0) / totalCO2) : "—"}/t
                </span>
                <span style={{ fontSize: 10, padding: "2px 8px", background: pvDollarPerTonne >= 0 ? "#e8f5e9" : "#fafafa", color: pvDollarPerTonne >= 0 ? "#3d8f32" : "#b83a4b", fontWeight: 600 }}>
                  PV $/t: {fd(pvDollarPerTonne)}
                </span>
                <span style={{ fontSize: 10, padding: "2px 8px", background: "#f0f0f0", color: "#666" }}>
                  Payback: {paybackYr}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { l: "Construction", v: `${constructionYears} yr (${capexDistStr})`, c: "#f68d2e" },
                { l: "COD", v: `${codYear}`, c: "#58a7af" },
                { l: "Op. End", v: `${codYear + projectLife}`, c: "#58a7af" },
                { l: "CAPEX (TOC)", v: `${fd(capex/1e6,1)}M`, c: "#93348f" },
                { l: "TASC", v: `${fd(totalCapex/1e6,1)}M (${tascTocFactor.toFixed(3)}x)`, c: "#b83a4b" },
                { l: "Life", v: `${projectLife} yr`, c: "#58b947" },
                { l: "Revenue", v: `$${totalRevRate}/t`, c: "#58b947" },
                { l: "Eff Tax", v: `${(effTaxRate * 100).toFixed(1)}%`, c: "#f68d2e" },
                { l: "Depreciation", v: deprMethod, c: "#93348f" },
                ...(useCDRCredit ? [{ l: cdrShort, v: `$${cdrCreditRate}/t x ${vcmDuration}yr`, c: "#58a7af" }] : []),
                ...(useAvoidCredit ? [{ l: avoidShort, v: `$${avoidCreditRate}/t x ${vcmDuration}yr`, c: "#f68d2e" }] : []),
              ].map((p, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fff", border: "1px solid " + p.c + "33", padding: "2px 6px" }}>
                  <div style={{ width: 4, height: 4, background: p.c }} />
                  <span style={{ fontSize: 8, color: "#aaa" }}>{p.l}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: p.c }}>{p.v}</span>
                </div>
              ))}
            </div>

            {/* TABLE 1: NOMINAL CASH FLOW */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "#93348f", marginBottom: 6 }}>Nominal Cash Flow</div>
            <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    <th style={thL}>Yr</th>
                    <th style={thS}>TASC</th>
                    <th style={thS}>Revenue</th>
                    <th style={thS}>Fix OPEX</th>
                    <th style={thS}>Var OPEX</th>
                    <th style={thS}>Power</th>
                    <th style={thS}>Gas</th>
                    <th style={thS}>EBITDA</th>
                    <th style={thS}>Depr</th>
                    <th style={thS}>Tax Inc</th>
                    <th style={thS}>Taxes</th>
                    <th style={thS}>Net CF</th>
                    <th style={thS}>Cumul</th>
                    <th style={thS}>CO2 (t)</th>
                  </tr>
                  <tr style={{ background: "#fafafa" }}>
                    <th colSpan={14} style={{ ...cellStyle, textAlign: "left", fontSize: 7, color: "#aaa", padding: "1px 4px", borderBottom: "2px solid #93348f" }}>All values in $M except CO2</th>
                  </tr>
                </thead>
                <tbody>
                  {cfRows.map((row, i) => (
                    <tr key={i} style={{ background: phaseColors[row.phase] || "#fff" }}>
                      <td style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#444" }}>{row.year}<span style={{fontSize:7,color:"#aaa",marginLeft:2}}>'{String(row.calYear).slice(-2)}</span></td>
                      <td style={row.capex < 0 ? negStyle : cellStyle}>{fmtM(row.capex)}</td>
                      <td style={cellStyle}>{fmtM(row.revenue)}</td>
                      <td style={cellStyle}>{fmtM(row.fixedOpex)}</td>
                      <td style={cellStyle}>{fmtM(row.varOpex)}</td>
                      <td style={cellStyle}>{fmtM(row.powerCost)}</td>
                      <td style={cellStyle}>{fmtM(row.fuelCost)}</td>
                      <td style={cellStyle}>{fmtM(row.ebitda)}</td>
                      <td style={{ ...cellStyle, color: "#93348f" }}>{fmtM(row.depr)}</td>
                      <td style={cellStyle}>{fmtM(row.taxableIncome)}</td>
                      <td style={cellStyle}>{fmtM(row.taxes)}</td>
                      <td style={row.netCF < 0 ? negStyle : posStyle}>{fmtM(row.netCF)}</td>
                      <td style={row.cumCF < 0 ? negStyle : posStyle}>{fmtM(row.cumCF)}</td>
                      <td style={{ ...cellStyle, color: "#888", fontSize: 7.5 }}>{row.co2Yr > 0 ? fm(Math.round(row.co2Yr), 0) : "—"}</td>
                    </tr>
                  ))}
                  {(() => {
                    const totalNetCF = cfRows.reduce((s,rw) => s + rw.netCF, 0);
                    const totalCapexSum = cfRows.reduce((s,rw) => s + rw.capex, 0);
                    const totalRev = cfRows.reduce((s,rw) => s + rw.revenue, 0);
                    const totalFO = cfRows.reduce((s,rw) => s + rw.fixedOpex, 0);
                    const totalVO = cfRows.reduce((s,rw) => s + rw.varOpex, 0);
                    const totalPwr = cfRows.reduce((s,rw) => s + rw.powerCost, 0);
                    const totalFuel = cfRows.reduce((s,rw) => s + rw.fuelCost, 0);
                    const totalEbitda = cfRows.reduce((s,rw) => s + rw.ebitda, 0);
                    const totalDepr = cfRows.reduce((s,rw) => s + rw.depr, 0);
                    const totalTaxInc = cfRows.reduce((s,rw) => s + rw.taxableIncome, 0);
                    const totalTaxes = cfRows.reduce((s,rw) => s + rw.taxes, 0);
                    const nomDpt = totalCO2 > 0 ? totalNetCF / totalCO2 : 0;
                    return (<>
                      <tr style={{ background: "#fafafa", borderTop: "2px solid #93348f" }}>
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: 700, color: "#333" }}>Total</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#b83a4b" }}>{fmtM(totalCapexSum)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalRev)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalFO)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalVO)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalPwr)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalFuel)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalEbitda)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#93348f" }}>{fmtM(totalDepr)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalTaxInc)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(totalTaxes)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333" }}>{fmtM(totalNetCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: totalNetCF >= 0 ? "#4aa63b" : "#b83a4b" }}>{fmtM(totalNetCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333", fontSize: 7.5 }}>{fm(Math.round(totalCO2), 0)}</td>
                      </tr>
                      <tr style={{ background: "#ede9fe" }}>
                        <td colSpan={12} style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: "#93348f", fontSize: 9 }}>Nominal $/t = Net CF / CO2 =</td>
                        <td colSpan={2} style={{ ...cellStyle, fontWeight: 700, color: nomDpt >= 0 ? "#4aa63b" : "#b83a4b", fontSize: 10 }}>{fd(nomDpt)}/t</td>
                      </tr>
                    </>);
                  })()}
                </tbody>
              </table>
            </div>

            {/* TABLE 2: DISCOUNTED (PV) CASH FLOW */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3d8f32", marginBottom: 6 }}>Discounted Cash Flow (PV @ {(r * 100).toFixed(1)}%)</div>
            <div style={{ overflowX: "auto", border: "1px solid #e0e0e0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    <th style={thL}>Yr</th>
                    <th style={thS}>DF</th>
                    <th style={thS}>TASC</th>
                    <th style={thS}>Revenue</th>
                    <th style={thS}>Fix OPEX</th>
                    <th style={thS}>Var OPEX</th>
                    <th style={thS}>Power</th>
                    <th style={thS}>Gas</th>
                    <th style={thS}>EBITDA</th>
                    <th style={thS}>Depr</th>
                    <th style={thS}>Tax Inc</th>
                    <th style={thS}>Taxes</th>
                    <th style={thS}>Net CF</th>
                    <th style={thS}>Cumul</th>
                    <th style={thS}>CO2 (t)</th>
                  </tr>
                  <tr style={{ background: "#fafafa" }}>
                    <th colSpan={15} style={{ ...cellStyle, textAlign: "left", fontSize: 7, color: "#aaa", padding: "1px 4px", borderBottom: "2px solid #3d8f32" }}>All PV values in $M except CO2 (discounted at {(r * 100).toFixed(1)}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cumPV = 0;
                    return cfRows.map((row, i) => {
                      const df = Math.pow(1 + r, i + 1);
                      const pvCapex = row.capex / df;
                      const pvRev = row.revenue / df;
                      const pvFO = row.fixedOpex / df;
                      const pvVO = row.varOpex / df;
                      const pvPwr = row.powerCost / df;
                      const pvFuel = row.fuelCost / df;
                      const pvEbitda = row.ebitda / df;
                      const pvDepr = row.depr / df;
                      const pvTaxInc = row.taxableIncome / df;
                      const pvTaxes = row.taxes / df;
                      cumPV += row.pvCF;
                      return (
                        <tr key={i} style={{ background: phaseColors[row.phase] || "#fff" }}>
                          <td style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#444" }}>{row.year}<span style={{fontSize:7,color:"#aaa",marginLeft:2}}>'{String(row.calYear).slice(-2)}</span></td>
                          <td style={{ ...cellStyle, color: "#aaa", fontSize: 7.5 }}>{(1/df).toFixed(3)}</td>
                          <td style={pvCapex < 0 ? negStyle : cellStyle}>{fmtM(pvCapex)}</td>
                          <td style={cellStyle}>{fmtM(pvRev)}</td>
                          <td style={cellStyle}>{fmtM(pvFO)}</td>
                          <td style={cellStyle}>{fmtM(pvVO)}</td>
                          <td style={cellStyle}>{fmtM(pvPwr)}</td>
                          <td style={cellStyle}>{fmtM(pvFuel)}</td>
                          <td style={cellStyle}>{fmtM(pvEbitda)}</td>
                          <td style={{ ...cellStyle, color: "#93348f" }}>{fmtM(pvDepr)}</td>
                          <td style={cellStyle}>{fmtM(pvTaxInc)}</td>
                          <td style={cellStyle}>{fmtM(pvTaxes)}</td>
                          <td style={row.pvCF < 0 ? negStyle : posStyle}>{fmtM(row.pvCF)}</td>
                          <td style={cumPV < 0 ? negStyle : posStyle}>{fmtM(cumPV)}</td>
                          <td style={{ ...cellStyle, color: "#888", fontSize: 7.5 }}>{row.pvCO2 > 0 ? fm(Math.round(row.pvCO2), 0) : "—"}</td>
                        </tr>
                      );
                    });
                  })()}
                  <tr style={{ background: "#e8f5e9", borderTop: "2px solid #3d8f32" }}>
                    {(() => {
                      let tCapex=0,tRev=0,tFO=0,tVO=0,tPwr=0,tFuel=0,tEbitda=0,tDepr=0,tTaxInc=0,tTax=0;
                      cfRows.forEach((row,i) => {
                        const df = Math.pow(1+r, i+1);
                        tCapex+=row.capex/df; tRev+=row.revenue/df; tFO+=row.fixedOpex/df; tVO+=row.varOpex/df;
                        tPwr+=row.powerCost/df; tFuel+=row.fuelCost/df; tEbitda+=row.ebitda/df; tDepr+=row.depr/df;
                        tTaxInc+=row.taxableIncome/df; tTax+=row.taxes/df;
                      });
                      return (<>
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: 700, color: "#333" }}>Total</td>
                        <td style={cellStyle}></td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#b83a4b" }}>{fmtM(tCapex)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tRev)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tFO)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tVO)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tPwr)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tFuel)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tEbitda)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#93348f" }}>{fmtM(tDepr)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tTaxInc)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtM(tTax)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333" }}>{fmtM(totalPVCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: totalPVCF >= 0 ? "#4aa63b" : "#b83a4b" }}>{fmtM(totalPVCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333", fontSize: 7.5 }}>{fm(Math.round(totalPVCO2), 0)}</td>
                      </>);
                    })()}
                  </tr>
                  <tr style={{ background: "#bfdbfe" }}>
                    <td colSpan={13} style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: "#3d8f32", fontSize: 9 }}>PV $/t = PV CF / PV CO2 =</td>
                    <td colSpan={2} style={{ ...cellStyle, fontWeight: 700, color: pvDollarPerTonne >= 0 ? "#4aa63b" : "#b83a4b", fontSize: 10 }}>{fd(pvDollarPerTonne)}/t</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, color: "#888" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, background: "#fafafa", border: "1px solid #e0e0e0" }}></span> Construction</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, background: "#f0f0f0", border: "1px solid #e0e0e0" }}></span> Steady-State</div>
            </div>

            {/* OPEX BREAKDOWN CHART */}
            <div style={{ marginTop: 24, padding: "16px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 12 }}>Annual Cost & Revenue Breakdown ($M)</div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={cfRows.filter(rw => rw.phase === "Steady-State").map(rw => ({
                  year: rw.year,
                  "Fixed OPEX": +(rw.fixedOpex / 1e6).toFixed(2),
                  "Var OPEX": +(rw.varOpex / 1e6).toFixed(2),
                  "Power": +(rw.powerCost / 1e6).toFixed(2),
                  "Nat Gas": +(rw.fuelCost / 1e6).toFixed(2),
                  "Taxes": +(rw.taxes / 1e6).toFixed(2),
                  "Revenue": +(rw.revenue / 1e6).toFixed(2),
                  "Net CF": +(rw.netCF / 1e6).toFixed(2)
                }))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 8 }} interval={Math.floor(projLife / 15)} />
                  <YAxis tick={{ fontSize: 8 }} tickFormatter={val => `$${val}`} />
                  <Tooltip formatter={(val) => `$${val}M`} contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="Fixed OPEX" stackId="cost" fill="#58b947" />
                  <Bar dataKey="Var OPEX" stackId="cost" fill="#f68d2e" />
                  <Bar dataKey="Power" stackId="cost" fill="#b83a4b" />
                  <Bar dataKey="Nat Gas" stackId="cost" fill="#93348f" />
                  <Bar dataKey="Taxes" stackId="cost" fill="#888888" />
                  <Line type="monotone" dataKey="Revenue" stroke="#58b947" strokeWidth={2} dot={false} name="Revenue" />
                  <Line type="monotone" dataKey="Net CF" stroke="#4aa63b" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Net CF" />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 8, color: "#aaa", marginTop: 4, textAlign: "center" }}>Stacked bars = total costs (OPEX + Taxes) | Green line = Revenue | Dashed green = Net Cash Flow</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
