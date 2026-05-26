import React, { useState } from "react";
import { iLabel } from "../../styles/theme";

// ─── DAY SPLIT EDITOR ─────────────────────────────────────────────────────────
function SplitEditorModal({
  day,
  currentMuscles,
  muscleGroups,
  onClose,
  onSave,
}) {
  const [selected, setSelected] = useState([...currentMuscles]);
  const toggle = (k) =>
    setSelected((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#0F1117",
          border: "1px solid #2A2D3A",
          borderRadius: "18px",
          padding: "26px",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <div>
            <div style={iLabel}>EDIT WORKOUT SPLIT</div>
            <div
              style={{ fontSize: "22px", fontWeight: "700", color: "#F0F0F0" }}
            >
              {day}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              fontSize: "22px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: "12px", color: "#444", marginBottom: "20px" }}>
          Select muscle groups for {day}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "22px",
          }}
        >
          {Object.entries(muscleGroups).map(([key, group]) => {
            const active = selected.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                style={{
                  background: active ? group.color + "20" : "#0D0F17",
                  border: `2px solid ${active ? group.color : "#1E2130"}`,
                  borderRadius: "13px",
                  padding: "16px 10px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "5px",
                  transition: "all 0.2s",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                <span
                  style={{
                    fontSize: "22px",
                    color: active ? group.color : "#333",
                  }}
                >
                  {group.icon}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: active ? group.color : "#444",
                  }}
                >
                  {group.label}
                </span>
                {active && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: group.color,
                      background: group.color + "15",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      letterSpacing: "1px",
                    }}
                  >
                    ✓ ON
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selected.length === 0 && (
          <div
            style={{
              background: "#1A1400",
              border: "1px solid #FFD70030",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "12px",
              color: "#FFD700",
              marginBottom: "16px",
            }}
          >
            ⚠ No muscle groups selected yet
          </div>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "#1A1D26",
              border: "1px solid #2A2D3A",
              borderRadius: "10px",
              color: "#888",
              padding: "13px",
              cursor: "pointer",
              fontSize: "13px",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(selected);
              onClose();
            }}
            style={{
              flex: 2,
              background: "linear-gradient(135deg,#FF4D4D,#FF8C42)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              padding: "13px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "700",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Save Split
          </button>
        </div>
      </div>
    </div>
  );
}
export default SplitEditorModal;
