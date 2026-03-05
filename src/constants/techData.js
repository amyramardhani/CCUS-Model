// Technology type adjustment factors relative to baseline amine/MEA
// capex/opex/power: multipliers vs amine baseline
// compat: compatible source categories
// learn: annual cost reduction rate (learning curve) — mature tech ~0.5%, emerging ~5-9%/yr
// baseYr: year when the listed capex/opex factors apply (learning adjusts from this year)
export const TECH = {
  amine:     { n: "Amine (MEA)",       capex: 1.00, opex: 1.00, power: 1.00, compat: ["High Purity", "Hydrogen", "Industrial", "Power"], learn: 0.005, baseYr: 2018, desc: "Baseline monoethanolamine solvent — mature, widely deployed" },
  advamine:  { n: "Advanced Amine",    capex: 1.08, opex: 0.88, power: 0.85, compat: ["High Purity", "Hydrogen", "Industrial", "Power"], learn: 0.02,  baseYr: 2018, desc: "Next-gen solvents (KS-1, CANSOLV) — lower regeneration energy, maturing rapidly" },
  membrane:  { n: "Membrane",          capex: 0.85, opex: 0.95, power: 0.70, compat: ["High Purity", "Hydrogen"],                        learn: 0.03,  baseYr: 2018, desc: "Polymer membrane separation — costs declining with scale, best for high-purity" },
  cryo:      { n: "Cryogenic",         capex: 1.25, opex: 1.10, power: 1.35, compat: ["High Purity"],                                    learn: 0.01,  baseYr: 2018, desc: "Low-temperature separation — mature industrial process, modest improvements" },
  solid:     { n: "Solid Sorbent",     capex: 1.15, opex: 0.82, power: 0.75, compat: ["Industrial", "Power"],                            learn: 0.04,  baseYr: 2018, desc: "Supported amines on silica/alumina — emerging tech, lower regeneration heat" },
  mof:       { n: "MOF",               capex: 1.35, opex: 0.70, power: 0.65, compat: ["High Purity", "Hydrogen", "Industrial", "Power"], learn: 0.06,  baseYr: 2020, desc: "Metal-Organic Frameworks — highly selective, very low regeneration energy, early commercial" },
  dacsolid:  { n: "DAC Solid Sorbent", capex: 1.00, opex: 1.00, power: 1.00, compat: ["CDR"],                                            learn: 0.07,  baseYr: 2020, desc: "Solid sorbent DAC (Climeworks-style) — modular, lower temp regeneration, electricity-only" },
  dacliquid: { n: "DAC Liquid Solvent",capex: 1.20, opex: 0.85, power: 1.50, compat: ["CDR"],                                            learn: 0.05,  baseYr: 2020, desc: "Liquid solvent DAC (Carbon Engineering-style) — larger scale, needs high-temp heat, lower OPEX" },
  doc:       { n: "DOC Electrodialysis",capex:0.62, opex: 0.65, power: 0.70, compat: ["CDR"],                                            learn: 0.09,  baseYr: 2022, desc: "Direct Ocean Capture — 150× higher CO₂ concentration than air, lowest energy, fastest learning" }
};

// Human-readable labels for CAPEX cost breakdown categories
export const CX_LABELS = {
  fg:"Flue Gas Cleanup", fw:"Feedwater & BOP", ds:"Ductwork & Stack",
  cw:"Cooling Water",    el:"Electrical",       ic:"I&C",
  si:"Site Improvements",bd:"Buildings",        st:"Steam Turbine",
  ac:"Air Contactor",    th:"Thermal System",   ed:"Electrodialysis"
};

// Colors for CAPEX cost breakdown chart segments
export const CX_COLORS = {
  fg:"#58b947",fw:"#58a7af",ds:"#93348f",cw:"#58b947",el:"#f68d2e",ic:"#ef509a",
  si:"#888888",bd:"#888888",st:"#f68d2e",ac:"#58a7af",th:"#b83a4b",ed:"#58a7af"
};
