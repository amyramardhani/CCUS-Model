# CCUS Cost Model

A browser-based techno-economic model for estimating the cost of Carbon Capture, Utilization, and Storage (CCUS) across U.S. industrial sources, power plants, and carbon dioxide removal (CDR) pathways.

Built with React 19 + Vite. All calculations run client-side -- no backend required.

## What It Does

The model computes the **Levelized Cost of CO2 Captured (LCOC)** for a user-selected combination of:

- **Emission source** -- 15 industrial/power/CDR scenarios (ammonia, ethanol, cement, steel, NGCC, coal, DAC, DOC, biomass, and more)
- **Capture technology** -- amine (MEA), advanced amine, membrane, cryogenic, solid sorbent, MOF, DAC solid/liquid, DOC electrodialysis
- **Location** -- all 50 U.S. states + D.C., with state-specific electricity prices, gas hub differentials, construction cost factors, and tax rates
- **Financial structure** -- NETL-sourced capital structures, WACC, MACRS depreciation, 45Q/48C tax credits, voluntary carbon market credits

Key outputs include CAPEX/OPEX breakdowns, annual cash flow projections, IRR, NPV, and sensitivity charts.

## Data Sources

| Data | Source |
|------|--------|
| Capture cost baselines (TIC, TOC, O&M, power) | DOE/NETL "Cost of Capturing CO2 from Industrial Sources" (2018 USD) |
| Cost escalation | CEPCI index (2018-2026) |
| Industrial electricity prices | EIA Table 5.6.a (2024) |
| Natural gas prices | Bloomberg Henry Hub forward strip (Feb 2026) |
| Hub basis differentials | Bloomberg state-level differentials (2025 avg vs HH) |
| Construction location factors | RSMeans / NETL location factor tables |
| State corporate tax rates | Enverus / Tax Foundation |
| Financial assumptions (debt/equity, CCF, TASC) | DOE/NETL sector-specific reports |
| Tax credits | IRC Section 45Q (IRA 2022), IRC Section 48C |

## Project Structure

```
CCUS Model/
  index.html              Entry point
  vite.config.js          Vite configuration
  package.json            Dependencies and scripts
  src/
    main.jsx              React root mount
    App.jsx               Main application component (UI, state, charts)
    App.css               Application styles
    components/
      Tip.jsx             Glossary tooltip component (hover definitions)
    constants/
      index.js            Barrel export for all constants
      sourceData.js       NETL source scenario data (15 emission sources)
      techData.js         Capture technology parameters and learning curves
      economics.js        EIA rates, CEPCI, MACRS, gas prices, NETL financials
      locationFactors.js  State construction factors, hub basis differentials
      tooltips.js         Glossary definitions for UI terms
    utils/
      engCalculations.js  Engineering calculations (variant lookup, cost scaling)
      finCalculations.js  Financial calculations (IRR, CCF, NPV, cash flow model)
      helpers.js          Formatting utilities and gas price lookups
      styles.js           Shared style objects
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install and Run

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173` by default.

### Build for Production

```bash
npm run build
npm run preview    # preview the production build locally
```

## Key Concepts

- **LCOC** -- Levelized Cost of CO2 Captured ($/tonne). The all-in cost including capital charge, fixed/variable O&M, power, and fuel.
- **Six-Tenths Rule** -- Empirical cost-scaling law used to adjust CAPEX when plant capacity differs from the NETL reference case.
- **CCF** -- Capital Charge Factor. Annualizes CAPEX over the project's economic life (typically 30 years) using the WACC.
- **45Q** -- Federal tax credit paying $85/t CO2 for geologic storage (industrial/power) or $180/t for DAC, available for 12 years.
- **Learning Curves** -- Technology-specific annual cost reduction rates applied from each technology's base year to the selected cost year.

## Calculation Methodology

1. **Baseline costs** are sourced from NETL 2018 reference cases for each emission source.
2. **CEPCI escalation** adjusts 2018 base-year costs to the user-selected cost year.
3. **Location factors** (RSMeans) adjust CAPEX for state-level construction cost differences relative to a Louisiana Gulf Coast baseline.
4. **Technology multipliers** adjust CAPEX, OPEX, and power demand based on the selected capture technology vs. the amine (MEA) baseline.
5. **Capacity scaling** uses the six-tenths rule when the user adjusts plant size from the NETL reference capacity.
6. **Financial modeling** builds year-by-year cash flows incorporating construction periods, MACRS depreciation, tax credits (45Q, 48C), and voluntary carbon market revenue.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## License

Private project. Not licensed for redistribution.
