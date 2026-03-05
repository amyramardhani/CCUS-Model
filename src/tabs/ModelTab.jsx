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
  heatRateBtu, plantMW, plantCFpct, hasCombustion, derivedCO2
}) {
  if (!res) return null;

  const v = res.vd;

  const fc = (title, formula, note, color) => (
    <div style={{ background: "#ffffff", borderRadius: 0, padding: "12px 14px", borderLeft: "3px solid " + color, border: "1px solid #e0e0e0" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#444444", marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: "Courier New, monospace", fontSize: 11, color: "#666666", whiteSpace: "pre-wrap", lineHeight: 1.5, background: "#f0f0f0", borderRadius: 0, padding: "8px 10px", marginBottom: 6, border: "1px solid #e0e0e0" }}>{formula}</div>
      <div style={{ fontSize: 10, color: "#aaaaaa", lineHeight: 1.4 }}>{note}</div>
    </div>
  );
  const cr2 = (label, value, unit, hl) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #e0e0e0" }}>
      <span style={{ fontSize: 11, color: hl ? "#58b947" : "#aaaaaa", fontWeight: hl ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 11, color: hl ? "#58b947" : "#444444", fontWeight: hl ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>{value}{unit ? " " + unit : ""}</span>
    </div>
  );
  const stg = (num, title, color) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: num === 1 ? 0 : 16 }}>
      <div style={{ width: 24, height: 24, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{num}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#333333" }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: color + "44" }} />
    </div>
  );
  const arrow = () => (
    <div style={{ display: "flex", justifyContent: "center", padding: "4px 0", color: "#cccccc", fontSize: 14, letterSpacing: 2 }}>▼</div>
  );
  const conn = (from, to, color) => (
    <div style={{ fontSize: 9, color: color || "#aaaaaa", padding: "2px 0 2px 12px", borderLeft: "2px solid " + (color || "#e0e0e0"), marginBottom: 2 }}>↳ feeds into {to}</div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { l: src, val: cr + " " + bt, c: "#58b947" },
          { l: "CEPCI", val: res.cR.toFixed(3) + "×", c: "#93348f" },
          { l: "Loc", val: st + " " + res.lR.toFixed(3) + "×", c: "#58a7af" },
          ...(res.cust ? [{ l: "Scale", val: res.sR.toFixed(2) + "×", c: "#f68d2e" }] : []),
          { l: "LCOC", val: fd(res.total) + "/t", c: "#58b947" },
        ].map((p, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#ffffff", border: "1px solid " + p.c + "33", padding: "3px 10px" }}>
            <div style={{ width: 5, height: 5, background: p.c }} />
            <span style={{ fontSize: 10, color: "#aaaaaa" }}>{p.l}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: p.c }}>{p.val}</span>
          </div>
        ))}
      </div>

      {/* ═══════ CALCULATION FLOW MAP ═══════ */}
      {(() => {
        const srcCatF = SC[src]?.cat || "Industrial";
        const isDacF = srcCatF === "CDR";
        const q45F = use45Q ? (isDacF ? 180 : 85) : 0;
        const cdrF = useCDRCredit ? cdrCreditRate : 0;
        const avdF = useAvoidCredit ? avoidCreditRate : 0;
        const totRevF = q45F + cdrF + avdF;

        const effTaxF = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
        const itcF = use48C ? res.sTOC * (itcPct / 100) : 0;
        const grantF = grantAmt * 1e6;
        const netCapF = res.sTOC - itcF - grantF;
        const discF = res.discountRate;
        const lifeF = projLife;
        const pvAnF = discF > 0 ? (1 - Math.pow(1 + discF, -lifeF)) / discF : lifeF;
        const annOpF = (res.sFO + res.sVO + res.pPt + res.sFL) * res.pCO2;
        const annRevF = totRevF * res.pCO2;
        const ebitdaF = annRevF - annOpF;
        const taxF = Math.max(0, ebitdaF * effTaxF);
        const atcfF = ebitdaF - taxF;
        const npvF = -netCapF + atcfF * pvAnF;

        const nd = (label, value, color, w, sub) => (
          <div style={{ background: "#fff", border: "2px solid " + color, padding: "6px 10px", minWidth: w || 120, textAlign: "center", position: "relative" }}>
            <div style={{ fontSize: 8.5, color: "#aaaaaa", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
            {sub && <div style={{ fontSize: 8, color: "#aaaaaa", marginTop: 1 }}>{sub}</div>}
          </div>
        );
        const arrowDown = (color) => (
          <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
            <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid " + (color || "#cccccc") }} />
          </div>
        );
        const vline = (h, color) => (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 2, height: h || 12, background: color || "#cccccc" }} />
          </div>
        );

        return (
          <div style={{ border: "1px solid #e0e0e0", background: "#fafbfc", padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#333333", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#58b947", color: "#fff", padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>FLOW</span>
              Calculation Dependencies
            </div>

            {/* ROW 1: Inputs */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              {nd("NETL Ref Data", "$" + (v ? v.tic : 0) + "M Total Installed Cost", "#888888", 100, fm(v ? v.rco : 0, 0) + " t/yr")}
              {nd("CEPCI", res.cR.toFixed(3) + "×", "#93348f", 80, yr + " vs 2018")}
              {nd("Location", res.lR.toFixed(3) + "×", "#58a7af", 80, st)}
              {nd("Scale", res.cS.toFixed(3) + "×", "#f68d2e", 80, "^0.6 rule")}
              {nd("Elec Price", "$" + pp + "/MWh", "#b83a4b", 85)}
              {res.hasFuel && nd("Gas Price", "Strip", "#93348f", 85)}
              {nd("CF", (res.cf * 100).toFixed(0) + "%", "#58a7af", 55)}
              {hasCombustion && nd("Heat Rate", fm(heatRateBtu, 0) + " Btu/kWh", "#b83a4b", 100, (EMIT_FACTORS[src] || 0).toFixed(5) + " t CO₂/MMBtu")}
            </div>
            {vline(8)}
            {arrowDown("#aaaaaa")}

            {/* ROW 2: Cost Components */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              {nd("CAPEX", fd(res.sTOC / 1e6, 1) + "M", "#58b947", 100, "TIC→CAPEX")}
              {nd("Fixed OPEX", fd(res.sFO) + "/t", "#58b947", 90, "FOM×Scale×CEPCI")}
              {nd("Var OPEX", fd(res.sVO) + "/t", "#f68d2e", 85, "VOM×CEPCI")}
              {nd("Power", fd(res.pPt) + "/t", "#b83a4b", 85, fm(res.sPW, 1) + " MW")}
              {res.hasFuel && nd("Fuel", fd(res.sFL) + "/t", "#93348f", 75, "Gas adj")}
            </div>
            {vline(8)}
            {arrowDown("#aaaaaa")}

            {/* ROW 3: LCOC + Capital Structure side by side */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ background: "#fff", border: "3px solid #58b947", padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#aaaaaa", textTransform: "uppercase", fontWeight: 700, marginBottom: 2 }}>LCOC (Total)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#58b947" }}>{fd(res.total)}/t CO₂</div>
                  <div style={{ fontSize: 8, color: "#888888", marginTop: 2 }}>= Capital({fd(res.capC)}) + OPEX({fd(res.tOM)}) + Power({fd(res.pPt)}){res.hasFuel ? " + Fuel(" + fd(res.sFL) + ")" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {nd("WACC", (res.wacc * 100).toFixed(2) + "%", "#58a7af", 90, debtPct + "/" + (100 - debtPct) + " D/E")}
                {vline(4, "#58a7af")}
                {nd("CCF", (res.ccf * 100).toFixed(2) + "%", "#58a7af", 90, lifeF + "yr life")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {nd("Net CAPEX", fd(netCapF / 1e6, 1) + "M", "#93348f", 100, "CAPEX − ITC − Grant")}
                {vline(4, "#93348f")}
                {nd("Tax Rate", (effTaxF * 100).toFixed(1) + "%", "#93348f", 100, "Fed " + fedTax + "% + State")}
              </div>
            </div>
            {vline(8)}
            {arrowDown("#aaaaaa")}

            {/* ROW 4: Revenue + OPEX → EBITDA */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              {nd("Revenue", fd(totRevF) + "/t", "#58a7af", 90, (use45Q ? "45Q " : "") + (useCDRCredit ? "CDR " : "") + (useAvoidCredit ? "VCM" : "") || "none")}
              <div style={{ display: "flex", alignItems: "center", fontSize: 16, fontWeight: 700, color: "#aaaaaa" }}>−</div>
              {nd("OPEX/t", fd(res.sFO + res.sVO + res.pPt + res.sFL) + "/t", "#888888", 90)}
              <div style={{ display: "flex", alignItems: "center", fontSize: 16, fontWeight: 700, color: "#aaaaaa" }}>=</div>
              {nd("EBITDA", fd(ebitdaF / 1e6, 1) + "M/yr", ebitdaF >= 0 ? "#4aa63b" : "#b83a4b", 100)}
              <div style={{ display: "flex", alignItems: "center", fontSize: 16, fontWeight: 700, color: "#aaaaaa" }}>→</div>
              {nd("After-Tax CF", fd(atcfF / 1e6, 1) + "M/yr", atcfF >= 0 ? "#4aa63b" : "#b83a4b", 105, "− Tax " + (effTaxF * 100).toFixed(0) + "%")}
            </div>
            {vline(8)}
            {arrowDown("#aaaaaa")}

            {/* ROW 5: NPV + IRR */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ background: npvF >= 0 ? "#f0faf0" : "#fef2f2", border: "3px solid " + (npvF >= 0 ? "#4aa63b" : "#b83a4b"), padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#aaaaaa", textTransform: "uppercase", fontWeight: 700, marginBottom: 2 }}>NPV</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: npvF >= 0 ? "#4aa63b" : "#b83a4b" }}>{fd(npvF / 1e6, 1)}M</div>
                <div style={{ fontSize: 8, color: "#888888", marginTop: 2 }}>= −{fd(netCapF / 1e6, 1)}M + {fd(atcfF / 1e6, 1)}M × {pvAnF.toFixed(1)} PVA</div>
              </div>
              {nd("Discount Rate", (discF * 100).toFixed(2) + "%", "#58a7af", 100, useFixedHurdle ? "Fixed hurdle" : "= WACC")}
              {nd("Project Life", lifeF + " yrs", "#58a7af", 85)}
            </div>
          </div>
        );
      })()}

      {/* ─── STAGE 1: REFERENCE DATA ─── */}
      {stg(1, "Reference Data (NETL 2018 Baseline)", "#888888")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Source: {src}</h3>
          {cr2("Ref Total Installed Cost", "$" + (v ? v.tic : 0) + "M")}
          {cr2("Ref CAPEX", "$" + (v ? v.toc : 0) + "M")}
          {cr2("Owner's Costs", fd((v ? v.toc - v.tic : 0)) + "M")}
          {cr2("Reference CO₂", fm(v ? v.rco : 0, 0) + " t/yr")}
          {cr2("Reference CF", ((v ? v.cf : 0.85) * 100).toFixed(0) + "%")}
          {cr2("Base State", v ? v.bs : "LA")}
          {cr2("Fixed OPEX (ref)", fd(v ? v.fo : 0) + "/t")}
          {cr2("Var OPEX (ref)", fd(v ? v.vo : 0) + "/t")}
          {cr2("Power (ref)", fm(v ? v.pw : 0, 1) + " MW")}
          {res.hasFuel && cr2("Fuel (ref)", "$" + res.bfl.toFixed(2) + "/t")}
        </div>
        <div style={cd}>
          <h3 style={ch}>Adjustment Factors</h3>
          {fc("CEPCI Ratio", "= CEPCI[" + yr + "] / CEPCI[2018]\n= " + (CEPCI[yr] || CEPCI[2026]) + " / " + CEPCI[2018] + "\n= " + res.cR.toFixed(4) + "×", "Escalates 2018 → " + yr + " USD", "#93348f")}
          {fc("Location Ratio", "= LF[" + st + "] / LF[" + (v ? v.bs : "LA") + "]\n= " + (LF[st] ? LF[st].f.toFixed(2) : "1.00") + " / " + (v && LF[v.bs] ? LF[v.bs].f.toFixed(2) : "0.97") + "\n= " + res.lR.toFixed(4) + "×", (LF[st] ? LF[st].n : st) + " vs " + (v ? v.bs : "LA"), "#58a7af")}
        </div>
        <div style={cd}>
          <h3 style={ch}>Scaling & Capacity</h3>
          {fc("Scale Factor", "= (Capacity_ratio) ^ 0.6\n= (" + res.sR.toFixed(4) + ") ^ 0.6\n= " + res.cS.toFixed(4) + "×", "Six-tenths rule" + (!res.cust ? " (ref size, no scaling)" : ""), "#f68d2e")}
          {fc("Project CO₂",
            hasCombustion && derivedCO2 > 0
              ? "= Plant_MW × CF × 8,760 × (Heat_Rate / 1,000,000) × Emission_Factor\n= " + fm(plantMW, 0) + " MW × " + (plantCFpct / 100).toFixed(2) + " × 8,760 × (" + fm(heatRateBtu, 0) + " / 1,000,000) × " + (EMIT_FACTORS[src] || 0).toFixed(5) + "\n= " + fm(res.pCO2, 0) + " t/yr"
              : res.cust && mode === "co2"
                ? "= User input = " + fm(res.pCO2, 0) + " t/yr"
                : "= Ref_CO₂ × (CF / Ref_CF)\n= " + fm(v ? v.rco : 0, 0) + " × (" + (res.cf * 100).toFixed(0) + "% / " + ((v ? v.cf : 0.85) * 100).toFixed(0) + "%)\n= " + fm(res.pCO2, 0) + " t/yr",
            hasCombustion && derivedCO2 > 0
              ? "Derived from plant heat rate × emission factor. Emission factor: " + (EMIT_FACTORS[src] || 0).toFixed(5) + " t CO₂/MMBtu (EPA AP-42)"
              : "Annual CO₂ captured",
            "#58a7af")}
        </div>
      </div>
      {conn(null, "Stage 2: CAPEX and Stage 3: OPEX", "#888888")}

      {arrow()}

      {/* ─── STAGE 2: CAPEX ─── */}
      {stg(2, "CAPEX Calculation", "#58b947")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Scaled Installed Cost</h3>
          {fc("Total Installed Cost (Scaled)", "= TotalInstalled_ref × Scale^0.6 × CEPCI × Location\n= $" + (v ? v.tic : 0) + "M × " + res.cS.toFixed(3) + " × " + res.cR.toFixed(3) + " × " + res.lR.toFixed(3) + "\n= " + fd(res.sT / 1e6, 1) + "M", "", "#58b947")}
          {fc("Owner's Costs (Scaled)", "= (CAPEX_ref − TotalInstalled_ref) × Scale^0.6 × CEPCI × Location\n= ($" + (v ? v.toc : 0) + "M − $" + (v ? v.tic : 0) + "M) × " + res.cS.toFixed(3) + " × " + res.cR.toFixed(3) + " × " + res.lR.toFixed(3) + "\n= $" + fd((v ? v.toc - v.tic : 0)) + "M × " + res.cS.toFixed(3) + " × " + res.cR.toFixed(3) + " × " + res.lR.toFixed(3) + "\n= " + fd(res.sOwn / 1e6, 1) + "M", "Preproduction, inventory capital, financing, land, and other owner expenses", "#93348f")}
          {fc("CAPEX", "= Scaled_Total_Installed_Cost + Scaled_Owners\n= " + fd(res.sT / 1e6, 1) + "M + " + fd(res.sOwn / 1e6, 1) + "M\n= " + fd(res.sTOC / 1e6, 1) + "M", "Total CAPEX (Total Installed Cost + Owners)", "#93348f")}
          {(() => {
            const netl = NETL_FIN[src] || NETL_DEFAULT;
            const cYrs = netl.constructionYrs;
            const tascFactor = netl.tascToc;
            const tasc = res.sTOC * tascFactor;
            const idcAmt = tasc - res.sTOC;
            const distStr = netl.capexDist.map((d, i) => "Y" + (i+1) + ": " + (d*100).toFixed(0) + "%").join(", ");
            return (<>
              {fc("TASC/TOC Factor (NETL)", "= " + tascFactor.toFixed(3) + "×\n\nTASC = CAPEX × TASC/TOC\n= " + fd(res.sTOC / 1e6, 1) + "M × " + tascFactor.toFixed(3) + "\n= " + fd(tasc / 1e6, 1) + "M", "Accounts for escalation + interest during construction (IDC) over " + cYrs + "-yr build (" + distStr + "). Source: NETL QGESS Cost Estimation Methodology.", "#b83a4b")}
              {fc("Total As-Spent Capital (TASC)", "= CAPEX + Escalation + IDC\n= " + fd(res.sTOC / 1e6, 1) + "M + " + fd(idcAmt / 1e6, 1) + "M\n= " + fd(tasc / 1e6, 1) + "M", "Used in Cash Flow Projection. IDC = interest on debt (" + netl.costDebt + "%) + return on equity (" + netl.roe + "%) during construction.", "#333333")}
            </>);
          })()}
        </div>
        <div style={cd}>
          <h3 style={ch}>Capital Charge</h3>
          {fc("CCF (Capital Charge Factor)", "= WACC / (1 − (1 + WACC)^−n)\n= " + (res.discountRate * 100).toFixed(2) + "% / (1 − (1 + " + (res.discountRate * 100).toFixed(2) + "%)^−" + projLife + ")\n= " + (res.ccf * 100).toFixed(2) + "%", "Annualizes CAPEX over " + projLife + " yr project life", "#58a7af")}
          {fc("Capital Charge ($/t)", "= (CAPEX × CCF) / CO₂_captured\n= (" + fd(res.sTOC / 1e6, 1) + "M × " + (res.ccf * 100).toFixed(2) + "%) / " + fm(res.pCO2, 0) + "\n= " + fd(res.capC) + "/t CO₂", "", "#58b947")}
        </div>
      </div>
      {conn(null, "Stage 5: LCOC", "#58b947")}

      {arrow()}

      {/* ─── STAGE 3: OPEX ─── */}
      {stg(3, "OPEX Calculation", "#58b947")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Fixed OPEX</h3>
          {fc("Fixed OPEX", "= FOM_ref × Scale_adj × CEPCI × Tech\n= " + fd(v ? v.fo : 0) + " × " + res.fS.toFixed(3) + " × " + res.cR.toFixed(3) + "\n= " + fd(res.sFO) + "/t CO₂", "Scale adj = (1/ratio)^0.15 = " + res.fS.toFixed(4), "#58b947")}
        </div>
        <div style={cd}>
          <h3 style={ch}>Variable OPEX</h3>
          {fc("Variable OPEX", "= VOM_ref × CEPCI × Tech\n= " + fd(v ? v.vo : 0) + " × " + res.cR.toFixed(3) + "\n= " + fd(res.sVO) + "/t CO₂", "No scale adjustment — proportional to throughput", "#f68d2e")}
        </div>
        <div style={cd}>
          <h3 style={ch}>Total OPEX</h3>
          {cr2("Fixed OPEX", fd(res.sFO) + "/t")}
          {cr2("Variable OPEX", fd(res.sVO) + "/t")}
          {cr2("Total OPEX", fd(res.tOM) + "/t", null, true)}
          {cr2("Annual OPEX", fd(res.tOM * res.pCO2 / 1e6, 1) + "M/yr")}
        </div>
      </div>
      {conn(null, "Stage 5: LCOC", "#58b947")}

      {arrow()}

      {/* ─── STAGE 4: ENERGY COSTS ─── */}
      {stg(4, "Energy Costs", "#b83a4b")}
      <div style={{ display: "grid", gridTemplateColumns: res.hasFuel ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>Power Cost</h3>
          {fc("Power ($/t CO₂)", "= (MW × $/MWh × CF × 8,760) / CO₂\n= (" + fm(res.sPW, 1) + " MW × $" + pp + " × " + res.cf.toFixed(2) + " × 8,760) / " + fm(res.pCO2, 0) + "\n= " + fd(res.pPt) + "/t CO₂", "Electricity: $" + pp + "/MWh (" + (ppO ? "manual" : "EIA " + (LF[st] ? LF[st].n : st)) + ")", "#b83a4b")}
          {cr2("Power Demand", fm(res.sPW, 1) + " MW")}
          {cr2("Annual Power Cost", fd(res.aPwr / 1e6, 1) + "M/yr")}
        </div>
        {res.hasFuel && (
          <div style={cd}>
            <h3 style={ch}>Natural Gas Fuel</h3>
            {fc("Fuel ($/t CO₂)", "= Fuel_ref × (Gas_price / Gas_base)\n= $" + res.bfl.toFixed(2) + " × ($" + gp + " / $" + BASE_GP + ")\n= " + fd(res.sFL) + "/t CO₂", "Amine regen steam requirement", "#93348f")}
            {cr2("Gas Price", "Bloomberg Strip (COD " + codYear + ")")}
            {cr2("Base Gas Price", "$" + BASE_GP + "/MMBtu")}
          </div>
        )}
      </div>
      {conn(null, "Stage 5: LCOC", "#b83a4b")}

      {arrow()}

      {/* ─── STAGE 5: LCOC ─── */}
      {stg(5, "Levelized Cost of CO₂ (LCOC)", "#58b947")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={cd}>
          <h3 style={ch}>LCOC Composition</h3>
          {fc("LCOC", "= Capital + Fixed_OPEX + Var_OPEX + Power + Fuel\n= " + fd(res.capC) + " + " + fd(res.sFO) + " + " + fd(res.sVO) + " + " + fd(res.pPt) + (res.hasFuel ? " + " + fd(res.sFL) : "") + "\n= " + fd(res.total) + "/t CO₂", "All-in levelized cost per tonne captured", "#58b947")}
        </div>
        <div style={cd}>
          <h3 style={ch}>Cost Breakdown</h3>
          {[
            { n: "Capital Charge", v: res.capC, c: "#58b947" },
            { n: "Fixed OPEX", v: res.sFO, c: "#58b947" },
            { n: "Variable OPEX", v: res.sVO, c: "#f68d2e" },
            { n: "Power", v: res.pPt, c: "#b83a4b" },
            ...(res.hasFuel ? [{ n: "Fuel", v: res.sFL, c: "#93348f" }] : [])
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span style={{ fontSize: 11, color: "#888888" }}><span style={{ display: "inline-block", width: 6, height: 6, background: item.c, marginRight: 5, verticalAlign: "middle" }} />{item.n}</span>
              <span style={{ fontSize: 11, color: "#444444", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fd(item.v)}/t <span style={{ color: "#aaaaaa", fontWeight: 400, fontSize: 9 }}>({(item.v / res.total * 100).toFixed(0)}%)</span></span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "2px solid #cccccc", marginTop: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#58b947" }}>Total LCOC</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#58b947" }}>{fd(res.total)}/t CO₂</span>
          </div>
        </div>
      </div>
      {conn(null, "Stage 6: Capital Structure & Stage 7: Revenue", "#58b947")}

      {arrow()}

      {/* ─── STAGE 6: CAPITAL STRUCTURE ─── */}
      {stg(6, "Capital Structure & Financing", "#58a7af")}
      {(() => {
        const effTaxM = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
        const itcValM = use48C ? res.sTOC * (itcPct / 100) : 0;
        const grantValM = grantAmt * 1e6;
        const netCapexM = res.sTOC - itcValM - grantValM;
        const discM = res.discountRate;
        const lifeM = projLife;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
            <div style={cd}>
              <h3 style={ch}>WACC</h3>
              {fc("WACC", "= D% × Kd + E% × Ke\n= " + debtPct + "% × " + costDebt.toFixed(2) + "% + " + (100 - debtPct) + "% × " + costEquity.toFixed(1) + "%\n= " + (res.wacc * 100).toFixed(2) + "%", useFixedHurdle ? "Overridden by fixed hurdle: " + (discM * 100).toFixed(2) + "%" : "Used as discount rate", "#58a7af")}
              {cr2("Debt / Equity", debtPct + "% / " + (100 - debtPct) + "%")}
              {cr2("Cost of Debt (Kd)", costDebt.toFixed(2) + "%")}
              {cr2("Cost of Equity (Ke)", costEquity.toFixed(1) + "%")}
              {cr2("WACC", (res.wacc * 100).toFixed(2) + "%", null, true)}
              {useFixedHurdle && cr2("Fixed Hurdle", (res.discountRate * 100).toFixed(2) + "% (overrides WACC)")}
              {cr2("Discount Rate", (discM * 100).toFixed(2) + "%", null, true)}
            </div>
            <div style={cd}>
              <h3 style={ch}>Net CAPEX</h3>
              {fc("Net CAPEX", "= CAPEX − ITC − Grants\n= " + fd(res.sTOC / 1e6, 1) + "M" + (use48C ? " − " + fd(itcValM / 1e6, 1) + "M" : "") + (grantAmt > 0 ? " − " + fd(grantValM / 1e6, 1) + "M" : "") + "\n= " + fd(netCapexM / 1e6, 1) + "M", "Capital outlay after incentives", "#93348f")}
              {cr2("Gross CAPEX", fd(res.sTOC / 1e6, 1) + "M")}
              {use48C && cr2("ITC (48C " + itcPct + "%)", "−" + fd(itcValM / 1e6, 1) + "M")}
              {grantAmt > 0 && cr2("Grant", "−" + fd(grantValM / 1e6, 1) + "M")}
              {cr2("Net CAPEX", fd(netCapexM / 1e6, 1) + "M", null, true)}
            </div>
            <div style={cd}>
              <h3 style={ch}>Tax & Timing</h3>
              {fc("Effective Tax Rate", "= Fed + State − Fed×State\n= " + fedTax + "% + " + stateTax.toFixed(1) + "% − " + fedTax + "×" + stateTax.toFixed(1) + "%\n= " + (effTaxM * 100).toFixed(1) + "%", "Combined marginal rate", "#f68d2e")}
              {cr2("Federal Tax", fedTax + "%")}
              {cr2("State Tax", stateTax.toFixed(1) + "%")}
              {cr2("Effective Rate", (effTaxM * 100).toFixed(1) + "%", null, true)}
              {cr2("Project Life", lifeM + " yrs")}
              {cr2("CCF", (res.ccf * 100).toFixed(2) + "%")}
            </div>
          </div>
        );
      })()}
      {conn(null, "Stage 8: Project Economics", "#58a7af")}

      {arrow()}

      {/* ─── STAGE 7: REVENUE ─── */}
      {stg(7, "Revenue & Credits", "#58a7af")}
      {(() => {
        const srcCat3 = SC[src]?.cat || "Industrial";
        const isDac3 = srcCat3 === "CDR";
        const q45r = use45Q ? (isDac3 ? 180 : 85) : 0;
        const cdrR = useCDRCredit ? cdrCreditRate : 0;
        const avdR = useAvoidCredit ? avoidCreditRate : 0;
        const totRev = q45r + cdrR + avdR;
        const annRev7 = totRev * res.pCO2;
        const margin7 = totRev - res.total;
        const annMargin7 = margin7 * res.pCO2;

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
            <div style={cd}>
              <h3 style={ch}>Revenue</h3>
              {use45Q && fc("45Q Tax Credit", "= " + (isDac3 ? "$180" : "$85") + "/t CO₂" + (isDac3 ? " (DAC rate)" : " (industrial rate)"), "IRC §45Q — 12-year credit window", "#58b947")}
              {useCDRCredit && fc("CDR Credit", "= $" + cdrR + "/t CO₂", "Voluntary carbon market — CDR removal credits", "#58a7af")}
              {useAvoidCredit && fc("Avoidance Credit", "= $" + avdR + "/t CO₂", "VCM — industrial avoidance credits", "#f68d2e")}
              {totRev === 0 && <div style={{ fontSize: 10, color: "#aaaaaa", padding: "8px 0" }}>No revenue sources enabled.</div>}
              {totRev > 0 && (<>
                {cr2("Total per Tonne", fd(totRev) + "/t CO₂", null, true)}
                <div style={{ borderTop: "1px solid #e0e0e0", marginTop: 6, paddingTop: 4 }}>
                  {fc("Annual Revenue", "= Revenue_per_tonne × Annual_CO₂\n= " + fd(totRev) + "/t × " + fm(res.pCO2, 0) + " t/yr\n= " + fd(annRev7 / 1e6, 2) + "M/yr", "", "#58a7af")}
                  {use45Q && cr2("45Q (" + (isDac3 ? "$180" : "$85") + "/t)", fd(q45r * res.pCO2 / 1e6, 2) + "M/yr")}
                  {useCDRCredit && cr2("CDR ($" + cdrR + "/t)", fd(cdrR * res.pCO2 / 1e6, 2) + "M/yr")}
                  {useAvoidCredit && cr2("Avoidance ($" + avdR + "/t)", fd(avdR * res.pCO2 / 1e6, 2) + "M/yr")}
                  {cr2("Total Annual Revenue", fd(annRev7 / 1e6, 2) + "M/yr", null, true)}
                </div>
              </>)}
            </div>
            <div style={cd}>
              <h3 style={ch}>Margin</h3>
              {fc("Margin per Tonne", "= Revenue − LCOC\n= " + fd(totRev) + " − " + fd(res.total) + "\n= " + fd(margin7) + "/t CO₂", margin7 >= 0 ? "Project is cash-flow positive per tonne" : "LCOC exceeds revenue per tonne", "#58a7af")}
              {cr2("Revenue", fd(totRev) + "/t")}
              {cr2("LCOC", fd(res.total) + "/t")}
              {cr2("Margin per Tonne", fd(margin7) + "/t", null, true)}
              <div style={{ borderTop: "1px solid #e0e0e0", marginTop: 6, paddingTop: 4 }}>
                {fc("Annual Margin", "= Margin_per_tonne × Annual_CO₂\n= " + fd(margin7) + "/t × " + fm(res.pCO2, 0) + " t/yr\n= " + fd(annMargin7 / 1e6, 2) + "M/yr", "", margin7 >= 0 ? "#4aa63b" : "#b83a4b")}
                {cr2("Annual Revenue", fd(annRev7 / 1e6, 2) + "M/yr")}
                {cr2("Annual LCOC", fd(res.total * res.pCO2 / 1e6, 2) + "M/yr")}
                {cr2("Annual Margin", fd(annMargin7 / 1e6, 2) + "M/yr", null, true)}
              </div>
            </div>
          </div>
        );
      })()}
      {conn(null, "Stage 8: Project Economics", "#58a7af")}

      {arrow()}

      {/* ─── STAGE 8: PROJECT ECONOMICS ─── */}
      {stg(8, "Project Economics (NPV / IRR)", "#4aa63b")}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
            <div style={cd}>
              <h3 style={ch}>Annual Cash Flow</h3>
              {fc("After-Tax CF", "= EBITDA − Tax\n= (Revenue − OPEX) − max(0, EBITDA × Tax%)\n= (" + fd(annRev2 / 1e6, 1) + "M − " + fd(annOp2 / 1e6, 1) + "M) − " + fd(tax2 / 1e6, 1) + "M\n= " + fd(atCF2 / 1e6, 1) + "M/yr", "", "#4aa63b")}
              {cr2("Annual Revenue", fd(annRev2 / 1e6, 1) + "M")}
              {cr2("Annual OPEX", fd(annOp2 / 1e6, 1) + "M")}
              {cr2("EBITDA", fd(ebitda2 / 1e6, 1) + "M", null, true)}
              {cr2("Tax (" + (effTax2 * 100).toFixed(0) + "%)", fd(tax2 / 1e6, 1) + "M")}
              {cr2("After-Tax CF", fd(atCF2 / 1e6, 1) + "M/yr", null, true)}
            </div>
            <div style={cd}>
              <h3 style={ch}>NPV & IRR</h3>
              {fc("NPV", "= −Net_CAPEX + Σ(After_Tax_CF / (1+r)^t)\n= −" + fd(netCap2 / 1e6, 1) + "M + " + fd(atCF2 / 1e6, 1) + "M × PV_annuity(" + (disc2 * 100).toFixed(1) + "%, " + life2 + "yr)\n= −" + fd(netCap2 / 1e6, 1) + "M + " + fd(atCF2 / 1e6, 1) + "M × " + pvAn2.toFixed(2) + "\n= " + fd(npv2 / 1e6, 1) + "M", "", npv2 >= 0 ? "#4aa63b" : "#b83a4b")}
              {cr2("Net CAPEX", fd(netCap2 / 1e6, 1) + "M")}
              {cr2("Discount Rate", (disc2 * 100).toFixed(2) + "%")}
              {cr2("PV Annuity Factor", pvAn2.toFixed(2) + " (" + life2 + " yrs)")}
              {cr2("NPV", fd(npv2 / 1e6, 1) + "M", null, true)}
              {cr2("IRR", (irr2 * 100).toFixed(1) + "%", null, true)}
              {payback != null && cr2("Simple Payback", payback.toFixed(1) + " yrs")}
            </div>
            <div style={cd}>
              <h3 style={ch}>Breakeven (NPV = 0)</h3>
              {totRev2 === 0 ? (
                <div style={{ fontSize: 10, color: "#aaaaaa", padding: "6px 0" }}>Enable revenue sources to see breakevens.</div>
              ) : (<>
                {fc("Min Carbon Price", beR != null ? "= " + fd(beR) + "/t CO₂\n  Current: " + fd(totRev2) + "/t\n  Headroom: " + (totRev2 >= beR ? "+" : "") + fd(totRev2 - beR) + "/t" : "= Not solvable in range", "Revenue needed for NPV = 0", beR != null && totRev2 >= beR ? "#4aa63b" : "#b83a4b")}
                <div style={{ marginTop: 8 }}>
                  {cr2("Min Carbon Price", beR != null ? fd(beR) + "/t" : "—")}
                  {cr2("Current Revenue", fd(totRev2) + "/t")}
                  {cr2("Headroom", beR != null ? (totRev2 >= beR ? "+" : "") + fd(totRev2 - beR) + "/t" : "—")}
                </div>
                <div style={{ fontSize: 9, color: "#aaaaaa", marginTop: 8, lineHeight: 1.5 }}>
                  At {(disc2 * 100).toFixed(1)}% discount rate, {life2}yr life, {(effTax2 * 100).toFixed(0)}% tax rate.
                </div>
              </>)}
            </div>
          </div>
        );
      })()}

      {/* Cash Flow Projection */}
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

        const revenueStack = [];
        if (use45Q) revenueStack.push(`45Q:$${isDac ? 180 : 85}`);
        if (useCDRCredit) revenueStack.push(`CDR:$${cdrCreditRate}`);
        if (useAvoidCredit) revenueStack.push(`Avoid:$${avoidCreditRate}`);
        const totalRevRate = (use45Q ? (isDac ? 180 : 85) : 0) + (useCDRCredit ? cdrCreditRate : 0) + (useAvoidCredit ? avoidCreditRate : 0);

        const cdrShort = CDR_TYPES[cdrCreditType]?.name?.split(" ")[0] || "CDR";
        const avoidShort = AVOID_TYPES[avoidCreditType]?.name?.split(" ")[0] || "Avoid";

        return (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#333333" }}>Cash Flow Projection</div>
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
                <span style={{ fontSize: 10, padding: "2px 8px", background: "#f0f0f0", color: "#666666" }}>
                  Payback: {paybackYr}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { l: "Construction", v: `${constructionYears} yr`, c: "#f68d2e" },
                { l: "CAPEX (TOC)", v: `${fd(capex/1e6,1)}M`, c: "#93348f" },
                { l: "TASC", v: `${fd(totalCapex/1e6,1)}M (${tascTocFactor.toFixed(3)}×)`, c: "#b83a4b" },
                { l: "Life", v: `${projectLife} yr`, c: "#58b947" },
                { l: "Revenue", v: `$${totalRevRate}/t`, c: "#58b947" },
                { l: "Eff Tax", v: `${(effTaxRate * 100).toFixed(1)}%`, c: "#f68d2e" },
                { l: "Depreciation", v: deprMethod, c: "#93348f" },
                ...(useCDRCredit ? [{ l: cdrShort, v: `$${cdrCreditRate}/t × ${vcmDuration}yr`, c: "#58a7af" }] : []),
                ...(useAvoidCredit ? [{ l: avoidShort, v: `$${avoidCreditRate}/t × ${vcmDuration}yr`, c: "#f68d2e" }] : []),
              ].map((p, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#ffffff", border: "1px solid " + p.c + "33", padding: "2px 6px" }}>
                  <div style={{ width: 4, height: 4, background: p.c }} />
                  <span style={{ fontSize: 8, color: "#aaaaaa" }}>{p.l}</span>
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
                    <th style={thS}>CO₂ (t)</th>
                  </tr>
                  <tr style={{ background: "#fafafa" }}>
                    <th colSpan={14} style={{ ...cellStyle, textAlign: "left", fontSize: 7, color: "#aaaaaa", padding: "1px 4px", borderBottom: "2px solid #93348f" }}>All values in $M except CO₂</th>
                  </tr>
                </thead>
                <tbody>
                  {cfRows.map((row, i) => (
                    <tr key={i} style={{ background: phaseColors[row.phase] || "#fff" }}>
                      <td style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#444444" }}>{row.year}<span style={{fontSize:7,color:"#aaaaaa",marginLeft:2}}>'{String(row.calYear).slice(-2)}</span></td>
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
                      <td style={{ ...cellStyle, color: "#888888", fontSize: 7.5 }}>{row.co2Yr > 0 ? fm(Math.round(row.co2Yr), 0) : "—"}</td>
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
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: 700, color: "#333333" }}>Total</td>
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
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333333" }}>{fmtM(totalNetCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: totalNetCF >= 0 ? "#4aa63b" : "#b83a4b" }}>{fmtM(totalNetCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333333", fontSize: 7.5 }}>{fm(Math.round(totalCO2), 0)}</td>
                      </tr>
                      <tr style={{ background: "#ede9fe" }}>
                        <td colSpan={12} style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: "#93348f", fontSize: 9 }}>Nominal $/t = Net CF ÷ CO₂ =</td>
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
                    <th style={thS}>CO₂ (t)</th>
                  </tr>
                  <tr style={{ background: "#fafafa" }}>
                    <th colSpan={15} style={{ ...cellStyle, textAlign: "left", fontSize: 7, color: "#aaaaaa", padding: "1px 4px", borderBottom: "2px solid #3d8f32" }}>All PV values in $M except CO₂ (discounted at {(r * 100).toFixed(1)}%)</th>
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
                          <td style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#444444" }}>{row.year}<span style={{fontSize:7,color:"#aaaaaa",marginLeft:2}}>'{String(row.calYear).slice(-2)}</span></td>
                          <td style={{ ...cellStyle, color: "#aaaaaa", fontSize: 7.5 }}>{(1/df).toFixed(3)}</td>
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
                          <td style={{ ...cellStyle, color: "#888888", fontSize: 7.5 }}>{row.pvCO2 > 0 ? fm(Math.round(row.pvCO2), 0) : "—"}</td>
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
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: 700, color: "#333333" }}>Total</td>
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
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333333" }}>{fmtM(totalPVCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: totalPVCF >= 0 ? "#4aa63b" : "#b83a4b" }}>{fmtM(totalPVCF)}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: "#333333", fontSize: 7.5 }}>{fm(Math.round(totalPVCO2), 0)}</td>
                      </>);
                    })()}
                  </tr>
                  <tr style={{ background: "#bfdbfe" }}>
                    <td colSpan={13} style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: "#3d8f32", fontSize: 9 }}>PV $/t = PV CF ÷ PV CO₂ =</td>
                    <td colSpan={2} style={{ ...cellStyle, fontWeight: 700, color: pvDollarPerTonne >= 0 ? "#4aa63b" : "#b83a4b", fontSize: 10 }}>{fd(pvDollarPerTonne)}/t</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, color: "#888888" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, background: "#fafafa", border: "1px solid #e0e0e0" }}></span> Construction</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, background: "#f0f0f0", border: "1px solid #e0e0e0" }}></span> Steady-State</div>
            </div>

            {/* OPEX BREAKDOWN CHART */}
            <div style={{ marginTop: 24, padding: "16px", background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#333333", marginBottom: 12 }}>Annual Cost & Revenue Breakdown ($M)</div>
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
              <div style={{ fontSize: 8, color: "#aaaaaa", marginTop: 4, textAlign: "center" }}>Stacked bars = total costs (OPEX + Taxes) · Blue line = Revenue · Dashed green = Net Cash Flow</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
