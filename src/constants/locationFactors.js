// State-level construction location factors relative to Louisiana Gulf Coast baseline
// Source: RSMeans / NETL location factor tables
export const LF = {
  AL:{n:"Alabama",f:0.96},AK:{n:"Alaska",f:1.32},AZ:{n:"Arizona",f:1.11},AR:{n:"Arkansas",f:0.96},
  CA:{n:"California",f:1.33},CO:{n:"Colorado",f:1.09},CT:{n:"Connecticut",f:1.29},DE:{n:"Delaware",f:1.27},
  DC:{n:"Washington D.C.",f:1.17},FL:{n:"Florida",f:0.96},GA:{n:"Georgia",f:0.98},HI:{n:"Hawaii",f:1.38},
  ID:{n:"Idaho",f:1.02},IL:{n:"Illinois",f:1.23},IN:{n:"Indiana",f:1.02},IA:{n:"Iowa",f:1.04},
  KS:{n:"Kansas",f:0.98},KY:{n:"Kentucky",f:1.00},LA:{n:"Louisiana",f:0.97},ME:{n:"Maine",f:1.02},
  MD:{n:"Maryland",f:1.03},MA:{n:"Massachusetts",f:1.34},MI:{n:"Michigan",f:1.10},MN:{n:"Minnesota",f:1.09},
  MS:{n:"Mississippi",f:0.95},MO:{n:"Missouri",f:1.11},MT:{n:"Montana",f:0.97},NE:{n:"Nebraska",f:0.99},
  NV:{n:"Nevada",f:1.14},NH:{n:"New Hampshire",f:1.19},NJ:{n:"New Jersey",f:1.22},NM:{n:"New Mexico",f:1.00},
  NY:{n:"New York",f:1.61},NC:{n:"North Carolina",f:0.96},ND:{n:"North Dakota",f:1.01},OH:{n:"Ohio",f:0.93},
  OK:{n:"Oklahoma",f:1.00},OR:{n:"Oregon",f:1.22},PA:{n:"Pennsylvania",f:1.37},RI:{n:"Rhode Island",f:1.26},
  SC:{n:"South Carolina",f:0.96},SD:{n:"South Dakota",f:0.98},TN:{n:"Tennessee",f:0.97},TX:{n:"Texas",f:0.93},
  UT:{n:"Utah",f:0.98},VT:{n:"Vermont",f:1.02},VA:{n:"Virginia",f:1.16},WA:{n:"Washington",f:1.13},
  WV:{n:"West Virginia",f:1.04},WI:{n:"Wisconsin",f:1.04},WY:{n:"Wyoming",f:1.00}
};

// State natural gas hub basis differentials (2025 avg $/MMBtu vs Henry Hub) — Bloomberg
export const HUB_BASIS = {
  AK:0,AL:0.24,AR:-0.42,AZ:-0.61,CA:-0.09,CO:-0.78,CT:5.02,DC:0.5,DE:0.5,FL:0.33,
  GA:-0.49,HI:0,IA:-0.38,ID:-0.94,IL:-0.29,IN:-0.29,KS:-0.56,KY:0.22,LA:0,MA:5.02,
  MD:0.5,ME:5.02,MI:-0.32,MN:-0.38,MO:-0.56,MS:0.24,MT:-0.76,NC:0.28,ND:-0.38,NE:-0.38,
  NH:5.02,NJ:0,NM:-0.81,NV:-0.76,NY:0.64,OH:-0.34,OK:-0.42,OR:-0.94,PA:-0.72,RI:5.02,
  SC:0.28,SD:-0.38,TN:0.22,TX:-0.43,UT:-0.78,VA:0.5,VT:5.02,WA:-1.79,WI:-0.29,WV:-0.27,WY:-0.76
};

// State natural gas trading hub names — Bloomberg
export const HUB_NAME = {
  AK:"Henry Hub",AL:"Sonat",AR:"NGPL Tex-Ok",AZ:"El Paso S. Main",CA:"PG&E CityGate",
  CO:"CIG Mainline",CT:"Algonquin CG",DC:"Transco Z6",DE:"Transco Z6",FL:"FGT Zone 3",
  GA:"Transco Stn30",HI:"Henry Hub",IA:"NNG Demarc",ID:"Stanfield OR",IL:"Chicago CG",
  IN:"Chicago CG",KS:"Southern Star",KY:"TN 500 Leg",LA:"Henry Hub",MA:"Algonquin CG",
  MD:"Transco Z6",ME:"Algonquin CG",MI:"MichCon CG",MN:"NNG Demarc",MO:"Southern Star",
  MS:"Sonat",MT:"Cheyenne",NC:"Transco Stn85",ND:"NNG Demarc",NE:"NNG Demarc",
  NH:"Algonquin CG",NJ:"Tetco M3",NM:"EP San Juan",NV:"Malin OR",NY:"Transco Z6 NY",
  OH:"REX Midwest",OK:"NGPL Tex-Ok",OR:"Stanfield OR",PA:"Dom South Pt",RI:"Algonquin CG",
  SC:"Transco Stn85",SD:"NNG Demarc",TN:"TN 500 Leg",TX:"Houston SC",UT:"CIG Mainline",
  VA:"Transco Z6",VT:"Algonquin CG",WA:"Sumas",WI:"Chicago CG",WV:"Columbia Main",WY:"Cheyenne"
};
