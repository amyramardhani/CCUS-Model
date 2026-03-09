import { SC, CEPCI, LF, TECH, EIA, STATE_TAX, BASE_GP, NETL_FIN, NETL_DEFAULT, MACRS, HH_STRIP, HUB_BASIS, HUB_NAME, CDR_TYPES, AVOID_TYPES, EMIT_FACTORS } from '../constants';
import { fm } from '../utils/helpers';
import { sec, secH, cd, ch, thd } from '../utils/styles';

const SOURCES = [
  {
    id: "netl-point-source",
    short: "NETL Point-Source CCS",
    full: "DOE/NETL Carbon Capture Cost Studies — Point-Source CCS (Industrial & Power Sectors)",
    url: "https://netl.doe.gov/coal/carbon-storage/strategic-program-support/point-source-carbon-capture",
    reports: [
      "DOE/NETL-2017/1844 — Post-Combustion Carbon Capture from Industrial Sources",
      "DOE/NETL-2019/2041 — Carbon Capture Approaches for Natural Gas Power Plants",
      "DOE/NETL-2022/3278 — CCUS Cost Estimation Database"
    ],
    usage: "All 17 engineering-cost scenarios: TIC, CAPEX, Fixed OPEX, Variable OPEX, parasitic power, fuel consumption, capital charge factors, construction schedules, and financing assumptions.",
    note: "NETL Class 4–5 estimates (±30–50%). Costs are 2018 USD at Gulf Coast basis."
  },
  {
    id: "netl-dac",
    short: "NETL Direct Air Capture",
    full: "DOE/NETL — Direct Air Capture Technology Cost and Performance Assessment",
    url: "https://netl.doe.gov/carbon-management/carbon-capture/direct-air-capture",
    reports: [
      "DOE/NETL-2021/2650 — Direct Air Capture of CO₂ with Chemicals",
      "DOE/NETL-2022 — Liqtech Ocean CO₂ Removal Techno-Economic Analysis"
    ],
    usage: "Ambient Air (DAC) and Ocean Water capture scenarios: capital costs, sorbent/solvent costs, regeneration energy, and CO₂ compression.",
    note: "DAC costs are highly uncertain and represent early-commercial estimates."
  },
  {
    id: "cepci",
    short: "CEPCI (Chemical Engineering)",
    full: "Chemical Engineering Plant Cost Index — Chemical Engineering Magazine",
    url: "https://www.chemengonline.com/pci",
    reports: ["Chemical Engineering Magazine — Annual CEPCI values"],
    usage: "Cost escalation from 2018 base year to any target year. All CAPEX and fixed OPEX are multiplied by (CEPCI_target / CEPCI_2018 = CEPCI_target / 603.1).",
    note: "2025–2026 values are projected estimates. Actual values published monthly."
  },
  {
    id: "eia-electricity",
    short: "EIA Electric Power Monthly",
    full: "U.S. Energy Information Administration — Electric Power Monthly, Table 5.6.a",
    url: "https://www.eia.gov/electricity/monthly/",
    reports: ["EIA Table 5.6.a — Average Retail Price of Electricity to Ultimate Customers by End-Use Sector, by State (2024)"],
    usage: "State-level industrial electricity prices (¢/kWh) used as default power cost. Users may override. Rates are average annual values, not time-of-use.",
    note: "Published monthly. Rates include transmission and distribution charges."
  },
  {
    id: "bloomberg-gas",
    short: "Bloomberg Gas Markets",
    full: "Bloomberg Terminal — Natural Gas Hub Forward Strips and Basis Differentials",
    url: "https://www.bloomberg.com/energy",
    reports: ["Bloomberg Natural Gas Forward Strip (as of 2026-02-17)", "Bloomberg Hub Basis Differentials — 50 US trading hubs vs Henry Hub"],
    usage: "Henry Hub annual forward strip prices (2026–2038) and per-state basis differentials for 50 natural gas trading hubs. Auto-populates gas price based on selected state and COD year.",
    note: "Forward prices are market expectations and will change with market conditions."
  },
  {
    id: "rsmeans-netl-lf",
    short: "RSMeans / NETL Location Factors",
    full: "RSMeans Construction Cost Data + NETL Regional Construction Cost Indices",
    url: "https://www.rsmeans.com",
    reports: [
      "RSMeans Building Construction Cost Data — State Location Cost Factors",
      "NETL Regional Construction Cost Indices by State"
    ],
    usage: "51 state-level construction location factors (including DC) relative to Louisiana Gulf Coast baseline (0.97). Applied to TIC and CAPEX.",
    note: "State averages; site-specific conditions (seismic, permitting, labor) not captured."
  },
  {
    id: "tax-foundation",
    short: "Tax Foundation",
    full: "Tax Foundation — State Corporate Income Tax Rates and Brackets",
    url: "https://taxfoundation.org/data/all/state/state-corporate-income-tax-rates-2024/",
    reports: ["Tax Foundation — State Corporate Income Tax Rates and Brackets (2024)"],
    usage: "All 50 state + DC corporate income tax rates. Auto-populates based on selected project state. Combined with federal rate as: Effective = Federal + State − Federal × State.",
    note: "Top marginal rates. Some states (OH, WA, TX, NV, SD, WY) have no corporate income tax."
  },
  {
    id: "irs-45q",
    short: "IRS Section 45Q",
    full: "IRS Section 45Q — Credit for Carbon Oxide Sequestration",
    url: "https://www.irs.gov/businesses/corporations/section-45q-credit-for-carbon-oxide-sequestration",
    reports: [
      "IRS Notice 2021-47 — Credit for Carbon Oxide Sequestration Under Section 45Q",
      "Inflation Reduction Act of 2022 (H.R. 5376) — Enhanced 45Q Credit Amounts",
      "Treasury/IRS Final Regulations, 26 CFR Part 1, Section 45Q"
    ],
    usage: "45Q credit rate ($85/t for industrial/power, $180/t for DAC), start year, duration (up to 12 years from COD), and optional annual escalation. Credit monetized via direct pay or transfer.",
    note: "Prevailing wage + apprenticeship requirements apply for full credit. Phase-in rules for facilities beginning construction after 2032."
  },
  {
    id: "irs-48c",
    short: "IRS Section 48C",
    full: "IRS Section 48C — Advanced Energy Project Credit (Qualifying Advanced Energy Manufacturing Tax Credit)",
    url: "https://www.irs.gov/credits-deductions/inflation-reduction-act-of-2022-advanced-energy-project-credit",
    reports: [
      "Inflation Reduction Act of 2022 — Section 48C Enhanced Allocation",
      "IRS Notice 2023-29 — Advanced Energy Project Credit Program Guidance"
    ],
    usage: "Investment tax credit (ITC) on qualifying CCUS facility CAPEX. Default rate 30% (base 6% without wage/apprenticeship compliance). Applied as one-time CAPEX offset.",
    note: "Requires DOE certification and IRS allocation. Not all CCUS projects qualify. May stack with 45Q under IRA rules."
  },
  {
    id: "irs-macrs",
    short: "IRS MACRS Depreciation",
    full: "IRS Publication 946 — Modified Accelerated Cost Recovery System (MACRS)",
    url: "https://www.irs.gov/publications/p946",
    reports: [
      "IRS Publication 946 — How To Depreciate Property",
      "IRS Rev. Proc. 87-56 — Class Lives and Recovery Periods",
      "Tax Cuts and Jobs Act 2017 — Bonus Depreciation Rules"
    ],
    usage: "MACRS depreciation schedules for 5, 7, 10, 15, and 20-year property classes. Bonus depreciation option (100% Year 1). Used in NPV, IRR, and revenue model cash flow calculations.",
    note: "CCUS equipment typically classified as 5- or 7-year MACRS property. ITC basis reduction: 48C reduces depreciable basis by 50% of credit amount."
  },
  {
    id: "vcm-cdr",
    short: "VCM / CDR Market Data",
    full: "Voluntary Carbon Market — CDR and Avoidance Credit Pricing",
    url: "https://carbonplan.org/research/cdr-database",
    reports: [
      "CarbonPlan CDR Database — Permanent Carbon Removal Market Prices",
      "Frontier Climate — CDR Purchase Commitments and Market Intelligence",
      "Ecosystem Marketplace — Voluntary Carbon Market Sentiment Survey 2024"
    ],
    usage: "Default CDR credit prices by type (DAC $400/t, DACCS $600/t, Ocean $250/t, BECCS $150/t, BiCRS $120/t). Avoidance credit prices by source type (Industrial $25/t, Power CCS $30/t, etc.).",
    note: "VCM prices are highly variable and subject to buyer scrutiny and co-benefit requirements."
  },
  {
    id: "doe-ccus",
    short: "DOE CCUS Program",
    full: "U.S. Department of Energy — Carbon Capture, Utilization, and Storage (CCUS) Program",
    url: "https://www.energy.gov/fecm/carbon-capture-utilization-and-storage",
    reports: [
      "DOE FE — Carbon Capture Technology Program Plan",
      "DOE CCUS Roadmap 2020 — A Vision for Commercially Viable Carbon Capture"
    ],
    usage: "Technology performance targets, capture efficiency benchmarks, and R&D cost reduction trajectories used for technology adjustment factors and learning rates.",
    note: "DOE targets are aspirational. Current commercial technology reflects baseline amine (MEA) costs."
  },
  {
    id: "ipcc-biomass",
    short: "IPCC / EPA Emission Factors",
    full: "IPCC + EPA — Combustion Emission Factors for CO₂",
    url: "https://www.epa.gov/sites/default/files/2015-07/documents/emission-factors_2014.pdf",
    reports: [
      "EPA AP-42 — Compilation of Air Pollutant Emission Factors",
      "IPCC 2006 Guidelines — Emission Factors for Stationary Combustion"
    ],
    usage: "CO₂ emission factors: Natural gas (0.05306 t CO₂/MMBtu, HHV basis), Coal-SC (0.09552 t CO₂/MMBtu). Used to derive CO₂ production from heat rate and fuel consumption.",
    note: "HHV (Higher Heating Value) basis. Actual plant emissions depend on fuel quality and combustion efficiency."
  }
];

export default function AssumptionsTab({ res, src, st, yr, tech, codYear, projLife }) {
  const aBox = { ...sec, marginBottom: 14 };
  const aHdr = { ...secH, borderLeft: "3px solid #888888" };
  const aTh = { padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#888888", textTransform: "uppercase", textAlign: "left", borderBottom: "2px solid #e0e0e0" };
  const aTd = { padding: "6px 10px", fontSize: 11.5, color: "#444444", borderBottom: "1px solid #f0f0f0" };
  const aTdR = { ...aTd, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 };
  const aTdG = { ...aTd, color: "#888888", fontSize: 11 };
  const noteStyle = { fontSize: 11, color: "#aaaaaa", lineHeight: 1.6, marginTop: 10, padding: "8px 10px", borderTop: "1px solid #f0f0f0" };
  const srcTag = { fontSize: 9, fontWeight: 600, color: "#888888", background: "#f0f0f0", borderRadius: 3, padding: "1px 5px", marginLeft: 6 };

  return (
    <div>

      {/* ── 1. MODEL OVERVIEW ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #58b947"}}>Model Overview</div>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "10px 20px", fontSize: 12, color: "#555555", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: "#666666", fontSize: 11, textTransform: "uppercase" }}>Primary Basis</div>
            <div>NETL Carbon Capture Cost Database — bottom-up engineering cost models for 17 industrial and power-sector point-source CO₂ capture scenarios. Reference costs are 2018 USD at Gulf Coast (Louisiana) site basis.</div>
            <div style={{ fontWeight: 700, color: "#666666", fontSize: 11, textTransform: "uppercase" }}>Metric</div>
            <div>Levelized Cost of CO₂ Capture (LCOC) in $/tonne CO₂ captured. First-year basis: annualized capital (via capital charge factor) + annual OPEX + energy costs, all divided by annual CO₂ tonnage. No transport, storage, or revenue offsets in the LCOC baseline.</div>
            <div style={{ fontWeight: 700, color: "#666666", fontSize: 11, textTransform: "uppercase" }}>System Boundary</div>
            <div>Capture plant battery limits only. Excludes CO₂ pipeline, injection well, storage formation, monitoring/verification, and host-plant modifications outside the capture island. For NGCC retrofit, host plant CAPEX/OPEX is excluded.</div>
            <div style={{ fontWeight: 700, color: "#666666", fontSize: 11, textTransform: "uppercase" }}>Accuracy Class</div>
            <div>NETL Class 4–5 estimates (AACE International) corresponding to ±30–50% project cost accuracy. Appropriate for conceptual screening and pre-feasibility studies only. Not suitable for investment decisions without further engineering development.</div>
            <div style={{ fontWeight: 700, color: "#666666", fontSize: 11, textTransform: "uppercase" }}>Financial Model</div>
            <div>NPV and IRR computed using annual discounted cash flows over project life, incorporating revenue sources (45Q, CDR credits, avoidance credits), OPEX, depreciation tax shield, and effective combined federal + state tax rate. WACC or fixed hurdle rate used as discount rate.</div>
          </div>
        </div>
      </div>

      {/* ── 2. COST ENGINEERING METHODOLOGY ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #93348f"}}>Cost Engineering Methodology</div>
        <div style={{ padding: "0 18px 14px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead><tr>
              <th style={aTh}>Adjustment</th>
              <th style={aTh}>Formula</th>
              <th style={{...aTh, textAlign: "right"}}>Current Value</th>
              <th style={aTh}>Source</th>
            </tr></thead>
            <tbody>
              {[
                { name: "Cost Year Escalation", formula: "CEPCI_yr / CEPCI_2018 = CEPCI_yr / 603.1", val: yr ? `${((CEPCI[yr]||CEPCI[2026])/603.1).toFixed(3)}× (${yr})` : "—", src: "CEPCI" },
                { name: "Location Factor", formula: "LF_state / LF_base (LA = 0.97)", val: st ? `${((LF[st]?.f||1)/0.97).toFixed(3)}× (${LF[st]?.n||st})` : "—", src: "RSMeans/NETL" },
                { name: "Technology Factor (CAPEX)", formula: "tech.capex multiplier vs Amine", val: tech ? `${(TECH[tech]?.capex||1).toFixed(2)}×` : "—", src: "DOE/NETL" },
                { name: "Technology Factor (OPEX)", formula: "tech.opex multiplier vs Amine", val: tech ? `${(TECH[tech]?.opex||1).toFixed(2)}×` : "—", src: "DOE/NETL" },
                { name: "CAPEX Scaling Exponent", formula: "(capacity_ratio) ^ 0.60", val: "0.60 (six-tenths rule)", src: "NETL / Industry" },
                { name: "Fixed OPEX Scaling", formula: "(1 / capacity_ratio) ^ 0.15", val: "0.15 (exponent)", src: "NETL" },
                { name: "Gas Price Reference", formula: "Fuel_cost scales as GP_user / $4.42", val: `$${BASE_GP}/MMBtu (2018 base)`, src: "NETL" },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{...aTd, fontWeight: 600}}>{r.name}</td>
                  <td style={{ ...aTd, fontFamily: "Courier New, monospace", fontSize: 11, color: "#666666" }}>{r.formula}</td>
                  <td style={aTdR}>{r.val}</td>
                  <td style={aTdG}>{r.src}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 4, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#666666", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Scaled TIC Formula</div>
              <div style={{ fontFamily: "Courier New, monospace", fontSize: 11, color: "#555555", lineHeight: 1.8 }}>
                TIC_scaled = TIC_ref<br />
                &nbsp;&nbsp;× (capacity_ratio)^0.60<br />
                &nbsp;&nbsp;× (CEPCI_yr / 603.1)<br />
                &nbsp;&nbsp;× (LF_state / LF_base)
              </div>
            </div>
            <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 4, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#666666", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total LCOC Formula</div>
              <div style={{ fontFamily: "Courier New, monospace", fontSize: 11, color: "#555555", lineHeight: 1.8 }}>
                LCOC = (CAPEX × WACC<br />
                &nbsp;&nbsp;+ FixedOPEX + VarOPEX<br />
                &nbsp;&nbsp;+ PowerCost + FuelCost)<br />
                &nbsp;&nbsp;/ Annual_CO₂_tonnes
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FINANCIAL METHODOLOGY ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #58a7af"}}>Financial Methodology</div>
        <div style={{ padding: "0 18px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
            {/* WACC / Discount Rate */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#444444", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>WACC & Discount Rate</div>
              <div style={{ fontSize: 11, color: "#666666", lineHeight: 1.7 }}>
                <strong>WACC</strong> = (Debt% × Cost_Debt × (1 − Tax_rate)) + (Equity% × Cost_Equity)<br />
                Where Equity% = 1 − Debt%.<br /><br />
                The <strong>discount rate</strong> equals WACC unless a fixed hurdle rate is selected. NPV and IRR calculations use this rate as the time-value-of-money benchmark.<br /><br />
                NETL default financing parameters (debt %, cost of debt, cost of equity) vary by source sector based on project risk profiles from NETL cost reports.
              </div>
            </div>
            {/* Capital Charge Factor */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#444444", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>WACC (Weighted Average Cost of Capital)</div>
              <div style={{ fontSize: 11, color: "#666666", lineHeight: 1.7 }}>
                WACC is applied directly to CAPEX to compute the annual capital charge ($/t CO₂):<br /><br />
                <strong>Capital_charge = CAPEX × WACC / Annual_CO₂</strong><br /><br />
                WACC = (Debt% × Cost of Debt) + (Equity% × Cost of Equity). It reflects the blended cost of financing from both debt and equity sources.
              </div>
            </div>
            {/* TASC */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#444444", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>TASC / IDC (Interest During Construction)</div>
              <div style={{ fontSize: 11, color: "#666666", lineHeight: 1.7 }}>
                Total As-Spent Cost (TASC) adds interest during construction (IDC) to overnight CAPEX. Multi-year construction schedules draw down capital over the construction period; interest accrues on unspent funds.<br /><br />
                <strong>TASC = CAPEX × tascToc_factor</strong><br /><br />
                NETL tascToc factors range from 1.025 (single-year construction) to 1.091 (4-year construction, Steel & Iron). The custom financial model recomputes IDC dynamically from user-defined WACC and construction years.
              </div>
            </div>
            {/* Depreciation */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#444444", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>Depreciation & Tax Shield</div>
              <div style={{ fontSize: 11, color: "#666666", lineHeight: 1.7 }}>
                MACRS depreciation creates a tax shield that reduces effective cash taxes in early project years. For the NPV/IRR model:<br /><br />
                <strong>Tax = max(0, (EBITDA − Depreciation) × EffTax%)</strong><br />
                <strong>Annual_CF = EBITDA − Tax</strong><br /><br />
                If 48C ITC is claimed, the depreciable basis is reduced by 50% of the ITC amount (per IRS rules). Bonus depreciation allows 100% Year-1 deduction regardless of MACRS class life.
              </div>
            </div>
          </div>

          {/* NETL Financial Parameters Table */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666666", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>NETL Default Financial Parameters by Source</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={aTh}>Source</th>
                <th style={{...aTh, textAlign:"right"}}>Debt %</th>
                <th style={{...aTh, textAlign:"right"}}>Cost of Debt</th>
                <th style={{...aTh, textAlign:"right"}}>ROE</th>
                <th style={{...aTh, textAlign:"right"}}>WACC</th>
                <th style={{...aTh, textAlign:"right"}}>TASC/TOC</th>
                <th style={{...aTh, textAlign:"right"}}>Constr. Yrs</th>
                <th style={{...aTh, textAlign:"right"}}>CAPEX Schedule</th>
                <th style={{...aTh, textAlign:"right"}}>COD (est.)</th>
                <th style={{...aTh, textAlign:"right"}}>Proj. Life</th>
                <th style={{...aTh, textAlign:"right"}}>Op. End (est.)</th>
              </tr></thead>
              <tbody>
                {Object.entries(NETL_FIN).map(([name, f]) => {
                  const estCOD = yr + f.constructionYrs;
                  const estEnd = estCOD + f.projectLife;
                  const isCurrent = name === src;
                  return (
                  <tr key={name} style={{ background: isCurrent ? "#f0faf0" : "transparent" }}>
                    <td style={{...aTd, fontWeight: isCurrent ? 700 : 400}}>{name}{isCurrent && <span style={{...srcTag, background:"#e8f5e9", color:"#4aa63b"}}> ← current</span>}</td>
                    <td style={aTdR}>{f.debtPct}%</td>
                    <td style={aTdR}>{f.costDebt.toFixed(2)}%</td>
                    <td style={aTdR}>{f.roe.toFixed(2)}%</td>
                    <td style={{...aTdR, color:"#58a7af"}}>{((f.debtPct/100)*f.costDebt + ((100-f.debtPct)/100)*f.roe).toFixed(2)}%</td>
                    <td style={aTdR}>{f.tascToc.toFixed(3)}×</td>
                    <td style={aTdR}>{f.constructionYrs} yr</td>
                    <td style={{...aTdR, fontSize:9, color:"#888888"}}>{f.capexDist.map((d,i)=>`Y${i+1}:${(d*100).toFixed(0)}%`).join(" / ")}</td>
                    <td style={{...aTdR, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "#58b947" : "#444444"}}>{isCurrent ? codYear : estCOD}</td>
                    <td style={aTdR}>{f.projectLife} yr</td>
                    <td style={{...aTdR, color:"#888888"}}>{isCurrent ? (codYear + (projLife ?? f.projectLife)) : estEnd}</td>
                  </tr>);
                })}
              </tbody>
            </table>
            <div style={noteStyle}>Source: NETL engineering cost reports. ROE = Return on Equity (levered). WACC = Weighted Average Cost of Capital applied directly to CAPEX. Highlighted row = currently selected source.</div>
          </div>
        </div>
      </div>

      {/* ── 4. CAPTURE TECHNOLOGY FACTORS ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #58b947"}}>Capture Technology Adjustment Factors</div>
        <div style={{ padding: "0 10px 10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={aTh}>Technology</th>
              <th style={{...aTh, textAlign:"right"}}>CAPEX ×</th>
              <th style={{...aTh, textAlign:"right"}}>OPEX ×</th>
              <th style={{...aTh, textAlign:"right"}}>Power ×</th>
              <th style={{...aTh, textAlign:"right"}}>Learn Rate</th>
              <th style={aTh}>Compatible Source Categories</th>
              <th style={aTh}>Description</th>
            </tr></thead>
            <tbody>
              {Object.entries(TECH).map(([k, t]) => (
                <tr key={k} style={{ background: k === tech ? "#f0faf0" : "transparent" }}>
                  <td style={{...aTd, fontWeight: 700}}>{t.n}{k === tech && <span style={{...srcTag, background:"#e8f5e9", color:"#4aa63b"}}>current</span>}</td>
                  <td style={aTdR}>{t.capex.toFixed(2)}×</td>
                  <td style={aTdR}>{t.opex.toFixed(2)}×</td>
                  <td style={aTdR}>{t.power.toFixed(2)}×</td>
                  <td style={{...aTdR, color: t.learn >= 0.04 ? "#58b947" : t.learn >= 0.02 ? "#f68d2e" : "#888888"}}>{((t.learn||0)*100).toFixed(0)}%/yr</td>
                  <td style={{...aTdG, fontSize: 10}}>{t.compat.join(", ")}</td>
                  <td style={aTdG}>{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={noteStyle}>All factors are multipliers relative to baseline Amine (MEA = 1.00×). <strong>Learn Rate</strong>: annual cost reduction from technology maturation (applied to CAPEX/OPEX; floored at 50%). Green &gt;4%/yr = fast learning; amber 2–4% = moderate; gray &lt;2% = mature/physics-limited. Source: DOE/NETL + DOE technology development roadmaps.</div>
        </div>
      </div>

      {/* ── 5. ENERGY PRICING ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* CEPCI */}
        <div style={aBox}>
          <div style={{...aHdr, borderLeft: "3px solid #f68d2e"}}>CEPCI Index Values</div>
          <div style={{ padding: "0 10px 10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={aTh}>Year</th>
                <th style={{...aTh, textAlign:"right"}}>Index</th>
                <th style={{...aTh, textAlign:"right"}}>vs 2018</th>
                <th style={aTh}>Note</th>
              </tr></thead>
              <tbody>
                {Object.entries(CEPCI).map(([y, v]) => (
                  <tr key={y} style={{ background: parseInt(y) === yr ? "#fff9e6" : "transparent" }}>
                    <td style={aTd}>{y}{parseInt(y) === yr && <span style={{...srcTag, background:"#fef3c7", color:"#d97706"}}>selected</span>}</td>
                    <td style={aTdR}>{v.toFixed(1)}</td>
                    <td style={aTdR}>{(v/603.1).toFixed(3)}×</td>
                    <td style={aTdG}>{parseInt(y) >= 2025 ? "est." : "actual"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={noteStyle}>Source: Chemical Engineering Magazine — published monthly. 2018 base = 603.1. 2025–2026 are projected estimates pending publication.</div>
          </div>
        </div>

        {/* HH Strip */}
        <div style={aBox}>
          <div style={{...aHdr, borderLeft: "3px solid #58a7af"}}>Henry Hub Forward Strip ($/MMBtu)</div>
          <div style={{ padding: "0 10px 10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={aTh}>Year</th>
                <th style={{...aTh, textAlign:"right"}}>HH Price</th>
                <th style={{...aTh, textAlign:"right"}}>vs 2018 Base ($4.42)</th>
              </tr></thead>
              <tbody>
                {Object.entries(HH_STRIP).map(([y, p]) => (
                  <tr key={y}>
                    <td style={aTd}>{y}</td>
                    <td style={aTdR}>${p.toFixed(2)}</td>
                    <td style={{...aTdR, color: p >= BASE_GP ? "#b83a4b" : "#58b947"}}>{(p/BASE_GP).toFixed(3)}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={noteStyle}>Source: Bloomberg Terminal — annual average Henry Hub forward strip as of 2026-02-17. State prices add hub basis differential (see table below). NETL 2018 base = $4.42/MMBtu.</div>
          </div>
        </div>
      </div>

      {/* Hub Basis Differentials */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #58a7af"}}>Natural Gas Hub Basis Differentials by State ($/MMBtu vs Henry Hub)</div>
        <div style={{ padding: "0 10px 10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
            {Object.entries(HUB_BASIS).sort((a,b) => (LF[a[0]]?.n||a[0]).localeCompare(LF[b[0]]?.n||b[0])).map(([code, basis]) => (
              <div key={code} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 10px", borderBottom:"1px solid #fafafa", background: code === st ? "#f0f0ff" : "transparent" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: code === st ? 700 : 500, color: "#444444" }}>{code}</span>
                  <div style={{ fontSize: 9, color: "#aaaaaa" }}>{HUB_NAME[code]||"Henry Hub"}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: basis > 0 ? "#b83a4b" : basis < 0 ? "#58b947" : "#888888", fontVariantNumeric: "tabular-nums" }}>
                  {basis >= 0 ? "+" : ""}{basis.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div style={noteStyle}>Source: Bloomberg Terminal — 2025 average basis differentials. State price = Henry Hub + basis. Red = premium to HH; green = discount. New England (CT, MA, ME, NH, RI, VT) carries significant positive basis due to pipeline capacity constraints. Highlighted = current state selection.</div>
        </div>
      </div>

      {/* EIA + State Tax side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={aBox}>
          <div style={{...aHdr, borderLeft: "3px solid #b83a4b"}}>EIA Industrial Electricity Rates ($/MWh)</div>
          <div style={{ padding: "0 10px 10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {Object.entries(EIA).sort((a,b) => (LF[a[0]]?.n||a[0]).localeCompare(LF[b[0]]?.n||b[0])).map(([code, rate]) => (
                <div key={code} style={{ display:"flex", justifyContent:"space-between", padding:"3px 10px", borderBottom:"1px solid #fafafa", background: code === st ? "#fff0f0" : "transparent" }}>
                  <span style={{ fontSize: 11, color: "#888888" }}>{LF[code]?.n||code}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: rate > 15 ? "#b83a4b" : rate < 7 ? "#58b947" : "#444444", fontVariantNumeric: "tabular-nums" }}>${(rate*10).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div style={noteStyle}>Source: EIA Electric Power Monthly, Table 5.6.a (2024). Average industrial customer rate including T&D charges. Converted: ¢/kWh × 10 = $/MWh. Highlighted = current state. Red = high cost (&gt;$150/MWh), green = low cost (&lt;$70/MWh).</div>
          </div>
        </div>

        <div style={aBox}>
          <div style={{...aHdr, borderLeft: "3px solid #f68d2e"}}>State Corporate Income Tax Rates</div>
          <div style={{ padding: "0 10px 10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {Object.entries(STATE_TAX).sort((a,b) => a[0].localeCompare(b[0])).map(([code, rate]) => (
                <div key={code} style={{ display:"flex", justifyContent:"space-between", padding:"3px 10px", borderBottom:"1px solid #fafafa", background: code === st ? "#fff9e6" : rate === 0 ? "#f0faf0" : "transparent" }}>
                  <span style={{ fontSize: 11, color: "#888888" }}>{code}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: rate === 0 ? "#58b947" : "#444444", fontVariantNumeric: "tabular-nums" }}>{rate === 0 ? "None" : rate.toFixed(2)+"%"}</span>
                </div>
              ))}
            </div>
            <div style={noteStyle}>Source: Tax Foundation + Enverus (2024). Top marginal rates. States with no corporate income tax: NV, OH, SD, TX, WA, WY. Green = no corporate tax. Highlighted = current state. Effective rate = Federal + State − Federal × State.</div>
          </div>
        </div>
      </div>

      {/* ── 6. POLICY INCENTIVES ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #58b947"}}>Policy Incentives & Credits</div>
        <div style={{ padding: "0 18px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#58b947", borderBottom: "1px solid #e0e0e0", paddingBottom: 6, marginBottom: 10 }}>Section 45Q — Carbon Capture Credit</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                {[
                  ["Credit Rate — Industrial/Power", "$85/tonne CO₂ (IRA 2022)"],
                  ["Credit Rate — Direct Air Capture", "$180/tonne CO₂ (IRA 2022)"],
                  ["Credit Rate — EOR Utilization", "$60/tonne (industrial), $130/t (DAC)"],
                  ["Duration", "Up to 12 years from commercial operation date"],
                  ["Prevailing Wage Req.", "Required for full credit; 1/5th rate without compliance"],
                  ["Monetization", "Direct pay (non-taxable entities) or tax credit transfer"],
                  ["Effective Date", "Facilities beginning construction after Jan 1, 2023"],
                  ["Escalation Option", "User-defined annual % escalation modeled over credit period"],
                  ["Sequestration Req.", "Geological storage OR permanent industrial use"],
                ].map(([k, v], i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "4px 0", color: "#888888", width: "45%" }}>{k}</td>
                    <td style={{ padding: "4px 0", fontWeight: 600, color: "#444444" }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#58a7af", borderBottom: "1px solid #e0e0e0", paddingBottom: 6, marginBottom: 10 }}>Section 48C — Advanced Energy ITC</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                {[
                  ["Base Credit Rate", "6% of qualifying CAPEX"],
                  ["Bonus Rate (Wage+Apprentice)", "30% of qualifying CAPEX"],
                  ["Basis Reduction", "Depreciable basis reduced by 50% of ITC amount"],
                  ["Eligibility", "Carbon capture equipment; requires DOE certification"],
                  ["IRA Allocation (Round 2)", "$10B total; ~$6B for non-wind/solar"],
                  ["Application", "Competitive allocation via DOE + IRS process"],
                  ["Stacking with 45Q", "Permitted under IRA (cannot claim for same costs)"],
                ].map(([k, v], i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "4px 0", color: "#888888", width: "45%" }}>{k}</td>
                    <td style={{ padding: "4px 0", fontWeight: 600, color: "#444444" }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>
          </div>

          {/* CDR and Avoidance Credit Types */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#58a7af", borderBottom: "1px solid #e0e0e0", paddingBottom: 6, marginBottom: 8 }}>CDR Credit Types (VCM)</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{...aTh, fontSize:9}}>Type</th>
                  <th style={{...aTh, textAlign:"right", fontSize:9}}>Default $/t</th>
                  <th style={{...aTh, fontSize:9}}>Description</th>
                </tr></thead>
                <tbody>
                  {Object.entries(CDR_TYPES).filter(([k]) => k !== "custom").map(([k, v]) => (
                    <tr key={k}><td style={{...aTd, fontSize:10, fontWeight:600}}>{v.name}</td><td style={{...aTdR, fontSize:10}}>${v.price}</td><td style={{...aTdG, fontSize:10}}>{v.desc}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f68d2e", borderBottom: "1px solid #e0e0e0", paddingBottom: 6, marginBottom: 8 }}>Avoidance Credit Types (VCM)</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{...aTh, fontSize:9}}>Type</th>
                  <th style={{...aTh, textAlign:"right", fontSize:9}}>Default $/t</th>
                  <th style={{...aTh, fontSize:9}}>Description</th>
                </tr></thead>
                <tbody>
                  {Object.entries(AVOID_TYPES).filter(([k]) => k !== "custom").map(([k, v]) => (
                    <tr key={k}><td style={{...aTd, fontSize:10, fontWeight:600}}>{v.name}</td><td style={{...aTdR, fontSize:10}}>${v.price}</td><td style={{...aTdG, fontSize:10}}>{v.desc}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={noteStyle}>CDR/Avoidance credit prices are indicative VCM market ranges as of 2024–2025. Actual transaction prices vary significantly by buyer, verification standard, co-benefits, and permanence. Source: CarbonPlan CDR Database, Frontier Climate, Ecosystem Marketplace.</div>
        </div>
      </div>

      {/* ── 7. MACRS DEPRECIATION ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #f68d2e"}}>MACRS Depreciation Schedules</div>
        <div style={{ padding: "0 10px 10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={aTh}>Year</th>
              {Object.keys(MACRS).filter(k => k !== "bonus").map(k => (
                <th key={k} style={{...aTh, textAlign:"right"}}>{k.replace("-yr"," yr")}</th>
              ))}
              <th style={{...aTh, textAlign:"right"}}>Bonus 100%</th>
            </tr></thead>
            <tbody>
              {Array.from({length: 21}, (_, i) => i+1).map(yr => {
                const hasData = Object.values(MACRS).some(s => s[yr-1] > 0);
                if (!hasData) return null;
                return (
                  <tr key={yr} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={aTd}>{yr}</td>
                    {Object.entries(MACRS).filter(([k]) => k !== "bonus").map(([k, s]) => (
                      <td key={k} style={{...aTdR, color: s[yr-1] > 0 ? "#444444" : "#e0e0e0", fontSize: 10}}>
                        {s[yr-1] > 0 ? (s[yr-1]*100).toFixed(2)+"%" : "—"}
                      </td>
                    ))}
                    <td style={{...aTdR, color: yr === 1 ? "#58b947" : "#e0e0e0", fontSize: 10}}>{yr === 1 ? "100.00%" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={noteStyle}>Source: IRS Publication 946, Rev. Proc. 87-56. Half-year convention applies. CCUS equipment typically 5-yr or 7-yr class life. Bonus depreciation (100% Year 1) under TCJA 2017 / IRA 2022. When 48C ITC is claimed, depreciable basis = CAPEX − (ITC amount × 50%) per IRS basis adjustment rules.</div>
        </div>
      </div>

      {/* ── 8. EMISSION FACTORS ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #b83a4b"}}>Combustion Emission Factors</div>
        <div style={{ padding: "0 10px 10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={aTh}>Source</th>
              <th style={{...aTh, textAlign:"right"}}>t CO₂/MMBtu</th>
              <th style={{...aTh, textAlign:"right"}}>kg CO₂/MMBtu</th>
              <th style={{...aTh, textAlign:"right"}}>lbs CO₂/MMBtu</th>
              <th style={aTh}>Heating Basis</th>
              <th style={aTh}>Reference</th>
            </tr></thead>
            <tbody>
              {Object.entries(EMIT_FACTORS).map(([s, f]) => (
                <tr key={s} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{...aTd, fontWeight: 600}}>{s}</td>
                  <td style={aTdR}>{f > 0 ? f.toFixed(5) : "—"}</td>
                  <td style={{...aTdR, fontWeight: 600, color: "#333"}}>{f > 0 ? (f * 1000).toFixed(2) : "0 (biogenic)"}</td>
                  <td style={aTdR}>{f > 0 ? (f * 2204.62).toFixed(2) : "—"}</td>
                  <td style={aTdG}>HHV</td>
                  <td style={aTdG}>
                    {s === "Biomass" ? "Biogenic — excluded from fossil CO₂ accounting" :
                     s.startsWith("NGCC") ? "EPA AP-42 §1.4 — Natural Gas Combustion" :
                     "EPA AP-42 §1.1 — Bituminous/Subbituminous Coal Blend"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={noteStyle}>
            Conversion: 1 t CO₂/MMBtu = 1,000 kg CO₂/MMBtu = 2,204.62 lbs CO₂/MMBtu. All factors on a Higher Heating Value (HHV) basis.
            Used in plant-cap mode: CO₂ (t/yr) = Net MW × CF × 8,760 hr/yr × Heat Rate (MMBtu/MWh) × Emission Factor (t CO₂/MMBtu).
            Biomass CO₂ treated as zero under biogenic carbon accounting (IPCC 2006 Guidelines, Vol. 2).
          </div>
        </div>
      </div>

      {/* ── 9. SCENARIO REFERENCE DATA ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #93348f"}}>NETL Reference Scenario Data (2018 USD, Gulf Coast Basis)</div>
        <div style={{ overflowX: "auto", padding: "0 0 10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
            <thead><tr>
              {["Source","Category","Ref Size","CO₂ t/yr","TIC ($M)","CAPEX ($M)","Fixed $/t","Var $/t","Power MW","Fuel $/t","WACC","Base State"].map(h => (
                <th key={h} style={{...aTh, whiteSpace:"nowrap", padding:"6px 8px"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {Object.entries(SC).map(([name, s]) => {
                const d = s.vr ? Object.values(s.vr)[0] : s;
                return (
                  <tr key={name} style={{ borderBottom:"1px solid #f0f0f0", background: name === src ? "#f0faf0" : "transparent" }}>
                    <td style={{...aTd, fontWeight:700, padding:"5px 8px"}}>{name}{name === src && <span style={{...srcTag, background:"#e8f5e9", color:"#4aa63b"}}>current</span>}</td>
                    <td style={{...aTdG, padding:"5px 8px"}}>{s.cat}</td>
                    <td style={{...aTd, padding:"5px 8px", fontSize:10}}>{s.rps}</td>
                    <td style={{...aTdR, padding:"5px 8px"}}>{fm(d.rco||s.rco,0)}</td>
                    <td style={{...aTdR, padding:"5px 8px"}}>{(d.tic||s.tic||0).toFixed(0)}</td>
                    <td style={{...aTdR, padding:"5px 8px"}}>{(d.toc||s.toc||0).toFixed(0)}</td>
                    <td style={{...aTdR, padding:"5px 8px"}}>{(d.fo||s.fo||0).toFixed(2)}</td>
                    <td style={{...aTdR, padding:"5px 8px"}}>{(d.vo||s.vo||0).toFixed(2)}</td>
                    <td style={{...aTdR, padding:"5px 8px"}}>{(d.pw||s.pw||0).toFixed(0)}</td>
                    <td style={{...aTdR, padding:"5px 8px"}}>{(d.fl||s.fl||0).toFixed(2)}</td>
                    <td style={{...aTdR, padding:"5px 8px", color:"#58a7af"}}>{(()=>{ const fin=NETL_FIN[name]; return fin ? ((fin.debtPct/100)*fin.costDebt+((100-fin.debtPct)/100)*fin.roe).toFixed(2) : ((d.ccf||s.ccf||0.06)*100).toFixed(2); })()}%</td>
                    <td style={{...aTdG, padding:"5px 8px"}}>{LF[s.bs]?.n||s.bs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={noteStyle}>All costs in 2018 USD. CAPEX = TIC + Owner's Costs. OPEX in $/t CO₂. Power = parasitic load at reference capacity. Fuel = natural gas cost at $4.42/MMBtu base. WACC applied directly to CAPEX for annual capital charge. Source: DOE/NETL engineering cost reports.</div>
      </div>

      {/* ── 10. LOCATION FACTORS ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #93348f"}}>State Construction Location Factors</div>
        <div style={{ padding: "0 10px 10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
            {Object.entries(LF).sort((a,b) => a[1].n.localeCompare(b[1].n)).map(([code, s]) => (
              <div key={code} style={{ display:"flex", justifyContent:"space-between", padding:"4px 10px", borderBottom:"1px solid #fafafa", fontSize:11, background: code === st ? "#f5f0ff" : "transparent" }}>
                <span style={{ color:"#888888" }}>{s.n}</span>
                <span style={{ fontWeight:600, color: s.f > 1.20 ? "#b83a4b" : s.f < 0.97 ? "#58b947" : "#444444", fontVariantNumeric:"tabular-nums" }}>{s.f.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={noteStyle}>Factors relative to Louisiana Gulf Coast (0.97 ≈ 1.00 normalized basis). Applied to all capital costs. Red &gt;1.20 = high cost region; green &lt;0.97 = below average. Source: RSMeans construction cost data + NETL regional indices. Highlighted = current state.</div>
        </div>
      </div>

      {/* ── 11. KEY FORMULAS ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #444444"}}>Key Formulas Reference</div>
        <div style={{ padding: "0 18px 14px" }}>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {[
              { name: "CEPCI Escalation", formula: "cost_yr = cost_2018 × (CEPCI_yr / 603.1)", note: "Applied to all CAPEX and fixed OPEX" },
              { name: "Location Adjustment", formula: "cost_loc = cost × (LF_state / LF_baseState)", note: "State LF divided by source's reference state LF" },
              { name: "CAPEX Scale (Six-Tenths)", formula: "TIC_scaled = TIC_ref × (capacity_ratio) ^ 0.60", note: "capacity_ratio = user_CO₂ / ref_CO₂ (or plant capacity ratio)" },
              { name: "Fixed OPEX Scale", formula: "FOM_scaled = FOM_ref × (1/capacity_ratio)^0.15 × CEPCI_ratio", note: "Per-unit fixed costs decrease at larger scale" },
              { name: "Variable OPEX", formula: "VOM_scaled = VOM_ref × CEPCI_ratio", note: "No scale adjustment — proportional to throughput" },
              { name: "Capital Charge ($/t)", formula: "capC = CAPEX_scaled × WACC / annual_CO₂_tonnes", note: "WACC from user-defined financing parameters" },
              { name: "Power Cost ($/t)", formula: "pPt = Power_MW_scaled × $/MWh × CF × 8,760 / annual_CO₂", note: "Parasitic electricity × price × operating hours" },
              { name: "Fuel Cost ($/t)", formula: "sFL = fuel_ref × (gas_price / $4.42)", note: "Linear scaling from NETL 2018 gas price base" },
              { name: "WACC", formula: "WACC = Debt% × r_d × (1−Tax) + Equity% × r_e", note: "After-tax WACC. Equity% = 1 − Debt%" },
              { name: "TASC (IDC)", formula: "TASC = CAPEX × tascFactor(constructionYrs, capexDist, WACC)", note: "Interest during construction; dynamically computed from WACC + construction schedule" },
              { name: "Annual NPV Cash Flow", formula: "CF_t = (Revenue_t − OPEX) × (1 − Tax) + Depreciation × Tax", note: "Tax shield from depreciation added back. Year-t depreciation per MACRS schedule." },
              { name: "NPV", formula: "NPV = −NetCapex + Σ [CF_t / (1+r)^t]  for t=1..life", note: "NetCapex = CAPEX − ITC − Grant. r = discount rate (WACC or hurdle)" },
              { name: "IRR", formula: "0 = −NetCapex + Σ [CF_t / (1+IRR)^t]", note: "Solved via Newton-Raphson iteration. Green if IRR ≥ discount rate." },
              { name: "Effective Tax Rate", formula: "effTax = Federal + State − Federal × State", note: "Combined marginal effective rate (avoids double-counting interaction)" },
              { name: "Total LCOC ($/t)", formula: "LCOC = capC + FOM + VOM + pPt + sFL", note: "First-year basis; does not include revenue offsets" },
            ].map((f, i, arr) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"180px 1fr", gap:12, padding:"6px 0", borderBottom: i < arr.length-1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#555555" }}>{f.name}</div>
                <div>
                  <div style={{ fontFamily:"Courier New, monospace", fontSize:11.5, color:"#555555", background:"#fafafa", padding:"4px 10px", border:"1px solid #f0f0f0", borderRadius:3, marginBottom:3 }}>{f.formula}</div>
                  <div style={{ fontSize:10.5, color:"#aaaaaa" }}>{f.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 12. LIMITATIONS ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #b83a4b"}}>Limitations & Caveats</div>
        <div style={{ padding: "12px 18px 14px", fontSize:12, color:"#666666", lineHeight:1.7 }}>
          {[
            ["Cost Accuracy", "NETL reference costs are Class 4–5 estimates (AACE International) with ±30–50% accuracy range. Appropriate for screening and pre-feasibility only. Project-specific FEED studies required for investment decisions."],
            ["Scaling Rule", "The six-tenths power law (exponent 0.6) is an empirical approximation. Accuracy degrades beyond ±50% of the NETL reference plant size. Modular or novel designs may not follow this relationship."],
            ["OPEX Completeness", "OPEX costs do not include CO₂ compression to pipeline pressure (if separate from capture plant), transport pipeline O&M, injection well operation, long-term monitoring, verification, and reporting (MVR), or decommissioning."],
            ["Energy Prices", "Electricity and natural gas prices are treated as constant over project life (no escalation). No time-of-use pricing, demand charges, or interruptible supply discounts are modeled."],
            ["CEPCI Projections", "CEPCI values for 2025–2026 are estimated projections and may differ from actual published values. Monitor chemengonline.com for updates."],
            ["WACC / Capital Charge", "WACC is applied directly to CAPEX as the annual capital charge rate. This simplifies the NETL CCF approach but does not account for tax depreciation shields or construction-period interest separately."],
            ["NGCC Retrofit Assumption", "NGCC cost scenarios represent incremental retrofit costs only. The host gas turbine plant CAPEX, OPEX, fuel, and generation revenue are excluded. Capture plant parasitic load reduces net electricity output."],
            ["Biomass Carbon Accounting", "Biomass (BECCS) CO₂ emission factor is set to zero per biogenic carbon accounting convention. Full life-cycle carbon balance (land use, feedstock supply chain) is not captured in this model."],
            ["Location Factors", "State-level location factors are area averages. Site-specific conditions (soil conditions, seismic zone, local permitting requirements, labor market tightness, remote location) are not captured."],
            ["45Q and Policy Credits", "Policy credits (45Q, 48C) are subject to change. Current values reflect IRA 2022 provisions. Treasury regulations and IRS guidance continue to evolve. Consult legal/tax counsel before relying on credit amounts."],
            ["VCM Credit Prices", "Voluntary carbon market prices are indicative ranges only. Actual transaction prices depend on buyer requirements, verification standards, co-benefits (additionality, permanence, SDGs), and market liquidity."],
            ["Technology Learning Rates", "Learning rate factors are approximate and based on historical technology cost reduction trends. Actual cost reductions depend on deployment scale, supply chain development, and R&D investment."],
          ].map(([title, text], i) => (
            <div key={i} style={{ display:"flex", gap:12, marginBottom:8 }}>
              <span style={{ color:"#aaaaaa", flexShrink:0, fontSize:11, marginTop:2, fontVariantNumeric:"tabular-nums" }}>{(i+1).toString().padStart(2,"0")}</span>
              <div><strong style={{ color:"#555555" }}>{title}.</strong> {text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 13. DATA SOURCES & REFERENCES ── */}
      <div style={aBox}>
        <div style={{...aHdr, borderLeft: "3px solid #58b947"}}>Data Sources & References</div>
        <div style={{ padding: "12px 18px 14px" }}>
          <div style={{ display: "grid", gap: 14 }}>
            {SOURCES.map((s, i) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 10, paddingBottom: 14, borderBottom: i < SOURCES.length-1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#cccccc", paddingTop: 2 }}>{(i+1).toString().padStart(2,"0")}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#333333" }}>{s.short}</span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#58a7af", textDecoration: "underline", wordBreak: "break-all" }}>{s.url}</a>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#666666", marginTop: 3, lineHeight: 1.5 }}>{s.full}</div>
                  {s.reports.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {s.reports.map((r, j) => (
                        <div key={j} style={{ display: "flex", gap: 6, fontSize: 10.5, color: "#888888", marginBottom: 2 }}>
                          <span style={{ color: "#cccccc", flexShrink: 0 }}>›</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 10.5, background: "#f0faf0", border: "1px solid #d4edda", borderRadius: 3, padding: "3px 8px", color: "#3d8f32" }}>
                      <strong>Used for:</strong> {s.usage}
                    </div>
                  </div>
                  {s.note && (
                    <div style={{ fontSize: 10, color: "#aaaaaa", marginTop: 5, fontStyle: "italic" }}>Note: {s.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick-reference link list */}
          <div style={{ marginTop: 20, padding: "12px 14px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666666", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Quick Reference Links</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
              {[
                ["NETL Point-Source CCS", "https://netl.doe.gov/coal/carbon-storage/strategic-program-support/point-source-carbon-capture"],
                ["NETL Direct Air Capture", "https://netl.doe.gov/carbon-management/carbon-capture/direct-air-capture"],
                ["CEPCI (Chemical Engineering)", "https://www.chemengonline.com/pci"],
                ["EIA Electric Power Monthly", "https://www.eia.gov/electricity/monthly/"],
                ["EIA State Electricity Prices", "https://www.eia.gov/electricity/state/"],
                ["Bloomberg Energy", "https://www.bloomberg.com/energy"],
                ["RSMeans Construction Costs", "https://www.rsmeans.com"],
                ["Tax Foundation State Taxes", "https://taxfoundation.org/data/all/state/state-corporate-income-tax-rates-2024/"],
                ["IRS Section 45Q", "https://www.irs.gov/businesses/corporations/section-45q-credit-for-carbon-oxide-sequestration"],
                ["IRS Section 48C", "https://www.irs.gov/credits-deductions/inflation-reduction-act-of-2022-advanced-energy-project-credit"],
                ["IRS Publication 946 (MACRS)", "https://www.irs.gov/publications/p946"],
                ["DOE CCUS Program", "https://www.energy.gov/fecm/carbon-capture-utilization-and-storage"],
                ["CarbonPlan CDR Database", "https://carbonplan.org/research/cdr-database"],
                ["Frontier Climate (CDR)", "https://frontierclimate.com"],
                ["Inflation Reduction Act 2022", "https://www.congress.gov/bill/117th-congress/house-bill/5376"],
                ["EPA Emission Factors (AP-42)", "https://www.epa.gov/air-emissions-factors-and-quantification/ap-42-compilation-air-emissions-factors"],
              ].map(([label, url], i) => (
                <div key={i} style={{ display:"flex", alignItems:"baseline", gap:6, fontSize:10.5 }}>
                  <span style={{ color:"#cccccc", flexShrink:0 }}>›</span>
                  <span style={{ color:"#666666", fontWeight:600, flexShrink:0 }}>{label}:</span>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ color:"#58a7af", textDecoration:"underline", wordBreak:"break-all" }}>{url}</a>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 10, color: "#aaaaaa", lineHeight: 1.6 }}>
            This model is intended for educational and pre-feasibility screening purposes. All data has been compiled from public sources as of early 2026. Users should verify data currency and applicability to their specific project before making engineering or investment decisions. No warranty is made regarding the accuracy or completeness of the information presented.
          </div>
        </div>
      </div>

    </div>
  );
}
