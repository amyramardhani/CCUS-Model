import Tip from '../components/Tip';
import { SC, TECH, LF, CEPCI, CX_COLORS, CDR_TYPES, AVOID_TYPES, EMIT_FACTORS, BASE_GP, HUB_BASIS, HUB_NAME, MACRS, EIA } from '../constants';
import { fm, fd, toMWh, hhBase, hhStripPrice, bestCreditType } from '../utils/helpers';
import { sec, secH, row, rowL, rowR, fi, fSel, unit, sub, cd, ch, thd } from '../utils/styles';

export default function SummaryTab({
  src, crCustom, bt, tech, st, yr, mode, co2Cap, plCap, pp, ppO, gp, gpO, codYear, cfIn,
  plantMW, plantCFpct, heatRateBtu, derivedCO2,
  debtPct, costDebt, costEquity, useFixedHurdle, fixedHurdle, capStructOverride, projLife, projLifeOverride,
  fedTax, stateTax, stateTaxOverride, deprMethod, bonusDepr, bonusDeprPct,
  use45Q, q45Duration, q45Inflation, q45StartYear, use48C, itcPct, grantAmt,
  useCDRCredit, cdrCreditType, cdrCreditRate, useAvoidCredit, avoidCreditType, avoidCreditRate, vcmDuration,
  res,
  chSrc, setCrCustom, setBt, setTech, setSt, setYr, setMode, setCo2Cap, setPlCap,
  setPp, setPpO, setGp, setGpO, setCodYear, setCfIn,
  setPlantMW, setPlantCFpct, setHeatRateBtu,
  setDebtPct, setCostDebt, setCostEquity, setUseFixedHurdle, setFixedHurdle, setCapStructOverride,
  setProjLife, setProjLifeOverride,
  setFedTax, setStateTax, setStateTaxOverride, setDeprMethod, setBonusDepr, setBonusDeprPct,
  setUse45Q, setQ45Duration, setQ45Inflation, setQ45StartYear, setUse48C, setItcPct, setGrantAmt,
  setUseCDRCredit, setCdrCreditType, setCdrCreditRate, setUseAvoidCredit, setAvoidCreditType, setAvoidCreditRate, setVcmDuration,
}) {
  const sd = SC[src];
  const aR = sd ? sd.cr : ["99%"];
  const aB = sd ? sd.bt : ["Retrofit"];
  const cr = `${crCustom}%`;
  const vd = res ? res.vd : null;
  const eC = EIA[st];
  const eM = toMWh(st);
  const hasCombustion = !!(EMIT_FACTORS[src]);
  const srcData = SC[src];
  const refPlantCap = srcData ? srcData.rpc : 1;
  const refCO2base = srcData ? (srcData.rco || (srcData.vr && srcData.vr[Object.keys(srcData.vr)[0]] ? srcData.vr[Object.keys(srcData.vr)[0]].rco : 0)) : 0;
  const refCFbase = srcData ? srcData.cf || 0.85 : 0.85;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 24, alignItems: "start", width: "100%" }}>

      {/* ═══════ LEFT COLUMN: ALL INPUTS ═══════ */}
      <div style={{ position: "sticky", top: 16 }}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
          <button onClick={()=>{
            chSrc("NGCC F-Frame"); setCr(90); setBt("MEA"); setMode("co2"); setCo2Cap(""); setPlCap(""); setCfIn("");
            setTech("amine"); setYr(2026); setSt("TX"); setPp(toMWh("TX")); setPpO(false);
            setGp(hhStripPrice(2029,"TX")); setGpO(false); setCodYear(2029);
            setDebtPct(60); setCostDebt(6); setCostEquity(12); setUseFixedHurdle(true); setFixedHurdle(10); setProjLife(30);
            setFedTax(21); setStateTax(0); setDeprKey("20-yr"); setConstructionYears(3);
            setUse45Q(true); setQ45Duration(12); setQ45Inflation(2); setQ45StartYear(2029); setGrantAmt(0);
            setUse48C(false); setItcPct(30);
            setUseCDRCredit(false); setCdrCreditRate(200); setUseAvoidCredit(false); setAvoidCreditRate(30);
            setVcmDuration(10);
          }} style={{fontSize:9,color:"#aaaaaa",background:"none",border:"1px solid #e0e0e0",borderRadius:4,padding:"3px 10px",cursor:"pointer"}}>
            Reset All
          </button>
        </div>
        <div style={sec}>
          <div style={secH}>Capture Configuration</div>
          <div style={row}>
            <span style={rowL}><Tip k="Emission Source">Emission Source</Tip></span>
            <select value={src} onChange={(e) => chSrc(e.target.value)} style={{...fSel, minWidth: 140}}>
              <optgroup label="High Purity">{["Ammonia","Ethylene Oxide","Ethanol","NG Processing","Coal-to-Liquids","Gas-to-Liquids"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
              <optgroup label="Industrial / Hydrogen">{["Refinery H₂","Cement","Steel & Iron","Pulp & Paper"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
              <optgroup label="Power Generation">{["NGCC F-Frame","NGCC H-Frame","Coal SC","Biomass"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
              <optgroup label="Carbon Removal (CDR)">{["Ambient Air","Ocean Water"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
            </select>
          </div>
          <div style={row}>
            <span style={rowL}><Tip k="Capture Config">Capture Rate</Tip></span>
            <div style={{...rowR, gap: 4}}>
              <input type="number" value={crCustom} onChange={(e) => setCrCustom(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} min="0" max="100" step="1" style={{...fi, width: 55, fontSize: 12, padding: "5px 8px", textAlign: "right"}} />
              <span style={{fontSize: 11, color: "#888888"}}>%</span>
              {!aR.includes(`${crCustom}%`) && <span style={{fontSize: 10, color: "#f68d2e", fontWeight: 600}}>⚠ est</span>}
            </div>
          </div>
          <div style={row}>
            <span style={rowL}><Tip k="Retrofit">Build Type</Tip></span>
            <div style={rowR}>
              <select value={bt} onChange={(e) => setBt(e.target.value)} style={{...fi, width: 100, textAlign: "left", cursor: "pointer"}}>
                {["Retrofit", "Greenfield"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {!aB.includes(bt) && <span style={{fontSize: 10, color: "#f68d2e", fontWeight: 600}}>⚠ estimate</span>}
            </div>
          </div>
          <div style={{...row, borderBottom: "none"}}>
            <span style={rowL}><Tip k="Capture Tech">Technology</Tip></span>
            <div style={rowR}>
              <select value={tech} onChange={(e) => setTech(e.target.value)} style={{...fi, width: 130, textAlign: "left", cursor: "pointer"}}>
                {Object.entries(TECH).map(([k, v]) => {
                  const srcCat = sd ? sd.cat : "High Purity";
                  const isCompat = v.compat.includes(srcCat);
                  return <option key={k} value={k} disabled={!isCompat} style={{ color: isCompat ? "#444444" : "#cccccc" }}>{v.n}{!isCompat ? " ✗" : ""}</option>;
                })}
              </select>
              {tech !== "amine" && <span style={{fontSize: 10, color: "#58a7af", fontWeight: 600}}>adj</span>}
            </div>
          </div>
        </div>

        <div style={sec}>
          <div style={{...secH, borderLeft: "3px solid #58a7af"}}>Production Parameters</div>
          <div style={row}>
            <span style={rowL}>Input Mode</span>
            <div style={{ display: "flex", borderRadius: 0, overflow: "hidden", border: "1px solid #e0e0e0" }}>
              {["co2", "plant"].map(m => (
                <button key={m} onClick={() => {
                  if (m === mode) return;
                  const v2 = vd;
                  if (!v2) { setMode(m); return; }
                  const refCO2 = v2.rco, refCF = v2.cf, rpc = v2.rpc;
                  const userCF = parseFloat(cfIn);
                  const cf = (userCF > 0 && userCF <= 100) ? userCF / 100 : refCF;
                  if (m === "plant" && mode === "co2") {
                    const uC = parseFloat(co2Cap);
                    if (uC > 0) {
                      const sR = (uC / (cf / refCF)) / refCO2;
                      setPlCap(Math.round(sR * rpc).toString());
                    }
                  } else if (m === "co2" && mode === "plant") {
                    const uP = parseFloat(plCap);
                    if (uP > 0) {
                      const sR = uP / rpc;
                      const pCO2 = refCO2 * sR * (cf / refCF);
                      setCo2Cap(Math.round(pCO2).toString());
                    }
                  }
                  setMode(m);
                }} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: mode === m ? "#58b947" : "#f5f5f5", color: mode === m ? "#fff" : "#aaaaaa" }}>
                  {m === "co2" ? "CO₂ t/yr" : "Plant Cap"}
                </button>
              ))}
            </div>
          </div>
          <div style={row}>
            <span style={rowL}>{mode === "co2" ? <Tip k="Project CO₂">Target CO₂</Tip> : "Plant Capacity"}</span>
            <div style={rowR}>
              <input type="number" value={mode === "co2" ? co2Cap : plCap} onChange={(e) => mode === "co2" ? setCo2Cap(e.target.value) : setPlCap(e.target.value)} placeholder={mode === "co2" ? fm(vd ? vd.rco : 0, 0) : fm(vd ? vd.rpc : 0, 0)} style={{...fi, width: 110}} />
              <span style={unit}>{mode === "co2" ? "t/yr" : (vd ? vd.rpu : "")}</span>
            </div>
          </div>
          <div style={hasCombustion ? row : {...row, borderBottom: "none"}}>
            <span style={rowL}><Tip k="Capacity Factor">Capacity Factor</Tip></span>
            <div style={rowR}>
              <input type="number" value={cfIn} onChange={(e) => setCfIn(e.target.value)} placeholder="85" min="1" max="100" step="1" style={{...fi, width: 70}} />
              <span style={unit}>%</span>
            </div>
          </div>
          {hasCombustion && (
            <div style={{...row, borderBottom: "none"}}>
              <span style={rowL}>Heat Rate</span>
              <div style={rowR}>
                <input type="number" value={heatRateBtu} onChange={(e) => setHeatRateBtu(Number(e.target.value) || 0)} min="1000" step="100" style={{...fi, width: 90}} />
                <span style={unit}>Btu/kWh</span>
              </div>
            </div>
          )}
          {(src === "NGCC F-Frame" || src === "NGCC H-Frame") && cfIn && (<div style={sub}>Equip sized at 100% CF; operating at {cfIn}%</div>)}
        </div>

        <div style={sec}>
          <div style={{...secH, borderLeft: "3px solid #93348f"}}>Cost Basis</div>
          <div style={row}>
            <span style={rowL}><Tip k="Location Factor">Project State</Tip></span>
            <select value={st} onChange={(e) => setSt(e.target.value)} style={{...fSel, minWidth: 130}}>
              {Object.entries(LF).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([c, d]) => (<option key={c} value={c}>{d.n} ({c})</option>))}
            </select>
          </div>
          <div style={row}>
            <span style={rowL}><Tip k="Cost Year">Cost Year</Tip></span>
            <select value={yr} onChange={(e) => setYr(parseInt(e.target.value))} style={{...fi, width: 80, textAlign: "left", cursor: "pointer"}}>
              {Object.keys(CEPCI).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{...row, borderBottom: "none"}}>
            <span style={rowL}>Project Life</span>
            <div style={rowR}>
              <input type="number" value={projLife} onChange={(e) => { setProjLife(parseInt(e.target.value) || 20); setProjLifeOverride(true); }} min="5" max="50" step="5" style={{...fi, width: 60}} />
              <span style={unit}>years</span>
            </div>
          </div>
          {projLifeOverride && (<div style={sub}><span style={{color:"#f68d2e"}}>Manual — <span onClick={()=>{setProjLifeOverride(false);}} style={{cursor:"pointer",textDecoration:"underline"}}>reset to NETL</span></span></div>)}
        </div>

        <div style={sec}>
          <div style={{...secH, borderLeft: "3px solid #b83a4b"}}>Energy Costs</div>
          <div style={row}>
            <span style={rowL}><Tip k="Power Cost">Electricity</Tip></span>
            <div style={rowR}>
              <input type="number" value={pp} onChange={(e) => { setPp(parseFloat(e.target.value) || 0); setPpO(true); }} style={{...fi, width: 90}} />
              <span style={unit}>$/MWh</span>
            </div>
          </div>
          <div style={sub}>{ppO ? <span style={{color:"#f68d2e"}}>Manual — <span onClick={()=>{setPpO(false);setPp(toMWh(st));}} style={{cursor:"pointer",textDecoration:"underline"}}>reset</span></span> : <span>EIA: {eC}¢/kWh ({LF[st] ? LF[st].n : st})</span>}</div>
          {(!res || res.hasFuel) && (<>
          <div style={row}>
            <span style={rowL}><Tip k="Natural Gas Fuel">Nat Gas</Tip></span>
            <div style={rowR}>
              <input type="number" value={gp} onChange={(e) => { setGp(parseFloat(e.target.value) || 0); setGpO(true); }} step="0.01" style={{...fi, width: 80}} />
              <span style={unit}>$/MMBtu</span>
            </div>
          </div>
          <div style={sub}>
            {gpO
              ? <span style={{color:"#f68d2e"}}>Override — <span onClick={()=>{setGpO(false);setGp(hhStripPrice(codYear,st));}} style={{cursor:"pointer",textDecoration:"underline"}}>reset</span></span>
              : <span style={{color:"#58a7af"}}>Bloomberg Strip Y1 ({HUB_NAME[st]||"HH"})</span>}
          </div>
          </>)}
          <div style={row}>
            <span style={{...rowL,fontSize:10,color:"#888888"}}>COD Year</span>
            <div style={rowR}>
              <input type="number" value={codYear} onChange={e=>{const y=parseInt(e.target.value)||2029;setCodYear(y);if(!gpO)setGp(hhStripPrice(y,st));}} step="1" style={{...fi,width:60,fontSize:10}} />
            </div>
          </div>
          <div style={{...sub, paddingBottom: 12}}>
            {(!res || res.hasFuel) && <span style={{fontSize:9,color:"#58a7af"}}>{HUB_NAME[st]||"HH"}: HH ${hhBase(codYear).toFixed(2)} {(HUB_BASIS[st]||0)>=0?"+":""}{(HUB_BASIS[st]||0).toFixed(2)} basis → ${hhStripPrice(codYear,st).toFixed(2)} Y1</span>}
          </div>
        </div>
      </div>


      {/* ═══════ RIGHT SIDE: TWO OUTPUT COLUMNS ═══════ */}
      <div>
        {res ? (<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

            {/* ══ COLUMN 2: COST OUTPUTS ══ */}
            <div>
              {/* CAPEX Summary */}
              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #93348f"}}>CAPEX Summary</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={{...thd,padding:"4px 10px"}}></th><th style={{...thd,textAlign:"right",padding:"4px 10px"}}>$M</th><th style={{...thd,textAlign:"right",padding:"4px 10px",width:32}}>%</th></tr></thead>
                  <tbody>
                    {res.cxBreak.map((c,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"4px 10px",fontSize:11,color:"#888888"}}><span style={{display:"inline-block",width:6,height:6,background:CX_COLORS[c.key]||"#666666",marginRight:5,verticalAlign:"middle"}} />{c.label}</td><td style={{padding:"4px 10px",fontSize:11,color:"#444444",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fd(c.val/1e6,1)}</td><td style={{padding:"4px 10px",fontSize:10,color:"#aaaaaa",textAlign:"right"}}>{(c.frac*100).toFixed(0)}</td></tr>))}
                    <tr style={{borderTop:"2px solid #e0e0e0"}}><td style={{padding:"5px 10px",fontSize:11,color:"#444444",fontWeight:700}}>Total Installed Cost</td><td style={{padding:"5px 10px",fontSize:11,color:"#444444",textAlign:"right",fontWeight:700}}>{fd(res.sT/1e6,1)}M</td><td style={{padding:"5px 10px",fontSize:10,color:"#aaaaaa",textAlign:"right"}}>100</td></tr>
                    <tr style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"4px 10px",fontSize:11,color:"#888888"}}><Tip k="Owner's Costs">Owner's Costs</Tip></td><td colSpan={2} style={{padding:"4px 10px",fontSize:11,color:"#444444",textAlign:"right"}}>{fd(res.sOwn/1e6,1)}M</td></tr>
                    <tr style={{background:"#f5f5f5"}}><td style={{padding:"6px 10px",fontSize:11,color:"#333333",fontWeight:700}}><Tip k="CAPEX">Total CAPEX</Tip></td><td colSpan={2} style={{padding:"6px 10px",fontSize:11,color:"#333333",textAlign:"right",fontWeight:700}}>{fd(res.sTOC/1e6,1)}M</td></tr>
                  </tbody>
                </table>
              </div>

              {/* OPEX Summary */}
              <div style={sec}>
                <div style={{...secH, borderLeft:"3px solid #58b947"}}>OPEX Summary</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={{...thd,padding:"4px 10px"}}></th><th style={{...thd,textAlign:"right",padding:"4px 10px"}}>$/t CO₂</th><th style={{...thd,textAlign:"right",padding:"4px 10px",width:32}}>%</th></tr></thead>
                  <tbody>
                    <tr style={{background:"#f0faf0"}}><td colSpan={3} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#4aa63b",textTransform:"uppercase",letterSpacing:"0.04em"}}><Tip k="Fixed O&M">Fixed OPEX</Tip></td></tr>
                    {res.fomItems.map((item,i)=>(<tr key={item.key} style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"3px 10px 3px 20px",fontSize:10.5,color:"#888888"}}><span style={{display:"inline-block",width:5,height:5,background:item.color,marginRight:5,verticalAlign:"middle"}} />{item.label}</td><td style={{padding:"3px 10px",fontSize:10.5,color:"#444444",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fd(item.val)}</td><td style={{padding:"3px 10px",fontSize:9.5,color:"#aaaaaa",textAlign:"right"}}>{(item.frac*100).toFixed(0)}</td></tr>))}
                    <tr style={{borderTop:"1px solid #e8f5e9",background:"#f0faf0"}}><td style={{padding:"4px 10px",fontSize:10.5,color:"#4aa63b",fontWeight:700}}>Total Fixed OPEX</td><td style={{padding:"4px 10px",fontSize:10.5,color:"#4aa63b",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fd(res.sFO)}</td><td style={{padding:"4px 10px",fontSize:9.5,color:"#4aa63b",textAlign:"right",fontWeight:600}}>{res.tOM > 0 ? (res.sFO/res.tOM*100).toFixed(0) : "—"}</td></tr>
                    <tr style={{background:"#fafafa"}}><td colSpan={3} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#f68d2e",textTransform:"uppercase",letterSpacing:"0.04em"}}><Tip k="Variable O&M">Variable OPEX</Tip></td></tr>
                    {res.vomItems.map((item,i)=>(<tr key={item.key} style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"3px 10px 3px 20px",fontSize:10.5,color:"#888888"}}><span style={{display:"inline-block",width:5,height:5,background:item.color,marginRight:5,verticalAlign:"middle"}} />{item.label}</td><td style={{padding:"3px 10px",fontSize:10.5,color:"#444444",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fd(item.val)}</td><td style={{padding:"3px 10px",fontSize:9.5,color:"#aaaaaa",textAlign:"right"}}>{(item.frac*100).toFixed(0)}</td></tr>))}
                    <tr style={{borderTop:"1px solid #fdcf0c",background:"#fafafa"}}><td style={{padding:"4px 10px",fontSize:10.5,color:"#f68d2e",fontWeight:700}}>Total Variable OPEX</td><td style={{padding:"4px 10px",fontSize:10.5,color:"#f68d2e",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fd(res.sVO)}</td><td style={{padding:"4px 10px",fontSize:9.5,color:"#f68d2e",textAlign:"right",fontWeight:600}}>{res.tOM > 0 ? (res.sVO/res.tOM*100).toFixed(0) : "—"}</td></tr>
                    <tr style={{borderTop:"2px solid #e0e0e0"}}><td style={{padding:"5px 10px",fontSize:11,color:"#444444",fontWeight:700}}><Tip k="Total O&M">Total OPEX</Tip></td><td style={{padding:"5px 10px",fontSize:11,color:"#444444",textAlign:"right",fontWeight:700}}>{fd(res.tOM)}/t</td><td style={{padding:"5px 10px",fontSize:10,color:"#aaaaaa",textAlign:"right"}}>100</td></tr>
                    <tr style={{background:"#f5f5f5"}}><td style={{padding:"5px 10px",fontSize:10,color:"#888888"}}>Annual OPEX</td><td colSpan={2} style={{padding:"5px 10px",fontSize:10,color:"#333333",textAlign:"right",fontWeight:600}}>{fd(res.tOM * res.pCO2 / 1e6,1)}M/yr</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Power Cost */}
              <div style={sec}>
                <div style={{...secH, borderLeft:"3px solid #b83a4b"}}><Tip k="Power Cost">Power Cost</Tip>
                  <span style={{marginLeft:"auto",float:"right",fontSize:9,fontWeight:500,color:ppO?"#f68d2e":"#888888",background:ppO?"rgba(245,158,11,0.12)":"rgba(100,116,139,0.08)",padding:"1px 6px"}}>{ppO ? "Manual" : "EIA"}</span>
                </div>
                <div style={{padding:"0 10px 10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}>Power Demand</span>
                    <span style={{fontSize:10,color:"#444444",fontWeight:600}}>{fm(res.sPW,1)} MW</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}>Electricity Rate</span>
                    <span style={{fontSize:10,color:"#444444",fontWeight:600}}>${pp}/MWh</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}><Tip k="Annual Power Cost">Annual Cost</Tip></span>
                    <span style={{fontSize:10,color:"#444444",fontWeight:600}}>{fd(res.aPwr/1e6,1)}M/yr</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
                    <span style={{fontSize:10,color:"#b83a4b",fontWeight:700}}>Power $/t CO₂</span>
                    <span style={{fontSize:10,color:"#b83a4b",fontWeight:700}}>{fd(res.pPt)}/t</span>
                  </div>
                </div>
              </div>

              {/* Nat Gas Fuel if applicable */}
              {res.hasFuel && (
                <div style={sec}>
                  <div style={{...secH, borderLeft:"3px solid #93348f"}}><Tip k="Natural Gas Fuel">Nat Gas Fuel</Tip>
                    <span style={{marginLeft:"auto",float:"right",fontSize:9,fontWeight:500,color:gpO?"#f68d2e":"#888888",background:gpO?"rgba(245,158,11,0.12)":"rgba(100,116,139,0.08)",padding:"1px 6px"}}>{gpO?"Manual":"NETL"}</span>
                  </div>
                  <div style={{padding:"0 10px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                      <span style={{fontSize:10,color:"#888888"}}>Gas Price</span>
                      <span style={{fontSize:10,color:"#444444",fontWeight:600}}>${gp}/MMBtu</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
                      <span style={{fontSize:10,color:"#93348f",fontWeight:700}}>Fuel $/t CO₂</span>
                      <span style={{fontSize:10,color:"#93348f",fontWeight:700}}>{fd(res.sFL)}/t</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost of CO₂ Captured */}
              <div style={sec}>
                <div style={{...secH, borderLeft:"3px solid #58b947"}}><Tip k="LCOC">Cost of CO₂ Captured</Tip></div>
                <div style={{padding:"0 10px 10px"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={{...thd,padding:"8px 0 4px"}}></th><th style={{...thd,textAlign:"right",padding:"8px 6px 4px"}}>$/t</th><th style={{...thd,textAlign:"right",padding:"8px 0 4px"}}>Share</th></tr></thead>
                  <tbody>
                    {[{n:"CAPEX",gk:"Capital Charge",v:res.capC,c:"#58b947"},{n:"Fixed OPEX",gk:"Fixed O&M",v:res.sFO,c:"#58b947"},{n:"Variable OPEX",gk:"Variable O&M",v:res.sVO,c:"#f68d2e"},{n:"Power",gk:"Power Cost",v:res.pPt,c:"#b83a4b"},...(res.hasFuel?[{n:"Fuel",gk:"Natural Gas Fuel",v:res.sFL,c:"#93348f"}]:[])].map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"4px 0",fontSize:11,color:"#888888"}}><span style={{display:"inline-block",width:5,height:5,background:r.c,marginRight:5,verticalAlign:"middle"}} /><Tip k={r.gk}>{r.n}</Tip></td><td style={{padding:"4px 6px",fontSize:11,color:"#444444",textAlign:"right",fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{fd(r.v)}</td><td style={{padding:"4px 0",fontSize:10,color:"#aaaaaa",textAlign:"right"}}>{(r.v/res.total*100).toFixed(0)}%</td></tr>))}
                    <tr style={{borderTop:"2px solid #cccccc"}}><td style={{padding:"6px 0",fontSize:11,color:"#58b947",fontWeight:700}}><Tip k="LCOC">Total LCOC</Tip></td><td style={{padding:"6px 6px",fontSize:11,color:"#58b947",textAlign:"right",fontWeight:700}}>{fd(res.total)}</td><td style={{padding:"6px 0",fontSize:10,color:"#aaaaaa",textAlign:"right"}}>100%</td></tr>
                  </tbody>
                </table>
                </div>
              </div>

              {/* Breakeven Analysis (NPV = 0) */}
              {(() => {
                const annCO2 = res.pCO2;
                const capex_be = res.sTOC;
                const itcVal = use48C ? capex_be * (itcPct / 100) : 0;
                const grantVal = grantAmt * 1e6;
                const netCapex = capex_be - itcVal - grantVal;
                const disc = res.discountRate;
                const life = projLife;
                const effTax = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
                const srcCat = SC[src]?.cat || "Industrial";
                const isDac = srcCat === "CDR";
                const q45Base = use45Q ? (isDac ? 180 : 85) : 0;
                const cdrBase = useCDRCredit ? cdrCreditRate : 0;
                const avoidBase = useAvoidCredit ? avoidCreditRate : 0;
                const currentRev = q45Base + cdrBase + avoidBase;
                const pvAnnuity = disc > 0 ? (1 - Math.pow(1 + disc, -life)) / disc : life;

                const npvAtRev = (revPerT) => {
                  const annOPEX_be = (res.sFO + res.sVO + res.pPt + res.sFL) * annCO2;
                  const ebitda = revPerT * annCO2 - annOPEX_be;
                  const annCF = ebitda - Math.max(0, ebitda * effTax);
                  return -netCapex + annCF * pvAnnuity;
                };

                const bisect = (fn, lo, hi, tol = 0.01, maxIter = 80) => {
                  let fLo = fn(lo), fHi = fn(hi);
                  if (fLo * fHi > 0) return null;
                  for (let i = 0; i < maxIter; i++) {
                    const mid = (lo + hi) / 2;
                    if (Math.abs(hi - lo) < tol) return mid;
                    const fMid = fn(mid);
                    if (fMid * fLo < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
                  }
                  return (lo + hi) / 2;
                };

                const calcNPV_be = (oPP, oGP, oCF, oCapexMult) => {
                  const v = res.vd;
                  const refCO2 = v.rco, refCF = v.cf;
                  const isN = src === "NGCC F-Frame" || src === "NGCC H-Frame";
                  const eq = isN ? 1.0 : oCF;
                  const cfR = eq / refCF;
                  let pco = refCO2 * (oCF / refCF), sr = cfR;
                  const uC2 = parseFloat(co2Cap), uP2 = parseFloat(plCap);
                  if (mode === "co2" && uC2 > 0) { pco = uC2; sr = (pco / (oCF / refCF)) / refCO2; }
                  else if (mode === "plant" && uP2 > 0) { sr = uP2 / v.rpc; pco = refCO2 * sr * (oCF / refCF); }
                  const tF2 = TECH[tech] || TECH.amine;
                  const cR2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
                  const lR2 = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
                  const cS2 = sr !== 1 ? Math.pow(sr, 0.6) : 1;
                  const rT2 = v.tic * 1e6 * oCapexMult, rOwn2 = (v.toc - v.tic) * 1e6 * oCapexMult;
                  const sTOC2 = (rT2 + rOwn2) * cS2 * cR2 * lR2 * tF2.capex;
                  const fS2 = sr !== 1 ? Math.pow(1 / sr, 0.15) : 1;
                  const sFO2 = v.fo * fS2 * cR2 * tF2.opex, sVO2 = v.vo * cR2 * tF2.opex;
                  const sPW2 = v.pw * sr * tF2.power;
                  const pPt2 = (sPW2 * oPP * oCF * 8760) / pco;
                  const sFL2 = (v.fl || 0) * (oGP / BASE_GP);
                  const opexPt = sFO2 + sVO2 + pPt2 + sFL2;
                  const nc = sTOC2 - itcVal - grantVal;
                  const ebitda2 = (currentRev - opexPt) * pco;
                  const cf2 = ebitda2 - Math.max(0, ebitda2 * effTax);
                  return -nc + cf2 * pvAnnuity;
                };

                const currentNPV = npvAtRev(currentRev);
                const beRevenue = bisect(x => npvAtRev(x), 0, 2000);
                const beElec = bisect(x => calcNPV_be(x, gp, res.cf, 1.0), 0, pp * 10);
                const beGas = res.hasFuel ? bisect(x => calcNPV_be(pp, x, res.cf, 1.0), 0, gp * 20) : null;
                const beCF = bisect(x => calcNPV_be(pp, gp, x, 1.0), 0.20, 0.99);
                const beCapex = bisect(x => calcNPV_be(pp, gp, res.cf, x), 0.05, 10.0);

                const beRows = [
                  { param: "Carbon Price", current: fd(currentRev) + "/t", breakeven: beRevenue != null ? fd(beRevenue) + "/t" : "—", delta: beRevenue != null ? (currentRev >= beRevenue ? "+" : "") + fd(currentRev - beRevenue) : "—", color: "#58b947", viable: beRevenue != null && currentRev >= beRevenue },
                  { param: "Electricity", current: "$" + pp + "/MWh", breakeven: beElec != null ? "$" + Math.round(beElec) + "/MWh" : "—", delta: beElec != null ? (beElec >= pp ? "+" : "") + "$" + Math.round(beElec - pp) : "—", color: "#b83a4b", viable: beElec != null && beElec >= pp },
                  ...(res.hasFuel ? [{ param: "Nat Gas", current: "$" + gp.toFixed(2) + "/MMBtu", breakeven: beGas != null ? "$" + beGas.toFixed(2) + "/MMBtu" : "—", delta: beGas != null ? (beGas >= gp ? "+" : "") + "$" + (beGas - gp).toFixed(2) : "—", color: "#93348f", viable: beGas != null && beGas >= gp }] : []),
                  { param: "Capacity Factor", current: Math.round(res.cf * 100) + "%", breakeven: beCF != null ? Math.round(beCF * 100) + "%" : "—", delta: beCF != null ? (res.cf >= beCF ? "+" : "") + Math.round((res.cf - beCF) * 100) + "pp" : "—", color: "#58a7af", viable: beCF != null && res.cf >= beCF },
                  { param: "CAPEX Mult", current: "1.00×", breakeven: beCapex != null ? beCapex.toFixed(2) + "×" : "—", delta: beCapex != null ? (beCapex >= 1 ? "+" : "") + (beCapex - 1).toFixed(2) + "×" : "—", color: "#93348f", viable: beCapex != null && beCapex >= 1.0 }
                ];

                return (
                  <div style={sec}>
                    <div style={{...secH, borderLeft:"3px solid #58a7af"}}>Breakeven Analysis (NPV = 0)</div>
                    <div style={{padding:"0 10px 10px"}}>
                    {currentRev === 0 ? (
                      <div style={{ fontSize: 10, color: "#aaaaaa", padding: "8px 0" }}>Enable a revenue source (45Q, CDR, or avoidance credits) to see breakeven values.</div>
                    ) : (<>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 8px", borderBottom: "1px solid #e0e0e0", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 9, color: "#aaaaaa", textTransform: "uppercase", fontWeight: 600 }}>Current NPV</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: currentNPV >= 0 ? "#4aa63b" : "#b83a4b" }}>{fd(currentNPV / 1e6, 1)}M</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 9, color: "#aaaaaa", textTransform: "uppercase", fontWeight: 600 }}>LCOC</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#333333" }}>{fd(res.total)}/t</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "#aaaaaa", textTransform: "uppercase", fontWeight: 600 }}>Revenue</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#58b947" }}>{fd(currentRev)}/t</div>
                        </div>
                      </div>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr style={{borderBottom:"2px solid #e0e0e0"}}>
                            <th style={{...thd,padding:"4px 0",textAlign:"left"}}>Parameter</th>
                            <th style={{...thd,padding:"4px 4px",textAlign:"right"}}>Current</th>
                            <th style={{...thd,padding:"4px 4px",textAlign:"right"}}>Breakeven</th>
                            <th style={{...thd,padding:"4px 0",textAlign:"right"}}>Headroom</th>
                          </tr>
                        </thead>
                        <tbody>
                          {beRows.map((brow, i) => (
                            <tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}>
                              <td style={{padding:"5px 0",fontSize:11,color:"#555555",fontWeight:500}}>
                                <span style={{display:"inline-block",width:5,height:5,background:brow.color,marginRight:5,verticalAlign:"middle"}} />{brow.param}
                              </td>
                              <td style={{padding:"5px 4px",fontSize:10.5,color:"#888888",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{brow.current}</td>
                              <td style={{padding:"5px 4px",fontSize:10.5,color:"#444444",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{brow.breakeven}</td>
                              <td style={{padding:"5px 0",fontSize:10,textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color: brow.breakeven === "—" ? "#aaaaaa" : brow.viable ? "#4aa63b" : "#b83a4b"}}>{brow.delta}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{fontSize:9,color:"#aaaaaa",marginTop:6,lineHeight:1.5}}>
                        Parameter value where NPV = 0 over {life}yr at {(disc * 100).toFixed(1)}% discount rate, all else equal. <span style={{color:"#4aa63b",fontWeight:600}}>Green</span> = headroom. <span style={{color:"#b83a4b",fontWeight:600}}>Red</span> = needs improvement.
                      </div>
                    </>)}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ══ COLUMN 3: FINANCIAL INPUTS & OUTPUTS ══ */}
            <div>
              {/* Capital Structure */}
              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #58a7af", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span>Capital Structure</span>
                  <span style={{fontSize:9,fontWeight:500,color:capStructOverride?"#f68d2e":"#58a7af",background:capStructOverride?"rgba(245,158,11,0.12)":"rgba(99,102,241,0.12)",padding:"1px 6px",cursor:capStructOverride?"pointer":"default"}} onClick={() => capStructOverride && setCapStructOverride(false)}>
                    {capStructOverride ? "Custom ✕" : "NETL Default"}
                  </span>
                </div>
                <div style={{padding: "0 10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}><Tip k="Debt %">Debt %</Tip></span>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={debtPct} onChange={(e) => { setDebtPct(parseFloat(e.target.value) || 0); setCapStructOverride(true); }} min="0" max="100" step="5" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}><Tip k="Cost of Debt">Cost of Debt</Tip></span>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={costDebt} onChange={(e) => { setCostDebt(parseFloat(e.target.value) || 0); setCapStructOverride(true); }} min="0" max="20" step="0.5" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}><Tip k="Cost of Equity">Cost of Equity</Tip></span>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={costEquity} onChange={(e) => { setCostEquity(parseFloat(e.target.value) || 0); setCapStructOverride(true); }} min="0" max="30" step="0.5" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}><Tip k="WACC">Calc. WACC</Tip></span>
                    <span style={{fontSize:10,fontWeight:700,color:"#444444"}}>{(res.wacc * 100).toFixed(2)}%</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                      <input type="checkbox" checked={useFixedHurdle} onChange={(e) => setUseFixedHurdle(e.target.checked)} style={{margin:0,width:10,height:10}} />
                      <span style={{fontSize:9,color:"#888888"}}>Fixed Hurdle</span>
                    </label>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={fixedHurdle} onChange={(e) => setFixedHurdle(parseFloat(e.target.value) || 0)} disabled={!useFixedHurdle} min="0" max="20" step="0.25" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px", opacity: useFixedHurdle ? 1 : 0.4}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f5f5f5",margin:"5px -10px 0",padding:"6px 10px"}}>
                    <span style={{fontSize:10,fontWeight:600,color:"#58a7af"}}>Discount Rate</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#58a7af"}}>{(res.discountRate * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Tax & Depreciation */}
              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #f68d2e", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span>Tax & Depreciation</span>
                  <span style={{fontSize:9,fontWeight:500,color:"#f68d2e",background:"rgba(245,158,11,0.1)",padding:"1px 5px"}}>
                    Eff: {(fedTax + stateTax - fedTax * stateTax / 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{padding: "0 10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}><Tip k="Federal Tax">Federal Tax</Tip></span>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={fedTax} onChange={(e) => setFedTax(parseFloat(e.target.value) || 0)} min="0" max="50" step="1" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:stateTaxOverride?"#f68d2e":"#888888",cursor:"pointer"}} onClick={() => stateTaxOverride && setStateTaxOverride(false)}>
                      <Tip k="State Tax">State Tax</Tip> {stateTaxOverride ? "✕" : `(${st})`}
                    </span>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={stateTax} onChange={(e) => { setStateTax(parseFloat(e.target.value) || 0); setStateTaxOverride(true); }} min="0" max="20" step="0.1" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:10,color:"#888888"}}><Tip k="Depreciation">Depreciation</Tip></span>
                    <select value={deprMethod} onChange={(e) => setDeprMethod(e.target.value)} style={{...fi, width: 100, fontSize: 9, padding: "3px 4px", cursor: "pointer"}}>
                      <option value="Bonus 100%">Bonus 100%</option>
                      <option value="MACRS 5-yr">MACRS 5-yr</option>
                      <option value="MACRS 7-yr">MACRS 7-yr</option>
                      <option value="MACRS 10-yr">MACRS 10-yr</option>
                      <option value="MACRS 15-yr">MACRS 15-yr</option>
                      <option value="MACRS 20-yr">MACRS 20-yr</option>
                      <option value="Straight-line">Straight-Line</option>
                    </select>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}>
                    <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                      <input type="checkbox" checked={bonusDepr} onChange={(e) => setBonusDepr(e.target.checked)} style={{margin:0,width:10,height:10}} />
                      <span style={{fontSize:9,color:"#888888"}}>Bonus Depr</span>
                    </label>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={bonusDeprPct} onChange={(e) => setBonusDeprPct(parseFloat(e.target.value) || 0)} disabled={!bonusDepr} min="0" max="100" step="20" style={{...fi, width: 38, fontSize: 9, padding: "2px 4px", opacity: bonusDepr ? 1 : 0.4}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incentives */}
              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #58b947"}}>Incentives</div>
                <div style={{padding: "0 10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                      <input type="checkbox" checked={use45Q} onChange={(e) => setUse45Q(e.target.checked)} style={{margin:0,width:10,height:10}} />
                      <span style={{fontSize:10,color:"#444444",fontWeight:500}}><Tip k="45Q">45Q Tax Credit</Tip></span>
                    </label>
                    <span style={{fontSize:10,color:use45Q?"#58b947":"#aaaaaa",fontWeight:600}}>
                      {use45Q ? `$${SC[src]?.cat === "CDR" ? 180 : 85}/t` : "—"}
                    </span>
                  </div>
                  {use45Q && (
                    <div style={{background:"#f0faf0",margin:"0 -10px",padding:"5px 10px",fontSize:9,color:"#3d8f32"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span>Annual Credit</span>
                        <span style={{fontWeight:600}}>{fd((SC[src]?.cat === "CDR" ? 180 : 85) * res.pCO2 / 1e6, 2)}M/yr</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                        <span>Start Year</span>
                        <div style={{display:"flex",alignItems:"center",gap:2}}>
                          <input type="number" value={q45StartYear} onChange={(e) => setQ45StartYear(parseInt(e.target.value) || 2029)} min="2024" max="2040" style={{width:40,fontSize:9,padding:"1px 3px",border:"1px solid #e8f5e9",borderRadius:2,textAlign:"center"}} />
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                        <span>Duration</span>
                        <div style={{display:"flex",alignItems:"center",gap:2}}>
                          <input type="number" value={q45Duration} onChange={(e) => setQ45Duration(parseInt(e.target.value) || 12)} min="1" max="20" style={{width:28,fontSize:9,padding:"1px 3px",border:"1px solid #e8f5e9",borderRadius:2,textAlign:"center"}} />
                          <span>yrs</span>
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span>Escalator</span>
                        <div style={{display:"flex",alignItems:"center",gap:2}}>
                          <input type="number" value={q45Inflation} onChange={(e) => setQ45Inflation(parseFloat(e.target.value) || 0)} min="0" max="10" step="0.5" style={{width:28,fontSize:9,padding:"1px 3px",border:"1px solid #e8f5e9",borderRadius:2,textAlign:"center"}} />
                          <span>%/yr</span>
                        </div>
                      </div>
                      <div style={{marginTop:3,fontSize:8,color:"#3d8f32"}}>{q45StartYear}–{q45StartYear + q45Duration - 1} · {q45Duration} yrs</div>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0",marginTop:use45Q?4:0}}>
                    <span style={{fontSize:10,color:"#888888"}}>Grant/Subsidy</span>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={grantAmt} onChange={(e) => setGrantAmt(parseFloat(e.target.value) || 0)} min="0" step="1" style={{...fi, width: 46, fontSize: 9, padding: "2px 4px"}} />
                      <span style={{fontSize:9,color:"#aaaaaa"}}>$M</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voluntary Carbon Markets */}
              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #58a7af"}}>Carbon Markets (VCM)</div>
                <div style={{padding: "0 10px"}}>
                  {/* CDR Credits */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"}}>
                    <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                      <input type="checkbox" checked={useCDRCredit} onChange={(e) => { setUseCDRCredit(e.target.checked); if (e.target.checked && cdrCreditType !== "custom") { const best = bestCreditType(src, CDR_TYPES, SC); setCdrCreditType(best); setCdrCreditRate(CDR_TYPES[best]?.price || 200); }}} style={{margin:0,width:10,height:10}} />
                      <span style={{fontSize:10,color:"#444444",fontWeight:500}}><Tip k="CDR Credit">CDR Credits</Tip></span>
                    </label>
                    <span style={{fontSize:9,color:useCDRCredit?"#58a7af":"#aaaaaa",fontWeight:600}}>${cdrCreditRate}/t</span>
                  </div>
                  {useCDRCredit && (
                    <div style={{background:"#fafafa",margin:"0 -10px",padding:"6px 10px",fontSize:9,color:"#58a7af"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span>Type</span>
                        <select value={cdrCreditType} onChange={(e) => setCdrCreditType(e.target.value)} style={{...fi, width: 130, fontSize: 9, padding: "2px 4px", cursor: "pointer"}}>
                          {Object.entries(CDR_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>{v.name} (${v.price})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span>Price</span>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <input type="number" value={cdrCreditRate} onChange={(e) => { setCdrCreditRate(parseFloat(e.target.value) || 0); setCdrCreditType("custom"); }} min="0" max="2000" step="25" style={{...fi, width: 50, fontSize: 9, padding: "2px 4px"}} />
                          <span style={{fontSize:8,color:"#58a7af"}}>$/t</span>
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e8f5e9",paddingTop:4,marginTop:2}}>
                        <span>Annual Revenue</span>
                        <span style={{fontWeight:600}}>{fd(cdrCreditRate * res.pCO2 / 1e6, 2)}M/yr</span>
                      </div>
                      <div style={{fontSize:8,color:"#58a7af",marginTop:2}}>{CDR_TYPES[cdrCreditType]?.desc}</div>
                    </div>
                  )}

                  {/* Avoidance Credits */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0",marginTop:useCDRCredit?4:0}}>
                    <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                      <input type="checkbox" checked={useAvoidCredit} onChange={(e) => { setUseAvoidCredit(e.target.checked); if (e.target.checked && avoidCreditType !== "custom") { const best = bestCreditType(src, AVOID_TYPES, SC); setAvoidCreditType(best); setAvoidCreditRate(AVOID_TYPES[best]?.price || 25); }}} style={{margin:0,width:10,height:10}} />
                      <span style={{fontSize:10,color:"#444444",fontWeight:500}}><Tip k="Avoidance Credit">Avoidance Credits</Tip></span>
                    </label>
                    <span style={{fontSize:9,color:useAvoidCredit?"#f68d2e":"#aaaaaa",fontWeight:600}}>${avoidCreditRate}/t</span>
                  </div>
                  {useAvoidCredit && (
                    <div style={{background:"#fafafa",margin:"0 -10px",padding:"6px 10px",fontSize:9,color:"#f68d2e"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span>Type</span>
                        <select value={avoidCreditType} onChange={(e) => setAvoidCreditType(e.target.value)} style={{...fi, width: 130, fontSize: 9, padding: "2px 4px", cursor: "pointer"}}>
                          {Object.entries(AVOID_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>{v.name} (${v.price})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span>Price</span>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <input type="number" value={avoidCreditRate} onChange={(e) => { setAvoidCreditRate(parseFloat(e.target.value) || 0); setAvoidCreditType("custom"); }} min="0" max="500" step="5" style={{...fi, width: 50, fontSize: 9, padding: "2px 4px"}} />
                          <span style={{fontSize:8,color:"#f68d2e"}}>$/t</span>
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #fdcf0c",paddingTop:4,marginTop:2}}>
                        <span>Annual Revenue</span>
                        <span style={{fontWeight:600}}>{fd(avoidCreditRate * res.pCO2 / 1e6, 2)}M/yr</span>
                      </div>
                      <div style={{fontSize:8,color:"#f68d2e",marginTop:2}}>{AVOID_TYPES[avoidCreditType]?.desc}</div>
                    </div>
                  )}

                  {/* Contract Duration */}
                  {(useCDRCredit || useAvoidCredit) && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",marginTop:4}}>
                      <span style={{fontSize:10,color:"#888888"}}>Contract Duration</span>
                      <div style={{display:"flex",alignItems:"center",gap:3}}>
                        <input type="number" value={vcmDuration} onChange={(e) => setVcmDuration(parseInt(e.target.value) || 10)} min="1" max="30" step="1" style={{...fi, width: 38, fontSize: 9, padding: "2px 4px"}} />
                        <span style={{fontSize:9,color:"#aaaaaa"}}>yrs</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue & Margins */}
              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #58a7af"}}>Revenue & Margins</div>
                {(() => {
                  const srcCat = SC[src]?.cat || "Industrial";
                  const isDac = srcCat === "CDR";
                  const base45Q = isDac ? 180 : 85;
                  const annualCO2 = res.pCO2;
                  const baseQ45Rev = use45Q ? base45Q * annualCO2 : 0;
                  const cdrRevenue = useCDRCredit ? cdrCreditRate * annualCO2 : 0;
                  const avoidRevenue = useAvoidCredit ? avoidCreditRate * annualCO2 : 0;
                  const totalRevenue = baseQ45Rev + cdrRevenue + avoidRevenue;
                  const annualOPEX = (res.sFO + res.sVO + res.pPt + res.sFL) * annualCO2;
                  const ebitda = totalRevenue - annualOPEX;
                  const lcoc = res.total;
                  const revenuePerTonne = annualCO2 > 0 ? totalRevenue / annualCO2 : 0;
                  const margin = revenuePerTonne - lcoc;
                  const projectLife = projLife;
                  const capex = res.sTOC;
                  const itcValue = use48C ? capex * (itcPct / 100) : 0;
                  const grantValue = grantAmt * 1e6;
                  const netCapex = capex - itcValue - grantValue;
                  const effTax = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
                  const sDeprKey = deprMethod.replace("MACRS ", "");
                  let sDeprSch = [];
                  if (deprMethod === "Bonus 100%") { sDeprSch = MACRS["bonus"]; }
                  else if (deprMethod === "Straight-line") { sDeprSch = Array(projectLife).fill(1 / projectLife); }
                  else { sDeprSch = MACRS[sDeprKey] || MACRS["7-yr"]; }
                  const sItcDepr = use48C ? capex * (itcPct / 100) * 0.5 : 0;
                  const sDeprBasis = capex - sItcDepr;
                  const r = res.discountRate;
                  let npv = -netCapex;
                  for (let t = 1; t <= projectLife; t++) {
                    const beCY = codYear + (t - 1);
                    let yrQ45 = (use45Q && beCY >= q45StartYear && beCY < q45StartYear + q45Duration) ? base45Q * Math.pow(1 + q45Inflation / 100, beCY - q45StartYear) : 0;
                    let yrCDR = (useCDRCredit && t <= vcmDuration) ? cdrCreditRate : 0;
                    let yrAvoid = (useAvoidCredit && t <= vcmDuration) ? avoidCreditRate : 0;
                    const yrRev = (yrQ45 + yrCDR + yrAvoid) * annualCO2;
                    const yrEbitda = yrRev - annualOPEX;
                    const yrDepr = (t - 1) < sDeprSch.length ? sDeprBasis * sDeprSch[t - 1] : 0;
                    const yrTax = Math.max(0, (yrEbitda - yrDepr) * effTax);
                    const yrCF = yrEbitda - yrTax;
                    npv += yrCF / Math.pow(1 + r, t);
                  }
                  let irr = 0.10;
                  for (let iter = 0; iter < 50; iter++) {
                    let npvCalc = -netCapex, dnpv = 0;
                    for (let t = 1; t <= projectLife; t++) {
                      const irrCY = codYear + (t - 1);
                      let yrQ45 = (use45Q && irrCY >= q45StartYear && irrCY < q45StartYear + q45Duration) ? base45Q * Math.pow(1 + q45Inflation / 100, irrCY - q45StartYear) : 0;
                      let yrCDR = (useCDRCredit && t <= vcmDuration) ? cdrCreditRate : 0;
                      let yrAvoid = (useAvoidCredit && t <= vcmDuration) ? avoidCreditRate : 0;
                      const yrRev = (yrQ45 + yrCDR + yrAvoid) * annualCO2;
                      const yrEbitda = yrRev - annualOPEX;
                      const yrDepr = (t - 1) < sDeprSch.length ? sDeprBasis * sDeprSch[t - 1] : 0;
                      const yrTax = Math.max(0, (yrEbitda - yrDepr) * effTax);
                      const yrCF = yrEbitda - yrTax;
                      npvCalc += yrCF / Math.pow(1 + irr, t);
                      dnpv -= t * yrCF / Math.pow(1 + irr, t + 1);
                    }
                    if (Math.abs(npvCalc) < 1000) break;
                    irr = irr - npvCalc / dnpv;
                    if (irr < -0.5) irr = -0.5;
                    if (irr > 2) irr = 2;
                  }
                  const taxAmt = Math.max(0, ebitda * effTax);
                  const annualCF = ebitda - taxAmt;
                  const rs = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f0f0f0"};
                  const ls = {fontSize:10,color:"#888888"};
                  const vs = {fontSize:10,color:"#444444",fontWeight:600};
                  return (
                    <div style={{padding: "0 10px"}}>
                      <div style={rs}>
                        <span style={ls}>Gross Revenue <span style={{fontSize:8,color:"#aaaaaa"}}>(Y1 basis{use45Q && q45Inflation > 0 ? `, 45Q +${q45Inflation}%/yr` : ""})</span></span>
                        <span style={vs}>{fd(totalRevenue/1e6,2)}M<span style={{fontSize:8,color:"#aaaaaa",marginLeft:2}}>/yr</span></span>
                      </div>
                      <div style={rs}>
                        <span style={ls}>Less: Net OPEX</span>
                        <span style={{fontSize:10,color:"#b83a4b",fontWeight:600}}>({fd(annualOPEX/1e6,2)}M)<span style={{fontSize:8,color:"#aaaaaa",marginLeft:2}}>/yr</span></span>
                      </div>
                      <div style={{...rs,background:"#fafafa",margin:"0 -10px",padding:"6px 10px",borderBottom:"none"}}>
                        <span style={{fontSize:10,fontWeight:700,color:"#58a7af"}}>EBITDA</span>
                        <span style={{fontSize:11,fontWeight:700,color:ebitda >= 0 ? "#58a7af" : "#b83a4b"}}>{fd(ebitda/1e6,2)}M<span style={{fontSize:8,color:"#aaaaaa",marginLeft:2}}>/yr</span></span>
                      </div>
                      <div style={{borderTop:"1px solid #e0e0e0",marginTop:6,paddingTop:4}}>
                        <div style={rs}>
                          <span style={ls}>LCOC</span>
                          <span style={vs}>{fd(lcoc)}/t</span>
                        </div>
                        <div style={{...rs,borderBottom:"none"}}>
                          <span style={ls}>Margin</span>
                          <span style={{fontSize:10,color:margin >= 0 ? "#4aa63b" : "#b83a4b",fontWeight:600}}>{fd(margin)}/t</span>
                        </div>
                      </div>
                      <div style={{borderTop:"2px solid #e0e0e0",marginTop:6,paddingTop:4}}>
                        <div style={rs}>
                          <span style={{...ls,fontWeight:600}}>Project IRR</span>
                          <span style={{fontSize:11,fontWeight:700,color:irr >= r ? "#4aa63b" : "#b83a4b"}}>{(irr * 100).toFixed(2)}%</span>
                        </div>
                        <div style={{...rs,borderBottom:"none"}}>
                          <span style={{...ls,fontWeight:600}}>NPV</span>
                          <span style={{fontSize:11,fontWeight:700,color:npv >= 0 ? "#4aa63b" : "#b83a4b"}}>{fd(npv/1e6,2)}M</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>) : (<div style={{padding:40,textAlign:"center",color:"#aaaaaa"}}>Select inputs to see results</div>)}
      </div>

    </div>
  );
}
