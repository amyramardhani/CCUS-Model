// EIA average industrial electricity prices by state (¢/kWh × 10 = $/MWh)
// Source: EIA Table 5.6.a (2024 data)
export const EIA = {
  AL:7.25,AK:19.31,AZ:7.90,AR:6.61,CA:21.53,CO:8.62,CT:17.12,DE:8.49,DC:10.80,FL:8.50,
  GA:7.21,HI:34.13,ID:7.69,IL:8.83,IN:8.15,IA:6.80,KS:7.73,KY:6.50,LA:5.61,ME:12.46,
  MD:10.01,MA:18.19,MI:8.26,MN:9.15,MS:6.81,MO:7.87,MT:7.59,NE:7.66,NV:8.64,NH:16.21,
  NJ:11.93,NM:5.43,NY:9.17,NC:7.77,ND:7.25,OH:7.10,OK:5.84,OR:8.05,PA:7.87,RI:19.70,
  SC:6.84,SD:8.28,TN:6.21,TX:6.12,UT:7.86,VT:11.58,VA:8.99,WA:6.61,WV:7.81,WI:8.54,WY:7.96
};

// State corporate income tax rates — Enverus / Tax Foundation
export const STATE_TAX = {
  AK:9.40,AL:6.50,AR:4.30,AZ:4.90,CA:8.84,CO:4.40,CT:8.25,DE:8.70,DC:8.25,FL:5.50,
  GA:5.39,HI:6.40,IA:7.10,ID:5.70,IL:9.50,IN:4.90,KS:6.50,KY:5.00,LA:5.50,MA:8.00,
  MD:8.25,ME:8.93,MI:6.00,MN:9.80,MO:4.00,MS:5.00,MT:6.75,NC:2.25,ND:4.31,NE:5.20,
  NH:7.50,NJ:11.50,NM:5.90,NV:0,NY:7.25,OH:0,OK:4.00,OR:7.60,PA:7.99,RI:7.00,
  SC:5.00,SD:0,TN:6.50,TX:0,UT:4.55,VA:6.00,VT:8.50,WA:0,WI:7.90,WV:6.50,WY:0
};

// Chemical Engineering Plant Cost Index — escalates 2018 NETL base costs to current year
export const CEPCI = {
  2018:603.1,2019:607.5,2020:596.2,2021:708.8,2022:816.0,2023:797.9,2024:810.5,2025:825.0,2026:840.0
};

// MACRS Depreciation Schedules (Modified Accelerated Cost Recovery System)
export const MACRS = {
  "bonus":  [1.0],
  "5-yr":  [0.2000, 0.3200, 0.1920, 0.1152, 0.1152, 0.0576],
  "7-yr":  [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
  "10-yr": [0.1000, 0.1800, 0.1440, 0.1152, 0.0922, 0.0737, 0.0655, 0.0655, 0.0656, 0.0655, 0.0328],
  "15-yr": [0.0500, 0.0950, 0.0855, 0.0770, 0.0693, 0.0623, 0.0590, 0.0590, 0.0591, 0.0590, 0.0591, 0.0590, 0.0591, 0.0590, 0.0591, 0.0295],
  "20-yr": [0.0375, 0.0722, 0.0668, 0.0618, 0.0571, 0.0528, 0.0489, 0.0452, 0.0447, 0.0447, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0223]
};

// Reference gas price baseline (2018 NETL base, $/MMBtu)
export const BASE_GP = 4.42;

// Bloomberg Henry Hub forward strip — annual avg $/MMBtu (as of 2026-02-17)
export const HH_STRIP = {
  2026:3.42,2027:3.69,2028:3.65,2029:3.62,2030:3.64,2031:3.68,
  2032:3.62,2033:3.50,2034:3.56,2035:3.59,2036:3.70,2037:3.81,2038:3.94
};
export const HH_STRIP_YRS = Object.keys(HH_STRIP).map(Number);

// NETL Financial Assumptions by Source Category (DOE/NETL Reports)
// constructionYrs: Capital Expenditure Period
// capexDist: Capital distribution during construction [Y1%, Y2%, Y3%]
// debtPct: Debt % of capital structure | costDebt: Interest rate on debt
// roe: Levered Return on Equity (asset weighted) | projectLife: Economic life (years)
export const NETL_FIN = {
  "Ammonia":        { constructionYrs: 1, capexDist: [1.0],               debtPct: 54, costDebt: 5.15, roe: 1.5,  ccf: 0.0551, tascToc: 1.035, projectLife: 30 },
  "Ethylene Oxide": { constructionYrs: 1, capexDist: [1.0],               debtPct: 48, costDebt: 5.15, roe: 0.04, ccf: 0.0474, tascToc: 1.025, projectLife: 30 },
  "Ethanol":        { constructionYrs: 1, capexDist: [1.0],               debtPct: 36, costDebt: 5.15, roe: 4.51, ccf: 0.0696, tascToc: 1.047, projectLife: 30 },
  "NG Processing":  { constructionYrs: 1, capexDist: [1.0],               debtPct: 43, costDebt: 5.15, roe: 2.96, ccf: 0.0605, tascToc: 1.039, projectLife: 30 },
  "Coal-to-Liquids":{ constructionYrs: 1, capexDist: [1.0],               debtPct: 32, costDebt: 5.15, roe: 5.54, ccf: 0.0771, tascToc: 1.054, projectLife: 30 },
  "Gas-to-Liquids": { constructionYrs: 1, capexDist: [1.0],               debtPct: 32, costDebt: 5.15, roe: 5.54, ccf: 0.0771, tascToc: 1.054, projectLife: 30 },
  "Refinery H₂":   { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],  debtPct: 33, costDebt: 5.15, roe: 0.41, ccf: 0.0455, tascToc: 1.036, projectLife: 30 },
  "Cement":         { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],  debtPct: 42, costDebt: 5.15, roe: 1.42, ccf: 0.0535, tascToc: 1.054, projectLife: 30 },
  "Steel & Iron":   { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],  debtPct: 39, costDebt: 5.15, roe: 5.02, ccf: 0.0753, tascToc: 1.091, projectLife: 30 },
  "Pulp & Paper":   { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],  debtPct: 42, costDebt: 5.15, roe: 1.42, ccf: 0.0535, tascToc: 1.054, projectLife: 30 },
  "NGCC F-Frame":   { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],  debtPct: 45, costDebt: 5.15, roe: 12.0, ccf: 0.0773, tascToc: 1.078, projectLife: 30 },
  "NGCC H-Frame":   { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],  debtPct: 45, costDebt: 5.15, roe: 12.0, ccf: 0.0773, tascToc: 1.078, projectLife: 30 },
  "Coal SC":        { constructionYrs: 4, capexDist: [0.10, 0.30, 0.40, 0.20], debtPct: 45, costDebt: 5.15, roe: 12.0, ccf: 0.0773, tascToc: 1.078, projectLife: 30 },
  "Ambient Air":    { constructionYrs: 2, capexDist: [0.40, 0.60],         debtPct: 50, costDebt: 6.0,  roe: 15.0, ccf: 0.0850, tascToc: 1.10,  projectLife: 25 },
  "Ocean Water":    { constructionYrs: 2, capexDist: [0.40, 0.60],         debtPct: 50, costDebt: 6.0,  roe: 15.0, ccf: 0.0850, tascToc: 1.10,  projectLife: 25 },
  "Biomass":        { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],  debtPct: 45, costDebt: 5.15, roe: 12.0, ccf: 0.0773, tascToc: 1.078, projectLife: 30 }
};

// Default NETL assumptions for sources not listed above
export const NETL_DEFAULT = {
  constructionYrs: 3, capexDist: [0.10, 0.60, 0.30],
  debtPct: 45, costDebt: 5.15, roe: 5.0, ccf: 0.06, tascToc: 1.05, projectLife: 30
};

// CDR credit types with market prices (Voluntary Carbon Market)
export const CDR_TYPES = {
  "dac":    { name: "DAC (Direct Air Capture)",         price: 400, desc: "Frontier/Microsoft buyers",                   cats: ["CDR"],   srcs: ["Ambient Air"] },
  "daccs":  { name: "DACCS (DAC + Storage)",            price: 600, desc: "Permanent geological storage",                cats: ["CDR"],   srcs: ["Ambient Air"] },
  "doc":    { name: "DOC (Direct Ocean Capture)",       price: 250, desc: "Ocean-based CO\u2082 removal",                cats: ["CDR"],   srcs: ["Ocean Water"] },
  "beccs":  { name: "BECCS (Bio-Energy + CCS)",         price: 150, desc: "Biomass power/CHP + capture",                 cats: ["Power"], srcs: ["Biomass"] },
  "bicrs":  { name: "BiCRS (Biomass Carbon Removal)",   price: 120, desc: "Biomass fermentation/process + storage",      cats: [],        srcs: ["Biomass"] },
  "biochar":{ name: "Biochar",                          price: 120, desc: "Pyrolysis-based removal",                     cats: [],        srcs: [] },
  "enhanced_weathering": { name: "Enhanced Weathering", price: 80, desc: "Mineral carbonation",                         cats: [],        srcs: [] },
  "ocean_alk": { name: "Ocean Alkalinity",              price: 100, desc: "Marine CDR",                                  cats: [],        srcs: [] },
  "custom": { name: "Custom",                           price: 200, desc: "User-defined price",                          cats: [],        srcs: [] }
};

// Avoidance credit types with market prices (Voluntary Carbon Market)
export const AVOID_TYPES = {
  "industrial":      { name: "Industrial CCS",       price: 25, desc: "Point-source capture",              cats: ["High Purity","Hydrogen","Industrial"], srcs: [] },
  "power_ccs":       { name: "Power Plant CCS",      price: 30, desc: "Fossil power + capture",            cats: ["Power"], srcs: ["NGCC F-Frame","NGCC H-Frame","Coal SC"] },
  "beccs_avoid":     { name: "BECCS Avoidance",      price: 35, desc: "Biomass energy avoided emissions",  cats: ["Power"], srcs: ["Biomass"] },
  "methane_coal":    { name: "Coal Mine Methane",    price: 15, desc: "CMM destruction",                   cats: [],        srcs: [] },
  "methane_landfill":{ name: "Landfill Gas",         price: 12, desc: "LFG capture/flare",                 cats: [],        srcs: [] },
  "methane_oil":     { name: "Oil & Gas Methane",    price: 18, desc: "Fugitive emissions",                cats: [],        srcs: [] },
  "renewable_energy":{ name: "Renewable Energy",     price:  8, desc: "RE certificates (low)",             cats: [],        srcs: [] },
  "forestry":        { name: "Forestry / REDD+",     price: 10, desc: "Avoided deforestation",             cats: [],        srcs: [] },
  "cookstoves":      { name: "Clean Cookstoves",     price:  5, desc: "Household efficiency",              cats: [],        srcs: [] },
  "custom":          { name: "Custom",               price: 25, desc: "User-defined price",                cats: [],        srcs: [] }
};

// Emission factors by source (t CO2/MMBtu) — combustion sources only
export const EMIT_FACTORS = {
  "NGCC F-Frame": 0.05306,
  "NGCC H-Frame": 0.05306,
  "Coal SC":      0.09552,
  "Coal Sub-C":   0.09552,
  "Biomass":      0
};
