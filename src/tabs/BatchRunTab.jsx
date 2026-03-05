import * as XLSX from 'xlsx';
import { SC, CEPCI, LF, TECH, EIA, STATE_TAX, BASE_GP, MACRS, HUB_NAME, HUB_BASIS } from '../constants';
import { hhStripPrice } from '../utils/helpers';
import { gv } from '../utils/engCalculations';
import { fi, sec, secH } from '../utils/styles';

export default function BatchRunTab({
  batchData, setBatchData, batchResults, setBatchResults,
  batchRunning, setBatchRunning, batchError, setBatchError,
  batchFileName, setBatchFileName, batchColMap, setBatchColMap,
  batchHeaders, setBatchHeaders, batchPreview, setBatchPreview,
  cfIn, setCfIn, useFixedHurdle, fixedHurdle, setFixedHurdle,
  projLife, setProjLife, yr, setYr, codYear, tech
}) {
  const SOURCE_ALIASES = {
    "ng processing": "NG Processing", "natural gas processing": "NG Processing", "gas processing": "NG Processing",
    "ammonia": "Ammonia", "nh3": "Ammonia",
    "ethylene oxide": "Ethylene Oxide", "eo": "Ethylene Oxide",
    "ethanol": "Ethanol",
    "refinery h2": "Refinery H\u2082", "refinery hydrogen": "Refinery H\u2082", "hydrogen": "Refinery H\u2082", "refinery h₂": "Refinery H\u2082",
    "cement": "Cement",
    "steel & iron": "Steel & Iron", "steel": "Steel & Iron", "iron": "Steel & Iron", "iron and steel": "Steel & Iron",
    "pulp & paper": "Pulp & Paper", "pulp": "Pulp & Paper", "paper": "Pulp & Paper",
    "ngcc": "NGCC F-Frame", "ngcc f-frame": "NGCC F-Frame", "ngcc f frame": "NGCC F-Frame", "natural gas": "NGCC F-Frame", "gas turbine": "NGCC F-Frame",
    "ngcc h-frame": "NGCC H-Frame", "ngcc h frame": "NGCC H-Frame",
    "coal": "Coal SC", "coal sc": "Coal SC", "coal powerplant": "Coal SC", "coal power": "Coal SC",
    "coal sub-c": "Coal Sub-C", "coal sub c": "Coal Sub-C",
    "biomass": "Biomass",
    "coal-to-liquids": "Coal-to-Liquids", "ctl": "Coal-to-Liquids",
    "gas-to-liquids": "Gas-to-Liquids", "gtl": "Gas-to-Liquids",
    "power plants": "NGCC F-Frame", "municipal landfills": "Biomass", "transmission compression": "NGCC F-Frame",
    "onshore production": "NG Processing", "gathering and boosting": "NG Processing",
    "food processing": "Ethanol", "other chemicals": "Ethylene Oxide", "ethanol production": "Ethanol",
    "refineries": "Refinery H\u2082", "iron and steel production": "Steel & Iron",
    "other minerals": "Cement", "glass production": "Cement", "other paper producers": "Pulp & Paper",
  };

  const resolveSource = (raw) => {
    if (!raw) return null;
    const lower = raw.toString().trim().toLowerCase();
    if (SOURCE_ALIASES[lower]) return SOURCE_ALIASES[lower];
    const srcKeys = Object.keys(SC);
    const exact = srcKeys.find(k => k.toLowerCase() === lower);
    if (exact) return exact;
    const partial = srcKeys.find(k => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower));
    return partial || null;
  };

  const STATE_ALIASES = {};
  Object.entries(LF).forEach(([code, data]) => {
    STATE_ALIASES[code.toLowerCase()] = code;
    STATE_ALIASES[data.n.toLowerCase()] = code;
  });
  const resolveState = (raw) => {
    if (!raw) return null;
    const s = raw.toString().trim();
    if (LF[s.toUpperCase()]) return s.toUpperCase();
    return STATE_ALIASES[s.toLowerCase()] || null;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBatchFileName(file.name);
    setBatchError(null);
    setBatchResults(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (json.length === 0) { setBatchError("No data found in file"); return; }
        const hdrs = Object.keys(json[0]);
        setBatchHeaders(hdrs);
        setBatchPreview(json.slice(0, 5));
        setBatchData(json);

        const autoMap = { state: "", source: "", co2: "", plantCap: "", plantCF: "", heatRate: "" };
        hdrs.forEach(h => {
          const hl = h.toLowerCase();
          if (hl.includes("state") || hl.includes("province")) autoMap.state = autoMap.state || h;
          if (hl.includes("source") || hl.includes("sector") || hl.includes("emission source")) autoMap.source = autoMap.source || h;
          if (hl.includes("co2") || hl.includes("carbon") || hl.includes("emission") && !hl.includes("source")) autoMap.co2 = autoMap.co2 || h;
          if (hl.includes("capacity") && !hl.includes("factor") && !hl.includes("capture")) autoMap.plantCap = autoMap.plantCap || h;
          if ((hl.includes("capacity factor") || hl.includes("plant cf") || hl === "cf") && !hl.includes("capture")) autoMap.plantCF = autoMap.plantCF || h;
          if (hl.includes("heat rate") || hl.includes("heatrate") || hl.includes("hr")) autoMap.heatRate = autoMap.heatRate || h;
        });
        setBatchColMap(autoMap);
      } catch (err) {
        setBatchError("Error reading file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const runBatch = () => {
    if (!batchData || batchData.length === 0) return;
    setBatchRunning(true);
    setBatchError(null);

    setTimeout(() => {
      try {
        const results = [];
        let processed = 0, skipped = 0;
        const useCF = parseFloat(cfIn) || 85;
        const useDR = useFixedHurdle ? fixedHurdle / 100 : 0.10;
        const useLife = projLife || 25;
        const useYr = yr || 2026;

        batchData.forEach((row) => {
          const rawState = batchColMap.state ? row[batchColMap.state] : "";
          const rawSource = batchColMap.source ? row[batchColMap.source] : "";
          const rawCO2 = batchColMap.co2 ? parseFloat(row[batchColMap.co2]) : 0;

          const stCode = resolveState(rawState);
          const srcName = resolveSource(rawSource);

          if (!stCode || !srcName) { skipped++; results.push({ ...row, _status: "Skipped", _reason: !stCode ? "Bad state: " + rawState : "Bad source: " + rawSource }); return; }

          const vd = gv(srcName, 90, "Retrofit");
          if (!vd) { skipped++; results.push({ ...row, _status: "Skipped", _reason: "No model data for: " + srcName }); return; }

          const refCO2 = vd.rco;
          const refCF = vd.cf;
          const cf2 = useCF / 100;
          let pCO2 = rawCO2 > 0 ? rawCO2 : refCO2 * (cf2 / refCF);
          let sR = (pCO2 / (cf2 / refCF)) / refCO2;

          const tF = TECH[tech] || TECH.amine;
          const cR2 = (CEPCI[useYr] || CEPCI[2026]) / CEPCI[2018];
          const lR2 = (LF[stCode] ? LF[stCode].f : 1) / (LF[vd.bs] ? LF[vd.bs].f : 0.97);
          const cS2 = sR !== 1 ? Math.pow(sR, 0.6) : 1;

          const sTIC = vd.tic * 1e6 * cR2 * lR2 * cS2 * tF.capex;
          const sTOC = sTIC * (vd.toc / vd.tic);
          const annCO2 = pCO2 * cf2;

          const foScale = sR !== 1 ? Math.pow(sR, 0.15) : 1;
          const sFO = vd.fo * cR2 * lR2 * foScale * tF.fo;
          const sVO = vd.vo * cR2 * tF.vo;

          const ePP = (EIA[stCode] || 8) * 10;
          const ePW = vd.pw * sR * tF.power;
          const pPt = annCO2 > 0 ? (ePW * 8760 * cf2 * ePP) / annCO2 : 0;

          const gp2 = hhStripPrice(codYear, stCode);
          const sFL = vd.fl > 0 ? vd.fl * (gp2 / BASE_GP) : 0;

          const stTax2 = STATE_TAX[stCode] || 0;
          const combTax = (21 + stTax2 * (1 - 0.21)) / 100;

          const deprKey = "20-yr";
          const deprSched = MACRS[deprKey] || MACRS["20-yr"];
          let depPV = 0;
          for (let i = 0; i < deprSched.length; i++) depPV += (sTOC * deprSched[i] * combTax) / Math.pow(1 + useDR, i + 1);
          const netCapex = sTOC - depPV;

          let pvAnn = 0;
          for (let y2 = 1; y2 <= useLife; y2++) pvAnn += 1 / Math.pow(1 + useDR, y2);
          const npvCO2 = annCO2 * pvAnn;

          const capexLCOC = npvCO2 > 0 ? (netCapex / npvCO2) : 0;
          const at = 1 - combTax;
          const foLCOC = sFO * at;
          const voLCOC = sVO * at;
          const elecLCOC = pPt * at;
          const gasLCOC = sFL * at;
          const lcoc = capexLCOC + foLCOC + voLCOC + elecLCOC + gasLCOC;

          processed++;
          results.push({
            ...row,
            _status: "OK",
            _srcResolved: srcName,
            _stateResolved: stCode,
            "CCUS Model LCOC": Math.round(lcoc * 100) / 100,
            "CAPEX $MM": Math.round(sTOC / 1e6 * 100) / 100,
            "CAPEX $/t": Math.round(capexLCOC * 100) / 100,
            "Fixed OPEX $/t": Math.round(foLCOC * 100) / 100,
            "Variable OPEX $/t": Math.round(voLCOC * 100) / 100,
            "Electricity $/t": Math.round(elecLCOC * 100) / 100,
            "Nat Gas $/t": Math.round(gasLCOC * 100) / 100,
            "CO2 tpa": Math.round(pCO2),
          });
        });

        setBatchResults({ rows: results, processed, skipped, total: batchData.length });
        setBatchRunning(false);
      } catch (err) {
        setBatchError("Batch run error: " + err.message);
        setBatchRunning(false);
      }
    }, 100);
  };

  const exportResults = () => {
    if (!batchResults || !batchResults.rows.length) return;
    try {
      const exportData = batchResults.rows.map(r => {
        const out = { ...r };
        delete out._status;
        delete out._reason;
        delete out._srcResolved;
        delete out._stateResolved;
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "LCOC Results");
      XLSX.writeFile(wb, batchFileName.replace(/\.[^.]+$/, "") + "_LCOC_Results.xlsx");
    } catch (err) {
      setBatchError("Export error: " + err.message);
    }
  };

  const mapSel = { ...fi, width: "auto", minWidth: 180, textAlign: "left", cursor: "pointer", fontSize: 12 };

  return (
    <div>
      <div style={sec}>
        <div style={secH}>1. Upload Excel File</div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#58b947", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", borderRadius: 4 }}>
              Choose File
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
            <button onClick={() => {
              try {
                // ── Sheet 1: Blank Input Template ──────────────────────────────
                // Header row
                const headers = [
                  "Facility Name",
                  "State",
                  "Emission Source",
                  "CO2 Emissions (tpa)",
                  "Plant Capacity",
                  "Plant CF (%)",
                  "Heat Rate (Btu/kWh)",
                  "Notes"
                ];
                // Description row (row 2) — grayed out guide text
                const descRow = [
                  "Your facility or project name (optional label only)",
                  "2-letter US state code — e.g. TX, CA, LA  [REQUIRED]",
                  "Emission source type — see Source Reference sheet  [REQUIRED]",
                  "Annual CO₂ captured in tonnes/yr. Leave blank to use model reference.",
                  "Plant output in the source's native units (MW, MMSCFD, t/yr, etc.). Optional.",
                  "Capacity factor as a percent (1–100). Default applied from Model Settings if blank.",
                  "Heat rate in Btu/kWh — only needed for NGCC and Coal sources. Leave blank otherwise.",
                  "Free text notes — not used in calculations"
                ];
                const ws1 = XLSX.utils.aoa_to_sheet([headers, descRow]);
                // Column widths
                ws1["!cols"] = [{wch:26},{wch:8},{wch:22},{wch:20},{wch:16},{wch:13},{wch:20},{wch:30}];
                // Style description row as italic/gray by setting cell types
                headers.forEach((_, ci) => {
                  const addr = XLSX.utils.encode_cell({ r: 1, c: ci });
                  if (!ws1[addr]) ws1[addr] = { t: "s", v: descRow[ci] };
                });

                // ── Sheet 2: Source Reference ───────────────────────────────────
                const sourceRef = [
                  { "Use This Exact Name": "Ammonia",        "Also Accepted As": "ammonia, NH3",                    Category: "High Purity", "Ref Plant Size": "394,000 t NH₃/yr",   "Ref CO₂ (tpa)": 413164,  "Heat Rate Needed?": "No",  "Notes": "Ammonia synthesis purge gas — high purity CO₂" },
                  { "Use This Exact Name": "Ethylene Oxide", "Also Accepted As": "ethylene oxide, EO",              Category: "High Purity", "Ref Plant Size": "364,500 t EO/yr",    "Ref CO₂ (tpa)": 103276,  "Heat Rate Needed?": "No",  "Notes": "EO reactor oxidation offgas — very high purity" },
                  { "Use This Exact Name": "Ethanol",        "Also Accepted As": "ethanol, food processing",        Category: "High Purity", "Ref Plant Size": "50 M gal/yr",        "Ref CO₂ (tpa)": 121586,  "Heat Rate Needed?": "No",  "Notes": "Fermentation CO₂ — nearly pipeline-ready purity" },
                  { "Use This Exact Name": "NG Processing",  "Also Accepted As": "ng processing, gas processing",   Category: "High Purity", "Ref Plant Size": "330 MMSCFD",         "Ref CO₂ (tpa)": 551816,  "Heat Rate Needed?": "No",  "Notes": "Natural gas sweetening / acid gas removal" },
                  { "Use This Exact Name": "Coal-to-Liquids","Also Accepted As": "coal-to-liquids, CTL",            Category: "High Purity", "Ref Plant Size": "50,000 bbl/day",     "Ref CO₂ (tpa)": 4990000, "Heat Rate Needed?": "No",  "Notes": "CTL gasification-derived CO₂ stream" },
                  { "Use This Exact Name": "Gas-to-Liquids", "Also Accepted As": "gas-to-liquids, GTL",             Category: "High Purity", "Ref Plant Size": "50,000 bbl/day",     "Ref CO₂ (tpa)": 1320000, "Heat Rate Needed?": "No",  "Notes": "GTL reforming CO₂ stream" },
                  { "Use This Exact Name": "Refinery H₂",   "Also Accepted As": "refinery h2, hydrogen, refineries",Category: "Industrial",  "Ref Plant Size": "87,000 t H₂/yr",    "Ref CO₂ (tpa)": 340550,  "Heat Rate Needed?": "No",  "Notes": "SMR hydrogen production CO₂ (post-combustion)" },
                  { "Use This Exact Name": "Cement",         "Also Accepted As": "cement, other minerals",          Category: "Industrial",  "Ref Plant Size": "1.3 Mt cement/yr",   "Ref CO₂ (tpa)": 1213802, "Heat Rate Needed?": "No",  "Notes": "Calcination + combustion flue gas — moderate purity" },
                  { "Use This Exact Name": "Steel & Iron",   "Also Accepted As": "steel, iron, steel & iron",       Category: "Industrial",  "Ref Plant Size": "2.54 Mt steel/yr",   "Ref CO₂ (tpa)": 1873012, "Heat Rate Needed?": "No",  "Notes": "BF-BOF integrated steel — mixed process CO₂" },
                  { "Use This Exact Name": "Pulp & Paper",   "Also Accepted As": "pulp, paper, pulp & paper",       Category: "Industrial",  "Ref Plant Size": "0.4 Mt pulp/yr",     "Ref CO₂ (tpa)": 1311546, "Heat Rate Needed?": "No",  "Notes": "Recovery boiler + lime kiln flue gas" },
                  { "Use This Exact Name": "NGCC F-Frame",   "Also Accepted As": "NGCC, natural gas, gas turbine",  Category: "Power",       "Ref Plant Size": "641 MW net",         "Ref CO₂ (tpa)": 2161745, "Heat Rate Needed?": "Yes", "Notes": "GE 7F.05 combined cycle — post-combustion amine capture" },
                  { "Use This Exact Name": "NGCC H-Frame",   "Also Accepted As": "ngcc h-frame",                   Category: "Power",       "Ref Plant Size": "727 MW net",         "Ref CO₂ (tpa)": 2474730, "Heat Rate Needed?": "Yes", "Notes": "GE 7HA.02 combined cycle — higher efficiency" },
                  { "Use This Exact Name": "Coal SC",        "Also Accepted As": "coal, coal powerplant, coal power",Category: "Power",       "Ref Plant Size": "550 MW net",         "Ref CO₂ (tpa)": 3410000, "Heat Rate Needed?": "Yes", "Notes": "Supercritical pulverized coal — post-combustion" },
                  { "Use This Exact Name": "Biomass",        "Also Accepted As": "biomass, beccs",                  Category: "Power",       "Ref Plant Size": "50 MW",              "Ref CO₂ (tpa)": 1280000, "Heat Rate Needed?": "No",  "Notes": "Biomass combustion — biogenic CO₂ (BECCS)" },
                  { "Use This Exact Name": "Ambient Air",    "Also Accepted As": "dac, direct air capture",         Category: "CDR",         "Ref Plant Size": "1 Mt CO₂/yr",        "Ref CO₂ (tpa)": 1000000, "Heat Rate Needed?": "No",  "Notes": "Solid sorbent DAC — very high CAPEX" },
                  { "Use This Exact Name": "Ocean Water",    "Also Accepted As": "ocean, moc",                      Category: "CDR",         "Ref Plant Size": "0.1 Mt CO₂/yr",      "Ref CO₂ (tpa)": 100000,  "Heat Rate Needed?": "No",  "Notes": "Marine ocean capture — early-stage technology" },
                ];
                const ws2 = XLSX.utils.json_to_sheet(sourceRef);
                ws2["!cols"] = [{wch:18},{wch:30},{wch:14},{wch:20},{wch:14},{wch:16},{wch:50}];

                // ── Sheet 3: State Reference ────────────────────────────────────
                const stateRef = Object.entries(LF).sort((a,b) => a[1].n.localeCompare(b[1].n)).map(([code, data]) => ({
                  "State Code (use this)": code,
                  "State Name": data.n,
                  "Location Factor": data.f,
                  "Elec Rate $/MWh": ((EIA[code] || 8) * 10).toFixed(0),
                  "State Corp Tax %": STATE_TAX[code] || 0,
                  "Gas Trading Hub": HUB_NAME[code] || "Henry Hub",
                  "Hub Basis $/MMBtu": (HUB_BASIS[code] || 0).toFixed(2),
                  "EIA Ind. Rate ¢/kWh": EIA[code] || ""
                }));
                const ws3 = XLSX.utils.json_to_sheet(stateRef);
                ws3["!cols"] = [{wch:18},{wch:22},{wch:15},{wch:15},{wch:16},{wch:22},{wch:18},{wch:18}];

                // ── Sheet 4: Field Guide ────────────────────────────────────────
                const fieldGuide = [
                  { Field: "Facility Name",          Required: "No",         "Data Type": "Text",          "Valid Values / Range": "Any text",                                   "Used In Model": "Label only — not used in LCOC calculations" },
                  { Field: "State",                   Required: "YES",        "Data Type": "Text",          "Valid Values / Range": "2-letter code: TX, CA, LA … (see State Reference sheet)", "Used In Model": "Location factor (CAPEX adj.), EIA electricity price, gas hub basis, state tax" },
                  { Field: "Emission Source",         Required: "YES",        "Data Type": "Text",          "Valid Values / Range": "See Source Reference sheet for exact names and aliases",      "Used In Model": "Selects NETL cost scenario: TIC, OPEX, parasitic power, fuel, CCF" },
                  { Field: "CO2 Emissions (tpa)",     Required: "Recommended","Data Type": "Number",        "Valid Values / Range": "> 0 tonnes/yr",                              "Used In Model": "Sets project scale for cost calculation. If blank, model uses NETL reference CO₂ for the source." },
                  { Field: "Plant Capacity",          Required: "No",         "Data Type": "Number",        "Valid Values / Range": "In the source's native units (MW, MMSCFD, t/yr)",  "Used In Model": "Alternative to CO₂ input — used if CO₂ column is blank. Scaling applies either way." },
                  { Field: "Plant CF (%)",            Required: "No",         "Data Type": "Number (1–100)","Valid Values / Range": "1 to 100 (percent)",                         "Used In Model": "Capacity factor — fraction of calendar hours operating. Default from Model Settings (typically 85%)." },
                  { Field: "Heat Rate (Btu/kWh)",     Required: "Power only", "Data Type": "Number",        "Valid Values / Range": "NGCC: ~6,500–7,500 / Coal: ~8,500–10,000",  "Used In Model": "Required for NGCC F-Frame, NGCC H-Frame, Coal SC. Used to derive CO₂ from fuel combustion." },
                  { Field: "Notes",                   Required: "No",         "Data Type": "Text",          "Valid Values / Range": "Any text",                                   "Used In Model": "Not used in calculations — pass-through to results" },
                ];
                const ws4 = XLSX.utils.json_to_sheet(fieldGuide);
                ws4["!cols"] = [{wch:22},{wch:12},{wch:18},{wch:44},{wch:60}];

                // ── Sheet 5: Model Settings Reference ──────────────────────────
                const settingsGuide = [
                  { Setting: "Capture CF (%)",    Default: "85",   Description: "Fraction of calendar hours the capture plant operates. Applied to all rows unless overridden per-row in Plant CF column." },
                  { Setting: "Discount Rate (%)", Default: "10",   Description: "Hurdle rate used in LCOC capital charge factor calculation. NETL source-specific rates range from 4.55% to 8.50%." },
                  { Setting: "Project Life (yr)", Default: "25",   Description: "Economic project lifetime in years. Affects capital charge annualization and depreciation tax shield." },
                  { Setting: "Cost Year",         Default: "2026", Description: "CEPCI escalation target year. All NETL 2018 reference costs are inflated to this year using CEPCI indices." },
                  { Setting: "Technology",        Default: "Amine (MEA)", Description: "Capture technology. Applied uniformly to all rows. Options: Amine (MEA), Adv. Amine, Membrane, Cryogenic, Solid Sorbent." },
                  { Setting: "Capture Rate",      Default: "90%",  Description: "CO₂ capture efficiency. Currently fixed at 90% in batch mode. Affects the fraction of available CO₂ that is captured." },
                  { Setting: "COD Year",          Default: "2029", Description: "Commercial operation date. Used to look up natural gas strip price from Bloomberg forward curve (Y1 COD price)." },
                ];
                const ws5 = XLSX.utils.json_to_sheet(settingsGuide);
                ws5["!cols"] = [{wch:22},{wch:12},{wch:80}];

                // ── Assemble workbook ───────────────────────────────────────────
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws1, "📋 Batch Input (Fill Here)");
                XLSX.utils.book_append_sheet(wb, ws4, "📖 Field Guide");
                XLSX.utils.book_append_sheet(wb, ws2, "🏭 Source Reference");
                XLSX.utils.book_append_sheet(wb, ws3, "🗺️ State Reference");
                XLSX.utils.book_append_sheet(wb, ws5, "⚙️ Model Settings Guide");
                XLSX.writeFile(wb, "CCUS_Model_Input_Template.xlsx");
              } catch (err) { setBatchError("Template error: " + err.message); }
            }} style={{ padding: "10px 20px", background: "#fff", color: "#58b947", fontWeight: 700, fontSize: 13, border: "2px solid #58b947", borderRadius: 4, cursor: "pointer" }}>
              Download Blank Template
            </button>
            {batchFileName && <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{batchFileName}</span>}
            {batchData && <span style={{ fontSize: 12, color: "#58b947", fontWeight: 700 }}>{batchData.length.toLocaleString()} rows loaded</span>}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#888" }}>
            Downloads a blank Excel template with column headers and a field guide. Fill in the <strong>"📋 Batch Input"</strong> sheet — State and Emission Source are required; CO₂ or Plant Capacity recommended. See the <strong>Field Guide</strong>, <strong>Source Reference</strong>, and <strong>State Reference</strong> sheets for valid values.
          </div>
          {batchError && <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", border: "1px solid #b83a4b", color: "#b83a4b", fontSize: 12, borderRadius: 4 }}>{batchError}</div>}

          {batchPreview.length > 0 && (
            <div style={{ marginTop: 16, overflow: "auto", maxHeight: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>PREVIEW (first 5 rows)</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr>{batchHeaders.slice(0, 10).map(h => <th key={h} style={{ padding: "4px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, textAlign: "left", color: "#333" }}>{h}</th>)}{batchHeaders.length > 10 && <th style={{ padding: "4px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", color: "#888" }}>+{batchHeaders.length - 10} more</th>}</tr></thead>
                <tbody>{batchPreview.map((r, i) => <tr key={i}>{batchHeaders.slice(0, 10).map(h => <td key={h} style={{ padding: "3px 8px", border: "1px solid #f0f0f0", color: "#666" }}>{String(r[h] || "").substring(0, 30)}</td>)}{batchHeaders.length > 10 && <td style={{ border: "1px solid #f0f0f0", color: "#aaa", padding: "3px 8px" }}>...</td>}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {batchData && (
        <div style={sec}>
          <div style={secH}>2. Map Columns</div>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>Map your columns to the model inputs. State and Source are required. CO2 is optional (model will use reference values if blank).</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { key: "state", label: "State", required: true },
                { key: "source", label: "Emission Source", required: true },
                { key: "co2", label: "CO2 Emissions (tpa)", required: false },
                { key: "plantCap", label: "Plant Capacity", required: false },
                { key: "plantCF", label: "Plant Capacity Factor (%)", required: false },
                { key: "heatRate", label: "Heat Rate (Btu/kWh)", required: false },
              ].map(f => (
                <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#333", minWidth: 160 }}>{f.label} {f.required && <span style={{ color: "#b83a4b" }}>*</span>}</span>
                  <select value={batchColMap[f.key]} onChange={(e) => setBatchColMap(prev => ({ ...prev, [f.key]: e.target.value }))} style={mapSel}>
                    <option value="">— none —</option>
                    {batchHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {batchData && (
        <div style={sec}>
          <div style={secH}>3. Model Settings</div>
          <div style={{ padding: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", color: "#333" }}>Capture CF (%)</label>
                <input type="number" value={cfIn || "85"} onChange={(e) => setCfIn(e.target.value)} style={{ ...fi, width: "100%", marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", color: "#333" }}>Discount Rate (%)</label>
                <input type="number" value={fixedHurdle} onChange={(e) => setFixedHurdle(Number(e.target.value))} style={{ ...fi, width: "100%", marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", color: "#333" }}>Project Life (yrs)</label>
                <input type="number" value={projLife} onChange={(e) => setProjLife(Number(e.target.value))} style={{ ...fi, width: "100%", marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", color: "#333" }}>Cost Year</label>
                <select value={yr} onChange={(e) => setYr(parseInt(e.target.value))} style={{ ...fi, width: "100%", marginTop: 4, textAlign: "left", cursor: "pointer" }}>
                  {Object.keys(CEPCI).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={runBatch} disabled={batchRunning || !batchColMap.state || !batchColMap.source}
                style={{ padding: "12px 32px", background: batchRunning ? "#ccc" : "#58b947", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 4, cursor: batchRunning ? "default" : "pointer" }}>
                {batchRunning ? "Running..." : "Run Batch Model"}
              </button>
              {!batchColMap.state || !batchColMap.source ? <span style={{ fontSize: 11, color: "#b83a4b" }}>Map State and Source columns first</span> : null}
            </div>
          </div>
        </div>
      )}

      {batchResults && (
        <div style={sec}>
          <div style={secH}>4. Results</div>
          <div style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16 }}>
              <div style={{ padding: "12px 20px", background: "#f0faf0", border: "2px solid #58b947", borderRadius: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>PROCESSED</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#58b947" }}>{batchResults.processed.toLocaleString()}</div>
              </div>
              <div style={{ padding: "12px 20px", background: "#fef2f2", border: "1px solid #e0e0e0", borderRadius: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>SKIPPED</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#b83a4b" }}>{batchResults.skipped.toLocaleString()}</div>
              </div>
              <div style={{ padding: "12px 20px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>TOTAL</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#333" }}>{batchResults.total.toLocaleString()}</div>
              </div>
              <button onClick={exportResults} style={{ padding: "12px 28px", background: "#58b947", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 4, cursor: "pointer", marginLeft: "auto" }}>
                Export to Excel
              </button>
            </div>

            <div style={{ overflow: "auto", maxHeight: 500 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "left" }}>Status</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "left" }}>State</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "left" }}>Source</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "right" }}>CO2 tpa</th>
                  <th style={{ padding: "6px 8px", background: "#58b947", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "right", color: "#fff" }}>LCOC $/t</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "right" }}>CAPEX $/t</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "right" }}>Fixed $/t</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "right" }}>Var $/t</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "right" }}>Elec $/t</th>
                  <th style={{ padding: "6px 8px", background: "#f5f5f5", border: "1px solid #e0e0e0", fontWeight: 700, position: "sticky", top: 0, textAlign: "right" }}>Gas $/t</th>
                </tr></thead>
                <tbody>
                  {batchResults.rows.slice(0, 200).map((r, i) => (
                    <tr key={i} style={{ background: r._status === "Skipped" ? "#fef2f2" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", color: r._status === "OK" ? "#58b947" : "#b83a4b", fontWeight: 700 }}>{r._status}{r._reason ? " — " + r._reason : ""}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0" }}>{r._stateResolved || "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0" }}>{r._srcResolved || "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r["CO2 tpa"] ? r["CO2 tpa"].toLocaleString() : "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", textAlign: "right", fontWeight: 700, color: "#58b947", fontVariantNumeric: "tabular-nums" }}>{r["CCUS Model LCOC"] != null ? "$" + r["CCUS Model LCOC"].toFixed(2) : "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r["CAPEX $/t"] != null ? "$" + r["CAPEX $/t"].toFixed(2) : "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r["Fixed OPEX $/t"] != null ? "$" + r["Fixed OPEX $/t"].toFixed(2) : "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r["Variable OPEX $/t"] != null ? "$" + r["Variable OPEX $/t"].toFixed(2) : "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r["Electricity $/t"] != null ? "$" + r["Electricity $/t"].toFixed(2) : "—"}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #f0f0f0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r["Nat Gas $/t"] != null ? "$" + r["Nat Gas $/t"].toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {batchResults.rows.length > 200 && <div style={{ padding: 10, fontSize: 11, color: "#888", textAlign: "center" }}>Showing first 200 of {batchResults.rows.length.toLocaleString()} rows. Export for full results.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
