import { useState, useMemo, useCallback, useEffect } from "react";
import { SC, CEPCI, LF, TECH, EIA, STATE_TAX, BASE_GP, NETL_FIN, NETL_DEFAULT, CDR_TYPES, AVOID_TYPES } from './constants';
import { fm, fd, toMWh, hhStripPrice, bestCreditType } from './utils/helpers';
import { gv, calcLCOC, PP_DEFAULTS } from './utils/engCalculations';
import SummaryTab from './tabs/SummaryTab';
import ModelTab from './tabs/ModelTab';
import ChartsTab from './tabs/ChartsTab';
import SensitivityTab from './tabs/SensitivityTab';
import SimulationTab from './tabs/SimulationTab';
import AssumptionsTab from './tabs/AssumptionsTab';
import BatchRunTab from './tabs/BatchRunTab';
import BatchModelTab from './tabs/BatchModelTab';

const CX_LABELS = {fg:"Flue Gas Cleanup",fw:"Feedwater & BOP",ds:"Ductwork & Stack",cw:"Cooling Water",el:"Electrical",ic:"I&C",si:"Site Improvements",bd:"Buildings",st:"Steam Turbine",ac:"Air Contactor",th:"Thermal System",ed:"Electrodialysis"};
const EMIT_FACTORS = {"NGCC F-Frame":0.05306,"NGCC H-Frame":0.05306,"Coal SC":0.09552,"Coal Sub-C":0.09552,"Biomass":0};

export default function CCUSDashboard() {
  const [src, setSrc] = useState("Ammonia");
  const [crCustom, setCrCustom] = useState(90);
  const [bt, setBt] = useState("Retrofit");
  const [tech, setTech] = useState("amine");
  const [st, setSt] = useState("TX");
  const [yr, setYr] = useState(2025);
  const [mode, setMode] = useState("co2");
  const [co2Cap, setCo2Cap] = useState("");
  const [plCap, setPlCap] = useState("");
  const [pp, setPp] = useState(toMWh("TX"));
  const [ppO, setPpO] = useState(false);
  const [gp, setGp] = useState(hhStripPrice(2026, "TX"));
  const [gpO, setGpO] = useState(false);
  const [codYear, setCodYear] = useState(2026); // Ammonia default: yr(2025) + 1 construction yr
  const [codYearOverride, setCodYearOverride] = useState(false);
  const [cfIn, setCfIn] = useState("");
  const [tab, setTab] = useState("io");

  /* Power Plant Parameters */
  const [plantMW, setPlantMW] = useState(500);
  const [plantCFpct, setPlantCFpct] = useState(57);
  const [heatRateBtu, setHeatRateBtu] = useState(6.722);
  const isPowerPlant = SC[src] && SC[src].cat === "Power";
  const hasCombustion = !!(EMIT_FACTORS[src]);
  // derivedCO2: gross MW × CF × 8,760 × HR × EF — same formula as the 4-box UI.
  // Using gross MW directly keeps the chain invertible: any box back-calcs to plCap,
  // and derivedCO2 reconstructs the same CO₂ value the user entered.
  const _sd = SC[src];
  const _refCF = _sd?.cf || 0.85;
  const _grossUserCap = parseFloat(plCap) > 0 ? parseFloat(plCap) : 0;
  const plantCapForDeriv = hasCombustion ? _grossUserCap : 0;
  const plantCFForDeriv = parseFloat(cfIn) > 0 && parseFloat(cfIn) <= 100 ? parseFloat(cfIn) : (_refCF * 100);
  const derivedCO2 = plantCapForDeriv > 0
    ? plantCapForDeriv * (plantCFForDeriv / 100) * 8760 * heatRateBtu * (EMIT_FACTORS[src] || 0)
    : 0;

  /* Capital Structure */
  const [debtPct, setDebtPct] = useState(54);
  const [costDebt, setCostDebt] = useState(5.15);
  const [costEquity, setCostEquity] = useState(12);
  const [useFixedHurdle, setUseFixedHurdle] = useState(false);
  const [fixedHurdle, setFixedHurdle] = useState(10);
  const [capStructOverride, setCapStructOverride] = useState(false);
  const [debtTerm, setDebtTerm] = useState(12);

  const [projLife, setProjLife] = useState(30);
  const [projLifeOverride, setProjLifeOverride] = useState(false);
  const [sensPct, setSensPct] = useState(20);
  const [sensSliders, setSensSliders] = useState({});

  /* Tax & Depreciation */
  const [fedTax, setFedTax] = useState(21);
  const [stateTax, setStateTax] = useState(0);
  const [stateTaxOverride, setStateTaxOverride] = useState(false);
  const [deprMethod, setDeprMethod] = useState("MACRS 7-yr");
  const [bonusDepr, setBonusDepr] = useState(false);
  const [bonusDeprPct, setBonusDeprPct] = useState(60);

  /* Incentives & Revenue */
  const [use45Q, setUse45Q] = useState(true);
  const [q45Duration, setQ45Duration] = useState(12);
  const [q45Inflation, setQ45Inflation] = useState(2);
  const [q45StartYear, setQ45StartYear] = useState(2029);
  const [use48C, setUse48C] = useState(false);
  const [itcPct, setItcPct] = useState(30);
  const [useCALCFA, setUseCALCFA] = useState(false);
  const [calcfaRate, setCalcfaRate] = useState(50);
  const [grantAmt, setGrantAmt] = useState(0);
  const [hovSt2, setHovSt2] = useState(null);
  const [lastInputBox, setLastInputBox] = useState(null); // 'plant'|'expOut'|'co2Prod'|'co2Capt'

  /* Voluntary Carbon Markets */
  const [useCDRCredit, setUseCDRCredit] = useState(false);
  const [cdrCreditType, setCdrCreditType] = useState("dac");
  const [cdrCreditRate, setCdrCreditRate] = useState(400);
  const [useAvoidCredit, setUseAvoidCredit] = useState(false);
  const [avoidCreditType, setAvoidCreditType] = useState("industrial");
  const [avoidCreditRate, setAvoidCreditRate] = useState(25);
  const [vcmDuration, setVcmDuration] = useState(10);

  /* Simulation Tab State */
  const [simMode, setSimMode] = useState("monte_carlo");
  const [mcRuns, setMcRuns] = useState(2000);
  const [mcResults, setMcResults] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcParams, setMcParams] = useState({
    elecPrice:  { enabled: true,  low: 36,  high: 96,  dist: "uniform" },
    gasPrice:   { enabled: true,  low: 2.21, high: 8.84, dist: "uniform" },
    capFactor:  { enabled: true,  low: 65,  high: 95,  dist: "triangular" },
    capexMult:  { enabled: true,  low: 0.7, high: 1.5, dist: "triangular" },
    ccfMult:    { enabled: false, low: 0.04, high: 0.09, dist: "uniform" },
    q45Rate:    { enabled: false, low: 42,  high: 85,  dist: "uniform" },
    cdrRate:    { enabled: false, low: 120, high: 600, dist: "uniform" },
    avoidRate:  { enabled: false, low: 8,   high: 50,  dist: "uniform" }
  });
  const [scenarios, setScenarios] = useState(null);

  /* Batch Processing State */
  const [batchData, setBatchData] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchError, setBatchError] = useState(null);
  const [batchFileName, setBatchFileName] = useState("");
  const [batchColMap, setBatchColMap] = useState({state: "", source: "", co2: "", plantCap: "", plantCF: "", heatRate: ""});
  const [batchHeaders, setBatchHeaders] = useState([]);
  const [batchPreview, setBatchPreview] = useState([]);

  /* useEffects */
  useEffect(() => { if (!stateTaxOverride) { setStateTax(STATE_TAX[st] || 0); } }, [st, stateTaxOverride]);

  useEffect(() => {
    if (cdrCreditType !== "custom") {
      const best = bestCreditType(src, CDR_TYPES, SC);
      setCdrCreditType(best);
      setCdrCreditRate(CDR_TYPES[best]?.price || 200);
    }
  }, [src]);

  useEffect(() => {
    if (cdrCreditType !== "custom") { setCdrCreditRate(CDR_TYPES[cdrCreditType]?.price || 200); }
  }, [cdrCreditType]);

  useEffect(() => {
    if (avoidCreditType !== "custom") {
      const best = bestCreditType(src, AVOID_TYPES, SC);
      setAvoidCreditType(best);
      setAvoidCreditRate(AVOID_TYPES[best]?.price || 25);
    }
  }, [src]);

  useEffect(() => {
    if (avoidCreditType !== "custom") { setAvoidCreditRate(AVOID_TYPES[avoidCreditType]?.price || 25); }
  }, [avoidCreditType]);

  useEffect(() => {
    if (!capStructOverride) {
      const netl = NETL_FIN[src] || NETL_DEFAULT;
      setDebtPct(netl.debtPct);
      setCostDebt(netl.costDebt);
      setCostEquity(Math.max(8, netl.roe + 8));
    }
  }, [src, capStructOverride]);

  useEffect(() => {
    if (!projLifeOverride) {
      const netl = NETL_FIN[src] || NETL_DEFAULT;
      setProjLife(netl.projectLife);
    }
  }, [src, projLifeOverride]);

  useEffect(() => { if (!ppO) { setPp(toMWh(st)); } }, [st, ppO]);
  useEffect(() => { if (!gpO) { setGp(hhStripPrice(codYear, st)); } }, [st, codYear, gpO]);
  useEffect(() => { setQ45StartYear(codYear); }, [codYear]);
  useEffect(() => {
    if (!codYearOverride) {
      const netl = NETL_FIN[src] || NETL_DEFAULT;
      setCodYear(yr + netl.constructionYrs);
    }
  }, [src, yr, codYearOverride]);

  const cr = `${crCustom}%`;

  const chSrc = useCallback((ns) => {
    setSrc(ns);
    const newCat = SC[ns] ? SC[ns].cat : "High Purity";
    const currentTech = TECH[tech];
    if (ns === "Ambient Air") {
      setTech("dacsolid");
    } else if (ns === "Ocean Water") {
      setTech("doc");
    } else if (currentTech && !currentTech.compat.includes(newCat)) {
      setTech("amine");
    }
    if (PP_DEFAULTS[ns]) {
      setPlantMW(PP_DEFAULTS[ns].mw);
      setPlantCFpct(PP_DEFAULTS[ns].cf);
      setHeatRateBtu(PP_DEFAULTS[ns].hr);
    }
    setCodYearOverride(false);
  }, [tech]);

  const res = useMemo(() => {
    const vd = gv(src, cr, bt);
    if (!vd) return null;

    // ── STEP 1: Plant Capacity & CO₂ ──────────────────────────
    // Determine plant size, CO₂ produced, CO₂ captured first —
    // these drive all downstream scaling.
    const refCO2 = vd.rco;
    const refCF = vd.cf;
    const userCF = parseFloat(cfIn);
    const cf = (userCF > 0 && userCF <= 100) ? userCF / 100 : refCF;
    const cfCustom = (userCF > 0 && userCF <= 100);
    const isNGCC = src === "NGCC F-Frame" || src === "NGCC H-Frame";
    const isCombustion = !!(EMIT_FACTORS[src]);
    const captureRate = parseFloat(cr) / 100;
    const uP = parseFloat(plCap);
    const grossRef = vd.rpc + (vd.pw || 0);

    let sR = 1.0, cust = false;
    let plantCap, co2Produced, co2Captured;

    if (isCombustion) {
      // Combustion: plant cap in gross MW drives CO₂ produced via HR × EF
      plantCap = uP > 0 ? uP : grossRef;
      if (uP > 0) { sR = uP / grossRef; cust = true; }
      co2Produced = derivedCO2 > 0 ? derivedCO2 : refCO2 / captureRate * sR * (cf / refCF);
      co2Captured = co2Produced * captureRate;
    } else if (uP > 0) {
      // Non-combustion with user-entered plant capacity
      plantCap = uP;
      sR = uP / vd.rpc;
      co2Captured = refCO2 * sR * (cf / refCF);
      co2Produced = co2Captured / captureRate;
      cust = true;
    } else {
      // Default: NETL reference
      plantCap = vd.rpc;
      co2Captured = refCO2 * (cf / refCF);
      co2Produced = co2Captured / captureRate;
      if (cfCustom) cust = true;
    }

    const pCO2 = co2Captured;
    const plantCapUnit = isCombustion ? "MW" : (vd.rpu || "units");
    const expOut = isCombustion ? plantCap * cf * 8760 : plantCap * cf;
    const expOutUnit = isCombustion ? "MWh/yr" : (vd.rpu || "units");

    // ── STEP 2: NETL Reference + CR/BT adjustments (vd from gv()) ──
    // Already computed above — vd contains adjusted NETL data.

    // ── STEP 3+: Cost calculation ─────────────────────────────
    const calcWACC = (debtPct / 100) * (costDebt / 100) + ((100 - debtPct) / 100) * (costEquity / 100);
    const discountRate = useFixedHurdle ? (fixedHurdle / 100) : calcWACC;
    const core = calcLCOC({ vd, pCO2, sR, techKey: tech, yr, st, pp, gp, cf, discountRate });
    const { sT, sFO, sVO } = core;
    const cxData = vd.cx || {};
    const cxBreak = Object.entries(cxData)
      .filter(([,f]) => f > 0)
      .map(([k, f]) => ({ key: k, label: CX_LABELS[k] || k, frac: f, val: sT * f, pt: (sT * f) / pCO2 }))
      .sort((a, b) => b.val - a.val);
    const fomItems = [
      { key: "lab", label: "Labor (Ops + Maint)", frac: 0.53, color: "#4aa63b" },
      { key: "mat", label: "Maintenance Materials", frac: 0.17, color: "#58b947" },
      { key: "adm", label: "Admin & Overhead", frac: 0.12, color: "#7cc96e" },
      { key: "pti", label: "Taxes, Insurance & Other", frac: 0.18, color: "#e8f5e9" }
    ].map(item => ({ ...item, val: sFO * item.frac, valM: sFO * item.frac * pCO2 }));
    const vomItems = [
      { key: "sol", label: "Solvent / Sorbent Make-Up", frac: 0.38, color: "#f68d2e" },
      { key: "chm", label: "Chemicals & Water Treatment", frac: 0.35, color: "#f68d2e" },
      { key: "wst", label: "Waste & Consumables", frac: 0.27, color: "#fdcf0c" }
    ].map(item => ({ ...item, val: sVO * item.frac, valM: sVO * item.frac * pCO2 }));
    return {
      ...core, cust, cf, cfCustom, isNGCC, isCombustion,
      plantCap, plantCapUnit, co2Produced, co2Captured, expOut, expOutUnit,
      cxBreak, fomItems, vomItems,
      wacc: calcWACC, tech: core.tF
    };
  }, [src, crCustom, bt, tech, st, yr, plCap, pp, gp, cfIn, debtPct, costDebt, costEquity, useFixedHurdle, fixedHurdle, projLife, plantMW, plantCFpct, heatRateBtu, derivedCO2]);

  const pie = res ? [
    { name: "Capital", value: res.capC, color: "#58b947" },
    { name: "Fixed OPEX", value: res.sFO, color: "#58b947" },
    { name: "Variable OPEX", value: res.sVO, color: "#f68d2e" },
    { name: "Power", value: res.pPt, color: "#b83a4b" },
    ...(res.sFL > 0 ? [{ name: "Nat Gas Fuel", value: res.sFL, color: "#93348f" }] : [])
  ] : [];

  const bars = useMemo(() => {
    if (!res) return [];
    return Object.keys(SC).map(k => {
      const dd = gv(k, SC[k].cr[0], SC[k].bt[0]);
      if (!dd) return null;
      const c2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
      const l2 = (LF[st] ? LF[st].f : 1) / (LF[dd.bs] ? LF[dd.bs].f : 0.97);
      const cap = (dd.toc * 1e6 * res.discountRate) / dd.rco * c2 * l2;
      const fix = dd.fo * c2;
      const vr2 = dd.vo * c2;
      const pwr = (dd.pw * pp * dd.cf * 8760) / dd.rco;
      const fuel = (dd.fl || 0) * (gp / BASE_GP);
      const nm = k.length > 13 ? k.substring(0, 12) + "…" : k;
      return { name: nm, Capital: +cap.toFixed(2), "Fixed OPEX": +fix.toFixed(2), "Variable OPEX": +vr2.toFixed(2), Power: +pwr.toFixed(2), "Nat Gas": +fuel.toFixed(2), total: +(cap + fix + vr2 + pwr + fuel).toFixed(2) };
    }).filter(Boolean).sort((a, b) => a.total - b.total);
  }, [yr, st, pp, gp, res]);

  const tabs = [
    { id: "io", label: "Summary" },
    { id: "model", label: "Model" },
    { id: "charts", label: "Charts" },
    { id: "sensitivity", label: "Sensitivity" },
    { id: "simulation", label: "Simulation" },
    { id: "assumptions", label: "Assumptions" },
    { id: "batch", label: "Batch Run" },
    { id: "batchmodel", label: "Batch Model" }
  ];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#fff", color: "#333", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "2px solid #58b947", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#333" }}>CCUS Cost of Capture Model</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#58b947", marginTop: 4 }}>After-Tax LCOC Calculator | 2026$</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>NETL Data {"·"} CEPCI {"·"} Location Factors {"·"} EIA Power Pricing {"·"} Nat Gas Fuel {"·"} Six-Tenths Scaling &nbsp;<span style={{ fontSize: 9.5, color: "#aaa", background: "#333", padding: "1px 6px", verticalAlign: "middle" }}>hover <span style={{ borderBottom: "1px dotted #aaa" }}>dotted terms</span> for definitions</span></div>
        </div>
      </div>

      {/* Key Metrics Bar */}
      {res && (() => {
        const sd = SC[src];
        const cfDisplay = res.cf ? (res.cf * 100).toFixed(0) : "—";
        const co2Capt = res.pCO2;
        const tocM = res.sTOC / 1e6;
        const techObj = res.tF || TECH[tech] || TECH.amine;
        const techLabel = techObj.n || tech;
        const waccDisplay = (res.discountRate * 100).toFixed(2);
        const kv = (label, value, unitStr, color) => (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 12px",
            borderRight: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#999", textTransform: "uppercase",
              letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: color || "#333", marginTop: 1 }}>{value}</div>
            <div style={{ fontSize: 8, color: "#aaa" }}>{unitStr}</div>
          </div>
        );
        const sep = () => (
          <div style={{ width: 2, alignSelf: "stretch", background: "#58b94733", margin: "2px 4px" }} />
        );
        return (
          <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#fafafa", borderBottom: "1px solid #e0e0e0", padding: "6px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: 1600, margin: "0 auto" }}>
              {/* ── Row 1: Inputs ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4, borderBottom: "1px solid #eee" }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: "#58b947", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 0 0", whiteSpace: "nowrap" }}>Inputs</div>
                {kv("Source", src, sd?.cat || "")}
                {kv("CR", crCustom + "%", "")}
                {kv("Build Type", bt, "")}
                {kv("Technology", techLabel, "")}
                {kv("State", st, "")}
                {kv("Cost Year", yr, "")}
                {kv("COD Year", codYear, "")}
                {kv("CF", cfDisplay + "%", "")}
                {kv("Elec Price", "$" + pp, "$/MWh")}
                {kv("Gas Price", "$" + gp, "$/MMBtu")}
                {kv("WACC", waccDisplay + "%", useFixedHurdle ? "fixed" : "calc")}
              </div>
              {/* ── Row 2: Outputs ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingTop: 4 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: "#58b947", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 0 0", whiteSpace: "nowrap" }}>Outputs</div>
                {kv("CO\u2082 Captured", fm(co2Capt, 0), "t/yr")}
                {res.sR !== 1 && kv("Scale (sR)", res.sR.toFixed(3) + "x", "")}
                {kv("CEPCI", res.cR.toFixed(3) + "x", "")}
                {kv("Location", res.lR.toFixed(3) + "x", "")}
                {sep()}
                {kv("CAPEX", fd(tocM, 1) + "M", "")}
                {kv("Capital", fd(res.capC, 2), "$/t CO\u2082")}
                {kv("Fixed OPEX", fd(res.sFO, 2), "$/t CO\u2082")}
                {kv("Var OPEX", fd(res.sVO, 2), "$/t CO\u2082")}
                {kv("Power", fd(res.pPt, 2), "$/t CO\u2082")}
                {res.hasFuel && kv("Fuel", fd(res.sFL, 2), "$/t CO\u2082")}
                {sep()}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 14px" }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#999", textTransform: "uppercase",
                    letterSpacing: "0.03em" }}>LCOC</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#58b947", marginTop: 1 }}>{fd(res.total, 2)}</div>
                  <div style={{ fontSize: 8, color: "#aaa" }}>$/t CO&#x2082;</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 24px 40px" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e0e0e0", marginBottom: 20, paddingTop: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "10px 22px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: "transparent",
                color: tab === t.id ? "#58b947" : "#999",
                borderBottom: tab === t.id ? "3px solid #58b947" : "3px solid transparent",
                marginBottom: -2, transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "io" && (
          <SummaryTab
            res={res} src={src} chSrc={chSrc} cr={cr} crCustom={crCustom} setCrCustom={setCrCustom}
            bt={bt} setBt={setBt} tech={tech} setTech={setTech} st={st} setSt={setSt}
            yr={yr} setYr={setYr} mode={mode} setMode={setMode} co2Cap={co2Cap} setCo2Cap={setCo2Cap}
            plCap={plCap} setPlCap={setPlCap} pp={pp} setPp={setPp} ppO={ppO} setPpO={setPpO}
            gp={gp} setGp={setGp} gpO={gpO} setGpO={setGpO} codYear={codYear} setCodYear={setCodYear} codYearOverride={codYearOverride} setCodYearOverride={setCodYearOverride}
            cfIn={cfIn} setCfIn={setCfIn}
            plantMW={plantMW} setPlantMW={setPlantMW} plantCFpct={plantCFpct} setPlantCFpct={setPlantCFpct}
            heatRateBtu={heatRateBtu} setHeatRateBtu={setHeatRateBtu} derivedCO2={derivedCO2}
            isPowerPlant={isPowerPlant} hasCombustion={hasCombustion}
            setLastInputBox={setLastInputBox}
            use45Q={use45Q} setUse45Q={setUse45Q} q45Duration={q45Duration} setQ45Duration={setQ45Duration}
            q45Inflation={q45Inflation} setQ45Inflation={setQ45Inflation} q45StartYear={q45StartYear} setQ45StartYear={setQ45StartYear}
            use48C={use48C} setUse48C={setUse48C} itcPct={itcPct} setItcPct={setItcPct}
            useCALCFA={useCALCFA} setUseCALCFA={setUseCALCFA} calcfaRate={calcfaRate} setCalcfaRate={setCalcfaRate}
            grantAmt={grantAmt} setGrantAmt={setGrantAmt}
            useCDRCredit={useCDRCredit} setUseCDRCredit={setUseCDRCredit}
            cdrCreditType={cdrCreditType} setCdrCreditType={setCdrCreditType}
            cdrCreditRate={cdrCreditRate} setCdrCreditRate={setCdrCreditRate}
            useAvoidCredit={useAvoidCredit} setUseAvoidCredit={setUseAvoidCredit}
            avoidCreditType={avoidCreditType} setAvoidCreditType={setAvoidCreditType}
            avoidCreditRate={avoidCreditRate} setAvoidCreditRate={setAvoidCreditRate}
            vcmDuration={vcmDuration} setVcmDuration={setVcmDuration}
            debtPct={debtPct} setDebtPct={setDebtPct} costDebt={costDebt} setCostDebt={setCostDebt}
            costEquity={costEquity} setCostEquity={setCostEquity}
            useFixedHurdle={useFixedHurdle} setUseFixedHurdle={setUseFixedHurdle}
            fixedHurdle={fixedHurdle} setFixedHurdle={setFixedHurdle}
            capStructOverride={capStructOverride} setCapStructOverride={setCapStructOverride}
            projLife={projLife} setProjLife={setProjLife} projLifeOverride={projLifeOverride} setProjLifeOverride={setProjLifeOverride}
            fedTax={fedTax} setFedTax={setFedTax} stateTax={stateTax} setStateTax={setStateTax}
            stateTaxOverride={stateTaxOverride} setStateTaxOverride={setStateTaxOverride}
            deprMethod={deprMethod} setDeprMethod={setDeprMethod}
            bonusDepr={bonusDepr} setBonusDepr={setBonusDepr}
            bonusDeprPct={bonusDeprPct} setBonusDeprPct={setBonusDeprPct}
            pie={pie} bars={bars}
          />
        )}

        {tab === "model" && (
          <ModelTab
            res={res} src={src} cr={cr} bt={bt} st={st} yr={yr}
            pp={pp} ppO={ppO} gp={gp} gpO={gpO} codYear={codYear}
            use45Q={use45Q} q45Duration={q45Duration} q45Inflation={q45Inflation} q45StartYear={q45StartYear}
            useCDRCredit={useCDRCredit} cdrCreditRate={cdrCreditRate} cdrCreditType={cdrCreditType}
            useAvoidCredit={useAvoidCredit} avoidCreditRate={avoidCreditRate} avoidCreditType={avoidCreditType}
            vcmDuration={vcmDuration} use48C={use48C} itcPct={itcPct} grantAmt={grantAmt}
            fedTax={fedTax} stateTax={stateTax} deprMethod={deprMethod} projLife={projLife}
            useFixedHurdle={useFixedHurdle} debtPct={debtPct} costDebt={costDebt} costEquity={costEquity}
            fixedHurdle={fixedHurdle} mode={mode}
            heatRateBtu={heatRateBtu} plantMW={plantMW} plantCFpct={plantCFpct}
            hasCombustion={hasCombustion} derivedCO2={derivedCO2}
            lastInputBox={lastInputBox}
          />
        )}

        {tab === "charts" && (
          <ChartsTab
            res={res} src={src} cr={cr} bt={bt} tech={tech} st={st} yr={yr}
            pp={pp} gp={gp} codYear={codYear}
            hovSt2={hovSt2} setHovSt2={setHovSt2}
            pie={pie} bars={bars}
          />
        )}

        {tab === "sensitivity" && res && (
          <SensitivityTab
            res={res} src={src} cr={cr} bt={bt} st={st} yr={yr} pp={pp} gp={gp}
            tech={tech} mode={mode} co2Cap={co2Cap} plCap={plCap}
            sensPct={sensPct} setSensPct={setSensPct}
            sensSliders={sensSliders} setSensSliders={setSensSliders}
            use45Q={use45Q} useCDRCredit={useCDRCredit} cdrCreditRate={cdrCreditRate}
            useAvoidCredit={useAvoidCredit} avoidCreditRate={avoidCreditRate}
          />
        )}

        {tab === "simulation" && res && (
          <SimulationTab
            res={res} src={src} cr={cr} bt={bt} st={st} yr={yr} pp={pp} gp={gp}
            tech={tech} mode={mode} co2Cap={co2Cap} plCap={plCap}
            use45Q={use45Q} useCDRCredit={useCDRCredit} cdrCreditRate={cdrCreditRate}
            useAvoidCredit={useAvoidCredit} avoidCreditRate={avoidCreditRate}
            use48C={use48C} itcPct={itcPct} grantAmt={grantAmt}
            projLife={projLife} fedTax={fedTax} stateTax={stateTax}
            simMode={simMode} setSimMode={setSimMode}
            mcRuns={mcRuns} setMcRuns={setMcRuns}
            mcResults={mcResults} setMcResults={setMcResults}
            mcRunning={mcRunning} setMcRunning={setMcRunning}
            mcParams={mcParams} setMcParams={setMcParams}
            scenarios={scenarios} setScenarios={setScenarios}
          />
        )}

        {tab === "assumptions" && (
          <AssumptionsTab res={res} src={src} st={st} yr={yr} tech={tech} codYear={codYear} projLife={projLife} />
        )}

        {tab === "batchmodel" && (
          <BatchModelTab batchResults={batchResults} />
        )}

        {tab === "batch" && (
          <BatchRunTab
            batchData={batchData} setBatchData={setBatchData}
            batchResults={batchResults} setBatchResults={setBatchResults}
            batchRunning={batchRunning} setBatchRunning={setBatchRunning}
            batchError={batchError} setBatchError={setBatchError}
            batchFileName={batchFileName} setBatchFileName={setBatchFileName}
            batchColMap={batchColMap} setBatchColMap={setBatchColMap}
            batchHeaders={batchHeaders} setBatchHeaders={setBatchHeaders}
            batchPreview={batchPreview} setBatchPreview={setBatchPreview}
            cfIn={cfIn} setCfIn={setCfIn}
            useFixedHurdle={useFixedHurdle} fixedHurdle={fixedHurdle} setFixedHurdle={setFixedHurdle}
            projLife={projLife} setProjLife={setProjLife}
            yr={yr} setYr={setYr} codYear={codYear}
            tech={tech} setTech={setTech}
            crCustom={crCustom} setCrCustom={setCrCustom}
            bt={bt} setBt={setBt}
            pp={pp} gp={gp}
            debtPct={debtPct} costDebt={costDebt} costEquity={costEquity}
          />
        )}
      </div>
    </div>
  );
}
