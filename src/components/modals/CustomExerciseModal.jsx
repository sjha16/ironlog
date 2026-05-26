import React, { useState } from "react";
import { iInput, iLabel } from "../../styles/theme";

// ─── CUSTOM EXERCISE MODAL ────────────────────────────────────────────────────
function CustomExerciseModal({ muscleGroups, defaultMuscle, onClose, onSave }) {
  const [name, setName] = useState("");
  const [logType, setLogType] = useState("weight_reps");
  const [sets, setSets] = useState("3x10-12");
  const [tip, setTip] = useState("");
  const [targetMuscle, setTargetMuscle] = useState(
    defaultMuscle || Object.keys(muscleGroups)[0],
  );

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(
      {
        id: "custom_" + Date.now(),
        name: name.trim(),
        sets: sets || "3x10",
        tip,
        instructor: "Custom",
        isCustom: true,
        logType,
      },
      targetMuscle,
    );
    onClose();
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
            marginBottom: "22px",
          }}
        >
          <div>
            <div style={iLabel}>NEW EXERCISE</div>
            <div
              style={{ fontSize: "20px", fontWeight: "700", color: "#F0F0F0" }}
            >
              Custom Exercise
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
        <div style={{ marginBottom: "14px" }}>
          <label style={iLabel}>Exercise Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Machine Chest Fly"
            style={iInput}
          />
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label style={iLabel}>Sets × Reps</label>
          <input
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            placeholder="e.g. 3x10-12"
            style={iInput}
          />
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label style={iLabel}>Log Type</label>
          <select
            value={logType}
            onChange={(e) => setLogType(e.target.value)}
            style={{ ...iInput, appearance: "none", cursor: "pointer" }}
          >
            <option value="weight_reps">Weight + Reps</option>
            <option value="reps_only">Reps Only</option>
            <option value="timer">Timer</option>
            <option value="weight_time">Weight + Time</option>
          </select>
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label style={iLabel}>Target Muscle Group</label>
          <select
            value={targetMuscle}
            onChange={(e) => setTargetMuscle(e.target.value)}
            style={{ ...iInput, appearance: "none", cursor: "pointer" }}
          >
            {Object.entries(muscleGroups).map(([k, g]) => (
              <option key={k} value={k}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "22px" }}>
          <label style={iLabel}>Notes / Tips (optional)</label>
          <textarea
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="Your form cues or technique notes..."
            rows={3}
            style={{ ...iInput, resize: "none", lineHeight: "1.6" }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{
            width: "100%",
            background: name.trim()
              ? "linear-gradient(135deg,#FF4D4D,#FF8C42)"
              : "#1A1D26",
            border: "none",
            borderRadius: "10px",
            color: name.trim() ? "#fff" : "#444",
            padding: "14px",
            cursor: name.trim() ? "pointer" : "not-allowed",
            fontSize: "15px",
            fontWeight: "700",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Add Exercise
        </button>
      </div>
    </div>
  );
}
export default CustomExerciseModal;
