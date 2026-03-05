import { useState } from "react";
import { G } from "../constants/tooltips";

/**
 * Tip — hover tooltip component.
 * Wraps children with a dotted underline and shows the glossary definition on hover.
 * If the key `k` is not in the glossary, renders children plain with no decoration.
 *
 * Usage:
 *   <Tip k="LCOC">LCOC</Tip>
 *   <Tip k="CCF" style={{ color: "#333" }}>CCF</Tip>
 */
export default function Tip({ k, children, style: s }) {
  const [show, setShow] = useState(false);
  const def = G[k];
  if (!def) return <span style={s}>{children}</span>;
  return (
    <span
      style={{ position: "relative", ...s }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ borderBottom: "1px dotted #aaaaaa", cursor: "help" }}>{children}</span>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", width: 260, padding: "10px 12px",
          background: "#333", border: "1px solid #555", borderRadius: 0,
          fontSize: 11, lineHeight: 1.5, color: "#cccccc",
          zIndex: 9999, boxShadow: "none", pointerEvents: "none"
        }}>
          <span style={{ display: "block", fontWeight: 700, color: "#f0f0f0", marginBottom: 3, fontSize: 11.5 }}>{k}</span>
          {def}
          <span style={{
            position: "absolute", bottom: -5, left: "50%",
            transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8,
            background: "#444444", borderRight: "1px solid #555555", borderBottom: "1px solid #555555"
          }} />
        </span>
      )}
    </span>
  );
}
