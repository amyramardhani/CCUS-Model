# CCUS Model — Calculation Flow Diagram

## Overview

```
+-----------------------------------------------------------------+
|                         USER INPUTS                              |
|  Source, State, Capture Rate, Build Type, Technology, Cost Year,  |
|  CF, Electricity $/MWh, Gas $/MMBtu, Debt/Equity, WACC/Hurdle   |
+-----------------------------+------------------------------------+
                              |
                              v
                 +------------------------+
                 |  STAGE 1: gv()         |
                 |  Get Variant Data      |
                 +-----------+------------+
                              |
                              v
                 +------------------------+
                 |  STAGE 2: Resolve      |
                 |  pCO2 and sR           |
                 +-----------+------------+
                              |
                              v
                 +------------------------+
                 |  STAGE 3: calcLCOC()   |
                 |  Central Cost Engine   |
                 +-----------+------------+
                              |
         +--------+-------+--+------+---------+
         v        v       v         v         v
      Capital   Fixed   Var      Power     Fuel
      Charge    OPEX    OPEX     Cost      Cost
         |        |       |         |         |
         +--------+-------+---------+---------+
                              |
                              v
                       +-----------+
                       | LCOC $/t  |
                       | (Total)   |
                       +-----------+
```

---

## STAGE 1: `gv(src, crInput, bt)` — Get Variant Data

**File:** `src/utils/engCalculations.js` (lines 34-123)
**Purpose:** Look up NETL reference data for a source, then adjust for capture rate and build type when exact NETL data isn't available.

### 1.1 Parse Inputs

```
crNum = parseFloat(crInput)     e.g. "90%" -> 90
crStr = crInput                 kept as string for key lookups
```

### 1.2 Look Up Source Data from SC

`SC` is the master source-data object in `constants/sourceData.js`. Each source has:

| Field  | Type     | Description                                     | Units        |
|--------|----------|-------------------------------------------------|--------------|
| `tic`  | number   | Total Installed Cost at NETL reference           | $M (millions)|
| `toc`  | number   | Total Overnight Cost (TIC + Owner's Costs)       | $M           |
| `fo`   | number   | Fixed O&M at NETL reference                      | $/t CO2      |
| `vo`   | number   | Variable O&M at NETL reference                   | $/t CO2      |
| `pw`   | number   | Parasitic power load                             | MW           |
| `fl`   | number   | Fuel cost at base gas price ($4.42/MMBtu)         | $/t CO2      |
| `rco`  | number   | Reference CO2 captured per year                  | t/yr         |
| `cf`   | number   | Reference capacity factor                        | decimal 0-1  |
| `bs`   | string   | Base state where NETL estimated costs             | 2-letter code|
| `cr`   | string[] | Capture rates available in NETL data             | e.g. ["99%"] |
| `bt`   | string[] | Build types available in NETL data               | e.g. ["Retrofit"] |
| `rpc`  | number   | Reference plant capacity (industrial sources)    | varies       |
| `vr`   | object   | Variant data keyed by "CR%|BT" (optional)        | sub-objects   |

**Example — Ammonia:**
```
SC["Ammonia"] = {
  tic: 37.356,    toc: 45.565,
  fo:  3.28,      vo:  2.67,
  pw:  5.86,      fl:  0,
  rco: 413164,    cf:  0.85,
  bs:  "LA",      cr:  ["99%"],   bt: ["Retrofit"],
  rpc: 394000
}
```

### 1.3 Variant Resolution (lines 45-56)

Sources may have multiple data sets for different CR/BT combinations stored in `s.vr`:

```
Priority order for finding the right variant data (d):

1. Exact match:      s.vr["90%|Retrofit"]
2. CR-only match:    s.vr["90%"]
3. Partial CR match: first key starting with "90%"
4. Partial BT match: first key ending with "Retrofit"
5. Fallback:         first variant in the object

If source has NO variants (no s.vr), use the source object itself:
   d = s
```

Then merge: `base = { ...s, ...d }` (variant fields override source-level fields).

### 1.4 Determine Base CR and BT for Adjustments

```
baseCR = the capture rate embedded in the matched variant key
         e.g. "99%|Retrofit" -> "99%"
         fallback: s.cr[0]

baseBT = the build type embedded in the matched variant key
         e.g. "99%|Retrofit" -> "Retrofit"
         fallback: s.bt[0]

baseCRNum = parseFloat(baseCR)    e.g. 99
```

### 1.5 Capture Rate Adjustments (lines 69-108)

**When the user's CR matches NETL data exactly:** No adjustments (all multipliers = 1).

**When the user's CR differs from NETL data (interpolation required):**

#### 1.5.1 Thermodynamic Difficulty Ratio

The minimum separation work for CO2 capture follows `-ln(1 - CR/100)`.

```
thermoBase  = -ln(1 - baseCRNum/100)    = -ln(1 - 0.99) = -ln(0.01) = 4.605
thermoNew   = -ln(1 - crNum/100)        = -ln(1 - 0.90) = -ln(0.10) = 2.303
thermoRatio = thermoNew / thermoBase     = 2.303 / 4.605 = 0.500

Going from 90% to 99% doubles the thermodynamic difficulty.
Going from 99% to 90% halves it.
```

#### 1.5.2 CO2 Volume Adjustment (rcoAdj)

CO2 captured scales linearly with capture rate — if you capture 90% instead of 99%
of the same flue gas, you get 90/99 = 0.909x as much CO2.

```
rcoAdj = crNum / baseCRNum = 90 / 99 = 0.909

Applied to: rco (reference CO2 output)
Result:     vd.rco = base.rco x 0.909
```

#### 1.5.3 CAPEX Adjustment (crCapexAdj)

Capture equipment is sized for CO₂ produced (total flue gas volume), NOT
the capture rate. The absorber column diameter, blower, and heat exchangers
are determined by the gas throughput, which is constant regardless of whether
you capture 90% or 99%. Changing the capture rate changes how hard the
equipment runs (energy, solvent cycling, chemical consumption) — not the
equipment itself. Therefore CAPEX does not change with capture rate.

```
crCapexAdj = 1.0   (always)

Applied to: tic, toc (but has no effect since factor = 1)
```

#### 1.5.4 Fixed OPEX Adjustment (crFomAdj)

Total fixed costs are roughly constant (same equipment, same crew).
More CO2 captured means lower per-tonne fixed cost, and vice versa.

```
crFomAdj = 1 / rcoAdj = 1 / 0.909 = 1.100

Example (99% -> 90%):
  10% less CO2, so per-tonne fixed cost goes UP by 10%

Applied to: fo (fixed O&M $/t)
```

#### 1.5.5 Variable OPEX Adjustment (crVomAdj)

Solvent degradation, chemical consumption, and water treatment scale with
the thermodynamic work of capture — deeper capture means more aggressive
solvent cycling. The 0.2 exponent dampens this (real systems use heat
integration and optimized solvents).

```
crVomAdj = thermoRatio^0.2

Example (99% -> 90%):
  = 0.500^0.2 = 0.871
  -> 13% reduction in per-tonne variable costs

Example (90% -> 99%):
  = 2.0^0.2 = 1.149
  -> 15% increase

Applied to: vo (variable O&M $/t)
```

#### 1.5.6 Power Adjustment (pwAdj)

Reboiler duty and CO2 compression scale with thermodynamic difficulty.
The 0.4 exponent reflects that real systems have heat integration which
partially offsets the theoretical increase.

```
pwAdj = thermoRatio^0.4

Example (99% -> 90%):
  = 0.500^0.4 = 0.758
  -> 24% less parasitic power

Example (90% -> 99%):
  = 2.0^0.4 = 1.320
  -> 32% more parasitic power

Applied to: pw (parasitic power MW)
```

### 1.6 Build Type Adjustments (lines 73-77)

**When the user's BT matches NETL data exactly:** No adjustment (btAdj = 1).

**When it differs:**

```
Greenfield when NETL data is Retrofit:  btAdj = 0.93  (7% cheaper — no demolition/tie-ins)
Retrofit when NETL data is Greenfield:  btAdj = 1.08  (8% more expensive)
```

Applied to: `tic` and `toc` (via crCapexAdj x btAdj), `fo` (via btAdj only)

### 1.7 Final Adjusted Output (lines 110-122)

```
vd = {
  ...base,                              // all source fields pass through
  tic:  base.tic x crCapexAdj x btAdj,  // adjusted TIC ($M)
  toc:  base.toc x crCapexAdj x btAdj,  // adjusted TOC ($M)
  fo:   base.fo  x crFomAdj   x btAdj,  // adjusted Fixed OPEX ($/t)
  vo:   base.vo  x crVomAdj   x btAdj,  // adjusted Variable OPEX ($/t)
  pw:   base.pw  x pwAdj,               // adjusted parasitic power (MW)
  rco:  base.rco x rcoAdj,              // adjusted CO2 output (t/yr)
  estCR:  true/false,                    // was CR interpolated?
  estBT:  true/false,                    // was BT interpolated?
  isEst:  estCR || estBT,               // any estimation used?
  crNumeric: crNum                       // numeric CR for downstream use
}
```

### 1.8 Summary of All Adjustment Factors

| Factor       | Formula                        | Direction (lower CR) | Applied To |
|-------------|--------------------------------|---------------------|------------|
| `rcoAdj`    | `crNum / baseCRNum`            | Less CO2             | rco        |
| `crCapexAdj`| `1.0` (always)                 | No change            | tic, toc   |
| `crFomAdj`  | `1 / rcoAdj`                  | More expensive /t    | fo         |
| `crVomAdj`  | `thermoRatio^0.2`             | Cheaper /t           | vo         |
| `pwAdj`     | `thermoRatio^0.4`             | Less power           | pw         |
| `btAdj`     | `0.93` or `1.08` or `1.0`     | Depends              | tic,toc,fo,vo |

---

## STAGE 2: Resolve pCO2 and Size Ratio (sR)

**File:** `src/CCUSDashboard.jsx` (dashboard) or `src/tabs/BatchRunTab.jsx` (batch)
**Purpose:** Determine how much CO2 the plant captures per year and how it compares to the NETL reference plant size.

### 2.1 Key Variables

| Variable | Description                          | Units  |
|----------|--------------------------------------|--------|
| `pCO2`   | Annual CO2 captured                  | t/yr   |
| `sR`     | Size Ratio = actual / reference      | ratio  |
| `CF`     | User capacity factor                 | 0-1    |
| `vd.cf`  | NETL reference capacity factor       | 0-1    |
| `vd.rco` | NETL reference CO2 at ref CF         | t/yr   |
| `vd.rpc` | NETL reference plant capacity        | varies |

### 2.2 Case A — Default (no custom inputs)

When user hasn't overridden CO2 volume or plant capacity:

```
pCO2 = vd.rco x (CF / vd.cf)
sR   = 1.0

Example: vd.rco = 375,573, CF = 0.85, vd.cf = 0.85
  pCO2 = 375,573 x (0.85 / 0.85) = 375,573 t/yr
  sR   = 1.0

Example with different CF: CF = 0.70
  pCO2 = 375,573 x (0.70 / 0.85) = 309,295 t/yr
  sR   = 1.0   (plant is same size, just runs fewer hours)
```

**Why sR stays 1.0:** CF changes how many hours the plant runs, not the physical equipment size.
The equipment is the same — it just produces less CO2 annually at lower utilization.

### 2.3 Case B — User provides CO2 volume

User directly enters desired annual CO2 capture (e.g. 200,000 t/yr):

```
pCO2 = userCO2                                  = 200,000 t/yr
sR   = (pCO2 / (CF / vd.cf)) / vd.rco

Step by step:
  1. Normalize pCO2 back to reference CF:   200,000 / (0.85/0.85) = 200,000
  2. Compare to reference:                  200,000 / 375,573     = 0.533

This means the plant is 53.3% of the NETL reference size.
```

### 2.4 Case C — User provides plant capacity (industrial sources)

For industrial sources (Ammonia, Ethanol, etc.), user enters production capacity:

```
sR   = plantCap / vd.rpc
pCO2 = vd.rco x sR x (CF / vd.cf)

Example: 200,000 t NH3/yr vs reference 394,000 t NH3/yr
  sR   = 200,000 / 394,000 = 0.508
  pCO2 = 375,573 x 0.508 x (0.85/0.85) = 190,791 t/yr
```

### 2.5 Case D — Combustion sources (NGCC, Coal, Biomass)

CO2 is derived from fuel combustion parameters:

```
Step 1: Calculate gross CO2 emissions
  grossCO2 = plantMW x heatRate x emissionFactor x hoursPerYear x CF
  (units:    MW       MMBtu/MWh   lb CO2/MMBtu     hr/yr          -)

Step 2: Apply capture rate
  pCO2 = grossCO2 x (captureRate / 100)

Step 3: Size ratio relative to reference plant
  sR = plantMW / (vd.rpc + vd.pw)
  (reference plant includes parasitic load — total gross capacity)
```

### 2.6 Batch Model pCO2/sR Resolution

The batch model gets CO2 volume from the spreadsheet row. If the row has a CO2 value:

```
rawCO2 = spreadsheet CO2 value (t/yr)
cf     = useCF / 100

If rawCO2 > 0:
  pCO2 = rawCO2
  sR   = (pCO2 / (cf / vd.cf)) / vd.rco

If rawCO2 = 0 or missing:
  pCO2 = vd.rco x (cf / vd.cf)
  sR   = 1.0   (use NETL reference)
```

---

## STAGE 3: `calcLCOC()` — Central Cost Engine

**File:** `src/utils/engCalculations.js` (lines 142-177)
**Both dashboard and batch call this exact same function.**

### 3.1 Function Signature

```javascript
calcLCOC({ vd, pCO2, sR, techKey, yr, st, pp, gp, cf, discountRate })
```

| Parameter      | Type   | Description                      | Example     |
|---------------|--------|----------------------------------|-------------|
| `vd`          | object | Variant data from gv()           | see Stage 1 |
| `pCO2`        | number | Annual CO2 captured              | 375,573 t/yr|
| `sR`          | number | Size ratio vs reference          | 1.0         |
| `techKey`     | string | Technology key                   | "amine"     |
| `yr`          | number | Cost year                        | 2025        |
| `st`          | string | State code                       | "TX"        |
| `pp`          | number | Electricity price                | 80 $/MWh    |
| `gp`          | number | Natural gas price                | 4.42 $/MMBtu|
| `cf`          | number | Capacity factor                  | 0.85        |
| `discountRate`| number | WACC or hurdle rate (decimal)    | 0.08        |

### 3.2 Scaling Factors (computed first, used everywhere)

#### 3.2.1 Technology Multiplier (tF)

```
tF = TECH[techKey]    // from constants/techData.js

Each technology has three independent multipliers:
  tF.capex  — CAPEX multiplier vs baseline amine (MEA)
  tF.opex   — OPEX multiplier vs baseline
  tF.power  — Power consumption multiplier vs baseline

Examples:
  Amine (MEA):       { capex: 1.00, opex: 1.00, power: 1.00 }
  Advanced Amine:    { capex: 1.08, opex: 0.88, power: 0.85 }
  Membrane:          { capex: 0.85, opex: 0.95, power: 0.70 }
  MOF (solid sorb.): { capex: 1.35, opex: 0.70, power: 0.65 }

Fallback: if techKey not found, uses TECH.amine (all 1.0)
```

#### 3.2.2 CEPCI Escalation Ratio (cR)

```
cR = CEPCI[yr] / CEPCI[2018]

Purpose: All NETL reference costs are in 2018 USD.
CEPCI (Chemical Engineering Plant Cost Index) adjusts for inflation
in chemical plant construction costs specifically.

Example values:
  CEPCI[2018] = 603.1   (base year)
  CEPCI[2025] = 735.8   (projected)
  cR = 735.8 / 603.1 = 1.220

If yr not in CEPCI table: falls back to CEPCI[2026]
```

#### 3.2.3 Location Factor Ratio (lR)

```
lR = LF[st].f / LF[vd.bs].f

Purpose: Adjust for geographic construction cost differences.
NETL costs are estimated at a base state (vd.bs, usually "LA").
User's project may be in a different state.

Example:
  User state: "CA" -> LF["CA"].f = 1.07
  Base state: "LA" -> LF["LA"].f = 0.97
  lR = 1.07 / 0.97 = 1.103 (California is 10.3% more expensive)

  User state: "TX" -> LF["TX"].f = 0.97
  lR = 0.97 / 0.97 = 1.000 (Texas matches Louisiana baseline)

Fallback: if state not found, numerator defaults to 1.0
          if base state not found, denominator defaults to 0.97
```

#### 3.2.4 Capacity Scale Factor — Six-Tenths Rule (cS)

```
cS = sR^0.6         (if sR != 1)
cS = 1.0             (if sR = 1, skip to avoid floating-point noise)

The six-tenths rule is a standard chemical engineering heuristic:
  "Doubling equipment capacity increases cost by only 52%"

Examples:
  sR = 2.0:   cS = 2.0^0.6  = 1.516   (52% more expensive, not 100%)
  sR = 0.5:   cS = 0.5^0.6  = 0.660   (34% cheaper, not 50%)
  sR = 0.533: cS = 0.533^0.6 = 0.687

Applied to: TIC and Owner's Costs (CAPEX only)
```

#### 3.2.5 Fixed OPEX Scale Factor (fS)

```
fS = (1/sR)^0.15    (if sR != 1)
fS = 1.0             (if sR = 1)

Larger plants have LOWER per-tonne fixed costs because:
  - Same operations crew regardless of size
  - Same number of instruments/control systems
  - Insurance and admin don't scale linearly

The 0.15 exponent is much gentler than CAPEX's 0.6:
  sR = 2.0:   fS = (1/2.0)^0.15 = 0.5^0.15 = 0.902  (10% lower $/t)
  sR = 0.5:   fS = (1/0.5)^0.15 = 2.0^0.15 = 1.109  (11% higher $/t)

Applied to: Fixed OPEX only (NOT variable OPEX — variable scales 1:1)
```

### 3.3 CAPEX Calculation

```
Step 1 — Convert from $M to $:
  rT   = vd.tic x 1,000,000          (TIC in dollars)
  rOwn = (vd.toc - vd.tic) x 1e6     (Owner's costs in dollars)

Step 2 — Apply all four scaling factors:
  sT   = rT   x cS x cR x lR x tF.capex
  sOwn = rOwn x cS x cR x lR x tF.capex

Step 3 — Sum:
  sTOC = sT + sOwn                    (Total Overnight Cost, scaled $)

Scaling chain diagram:
  NETL $M  -->  x cS (size)  -->  x cR (CEPCI)  -->  x lR (location)  -->  x tF.capex (tech)
  (2018$)       (0.6 rule)        (inflate)            (geography)           (technology)

Worked example (Ammonia/TX/90%/Amine/2025, sR=1.0):
  rT   = 36.42 x 1e6 = $36,420,000
  rOwn = (44.43 - 36.42) x 1e6 = $8,010,000
  sT   = 36,420,000 x 1.0 x 1.220 x 1.0 x 1.0 = $44,432,400
  sOwn = 8,010,000  x 1.0 x 1.220 x 1.0 x 1.0 = $9,772,200
  sTOC = $54,204,600
```

### 3.4 Capital Charge ($/t CO2)

```
capC = (sTOC x discountRate) / pCO2

Where:
  discountRate = WACC (weighted average cost of capital)
  WACC = (debtPct/100) x (costDebt/100) + ((100-debtPct)/100) x (costEquity/100)

  Or a user-supplied fixed hurdle rate.

This is a simplified perpetuity-style annualization:
  Annual capital cost = Total capital x WACC
  Per-tonne capital   = Annual capital cost / Annual CO2 captured

Worked example:
  sTOC = $54,204,600, discountRate = 0.08, pCO2 = 375,573
  capC = (54,204,600 x 0.08) / 375,573 = 4,336,368 / 375,573 = $11.55/t
```

### 3.5 Fixed OPEX ($/t CO2)

```
sFO = vd.fo x fS x cR x tF.opex

Where:
  vd.fo    = NETL fixed O&M ($/t CO2 at reference, already CR-adjusted from Stage 1)
  fS       = size scale factor (bigger plant -> lower $/t)
  cR       = CEPCI inflation
  tF.opex  = technology multiplier

Typical components of fixed O&M (approximate):
  53%  Operating & maintenance labor
  17%  Maintenance materials
  12%  Administrative & overhead
  18%  Property taxes, insurance, other

Worked example (Ammonia/TX/90%/Amine/2025, sR=1.0):
  sFO = 3.61 x 1.0 x 1.220 x 1.0 = $4.40/t

Note: No location factor on OPEX — LF only applies to CAPEX.
```

### 3.6 Variable OPEX ($/t CO2)

```
sVO = vd.vo x cR x tF.opex

Where:
  vd.vo    = NETL variable O&M ($/t CO2, already CR-adjusted from Stage 1)
  cR       = CEPCI inflation
  tF.opex  = technology multiplier

Typical components of variable O&M (approximate):
  38%  Solvent/sorbent make-up (amine degradation replacement)
  35%  Chemicals & water treatment
  27%  Waste disposal & consumables

Worked example:
  sVO = 2.33 x 1.220 x 1.0 = $2.84/t

Note: NO size scaling (fS) for VOM — variable costs scale 1:1 with throughput.
  If you capture 2x the CO2, you use 2x the solvent, so $/t stays the same.
```

### 3.7 Power Cost ($/t CO2)

```
Step 1 — Scale parasitic power:
  sPW = vd.pw x sR x tF.power                 (MW)

Step 2 — Annual power cost:
  aPwr = sPW x pp x CF x 8760                 ($/yr)

Step 3 — Per-tonne:
  pPt = aPwr / pCO2                            ($/t CO2)

Variable breakdown:
  vd.pw      = parasitic MW at reference capacity (from Stage 1, CR-adjusted)
  sR         = size ratio (power scales LINEARLY with plant size, not 0.6 rule)
  tF.power   = tech multiplier (membranes/MOFs need less regeneration energy)
  pp         = electricity price from user ($/MWh)
  CF         = capacity factor (fraction of year the plant actually runs)
  8760       = hours per year (365.25 days x 24 hours)

Why power scales linearly (sR, not sR^0.6):
  Unlike equipment costs, energy consumption IS proportional to throughput.
  2x the gas flow = 2x the fan power, 2x the pump power, 2x the compressor work.

Worked example (Ammonia/TX/90%/Amine/2025, sR=1.0, pp=$80/MWh):
  sPW  = 4.44 x 1.0 x 1.0 = 4.44 MW
  aPwr = 4.44 x 80 x 0.85 x 8760 = $2,643,494/yr
  pPt  = 2,643,494 / 375,573 = $7.04/t
```

### 3.8 Fuel Cost ($/t CO2)

```
sFL = vd.fl x (gp / BASE_GP)

Where:
  vd.fl    = $/t fuel cost at NETL base gas price
  gp       = user's natural gas price ($/MMBtu)
  BASE_GP  = $4.42/MMBtu (NETL reference gas price, from constants)

This is a simple ratio adjustment: if gas costs 2x the reference,
fuel cost doubles.

Sources WITH fuel cost (vd.fl > 0):
  Cement, Steel & Iron, Pulp & Paper, Refinery H2, Coal (SC/Sub-C),
  NGCC (F/H-Frame), Biomass
  These sources need to burn additional fuel to regenerate the amine solvent
  (steam for the reboiler) OR their existing fuel use changes.

Sources WITHOUT fuel cost (vd.fl = 0):
  Ammonia, Ethanol, Ethylene Oxide, NG Processing, Coal-to-Liquids, Gas-to-Liquids
  These are either high-purity CO2 (no/minimal reboiler) or already have
  waste heat available.

Worked example (Ammonia — no fuel cost):
  sFL = 0 x (4.42 / 4.42) = $0.00/t
```

### 3.9 Total LCOC

```
total = capC + sFO + sVO + pPt + sFL

All five components are in $/t CO2 captured.

Worked example (Ammonia/TX/90%/Amine/2025):
  Capital:  $11.55/t
  Fixed:    $ 4.40/t
  Variable: $ 2.84/t
  Power:    $ 7.04/t
  Fuel:     $ 0.00/t
  ──────────────────
  TOTAL:    $25.83/t CO2
```

### 3.10 Full Return Object

```javascript
return {
  // Input references
  vd, pCO2, sR, tF,

  // Scaling factors (for debugging/display)
  cR,                    // CEPCI ratio
  lR,                    // Location factor ratio
  cS,                    // Capacity scale factor (0.6 rule)
  fS,                    // Fixed OPEX scale factor

  // CAPEX breakdown
  rT,                    // Reference TIC ($)
  rOwn,                  // Reference Owner's Costs ($)
  sT,                    // Scaled TIC ($)
  sOwn,                  // Scaled Owner's Costs ($)
  sTOC,                  // Scaled Total Overnight Cost ($)
  tpt:  sT / pCO2,      // TIC per tonne ($/t)
  opt:  sOwn / pCO2,     // Owner's cost per tonne ($/t)
  tocpt: sTOC / pCO2,   // TOC per tonne ($/t)

  // OPEX
  sFO,                   // Fixed OPEX ($/t)
  sVO,                   // Variable OPEX ($/t)
  tOM: sFO + sVO,        // Total O&M ($/t)

  // Power
  sPW,                   // Scaled parasitic power (MW)
  aPwr,                  // Annual power cost ($)
  pPt,                   // Power per tonne ($/t)

  // Capital
  capC,                  // Capital charge per tonne ($/t)

  // Fuel
  sFL,                   // Fuel cost ($/t)
  bfl,                   // Base fuel cost before gas price adj
  hasFuel: bfl > 0,      // Boolean flag

  // Total
  total,                 // LCOC ($/t CO2)
  discountRate           // WACC used
}
```

---

## Data Flow: Dashboard vs Batch

```
+-------------------------------+    +-------------------------------+
|    DASHBOARD (Summary Tab)    |    |      BATCH (BatchRunTab)      |
+-------------------------------+    +-------------------------------+
|                               |    |                               |
| src    <- dropdown            |    | srcName <- spreadsheet row    |
| cr     <- slider (e.g. "90%")|    | cr      <- shared crCustom   |
| bt     <- dropdown            |    | bt      <- shared bt         |
| tech   <- dropdown            |    | tech    <- shared tech       |
| st     <- dropdown            |    | stCode  <- spreadsheet row   |
| yr     <- dropdown            |    | yr      <- shared yr         |
| pp     <- EIA lookup or manual|    | pp      <- shared pp         |
| gp     <- strip or manual     |    | gp      <- shared gp        |
| cf     <- input (default 85%) |    | cf      <- shared cfIn      |
| WACC   <- debt/equity inputs  |    | WACC    <- shared debt/equity|
|                               |    |                               |
|        +---------+            |    |        +---------+            |
|        |  gv()   |            |    |        |  gv()   |            |
|        +----+----+            |    |        +----+----+            |
|             |                 |    |             |                  |
|     resolve pCO2, sR         |    |     resolve pCO2, sR          |
|     (custom CO2/plant/        |    |     (from spreadsheet CO2     |
|      combustion logic)        |    |      or NETL default)         |
|             |                 |    |             |                  |
|        +----+----+            |    |        +----+----+            |
|        |calcLCOC |<===========|====|========|calcLCOC |            |
|        | (SAME   |  SAME      |    |  SAME  | (SAME   |            |
|        |FUNCTION)|  FUNCTION  |    |FUNCTION|FUNCTION)|            |
|        +----+----+            |    |        +----+----+            |
|             |                 |    |             |                  |
|        return res             |    |        return r                |
|        (+ UI extras:          |    |        (+ output columns)     |
|         cxBreak, fomItems,    |    |                               |
|         vomItems, etc.)       |    |                               |
|                               |    |                               |
+-------------------------------+    +-------------------------------+

KEY DIFFERENCE: Source and State come from different places.
  Dashboard: user-selected dropdown
  Batch:     each spreadsheet row
All other inputs (tech, CR, BT, pp, gp, cf, WACC) are shared.
```

---

## Constants Reference

| Constant   | File                        | Purpose                                                   |
|-----------|-----------------------------|------------------------------------------------------------|
| `SC`       | `constants/sourceData.js`   | NETL source data (TIC, TOC, FOM, VOM, power, fuel, CO2, CF)|
| `CEPCI`    | `constants/economics.js`    | Chemical Engineering Plant Cost Index by year               |
| `LF`       | `constants/economics.js`    | State location factors (construction cost multipliers)      |
| `TECH`     | `constants/techData.js`     | Technology multipliers (capex, opex, power)                 |
| `BASE_GP`  | `constants/economics.js`    | Reference natural gas price ($4.42/MMBtu)                   |
| `NETL_FIN` | `constants/economics.js`    | NETL financing assumptions (debt%, cost of debt, ROE)       |
| `EIA`      | `constants/economics.js`    | State industrial electricity rates (cents/kWh)              |

---

## Worked Example: Ammonia, TX, 90% CR, Amine, 2025

```
STAGE 1 -- gv("Ammonia", "90%", "Retrofit"):
  NETL has 99% only -> interpolate to 90%
  thermoRatio = -ln(0.10) / -ln(0.01) = 2.303 / 4.605 = 0.500

  tic: 37.356 x 1.0                        = 37.356 $M  (no CR adjustment)
  toc: 45.565 x 1.0                        = 45.565 $M  (no CR adjustment)
  rco: 413,164 x (90/99)                   = 375,573 t/yr
  fo:  3.28 x (1/0.909)                    = 3.61 $/t
  vo:  2.67 x 0.500^0.2                    = 2.33 $/t
  pw:  5.86 x 0.500^0.4                    = 4.44 MW
  fl:  0 (no fuel for Ammonia)

STAGE 2 -- Resolve pCO2 and sR (default, CF=85%):
  pCO2 = 375,573 x (0.85/0.85) = 375,573 t/yr
  sR   = 1.0

STAGE 3 -- calcLCOC():
  Scaling factors:
    tF.capex = 1.0, tF.opex = 1.0, tF.power = 1.0  (Amine)
    cR = CEPCI[2025] / CEPCI[2018] = 1.220
    lR = LF["TX"].f / LF["LA"].f  = 0.97 / 0.97 = 1.000
    cS = 1.0^0.6 = 1.0  (reference size)
    fS = 1.0             (reference size)

  CAPEX:
    rT   = 36.42M         = $36,420,000
    rOwn = (44.43 - 36.42) = $8,010,000
    sT   = 36,420,000 x 1.0 x 1.220 x 1.0 x 1.0 = $44,432,400
    sOwn = 8,010,000  x 1.0 x 1.220 x 1.0 x 1.0 = $9,772,200
    sTOC = $54,204,600

  Cost components:
    Capital:  (54,204,600 x 0.08) / 375,573        = $11.55/t
    Fixed:    3.61 x 1.0 x 1.220 x 1.0              = $4.40/t
    Variable: 2.33 x 1.220 x 1.0                    = $2.84/t
    Power:    (4.44 x 1.0 x 1.0 x 80 x 0.85 x 8760) / 375,573 = $7.04/t
    Fuel:     0 x (4.42 / 4.42)                     = $0.00/t

  LCOC = 11.55 + 4.40 + 2.84 + 7.04 + 0.00        = $25.83/t CO2
```
