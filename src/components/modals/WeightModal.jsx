import React, { useState } from "react";
import { iInput, iLabel } from "../../styles/theme";

function WeightModal({ exercise, onClose, onSave, existing }) {
  const logType = exercise.logType || "weight_reps";

  const getEmptyRow = () => {
    switch (logType) {
      case "timer":
        return { set: 1, time: "" };
      case "reps_only":
        return { set: 1, reps: "" };
      case "weight_time":
        return { set: 1, weight: "", time: "" };
      default:
        return { set: 1, weight: "", reps: "" };
    }
  };

  const [entries, setEntries] = useState(
    existing?.length ? existing : [getEmptyRow()],
  );

  const rowColumns =
    logType === "weight_reps" || logType === "weight_time"
      ? "32px minmax(0, 1fr) minmax(0, 1fr) 24px"
      : "32px minmax(0, 1fr) 24px";

  const addSet = () => {
    const newRow = { set: entries.length + 1 };

    if (logType === "timer") {
      newRow.time = "";
    } else if (logType === "reps_only") {
      newRow.reps = "";
    } else if (logType === "weight_time") {
      newRow.weight = "";
      newRow.time = "";
    } else {
      newRow.weight = "";
      newRow.reps = "";
    }

    setEntries((p) => [...p, newRow]);
  };

  const removeSet = (i) =>
    setEntries((p) =>
      p.filter((_, idx) => idx !== i).map((e, idx) => ({ ...e, set: idx + 1 })),
    );

  const update = (i, field, val) =>
    setEntries((p) => {
      const u = [...p];
      u[i] = { ...u[i], [field]: val };
      return u;
    });

  const getHeaders = () => {
    if (logType === "timer") return ["#", "SEC", ""];
    if (logType === "reps_only") return ["#", "REPS", ""];
    if (logType === "weight_time") return ["#", "KG", "TIME", ""];
    return ["#", "KG", "REPS", ""];
  };

  const renderInputs = (e, i) => {
    if (logType === "timer") {
      return (
        <input
          type="number"
          placeholder="0"
          value={e.time || ""}
          onChange={(v) => update(i, "time", v.target.value)}
          style={{ ...iInput, width: "100%", minWidth: 0 }}
        />
      );
    }

    if (logType === "reps_only") {
      return (
        <input
          type="number"
          placeholder="0"
          value={e.reps || ""}
          onChange={(v) => update(i, "reps", v.target.value)}
          style={{ ...iInput, width: "100%", minWidth: 0 }}
        />
      );
    }

    if (logType === "weight_time") {
      return (
        <>
          <input
            type="number"
            placeholder="0"
            value={e.weight || ""}
            onChange={(v) => update(i, "weight", v.target.value)}
            style={{ ...iInput, width: "100%", minWidth: 0 }}
          />
          <input
            type="number"
            placeholder="0"
            value={e.time || ""}
            onChange={(v) => update(i, "time", v.target.value)}
            style={{ ...iInput, width: "100%", minWidth: 0 }}
          />
        </>
      );
    }

    return (
      <>
        <input
          type="number"
          placeholder="0"
          value={e.weight || ""}
          onChange={(v) => update(i, "weight", v.target.value)}
          style={{ ...iInput, width: "100%", minWidth: 0 }}
        />
        <input
          type="number"
          placeholder="0"
          value={e.reps || ""}
          onChange={(v) => update(i, "reps", v.target.value)}
          style={{ ...iInput, width: "100%", minWidth: 0 }}
        />
      </>
    );
  };

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
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <div style={iLabel}>LOG WEIGHTS</div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#F0F0F0",
              }}
            >
              {exercise.name}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: rowColumns,
            gap: "8px",
            marginBottom: "8px",
            alignItems: "center",
          }}
        >
          {getHeaders().map((h) => (
            <div key={h} style={iLabel}>
              {h}
            </div>
          ))}
        </div>

        {entries.map((e, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: rowColumns,
              gap: "8px",
              marginBottom: "8px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {i + 1}
            </div>

            {renderInputs(e, i)}

            <button
              onClick={() => removeSet(i)}
              style={{
                background: "none",
                border: "none",
                color: "#444",
                cursor: "pointer",
                fontSize: "18px",
                padding: "0",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addSet}
          style={{
            width: "100%",
            background: "#1A1D26",
            border: "1px dashed #3A3D4A",
            borderRadius: "8px",
            color: "#888",
            padding: "9px",
            cursor: "pointer",
            fontSize: "12px",
            marginTop: "4px",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          + Add Set
        </button>

        <button
          onClick={() => {
            onSave(entries);
            onClose();
          }}
          style={{
            width: "100%",
            background: "linear-gradient(135deg,#FF4D4D,#FF8C42)",
            border: "none",
            borderRadius: "10px",
            color: "#fff",
            padding: "13px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "700",
            marginTop: "14px",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Save Session
        </button>
      </div>
    </div>
  );
}
export default WeightModal;
