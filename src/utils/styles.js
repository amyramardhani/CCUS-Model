// Shared inline style objects used across multiple tab components.
// Import only the styles you need: import { sec, secH, cd, ch } from '../utils/styles';

// Collapsible section card
export const sec  = { background: "#fafafa", border: "1px solid #e0e0e0", marginBottom: 16, borderRadius: 4, overflow: "hidden" };

// Section header bar (green left border accent)
export const secH = { padding: "12px 18px", fontSize: 13, fontWeight: 700, color: "#58b947", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e0e0e0", borderLeft: "3px solid #58b947", background: "#fff" };

// Input row container (flex, space-between)
export const row  = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1px solid #f0f0f0", minHeight: 42 };

// Row label (left side)
export const rowL = { fontSize: 13, color: "#333", fontWeight: 600 };

// Row right side container
export const rowR = { display: "flex", alignItems: "center", gap: 8 };

// Input field (number / text)
export const fi   = { width: 130, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#333", background: "#fff", border: "1px solid #ccc", borderRadius: 4, outline: "none", textAlign: "right", boxSizing: "border-box" };

// Select / dropdown (extends fi)
export const fSel = { ...fi, width: "auto", minWidth: 160, textAlign: "left", cursor: "pointer" };

// Unit label (right of inputs)
export const unit = { fontSize: 12, color: "#888", fontWeight: 500, minWidth: 50 };

// Sub-label below a row
export const sub  = { fontSize: 11, color: "#888", fontWeight: 400, padding: "2px 18px 10px", marginTop: -4 };

// Chart / data card
export const cd   = { background: "#ffffff", padding: "16px 18px", border: "1px solid #e0e0e0" };

// Chart heading (uppercase small caps)
export const ch   = { margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#888888", textTransform: "uppercase", letterSpacing: "0.06em" };

// Table header cell (dotted border, uppercase)
export const thd  = { padding: "0 0 6px", fontSize: 10, color: "#888888", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid #e0e0e0" };
