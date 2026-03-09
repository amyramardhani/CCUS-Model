import { useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { SC, CEPCI, LF, TECH, BASE_GP, CX_COLORS, HUB_NAME } from '../constants';
import { gv } from '../utils/engCalculations';
import { fm, fd, toMWh, hhStripPrice } from '../utils/helpers';
import { cd, ch } from '../utils/styles';

export default function ChartsTab({
  res, src, cr, bt, tech, st, yr, pp, gp, pie, bars, hovSt2, setHovSt2
}) {
  if (!res) return null;

  // ── refs for PNG export ──────────────────────────────
  const pieRef1 = useRef(null);
  const pieRef2 = useRef(null);
  const stackRef = useRef(null);
  const flowRef = useRef(null);
  const barsRef = useRef(null);
  const trendRef = useRef(null);
  const srcTrendRef = useRef(null);
  const techRef = useRef(null);
  const techTrendRef = useRef(null);
  const pureLearnRef = useRef(null);
  const mapRef = useRef(null);

  // ── pre-compute chart data ───────────────────────────
  const v = res.vd;
  const tF = TECH[tech] || TECH.amine;
  const cR2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
  const lR2 = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
  const srcCat = SC[src] ? SC[src].cat : 'High Purity';

  // LCOC stack
  const stackComps = [
    { name: 'Capital Charge', val: res.capC, color: '#58b947' },
    { name: 'Fixed OPEX',     val: res.sFO,  color: '#58b947' },
    { name: 'Variable OPEX',  val: res.sVO,  color: '#f68d2e' },
    { name: 'Power',          val: res.pPt,  color: '#b83a4b' },
    ...(res.hasFuel ? [{ name: 'Fuel', val: res.sFL, color: '#93348f' }] : [])
  ];
  const stackBarD = [stackComps.reduce((o, c) => ({ ...o, [c.name]: Math.round(c.val * 100) / 100 }), { name: 'LCOC' })];

  // Flow rate curve
  const flowData = [];
  for (let i = 1; i <= 25; i++) {
    const m = 0.2 + (i / 25) * 1.8;
    const pCO2 = v.rco * (res.cf / v.cf) * m;
    const cS = Math.pow(m, 0.6);
    const sTOC = (v.tic * 1e6 + (v.toc - v.tic) * 1e6) * cS * cR2 * lR2 * tF.capex;
    const fS = Math.pow(1 / m, 0.15);
    const sFO = v.fo * fS * cR2 * tF.opex;
    const sVO = v.vo * cR2 * tF.opex;
    const sPW = v.pw * m * tF.power;
    const pPt = (sPW * pp * res.cf * 8760) / pCO2;
    const capC = (sTOC * res.discountRate) / pCO2;
    const sFL = (v.fl || 0) * (gp / BASE_GP);
    const opex = sFO + sVO + pPt + sFL;
    flowData.push({
      flow: Math.round(pCO2),
      lcoc: Math.round((capC + opex) * 100) / 100,
      capex: Math.round(capC * 100) / 100,
      fixedOpex: Math.round(sFO * 100) / 100,
      varOpex: Math.round(sVO * 100) / 100,
      power: Math.round(pPt * 100) / 100,
      fuel: Math.round(sFL * 100) / 100,
      opex: Math.round(opex * 100) / 100,
      tocM: Math.round(sTOC / 1e6 * 10) / 10,
      opexM: Math.round(opex * pCO2 / 1e6 * 10) / 10,
    });
  }

  // LCOC by cost year
  const cScale = res.sR !== 1 ? Math.pow(res.sR, 0.6) : 1;
  const fScale = res.sR !== 1 ? Math.pow(1 / res.sR, 0.15) : 1;
  const trendData = Object.keys(CEPCI).sort().map(y => {
    const yNum = parseInt(y);
    const cR = CEPCI[yNum] / CEPCI[2018];
    const sTOC = (v.tic * 1e6 + (v.toc - v.tic) * 1e6) * cScale * cR * lR2;
    const cap = (sTOC * res.discountRate) / res.pCO2;
    const fix = v.fo * fScale * cR;
    const vari = v.vo * cR;
    const pwr = (v.pw * res.sR * pp * res.cf * 8760) / res.pCO2;
    const fuel = (v.fl || 0) * (gp / BASE_GP);
    return { Year: yNum, Capital: +cap.toFixed(2), 'Fixed OPEX': +fix.toFixed(2), 'Var OPEX': +vari.toFixed(2), Power: +pwr.toFixed(2), Fuel: +fuel.toFixed(2), 'Total LCOC': +(cap + fix + vari + pwr + fuel).toFixed(2) };
  });

  // All sources trend
  const srcTrend = Object.keys(CEPCI).sort().map(y => {
    const yNum = parseInt(y);
    const cR = CEPCI[yNum] / CEPCI[2018];
    const row = { Year: yNum };
    Object.entries(SC).forEach(([name, s]) => {
      const d = s.vr ? Object.values(s.vr)[0] : s;
      const rco = d.rco || s.rco;
      const lR3 = (LF[st] ? LF[st].f : 1) / (LF[s.bs] ? LF[s.bs].f : 0.97);
      const cap2 = ((d.toc || s.toc) * 1e6 * res.discountRate) / rco * cR * lR3;
      const fix2 = (d.fo || s.fo) * cR;
      const var2 = (d.vo || s.vo) * cR;
      const pwr2 = ((d.pw || s.pw) * pp * (s.cf || 0.85) * 8760) / rco;
      const fl2 = (d.fl || s.fl || 0) * (gp / BASE_GP);
      row[name] = +(cap2 + fix2 + var2 + pwr2 + fl2).toFixed(2);
    });
    return row;
  });

  // Technology comparison
  const techData = Object.entries(TECH).map(([k, t]) => {
    if (!t.compat.includes(srcCat)) return null;
    const sT2 = res.rT * res.cS * res.cR * res.lR * t.capex;
    const sOwn2 = res.rOwn * res.cS * res.cR * res.lR * t.capex;
    const capC2 = ((sT2 + sOwn2) * res.discountRate) / res.pCO2;
    const sFO2 = v.fo * res.fS * res.cR * t.opex;
    const sVO2 = v.vo * res.cR * t.opex;
    const pPt2 = (v.pw * res.sR * t.power * pp * res.cf * 8760) / res.pCO2;
    const sFL2 = (v.fl || 0) * (gp / BASE_GP);
    const total2 = capC2 + sFO2 + sVO2 + pPt2 + sFL2;
    return { Technology: t.n, key: k, Capital: +capC2.toFixed(2), 'Fixed OPEX': +sFO2.toFixed(2), 'Var OPEX': +sVO2.toFixed(2), Power: +pPt2.toFixed(2), Fuel: +sFL2.toFixed(2), 'Total LCOC': +total2.toFixed(2), isCurrent: k === tech };
  }).filter(Boolean).sort((a, b) => a['Total LCOC'] - b['Total LCOC']);

  // Tech learning curves
  const compatTechs = Object.entries(TECH).filter(([, t]) => t.compat.includes(srcCat));
  const techColors = { amine: '#58b947', advamine: '#58a7af', membrane: '#58b947', cryo: '#93348f', solid: '#f68d2e', mof: '#ef509a' };

  const techTrendData = Object.keys(CEPCI).sort().map(y => {
    const yNum = parseInt(y);
    const cR = CEPCI[yNum] / CEPCI[2018];
    const row = { Year: yNum };
    compatTechs.forEach(([k, t]) => {
      const lf = Math.max(0.5, Math.pow(1 - (t.learn || 0), Math.max(0, yNum - (t.baseYr || 2018))));
      const capC2 = ((res.rT + res.rOwn) * res.cS * cR * res.lR * t.capex * lf * res.discountRate) / res.pCO2;
      const sFO2 = v.fo * res.fS * cR * t.opex * lf;
      const sVO2 = v.vo * cR * t.opex * lf;
      const pPt2 = (v.pw * res.sR * t.power * pp * res.cf * 8760) / res.pCO2;
      row[t.n] = +(capC2 + sFO2 + sVO2 + pPt2 + (v.fl || 0) * (gp / BASE_GP)).toFixed(2);
    });
    return row;
  });

  const pureLearnData = Object.keys(CEPCI).sort().map(y => {
    const yNum = parseInt(y);
    const row = { Year: yNum };
    compatTechs.forEach(([k, t]) => {
      const lf = Math.max(0.5, Math.pow(1 - (t.learn || 0), Math.max(0, yNum - (t.baseYr || 2018))));
      const capC2 = ((res.rT + res.rOwn) * res.cS * 1 * res.lR * t.capex * lf * res.discountRate) / res.pCO2;
      const sFO2 = v.fo * res.fS * 1 * t.opex * lf;
      const sVO2 = v.vo * 1 * t.opex * lf;
      const pPt2 = (v.pw * res.sR * t.power * pp * res.cf * 8760) / res.pCO2;
      row[t.n] = +(capC2 + sFO2 + sVO2 + pPt2 + (v.fl || 0) * (gp / BASE_GP)).toFixed(2);
    });
    return row;
  });
  const base2018 = pureLearnData.find(d => d.Year === 2018);
  const latestLearn = pureLearnData[pureLearnData.length - 1];

  // ── LCOC sensitivity sweeps ─────────────────────────
  // LCOC vs Capture Rate: sweep CR from 50% to 99%
  const crSweep = [];
  for (let c = 50; c <= 99; c += 1) {
    const vd2 = gv(src, `${c}%`, bt);
    if (!vd2) continue;
    const cf2 = res.cf;
    const pCO2_2 = vd2.rco * (cf2 / vd2.cf);
    const cS2 = res.sR !== 1 ? Math.pow(res.sR, 0.6) : 1;
    const fS2 = res.sR !== 1 ? Math.pow(1 / res.sR, 0.15) : 1;
    const sTOC2 = (vd2.toc * 1e6) * cS2 * cR2 * lR2 * tF.capex;
    const capC2 = (sTOC2 * res.discountRate) / pCO2_2;
    const sFO2 = vd2.fo * fS2 * cR2 * tF.opex;
    const sVO2 = vd2.vo * cR2 * tF.opex;
    const pPt2 = (vd2.pw * res.sR * tF.power * pp * cf2 * 8760) / pCO2_2;
    const sFL2 = (vd2.fl || 0) * (gp / BASE_GP);
    crSweep.push({ cr: c, lcoc: +(capC2 + sFO2 + sVO2 + pPt2 + sFL2).toFixed(2), capex: +capC2.toFixed(2), opex: +(sFO2 + sVO2).toFixed(2), power: +pPt2.toFixed(2) });
  }

  // LCOC vs CAPEX ($MM): sweep CAPEX multiplier 0.5x to 2.0x
  const capexSweep = [];
  const curCapexMM = res.sTOC / 1e6;
  for (let m = 0.5; m <= 2.0; m += 0.05) {
    const capC2 = res.capC * m;
    const total2 = capC2 + res.sFO + res.sVO + res.pPt + res.sFL;
    const capexMM = curCapexMM * m;
    capexSweep.push({ capexMM: +capexMM.toFixed(1), lcoc: +total2.toFixed(2) });
  }

  // LCOC vs OPEX ($MM/yr): sweep OPEX multiplier 0.5x to 2.0x
  const opexSweep = [];
  const curOpexMM = (res.sFO + res.sVO) * res.pCO2 / 1e6;
  for (let m = 0.5; m <= 2.0; m += 0.05) {
    const sFO2 = res.sFO * m;
    const sVO2 = res.sVO * m;
    const total2 = res.capC + sFO2 + sVO2 + res.pPt + res.sFL;
    const opexMM = curOpexMM * m;
    opexSweep.push({ opexMM: +opexMM.toFixed(1), lcoc: +total2.toFixed(2) });
  }

  // LCOC vs Power (MW): sweep parasitic power load 0.3x to 3.0x
  const pwrSweep = [];
  const curPwrMW = res.sPW;
  for (let m = 0.3; m <= 3.0; m += 0.1) {
    const pwMW = curPwrMW * m;
    const pPt2 = (pwMW * pp * res.cf * 8760) / res.pCO2;
    const total2 = res.capC + res.sFO + res.sVO + pPt2 + res.sFL;
    pwrSweep.push({ mw: +pwMW.toFixed(1), lcoc: +total2.toFixed(2) });
  }

  // LCOC vs Facility Size: sweep sR from 0.2x to 3.0x of reference
  const sizeSweep = [];
  const curCO2tpy = res.pCO2;
  for (let m = 0.2; m <= 3.0; m += 0.1) {
    const pCO2_s = v.rco * m * (res.cf / v.cf);
    const cS_s = Math.pow(m, 0.6);
    const fS_s = Math.pow(1 / m, 0.15);
    const sTOC_s = (v.toc * 1e6) * cS_s * cR2 * lR2 * tF.capex;
    const capC_s = (sTOC_s * res.discountRate) / pCO2_s;
    const sFO_s = v.fo * fS_s * cR2 * tF.opex;
    const sVO_s = v.vo * cR2 * tF.opex;
    const sPW_s = v.pw * m * tF.power;
    const pPt_s = (sPW_s * pp * res.cf * 8760) / pCO2_s;
    const sFL_s = (v.fl || 0) * (gp / BASE_GP);
    sizeSweep.push({
      co2k: +(pCO2_s / 1e3).toFixed(0),
      lcoc: +(capC_s + sFO_s + sVO_s + pPt_s + sFL_s).toFixed(2),
      capital: +capC_s.toFixed(2),
      opex: +(sFO_s + sVO_s).toFixed(2),
      power: +pPt_s.toFixed(2),
      capexMM: +(sTOC_s / 1e6).toFixed(1),
    });
  }
  const curCO2k = +(curCO2tpy / 1e3).toFixed(0);

  // refs for new charts
  const crSweepRef = useRef(null);
  const capexSweepRef = useRef(null);
  const opexSweepRef = useRef(null);
  const pwrSweepRef = useRef(null);
  const sizeSweepRef = useRef(null);

  // ── state LCOC heatmap data ──────────────────────────
  const stateMap = {};
  Object.entries(LF).forEach(([code, loc]) => {
    if (code === 'DC') return;
    const lR3 = loc.f / (LF[v.bs] ? LF[v.bs].f : 0.97);
    const sTOC3 = (v.tic * 1e6 + (v.toc - v.tic) * 1e6) * cR2 * lR3 * tF.capex;
    const sFO3 = v.fo * res.fS * cR2 * tF.opex;
    const sVO3 = v.vo * cR2 * tF.opex;
    const pp3 = toMWh(code);
    const gp3 = hhStripPrice(yr, code);
    const sPW3 = (v.pw * res.sR * tF.power * pp3 * res.cf * 8760) / res.pCO2;
    const sFL3 = (v.fl || 0) * (gp3 / BASE_GP);
    const capC3 = (sTOC3 * res.discountRate) / res.pCO2;
    stateMap[code] = { lcoc: capC3 + sFO3 + sVO3 + sPW3 + sFL3, pp: pp3, gp: gp3, name: loc.n };
  });
  const stateVals = Object.values(stateMap).map(s => s.lcoc).filter(Number.isFinite);
  const minL = Math.min(...stateVals);
  const maxL = Math.max(...stateVals);
  const stateRows = Object.entries(stateMap).map(([code, s]) => ({
    State: code, Name: s.name,
    'LCOC $/t': +s.lcoc.toFixed(2), 'Power $/MWh': +s.pp.toFixed(2), 'Gas $/MMBtu': +s.gp.toFixed(2),
  }));
  const hColor = (l) => {
    const t = Math.max(0, Math.min(1, (l - minL) / Math.max(0.01, maxL - minL)));
    return `rgb(${Math.round(88 + 96 * t)},${Math.round(185 - 127 * t)},${Math.round(71 + 4 * t)})`;
  };

  // ── US state SVG paths (Albers-like, 960×600 viewBox) ─
  // Coordinate system: x = 50 + (125 - lon°W) × 14.8,  y = 25 + (50 - lat°N) × 20
  const SP = {
    WA:"M54,45 L168,45 L170,99 L62,99 Z",
    OR:"M62,99 L176,105 L176,185 L62,185 Z",
    CA:"M62,185 L124,185 L205,305 L168,375 L65,375 L62,290 Z",
    NV:"M124,185 L211,185 L205,325 L124,325 Z",
    AZ:"M203,285 L287,285 L287,399 L203,399 Z",
    ID:"M170,45 L183,45 L183,99 L257,105 L257,185 L176,185 L176,99 L170,99 Z",
    MT:"M183,45 L360,45 L360,137 L257,137 L183,99 Z",
    WY:"M257,125 L360,125 L360,205 L257,205 Z",
    UT:"M211,185 L287,185 L287,285 L211,285 Z",
    CO:"M285,205 L389,205 L389,285 L285,285 Z",
    NM:"M285,285 L374,285 L374,399 L285,399 Z",
    ND:"M360,45 L470,45 L470,107 L360,107 Z",
    SD:"M360,107 L473,107 L473,175 L360,175 Z",
    NE:"M360,175 L490,175 L490,225 L360,225 Z",
    KS:"M389,225 L500,225 L500,285 L389,285 Z",
    OK:"M374,285 L503,285 L503,353 L420,353 L420,295 L374,295 Z",
    TX:"M374,285 L420,285 L420,295 L503,353 L510,427 L497,442 L458,472 L458,509 L425,487 L406,438 L322,389 L374,385 L374,295 Z",
    MN:"M461,45 L575,45 L575,155 L461,155 Z",
    IA:"M470,155 L575,155 L575,215 L470,215 Z",
    MO:"M482,207 L581,207 L581,295 L482,295 Z",
    AR:"M500,295 L575,295 L575,365 L500,365 Z",
    LA:"M507,365 L580,365 L580,445 L507,445 Z",
    WI:"M525,85 L614,85 L614,175 L525,175 Z",
    IL:"M546,175 L605,175 L605,287 L546,287 Z",
    MI:"M549,85 L652,85 L652,110 L679,115 L679,197 L620,197 L620,110 L549,110 Z",
    IN:"M596,189 L645,189 L645,269 L596,269 Z",
    OH:"M645,185 L709,185 L709,257 L645,257 Z",
    KY:"M574,243 L688,243 L688,295 L574,295 Z",
    TN:"M564,295 L692,295 L692,325 L564,325 Z",
    MS:"M543,325 L598,325 L598,425 L543,425 Z",
    AL:"M590,325 L644,325 L644,420 L590,420 Z",
    GA:"M633,325 L704,325 L704,417 L633,417 Z",
    FL:"M604,415 L692,411 L700,441 L710,457 L714,477 L714,511 L694,533 L688,505 L680,469 L672,445 L644,430 L604,425 Z",
    SC:"M666,321 L738,317 L754,385 L666,385 Z",
    NC:"M652,293 L783,287 L786,349 L652,349 Z",
    VA:"M661,235 L787,231 L790,275 L762,295 L661,295 Z",
    WV:"M676,211 L750,211 L750,281 L676,281 Z",
    MD:"M723,231 L790,229 L790,267 L723,267 Z",
    DE:"M778,225 L790,225 L790,255 L778,255 Z",
    PA:"M709,185 L794,185 L796,231 L709,231 Z",
    NY:"M719,125 L836,141 L836,207 L781,215 L719,199 Z",
    NJ:"M781,197 L806,197 L808,247 L781,247 Z",
    CT:"M809,183 L837,183 L839,205 L809,205 Z",
    RI:"M836,185 L848,185 L848,203 L836,203 Z",
    MA:"M812,167 L866,163 L868,195 L846,195 L844,215 L816,201 Z",
    VT:"M814,125 L842,121 L842,171 L814,171 Z",
    NH:"M826,119 L856,115 L858,171 L826,171 Z",
    ME:"M848,75 L910,71 L912,163 L848,163 Z",
    AK:"M62,512 L100,492 L144,480 L190,480 L228,494 L230,522 L212,544 L186,558 L156,564 L118,562 L82,548 L66,528 Z",
    HI:"M272,556 L288,550 L292,564 L276,566 Z M294,546 L308,542 L312,554 L298,556 Z M312,540 L324,538 L326,548 L314,550 Z M328,532 L342,528 L344,542 L330,542 Z M348,524 L366,518 L370,538 L352,540 Z",
  };
  // approximate label centers for each state
  const SL = {
    WA:{x:112,y:72},OR:{x:119,y:145},CA:{x:120,y:280},NV:{x:167,y:255},AZ:{x:245,y:342},
    ID:{x:216,y:143},MT:{x:271,y:91},WY:{x:308,y:165},UT:{x:249,y:235},CO:{x:337,y:245},
    NM:{x:329,y:342},ND:{x:415,y:76},SD:{x:416,y:141},NE:{x:425,y:200},KS:{x:444,y:255},
    OK:{x:439,y:319},TX:{x:430,y:420},MN:{x:518,y:100},IA:{x:522,y:185},MO:{x:531,y:251},
    AR:{x:537,y:330},LA:{x:543,y:406},WI:{x:570,y:130},IL:{x:575,y:231},MI:{x:635,y:150},
    IN:{x:621,y:229},OH:{x:677,y:221},KY:{x:631,y:269},TN:{x:628,y:310},MS:{x:570,y:375},
    AL:{x:617,y:373},GA:{x:668,y:371},FL:{x:655,y:473},SC:{x:703,y:353},NC:{x:718,y:318},
    VA:{x:724,y:263},WV:{x:713,y:246},MD:{x:757,y:249},DE:{x:784,y:238},PA:{x:752,y:208},
    NY:{x:777,y:168},NJ:{x:793,y:222},CT:{x:823,y:194},RI:{x:842,y:194},MA:{x:840,y:184},
    VT:{x:828,y:148},NH:{x:841,y:143},ME:{x:880,y:119},AK:{x:146,y:526},HI:{x:350,y:540},
  };

  // ── export helpers ───────────────────────────────────
  const exportPNG = (ref, name) => {
    const container = ref.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    const clone = svg.cloneNode(true);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = name + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const exportXLSX = (sheets, name) => {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ label, data }) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), label.slice(0, 31));
    });
    XLSX.writeFile(wb, name + '.xlsx');
  };

  const exportAllXLSX = () => exportXLSX([
    { label: 'LCOC Breakdown',  data: pie.map(p => ({ Component: p.name, '$/t CO2': p.value })) },
    { label: 'CAPEX Breakdown', data: res.cxBreak.map(c => ({ System: c.label, '$M': +(c.val/1e6).toFixed(2), '%': +(c.frac*100).toFixed(1) })) },
    { label: 'Cost Stack',      data: stackComps.map(c => ({ Component: c.name, '$/t': c.val, '% Total': +(c.val/res.total*100).toFixed(1) })) },
    { label: 'Flow Rate Curve', data: flowData.map(d => ({ 'CO2 t/yr': d.flow, 'LCOC $/t': d.lcoc, 'Capital $/t': d.capex, 'Fixed OPEX $/t': d.fixedOpex, 'Var OPEX $/t': d.varOpex, 'Power $/t': d.power, 'Fuel $/t': d.fuel, 'CAPEX $M': d.tocM, 'OPEX $M/yr': d.opexM })) },
    { label: 'All Sources',     data: bars },
    { label: 'LCOC by Year',    data: trendData },
    { label: 'Source Trends',   data: srcTrend },
    { label: 'Tech Comparison', data: techData.map(({ Technology, Capital, 'Fixed OPEX': fo, 'Var OPEX': vo, Power, Fuel, 'Total LCOC': tot }) => ({ Technology, 'Capital $/t': Capital, 'Fixed OPEX $/t': fo, 'Var OPEX $/t': vo, 'Power $/t': Power, 'Fuel $/t': Fuel, 'Total LCOC $/t': tot })) },
    { label: 'Tech Trends',     data: techTrendData },
    { label: 'Pure Learning',   data: pureLearnData },
    { label: 'State LCOC',     data: stateRows },
  ], `CCUS_Charts_${src.replace(/[^a-zA-Z0-9]/g, '_')}_${yr}`);

  // ── shared style helpers ─────────────────────────────
  const Btn = ({ onClick, children }) => (
    <button onClick={onClick} style={{ fontSize: 9, padding: '2px 7px', border: '1px solid #e0e0e0', background: '#fafafa', cursor: 'pointer', borderRadius: 3, color: '#888', marginLeft: 4, flexShrink: 0 }}>
      {children}
    </button>
  );
  const ChHead = ({ children, onPNG, onXLSX }) => (
    <h3 style={{ ...ch, display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onPNG  && <Btn onClick={onPNG}>PNG</Btn>}
      {onXLSX && <Btn onClick={onXLSX}>XLSX</Btn>}
    </h3>
  );
  const axStyle = { tick: { fill: '#333', fontSize: 10, fontWeight: 600 } };
  const ttStyle = { contentStyle: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 0, fontSize: 11 } };
  const curFlow = res.pCO2;
  const srcColors = { "Ammonia":"#58b947","Ethylene Oxide":"#58a7af","Ethanol":"#58b947","NG Processing":"#22c55e","Coal-to-Liquids":"#888888","Gas-to-Liquids":"#aaaaaa","Refinery H\u2082":"#f68d2e","Cement":"#b83a4b","Steel & Iron":"#b83a4b","Pulp & Paper":"#93348f","NGCC F-Frame":"#ef509a","NGCC H-Frame":"#f68d2e","Coal SC":"#be185d","Ambient Air":"#58a7af","Ocean Water":"#58a7af" };

  // ── shared layout constants ─────────────────────────
  const G2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 };
  const card = { ...cd, borderRadius: 6 };
  const cardMb = { ...card, marginBottom: 24 };
  const secHead = { fontSize: 13, fontWeight: 700, color: '#58b947', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: '2px solid #e0e0e0' };
  const note = { fontSize: 10, color: '#999', marginTop: 6, lineHeight: 1.5 };
  const H = 300;
  const margin = { top: 10, right: 16, bottom: 44, left: 16 };
  const axLabel = { position: 'bottom', offset: 16, style: { fontSize: 11, fill: '#333', fontWeight: 700 } };

  return (
    <div>
      {/* Export All */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={exportAllXLSX} style={{ fontSize: 11, padding: '6px 18px', border: '1px solid #58b947', background: '#f0faf0', cursor: 'pointer', borderRadius: 4, color: '#58b947', fontWeight: 600 }}>
          Export All Chart Data (XLSX)
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — Cost Breakdown
          ═══════════════════════════════════════════════════════════ */}
      <div style={secHead}>Cost Breakdown</div>

      {/* Pie charts */}
      <div style={G2}>
        <div style={card}>
          <ChHead onPNG={() => exportPNG(pieRef1, `LCOC_Pie_${src}`)} onXLSX={() => exportXLSX([{ label: 'LCOC Breakdown', data: pie.map(p => ({ Component: p.name, '$/t CO2': p.value })) }], `LCOC_Pie_${src}`)}>
            LCOC Breakdown — {src} {cr} {bt}
          </ChHead>
          <div ref={pieRef1}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pie} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2} stroke="none">
                  {pie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(val) => fd(val)} {...ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8 }}>
            {pie.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, background: c.color, borderRadius: 1, flexShrink: 0 }} />
                <span style={{ color: '#888' }}>{c.name}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#333' }}>{fd(c.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '10px 0 0', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>Total LCOC</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#58b947' }}>{fd(res.total)}<span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}> /t CO₂</span></div>
          </div>
        </div>

        <div style={card}>
          <ChHead onPNG={() => exportPNG(pieRef2, `CAPEX_Pie_${src}`)} onXLSX={() => exportXLSX([{ label: 'CAPEX Breakdown', data: res.cxBreak.map(c => ({ System: c.label, '$M': +(c.val/1e6).toFixed(2), '%': +(c.frac*100).toFixed(1) })) }], `CAPEX_Pie_${src}`)}>
            CAPEX by System — {src} {cr} {bt}
          </ChHead>
          <div ref={pieRef2}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={res.cxBreak.map(c => ({ name: c.label, value: c.frac, color: CX_COLORS[c.key] || '#666' }))} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2} stroke="none">
                  {res.cxBreak.map((c, i) => <Cell key={i} fill={CX_COLORS[c.key] || '#666'} />)}
                </Pie>
                <Tooltip formatter={(val) => (val * 100).toFixed(0) + '%'} {...ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8 }}>
            {res.cxBreak.slice(0, 6).map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, background: CX_COLORS[c.key] || '#666', borderRadius: 1, flexShrink: 0 }} />
                <span style={{ color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#333', flexShrink: 0 }}>{(c.frac * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '10px 0 0', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>Total Installed Cost</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#93348f' }}>{fd(res.sT / 1e6, 1)}<span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>M</span></div>
          </div>
        </div>
      </div>

      {/* Cost Stack */}
      <div style={cardMb}>
        <ChHead onPNG={() => exportPNG(stackRef, `Cost_Stack_${src}`)} onXLSX={() => exportXLSX([{ label: 'Cost Stack', data: stackComps.map(c => ({ Component: c.name, '$/t': c.val, '%': +(c.val/res.total*100).toFixed(1) })) }], `Cost_Stack_${src}`)}>
          LCOC Cost Stack — {src} {cr} {bt}
        </ChHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center' }}>
          <div ref={stackRef}>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={stackBarD} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis type="number" hide domain={[0, res.total]} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip {...ttStyle} formatter={v => fd(v)} />
                {stackComps.map(c => <Bar key={c.name} dataKey={c.name} stackId="a" fill={c.color} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            {stackComps.map(c => (
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: c.color, borderRadius: 1 }} />{c.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#333', fontVariantNumeric: 'tabular-nums' }}>
                  {fd(c.val)} <span style={{ fontSize: 9, color: '#aaa' }}>({(c.val/res.total*100).toFixed(0)}%)</span>
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6, borderTop: '2px solid #333' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>Total LCOC</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#58b947' }}>{fd(res.total)}<span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}> /t CO₂</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — Scaling & Flow Rate
          ═══════════════════════════════════════════════════════════ */}
      <div style={secHead}>Scaling & Flow Rate</div>

      <div style={G2}>
        <div style={card}>
          <ChHead onPNG={() => exportPNG(flowRef, `Flow_LCOC_${src}`)} onXLSX={() => exportXLSX([{ label: 'Flow Rate Curve', data: flowData.map(d => ({ 'CO2 t/yr': d.flow, 'LCOC $/t': d.lcoc, 'CAPEX $M': d.tocM, 'OPEX $M/yr': d.opexM })) }], `Flow_Curve_${src}`)}>
            LCOC vs CO₂ Flow Rate
          </ChHead>
          <div ref={flowRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={flowData} margin={margin}>
                <XAxis dataKey="flow" {...axStyle} tickFormatter={v => fm(v, 0)} label={{ value: 'CO₂ (t/yr)', ...axLabel }} />
                <YAxis {...axStyle} tickFormatter={v => '$' + v} width={50} />
                <Tooltip {...ttStyle} formatter={v => '$' + v.toFixed(2) + '/t'} labelFormatter={v => fm(v, 0) + ' t/yr'} />
                <ReferenceLine x={curFlow} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                <Line type="monotone" dataKey="lcoc" stroke="#58b947" strokeWidth={2.5} dot={false} name="LCOC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={note}>Dashed line = current facility size. Larger throughput reduces per-tonne costs via six-tenths rule.</div>
        </div>

        <div style={card}>
          <ChHead onPNG={() => exportPNG(sizeSweepRef, `LCOC_vs_Size_${src}`)} onXLSX={() => exportXLSX([{ label: 'LCOC vs Facility Size', data: sizeSweep }], `LCOC_vs_Size_${src}`)}>
            LCOC vs Facility Size
          </ChHead>
          <div ref={sizeSweepRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={sizeSweep} margin={margin}>
                <XAxis dataKey="co2k" {...axStyle} tickFormatter={v => fm(v, 0) + 'k'} label={{ value: 'CO₂ Captured (kt/yr)', ...axLabel }} />
                <YAxis {...axStyle} tickFormatter={v => '$' + v} width={50} />
                <Tooltip {...ttStyle} formatter={v => '$' + v + '/t'} labelFormatter={v => fm(v, 0) + ' kt CO₂/yr'} />
                <ReferenceLine x={curCO2k} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                <Line type="monotone" dataKey="lcoc" stroke="#58b947" strokeWidth={2.5} dot={false} name="LCOC" />
                <Line type="monotone" dataKey="capital" stroke="#58a7af" strokeWidth={1.5} dot={false} name="Capital" />
                <Line type="monotone" dataKey="opex" stroke="#f68d2e" strokeWidth={1.5} dot={false} name="OPEX" />
                <Line type="monotone" dataKey="power" stroke="#b83a4b" strokeWidth={1.5} dot={false} name="Power" />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#333' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={note}>Dashed line = current ({fm(curCO2k, 0)}k t/yr). Sweep 0.2x–3.0x of reference plant.</div>
        </div>
      </div>

      <div style={G2}>
        <div style={card}>
          <ChHead>CAPEX ($M) vs CO₂ Flow Rate</ChHead>
          <ResponsiveContainer width="100%" height={H}>
            <LineChart data={flowData} margin={margin}>
              <XAxis dataKey="flow" {...axStyle} tickFormatter={v => fm(v, 0)} label={{ value: 'CO₂ (t/yr)', ...axLabel }} />
              <YAxis {...axStyle} tickFormatter={v => '$' + v + 'M'} width={54} />
              <Tooltip {...ttStyle} formatter={v => '$' + v.toFixed(1) + 'M'} labelFormatter={v => fm(v, 0) + ' t/yr'} />
              <ReferenceLine x={curFlow} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
              <Line type="monotone" dataKey="tocM" stroke="#58b947" strokeWidth={2} dot={false} name="CAPEX" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <ChHead>OPEX ($/t) vs CO₂ Flow Rate</ChHead>
          <ResponsiveContainer width="100%" height={H}>
            <LineChart data={flowData} margin={margin}>
              <XAxis dataKey="flow" {...axStyle} tickFormatter={v => fm(v, 0)} label={{ value: 'CO₂ (t/yr)', ...axLabel }} />
              <YAxis {...axStyle} tickFormatter={v => '$' + v} width={50} />
              <Tooltip {...ttStyle} formatter={v => '$' + v.toFixed(2) + '/t'} labelFormatter={v => fm(v, 0) + ' t/yr'} />
              <ReferenceLine x={curFlow} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
              <Line type="monotone" dataKey="opex" stroke="#f68d2e" strokeWidth={2} dot={false} name="OPEX" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — Sensitivity Sweeps
          ═══════════════════════════════════════════════════════════ */}
      <div style={secHead}>Sensitivity Sweeps</div>

      <div style={G2}>
        <div style={card}>
          <ChHead onPNG={() => exportPNG(crSweepRef, `LCOC_vs_CR_${src}`)} onXLSX={() => exportXLSX([{ label: 'LCOC vs CR', data: crSweep }], `LCOC_vs_CR_${src}`)}>
            LCOC vs Capture Rate
          </ChHead>
          <div ref={crSweepRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={crSweep} margin={margin}>
                <XAxis dataKey="cr" {...axStyle} tickFormatter={v => v + '%'} label={{ value: 'Capture Rate (%)', ...axLabel }} />
                <YAxis {...axStyle} tickFormatter={v => '$' + v} width={50} />
                <Tooltip {...ttStyle} formatter={v => '$' + v + '/t'} labelFormatter={v => v + '% capture'} />
                <ReferenceLine x={parseInt(cr)} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                <Line type="monotone" dataKey="lcoc" stroke="#58b947" strokeWidth={2.5} dot={false} name="LCOC" />
                <Line type="monotone" dataKey="capex" stroke="#58a7af" strokeWidth={1.5} dot={false} name="Capital" />
                <Line type="monotone" dataKey="opex" stroke="#f68d2e" strokeWidth={1.5} dot={false} name="OPEX" />
                <Line type="monotone" dataKey="power" stroke="#b83a4b" strokeWidth={1.5} dot={false} name="Power" />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#333' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={note}>Dashed line = current ({cr}). Power penalty drives LCOC up above ~90%.</div>
        </div>

        <div style={card}>
          <ChHead onPNG={() => exportPNG(capexSweepRef, `LCOC_vs_CAPEX_${src}`)} onXLSX={() => exportXLSX([{ label: 'LCOC vs CAPEX', data: capexSweep }], `LCOC_vs_CAPEX_${src}`)}>
            LCOC vs CAPEX ($MM)
          </ChHead>
          <div ref={capexSweepRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={capexSweep} margin={margin}>
                <XAxis dataKey="capexMM" {...axStyle} tickFormatter={v => '$' + fm(v, 0) + 'M'} label={{ value: 'Total CAPEX ($MM)', ...axLabel }} />
                <YAxis {...axStyle} tickFormatter={v => '$' + v} width={50} />
                <Tooltip {...ttStyle} formatter={v => fd(v) + '/t'} labelFormatter={v => '$' + fm(v, 1) + 'MM'} />
                <ReferenceLine x={+curCapexMM.toFixed(1)} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                <Line type="monotone" dataKey="lcoc" stroke="#58b947" strokeWidth={2.5} dot={false} name="LCOC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={note}>Dashed line = current (${fm(curCapexMM, 1)}MM). Sweep 0.5x–2.0x.</div>
        </div>
      </div>

      <div style={G2}>
        <div style={card}>
          <ChHead onPNG={() => exportPNG(opexSweepRef, `LCOC_vs_OPEX_${src}`)} onXLSX={() => exportXLSX([{ label: 'LCOC vs OPEX', data: opexSweep }], `LCOC_vs_OPEX_${src}`)}>
            LCOC vs OPEX ($MM/yr)
          </ChHead>
          <div ref={opexSweepRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={opexSweep} margin={margin}>
                <XAxis dataKey="opexMM" {...axStyle} tickFormatter={v => '$' + fm(v, 0) + 'M'} label={{ value: 'Total OPEX ($MM/yr)', ...axLabel }} />
                <YAxis {...axStyle} tickFormatter={v => '$' + v} width={50} />
                <Tooltip {...ttStyle} formatter={v => fd(v) + '/t'} labelFormatter={v => '$' + fm(v, 1) + 'MM/yr'} />
                <ReferenceLine x={+curOpexMM.toFixed(1)} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                <Line type="monotone" dataKey="lcoc" stroke="#58b947" strokeWidth={2.5} dot={false} name="LCOC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={note}>Dashed line = current (${fm(curOpexMM, 1)}MM/yr). Sweep 0.5x–2.0x.</div>
        </div>

        <div style={card}>
          <ChHead onPNG={() => exportPNG(pwrSweepRef, `LCOC_vs_Power_${src}`)} onXLSX={() => exportXLSX([{ label: 'LCOC vs Power', data: pwrSweep }], `LCOC_vs_Power_${src}`)}>
            LCOC vs Parasitic Power (MW)
          </ChHead>
          <div ref={pwrSweepRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={pwrSweep} margin={margin}>
                <XAxis dataKey="mw" {...axStyle} tickFormatter={v => fm(v, 0) + ' MW'} label={{ value: 'Parasitic Power (MW)', ...axLabel }} />
                <YAxis {...axStyle} tickFormatter={v => '$' + v} width={50} />
                <Tooltip {...ttStyle} formatter={v => fd(v) + '/t'} labelFormatter={v => fm(v, 1) + ' MW'} />
                <ReferenceLine x={+curPwrMW.toFixed(1)} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                <Line type="monotone" dataKey="lcoc" stroke="#58b947" strokeWidth={2.5} dot={false} name="LCOC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={note}>Dashed line = current ({fm(curPwrMW, 1)} MW at ${pp}/MWh). Sweep 0.3x–3.0x.</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — Source & Year Comparisons
          ═══════════════════════════════════════════════════════════ */}
      <div style={secHead}>Source & Year Comparisons</div>

      <div style={cardMb}>
        <ChHead onPNG={() => exportPNG(barsRef, `All_Sources_${yr}`)} onXLSX={() => exportXLSX([{ label: 'All Sources', data: bars }], `All_Sources_${yr}`)}>
          All Sources — LCOC Comparison — {yr} · {LF[st] ? LF[st].n : st} · ${pp}/MWh
        </ChHead>
        <div ref={barsRef}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={bars} margin={{ top: 10, right: 16, bottom: 50, left: 16 }}>
              <XAxis dataKey="name" tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} tickFormatter={v => '$' + v} />
              <Tooltip {...ttStyle} formatter={v => fd(v)} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#333' }} />
              <Bar dataKey="Capital" stackId="a" fill="#58b947" />
              <Bar dataKey="Fixed OPEX" stackId="a" fill="#7cc96e" />
              <Bar dataKey="Variable OPEX" stackId="a" fill="#f68d2e" />
              <Bar dataKey="Power" stackId="a" fill="#b83a4b" />
              <Bar dataKey="Nat Gas" stackId="a" fill="#93348f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={G2}>
        <div style={card}>
          <ChHead onPNG={() => exportPNG(trendRef, `Year_Trend_${src}`)} onXLSX={() => exportXLSX([{ label: 'LCOC by Year', data: trendData }], `Year_Trend_${src}`)}>
            {src} — LCOC by Cost Year
          </ChHead>
          <div ref={trendRef}>
            <ResponsiveContainer width="100%" height={H}>
              <BarChart data={trendData} margin={margin}>
                <XAxis dataKey="Year" tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} tickFormatter={v => '$' + v} />
                <Tooltip {...ttStyle} formatter={v => fd(v)} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#333' }} />
                <Bar dataKey="Capital" stackId="a" fill="#58b947" />
                <Bar dataKey="Fixed OPEX" stackId="a" fill="#7cc96e" />
                <Bar dataKey="Var OPEX" stackId="a" fill="#f68d2e" />
                <Bar dataKey="Power" stackId="a" fill="#b83a4b" />
                <Bar dataKey="Fuel" stackId="a" fill="#93348f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={note}>CEPCI-escalated from 2018. {yr} → {fd(res.total)}/t.</div>
        </div>

        <div style={card}>
          <ChHead onPNG={() => exportPNG(srcTrendRef, `Source_Trends_${yr}`)} onXLSX={() => exportXLSX([{ label: 'Source Trends', data: srcTrend }], `Source_Trends_${yr}`)}>
            All Sources — LCOC Trend by Cost Year
          </ChHead>
          <div ref={srcTrendRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={srcTrend} margin={margin}>
                <XAxis dataKey="Year" tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} tickFormatter={v => '$' + v} />
                <Tooltip {...ttStyle} formatter={v => '$' + v + '/t'} />
                <ReferenceLine x={yr} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                {Object.keys(SC).map(name => (
                  <Line key={name} dataKey={name} stroke={srcColors[name] || '#aaa'} strokeWidth={name === src ? 2.5 : 1} dot={false} opacity={name === src ? 1 : 0.4} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
            {Object.keys(SC).map(name => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, opacity: name === src ? 1 : 0.5 }}>
                <div style={{ width: 10, height: 2, background: srcColors[name] || '#aaa' }} />
                <span style={{ color: '#888' }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — Technology
          ═══════════════════════════════════════════════════════════ */}
      <div style={secHead}>Technology Comparison</div>

      <div style={cardMb}>
        <ChHead onPNG={() => exportPNG(techRef, `Tech_Compare_${src}`)} onXLSX={() => exportXLSX([{ label: 'Tech Comparison', data: techData.map(({ Technology, Capital, 'Fixed OPEX': fo, 'Var OPEX': vo, Power, Fuel, 'Total LCOC': tot }) => ({ Technology, 'Capital $/t': Capital, 'Fixed OPEX $/t': fo, 'Var OPEX $/t': vo, 'Power $/t': Power, 'Fuel $/t': Fuel, 'Total LCOC $/t': tot })) }], `Tech_Compare_${src}`)}>
          {src} — LCOC by Technology ({yr} · {LF[st] ? LF[st].n : st})
        </ChHead>
        <div ref={techRef}>
          <ResponsiveContainer width="100%" height={H}>
            <BarChart data={techData} layout="vertical" margin={{ top: 10, right: 30, bottom: 4, left: 100 }}>
              <XAxis type="number" tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} tickFormatter={v => '$' + v} />
              <YAxis type="category" dataKey="Technology" tick={{ fill: '#333', fontSize: 11, fontWeight: 700 }} width={95} />
              <Tooltip {...ttStyle} formatter={v => fd(v)} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#333' }} />
              <Bar dataKey="Capital" stackId="a" fill="#58b947" />
              <Bar dataKey="Fixed OPEX" stackId="a" fill="#7cc96e" />
              <Bar dataKey="Var OPEX" stackId="a" fill="#f68d2e" />
              <Bar dataKey="Power" stackId="a" fill="#b83a4b" />
              <Bar dataKey="Fuel" stackId="a" fill="#93348f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12, fontSize: 11 }}>
          {techData.map(t => (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: t.isCurrent ? '#f0faf0' : 'transparent', border: t.isCurrent ? '1px solid #58b947' : '1px solid transparent', borderRadius: 3 }}>
              <span style={{ color: '#888' }}>{t.Technology}:</span>
              <span style={{ fontWeight: 700, color: t.isCurrent ? '#58b947' : '#444' }}>{fd(t['Total LCOC'])}</span>
              {t.isCurrent && <span style={{ fontSize: 9, color: '#58b947', fontWeight: 600 }}>CURRENT</span>}
            </div>
          ))}
        </div>
        <div style={note}>Incompatible technologies not shown. Lower LCOC = more cost-effective.</div>
      </div>

      <div style={G2}>
        <div style={card}>
          <ChHead onPNG={() => exportPNG(techTrendRef, `Tech_Trend_${src}`)} onXLSX={() => exportXLSX([{ label: 'Tech Trends', data: techTrendData }], `Tech_Trend_${src}`)}>
            {src} — Tech LCOC with Learning Curves
          </ChHead>
          <div ref={techTrendRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={techTrendData} margin={margin}>
                <XAxis dataKey="Year" tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} tickFormatter={v => '$' + v} domain={['auto', 'auto']} />
                <Tooltip {...ttStyle} formatter={v => fd(v)} />
                <ReferenceLine x={yr} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                {compatTechs.map(([k, t]) => (
                  <Line key={k} dataKey={t.n} stroke={techColors[k] || '#aaa'} strokeWidth={k === tech ? 3 : 1.5} dot={false} opacity={k === tech ? 1 : 0.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
            {compatTechs.map(([k, t]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, opacity: k === tech ? 1 : 0.6 }}>
                <div style={{ width: 14, height: k === tech ? 3 : 2, background: techColors[k] || '#aaa' }} />
                <span style={{ color: k === tech ? '#444' : '#888', fontWeight: k === tech ? 600 : 400 }}>{t.n}</span>
                <span style={{ color: '#aaa', fontSize: 9 }}>({((t.learn || 0) * 100).toFixed(0)}%/yr)</span>
                {k === tech && <span style={{ color: '#58b947', fontSize: 9 }}>●</span>}
              </div>
            ))}
          </div>
          <div style={note}>Learning curves reduce costs over time. CEPCI inflation partially offsets. Floor at 50%.</div>
        </div>

        <div style={card}>
          <ChHead onPNG={() => exportPNG(pureLearnRef, `Pure_Learn_${src}`)} onXLSX={() => exportXLSX([{ label: 'Pure Learning', data: pureLearnData }], `Pure_Learn_${src}`)}>
            {src} — Pure Learning (2018 USD)
          </ChHead>
          <div ref={pureLearnRef}>
            <ResponsiveContainer width="100%" height={H}>
              <LineChart data={pureLearnData} margin={margin}>
                <XAxis dataKey="Year" tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#333', fontSize: 10, fontWeight: 600 }} tickFormatter={v => '$' + v} domain={['auto', 'auto']} />
                <Tooltip {...ttStyle} formatter={v => fd(v)} />
                <ReferenceLine x={yr} stroke="#333" strokeDasharray="3 3" strokeWidth={1} />
                {compatTechs.map(([k, t]) => (
                  <Line key={k} dataKey={t.n} stroke={techColors[k] || '#aaa'} strokeWidth={k === tech ? 3 : 1.5} dot={false} opacity={k === tech ? 1 : 0.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
            {compatTechs.map(([k, t]) => {
              const b = base2018 ? base2018[t.n] : 0;
              const l = latestLearn ? latestLearn[t.n] : 0;
              const pctDrop = b > 0 ? ((b - l) / b * 100).toFixed(0) : 0;
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, opacity: k === tech ? 1 : 0.6 }}>
                  <div style={{ width: 14, height: k === tech ? 3 : 2, background: techColors[k] || '#aaa' }} />
                  <span style={{ color: k === tech ? '#444' : '#888', fontWeight: k === tech ? 600 : 400 }}>{t.n}</span>
                  <span style={{ color: '#58b947', fontSize: 9, fontWeight: 600 }}>↓{pctDrop}%</span>
                  {k === tech && <span style={{ color: '#58b947', fontSize: 9 }}>●</span>}
                </div>
              );
            })}
          </div>
          <div style={note}>Constant 2018 USD. No inflation — pure learning. Reduction 2018→{latestLearn?.Year || 2026}.</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6 — Geographic
          ═══════════════════════════════════════════════════════════ */}
      <div style={secHead}>Geographic Analysis</div>

      <div style={cardMb}>
        <ChHead
          onPNG={() => exportPNG(mapRef, `State_LCOC_${src}_${yr}`)}
          onXLSX={() => exportXLSX([{ label: 'State LCOC', data: stateRows }], `State_LCOC_${src}_${yr}`)}
        >
          {src} — LCOC by State ({yr} · {tF.n || tech})
        </ChHead>
        <div style={{ position: 'relative' }} ref={mapRef}>
          <svg viewBox="0 0 960 600" style={{ width: '100%', height: 'auto', display: 'block' }}>
            {Object.entries(SP).map(([code, path]) => {
              const s = stateMap[code];
              if (!s) return null;
              return (
                <path
                  key={code}
                  d={path}
                  fill={hColor(s.lcoc)}
                  stroke="#222"
                  strokeWidth={0.8}
                  strokeLinejoin="round"
                  opacity={code === st ? 1 : 0.85}
                  style={{ cursor: 'pointer', filter: code === st ? 'brightness(1.15)' : 'none' }}
                  onMouseEnter={() => setHovSt2(code)}
                  onMouseLeave={() => setHovSt2(null)}
                />
              );
            })}
            {Object.entries(SL).map(([code, pos]) => {
              const s = stateMap[code];
              if (!s) return null;
              return (
                <text
                  key={code}
                  x={pos.x} y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: 7.5, fontFamily: 'sans-serif', fill: '#fff', pointerEvents: 'none',
                    fontWeight: code === st ? 700 : 400, opacity: 0.9 }}
                >
                  {code}
                </text>
              );
            })}
            <text x={146} y={576} textAnchor="middle" style={{ fontSize: 8, fill: '#aaa', fontFamily: 'sans-serif' }}>Alaska</text>
            <text x={350} y={576} textAnchor="middle" style={{ fontSize: 8, fill: '#aaa', fontFamily: 'sans-serif' }}>Hawaii</text>
          </svg>
          {hovSt2 && stateMap[hovSt2] && (
            <div style={{ position: 'absolute', top: 10, right: 10, background: '#1a1a1a', border: '1px solid #444', padding: '12px 16px', fontSize: 11, minWidth: 180, pointerEvents: 'none', borderRadius: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff', fontSize: 12 }}>{stateMap[hovSt2].name} ({hovSt2})</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <span style={{ color: '#aaa' }}>LCOC</span>
                <span style={{ color: hColor(stateMap[hovSt2].lcoc), fontWeight: 700 }}>{fd(stateMap[hovSt2].lcoc)}/t</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <span style={{ color: '#aaa' }}>Power</span>
                <span style={{ color: '#eee', fontWeight: 600 }}>${stateMap[hovSt2].pp.toFixed(1)}/MWh</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <span style={{ color: '#aaa' }}>Gas</span>
                <span style={{ color: '#eee', fontWeight: 600 }}>${stateMap[hovSt2].gp.toFixed(2)}/MMBtu</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#aaa' }}>Hub</span>
                <span style={{ color: '#eee', fontSize: 10 }}>{HUB_NAME[hovSt2] || 'Henry Hub'}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 10 }}>
          <span style={{ color: '#aaa', minWidth: 50, textAlign: 'right' }}>{fd(minL)}</span>
          <div style={{ flex: 1, height: 10, background: 'linear-gradient(to right, rgb(88,185,71), rgb(184,58,75))', borderRadius: 2 }} />
          <span style={{ color: '#aaa', minWidth: 50 }}>{fd(maxL)}</span>
        </div>
        <div style={note}>
          Hover for details. Cost year {yr}. Power = EIA state rates, gas = Henry Hub + basis differential.
          {st && stateMap[st] ? <span> Selected: <strong style={{ color: '#58b947' }}>{stateMap[st].name} — {fd(stateMap[st].lcoc)}/t</strong></span> : null}
        </div>
      </div>

    </div>
  );
}
