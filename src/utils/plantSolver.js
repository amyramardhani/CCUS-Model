/**
 * plantSolver.js — Iterative constraint solver for the 9 CCUS plant variables.
 *
 * Variables:
 *   PC  — Plant Capacity [MW]
 *   CF  — Capacity Factor [decimal, 0–1]
 *   HPY — Hours per Year [hours/year]
 *   HR  — Heat Rate [MMBtu/MWh]
 *   EF  — Emission Factor [kg/MMBtu]
 *   CR  — Capture Rate [decimal, 0–1]
 *   EO  — Expected Output [MWh/year]
 *   COP — CO2 Produced [kg CO2/year]
 *   COC — CO2 Captured [kg CO2/year]
 *
 * Formulas:
 *   EO  = PC  * CF * HPY
 *   COP = EO  * HR * (EF / 1000)
 *   COC = COP * CR
 */

const VARIABLES = [
  { key: 'PC',  name: 'Plant Capacity',  unit: 'MW' },
  { key: 'CF',  name: 'Capacity Factor', unit: 'decimal' },
  { key: 'HPY', name: 'Hours per Year',  unit: 'hours/year' },
  { key: 'HR',  name: 'Heat Rate',       unit: 'MMBtu/MWh' },
  { key: 'EF',  name: 'Emission Factor', unit: 'kg/MMBtu' },
  { key: 'CR',  name: 'Capture Rate',    unit: 'decimal' },
  { key: 'EO',  name: 'Expected Output', unit: 'MWh/year' },
  { key: 'COP', name: 'CO2 Produced',    unit: 'kg CO2/year' },
  { key: 'COC', name: 'CO2 Captured',    unit: 'kg CO2/year' },
];

export { VARIABLES };

/**
 * Validate and normalize raw user inputs.
 * - CF and CR entered as percentages (>1) are auto-divided by 100.
 * - Returns { vars, warnings } where vars is a dict of key -> number|null.
 */
export function validateInputs(rawInputs) {
  const vars = {};
  const warnings = [];

  for (const { key } of VARIABLES) {
    const raw = rawInputs[key];
    if (raw === null || raw === undefined || raw === '') {
      vars[key] = null;
    } else {
      let val = Number(raw);
      if (isNaN(val) || val < 0) {
        warnings.push(`${key}: invalid value "${raw}", treating as unknown.`);
        vars[key] = null;
        continue;
      }
      // Auto-convert percentage inputs for CF and CR
      if ((key === 'CF' || key === 'CR') && val > 1) {
        warnings.push(`${key} entered as ${val} (>1) — auto-divided by 100 to ${val / 100}.`);
        val = val / 100;
      }
      vars[key] = val;
    }
  }

  return { vars, warnings };
}

/**
 * All rearranged formulas. Each entry: [output key, required input keys, compute fn].
 * The solver iterates these until no new variables can be resolved.
 */
const FORMULAS = [
  // Forward formulas
  ['EO',  ['PC', 'CF', 'HPY'],      v => v.PC * v.CF * v.HPY],
  ['COP', ['EO', 'HR', 'EF'],       v => v.EO * v.HR * (v.EF / 1000)],
  ['COC', ['COP', 'CR'],            v => v.COP * v.CR],

  // Rearrangements of EO = PC * CF * HPY
  ['PC',  ['EO', 'CF', 'HPY'],      v => v.EO / (v.CF * v.HPY)],
  ['CF',  ['EO', 'PC', 'HPY'],      v => v.EO / (v.PC * v.HPY)],
  ['HPY', ['EO', 'PC', 'CF'],       v => v.EO / (v.PC * v.CF)],

  // Rearrangements of COP = EO * HR * (EF / 1000)
  ['EO',  ['COP', 'HR', 'EF'],      v => v.COP / (v.HR * (v.EF / 1000))],
  ['HR',  ['COP', 'EO', 'EF'],      v => v.COP / (v.EO * (v.EF / 1000))],
  ['EF',  ['COP', 'EO', 'HR'],      v => (v.COP / (v.EO * v.HR)) * 1000],

  // Rearrangements of COC = COP * CR
  ['COP', ['COC', 'CR'],            v => v.COC / v.CR],
  ['CR',  ['COC', 'COP'],           v => v.COC / v.COP],
];

/**
 * Iterative constraint solver.
 *
 * Takes a vars dict (key -> number|null for unknowns), iteratively applies
 * all rearranged formulas until no new variables can be resolved.
 *
 * Returns { solved, unsolved, contradictions, inputKeys }
 *   - solved: dict of all resolved variables (key -> number)
 *   - unsolved: array of keys that could not be determined
 *   - contradictions: array of { key, existing, computed } for over-constrained cases
 *   - inputKeys: Set of keys that were user-provided
 */
export function solve(vars) {
  const result = { ...vars };
  const inputKeys = new Set();
  const computedKeys = new Set();
  const contradictions = [];

  // Track which keys were provided by the user
  for (const key of Object.keys(result)) {
    if (result[key] !== null) {
      inputKeys.add(key);
    }
  }

  const TOLERANCE = 1e-6;
  let changed = true;
  let iterations = 0;
  const MAX_ITER = 20;

  while (changed && iterations < MAX_ITER) {
    changed = false;
    iterations++;

    for (const [outKey, reqKeys, computeFn] of FORMULAS) {
      // All required inputs must be known
      if (reqKeys.some(k => result[k] === null)) continue;
      // Check for division by zero
      if (reqKeys.some(k => result[k] === 0)) continue;

      const computed = computeFn(result);
      if (!isFinite(computed)) continue;

      if (result[outKey] === null) {
        // Unknown — fill it in
        result[outKey] = computed;
        computedKeys.add(outKey);
        changed = true;
      } else if (inputKeys.has(outKey) || computedKeys.has(outKey)) {
        // Already known — check for contradiction
        const relDiff = Math.abs(result[outKey] - computed) / Math.max(Math.abs(result[outKey]), 1e-12);
        if (relDiff > TOLERANCE) {
          contradictions.push({
            key: outKey,
            existing: result[outKey],
            computed,
          });
        }
      }
    }
  }

  // Collect unsolved
  const unsolved = VARIABLES
    .map(v => v.key)
    .filter(k => result[k] === null);

  // Build final solved dict (only non-null)
  const solved = {};
  for (const { key } of VARIABLES) {
    if (result[key] !== null) {
      solved[key] = result[key];
    }
  }

  return { solved, unsolved, contradictions, inputKeys };
}

/**
 * Format a number with commas and 2 decimal places.
 */
function formatNum(val) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Build a results table array for display.
 * Each entry: { key, name, unit, value, formatted, source }
 *   - source: 'INPUT' | 'COMPUTED' | 'UNSOLVED'
 *   - For CF and CR, includes both decimal and percentage display.
 */
export function buildResultsTable(solveResult) {
  const { solved, unsolved, contradictions, inputKeys } = solveResult;
  const unsolvedSet = new Set(unsolved);

  return VARIABLES.map(({ key, name, unit }) => {
    if (unsolvedSet.has(key)) {
      return { key, name, unit, value: null, formatted: '—', source: 'UNSOLVED' };
    }
    const val = solved[key];
    const source = inputKeys.has(key) ? 'INPUT' : 'COMPUTED';
    let formatted = formatNum(val);

    // CF and CR: show both decimal and percentage
    if (key === 'CF' || key === 'CR') {
      formatted = `${val.toFixed(4)} (${(val * 100).toFixed(2)}%)`;
    }

    return { key, name, unit, value: val, formatted, source };
  });
}

/**
 * Convenience: validate, solve, and build results in one call.
 * Input: rawInputs — object with keys PC, CF, HPY, HR, EF, CR, EO, COP, COC
 *        (values are numbers, strings, or null/undefined for unknowns)
 * Returns: { table, unsolved, contradictions, warnings }
 */
export function solveFromInputs(rawInputs) {
  const { vars, warnings } = validateInputs(rawInputs);
  const result = solve(vars);
  const table = buildResultsTable(result);
  return {
    table,
    unsolved: result.unsolved,
    contradictions: result.contradictions,
    warnings,
  };
}
