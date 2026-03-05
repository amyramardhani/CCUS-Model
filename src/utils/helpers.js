import { EIA, HH_STRIP, HH_STRIP_YRS, HUB_BASIS } from '../constants';

// Format number with thousands separators and fixed decimals. Returns "—" for null/NaN.
export function fm(n, d) {
  if (n == null || isNaN(n)) return "\u2014";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d !== undefined ? d : 2,
    maximumFractionDigits: d !== undefined ? d : 2
  });
}

// Format number as dollars. Returns "—" for null/NaN.
export function fd(n, d) {
  if (n == null || isNaN(n)) return "\u2014";
  return "$" + fm(n, d);
}

// Convert EIA ¢/kWh state rate to $/MWh (×10). Defaults to $60/MWh if state not found.
export function toMWh(sc) {
  const c = EIA[sc];
  return c != null ? +(c * 10).toFixed(0) : 60;
}

// Look up Henry Hub annual average $/MMBtu from the Bloomberg strip.
// Clamps to strip range endpoints.
export function hhBase(yr) {
  if (yr <= HH_STRIP_YRS[0]) return HH_STRIP[HH_STRIP_YRS[0]];
  if (yr >= HH_STRIP_YRS[HH_STRIP_YRS.length - 1]) return HH_STRIP[HH_STRIP_YRS[HH_STRIP_YRS.length - 1]];
  return HH_STRIP[yr] || HH_STRIP[HH_STRIP_YRS[HH_STRIP_YRS.length - 1]];
}

// State-specific gas price = HH strip + hub basis differential. Floor at $0.50/MMBtu.
export function hhStripPrice(yr, st) {
  return Math.max(0.5, hhBase(yr) + (HUB_BASIS[st] || 0));
}

// Auto-select best credit type for a given source from a credit-types map.
// Priority: exact source match > category match > first entry.
export function bestCreditType(source, creditTypes, SC) {
  const cat = SC[source]?.cat || "Industrial";
  for (const [k, v] of Object.entries(creditTypes)) {
    if (k === "custom") continue;
    if (v.srcs && v.srcs.includes(source)) return k;
  }
  for (const [k, v] of Object.entries(creditTypes)) {
    if (k === "custom") continue;
    if (v.cats && v.cats.includes(cat)) return k;
  }
  return Object.keys(creditTypes)[0];
}
