// ─── WORKOUT CALENDAR ─────────────────────────────────────────────────────────
/**
 * WorkoutCalendar
 * Shows the current month. Days with logged data get a coloured dot.
 * Clicking a past/today date opens a panel showing every exercise logged that day
 * with their sets/weight if available.
 */
import React, { useState } from "react";
import { useMemo } from "react";
import {
  monthStartOffset,
  daysInMonth,
  formatDateLocal,
} from "../utils/dateUtils";
import { sectionTitle } from "../styles/theme";
const WorkoutCalendar = ({ weightLogs, muscleGroups }) => {
  console.log("Component Rendered");
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(null); // Date object

  // Build a map: "M/D/YYYY" → Set of exIds that have data that day
  console.log("weightLogs:", weightLogs);
  const activeDays = useMemo(() => {
    const map = {};

    Object.entries(weightLogs).forEach(([exId, sessions]) => {
      Object.keys(sessions).forEach((dateKey) => {
        // Extract only date (YYYY-MM-DD)
        const dateStr = dateKey.includes(" · ")
          ? dateKey.split(" · ")[1]
          : dateKey;

        if (!dateStr) return;

        if (!map[dateStr]) map[dateStr] = new Set();
        map[dateStr].add(exId);
      });
    });

    console.log("ActiveDays:", map); // IMPORTANT DEBUG

    return map;
  }, [weightLogs]);

  // All exercise ids logged on the selected day
  const selectedDateStr = selected ? formatDateLocal(selected) : null;
  console.log("Selected Date Str:", selectedDateStr);

  // Build structured list: for each exercise logged on selected day, gather sets
  const dayHistory = useMemo(() => {
    console.log("dayHistory running");
    if (!selectedDateStr) return [];

    console.log("Selected Date:", selectedDateStr); // 🔥

    const allExercises = Object.values(muscleGroups).flatMap((g) =>
      g.exercises.map((ex) => ({ ...ex })),
    );

    const result = [];

    allExercises.forEach((ex) => {
      const sessions = weightLogs[ex.id];
      if (!sessions) return;

      console.log("Exercise:", ex.id); // 🔥
      console.log("Session keys:", Object.keys(sessions)); // 🔥

      const matchingKeys = Object.keys(sessions).filter((k) => {
        const dp = k.includes(" · ") ? k.split(" · ")[1] : k;

        console.log("Checking key:", k, "→", dp); // 🔥

        return dp === selectedDateStr;
      });

      console.log("Matching keys:", matchingKeys); // 🔥

      if (!matchingKeys.length) return;

      const sets = matchingKeys.flatMap((k) => sessions[k]);

      console.log("Final sets for this day:", sets); // 🔥

      result.push({ ex, sets });
    });

    return result;
  }, [selectedDateStr, weightLogs, muscleGroups]);

  const offset = monthStartOffset(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells = Array(offset)
    .fill(null)
    .concat(Array.from({ length: totalDays }, (_, i) => i + 1));
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayY = now.getFullYear(),
    todayM = now.getMonth(),
    todayD = now.getDate();

  const goBack = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
    setSelected(null);
  };
  const goFwd = () => {
    // Don't allow navigating past current month
    if (viewYear === todayY && viewMonth === todayM) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
    setSelected(null);
  };

  const atCurrentMonth = viewYear === todayY && viewMonth === todayM;

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  const handleDayClick = (day) => {
    if (!day) return;
    const d = new Date(viewYear, viewMonth, day);
    // Can't select future dates
    const isToday =
      d.getFullYear() === todayY &&
      d.getMonth() === todayM &&
      d.getDate() === todayD;
    const isPast = d < new Date(todayY, todayM, todayD);
    if (!isToday && !isPast) return;
    setSelected((prev) =>
      prev && formatDateLocal(prev) === formatDateLocal(d) ? null : d,
    );
  };

  return (
    <div
      style={{
        background: "#0F1117",
        border: "1px solid #1E2130",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "24px",
      }}
    >
      {/* Month nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={goBack}
          style={{
            background: "#1A1D26",
            border: "1px solid #2A2D3A",
            borderRadius: "8px",
            color: "#888",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "16px",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          ‹
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={sectionTitle}>WORKOUT CALENDAR</div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#F0F0F0",
              marginTop: "-8px",
            }}
          >
            {monthLabel}
          </div>
        </div>
        <button
          onClick={goFwd}
          style={{
            background: atCurrentMonth ? "#111" : "#1A1D26",
            border: "1px solid #2A2D3A",
            borderRadius: "8px",
            color: atCurrentMonth ? "#2A2D3A" : "#888",
            padding: "6px 12px",
            cursor: atCurrentMonth ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontFamily: "'DM Sans',sans-serif",
          }}
          disabled={atCurrentMonth}
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: "3px",
          marginBottom: "6px",
        }}
      >
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: "10px",
              color: i >= 5 ? "#444" : "#555",
              fontWeight: "700",
              letterSpacing: "1px",
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: "3px",
        }}
      >
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const thisDate = new Date(viewYear, viewMonth, day);
          const dateStr =
            viewYear +
            "-" +
            String(viewMonth + 1).padStart(2, "0") +
            "-" +
            String(day).padStart(2, "0");
          const isToday =
            viewYear === todayY && viewMonth === todayM && day === todayD;
          const isPast = thisDate < new Date(todayY, todayM, todayD);
          const isFuture = !isToday && !isPast;
          const hasData = !!activeDays[dateStr];
          const isSelected = selected && formatDateLocal(selected) === dateStr;
          const isWeekend = idx % 7 >= 5;

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={isFuture}
              style={{
                position: "relative",
                padding: "8px 4px",
                borderRadius: "9px",
                border: isSelected
                  ? "1.5px solid #FF4D4D"
                  : "1.5px solid transparent",
                background: isSelected
                  ? "#FF4D4D20"
                  : isToday
                    ? "#1A1D26"
                    : "transparent",
                cursor: isFuture ? "not-allowed" : "pointer",
                opacity: isFuture ? 0.2 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: isToday ? "900" : "500",
                  color: isSelected
                    ? "#FF4D4D"
                    : isToday
                      ? "#FF4D4D"
                      : isWeekend
                        ? "#3A3D4A"
                        : "#888",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {day}
              </span>
              {hasData && (
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: isSelected ? "#FF4D4D" : "#00AA00",
                    flexShrink: 0,
                  }}
                />
              )}
              {!hasData && <span style={{ width: "5px", height: "5px" }} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "14px",
          marginTop: "12px",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "10px",
            color: "#444",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#00AA00",
              display: "inline-block",
            }}
          />
          Workout logged
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "10px",
            color: "#444",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#FF4D4D",
              display: "inline-block",
            }}
          />
          Selected
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "10px",
            color: "#333",
          }}
        >
          <span style={{ opacity: 0.25, fontSize: "12px" }}>15</span>
          Future (locked)
        </div>
      </div>

      {/* Day history panel */}
      {selected && (
        <div
          style={{
            marginTop: "18px",
            borderTop: "1px solid #1E2130",
            paddingTop: "16px",
            animation: "fadeSlide 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#F0F0F0",
                }}
              >
                {selected.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div
                style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}
              >
                {dayHistory.length > 0
                  ? `${dayHistory.length} exercise${dayHistory.length > 1 ? "s" : ""} logged`
                  : "No workout data for this day"}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: "none",
                border: "none",
                color: "#444",
                fontSize: "18px",
                cursor: "pointer",
                padding: "0",
              }}
            >
              ✕
            </button>
          </div>

          {dayHistory.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 10px",
                border: "1px dashed #1E2130",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "6px" }}>🏖️</div>
              <div style={{ fontSize: "13px", color: "#444" }}>
                No exercises were logged on this day.
              </div>
            </div>
          ) : (
            dayHistory.map(({ ex, sets }) => {
              const groupEntry = Object.entries(muscleGroups).find(([, g]) =>
                g.exercises.some((e) => e.id === ex.id),
              );
              const group = groupEntry
                ? groupEntry[1]
                : { color: "#888", icon: "●", label: "" };
              const validSets = sets.filter(
                (s) => s.weight || s.reps || s.time,
              );
              const formatProgressSet = (set, logType) => {
                if (logType === "timer") {
                  return `${set.time || "–"} sec`;
                }

                if (logType === "reps_only") {
                  return `${set.reps || "–"} reps`;
                }

                if (logType === "weight_time") {
                  return `${set.weight || "–"}kg × ${set.time || "–"} sec`;
                }

                return `${set.weight || "–"}kg × ${set.reps || "–"}`;
              };
              return (
                <div
                  key={ex.id}
                  style={{
                    background: "#080A0F",
                    border: `1px solid ${group.color}25`,
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "8px",
                    borderLeft: `3px solid ${group.color}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      marginBottom: validSets.length ? "10px" : "0",
                    }}
                  >
                    <span style={{ fontSize: "14px", color: group.color }}>
                      {group.icon}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#F0F0F0",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {ex.name}
                        {ex.isCustom && (
                          <span
                            style={{
                              fontSize: "9px",
                              background: "#FF8C4230",
                              color: "#FF8C42",
                              borderRadius: "4px",
                              padding: "1px 5px",
                              fontWeight: "700",
                              letterSpacing: "1px",
                            }}
                          >
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: group.color,
                          marginTop: "1px",
                        }}
                      >
                        {group.label}
                      </div>
                    </div>
                  </div>
                  {validSets.length > 0 && (
                    <div
                      style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}
                    >
                      {validSets.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            background: group.color + "18",
                            border: `1px solid ${group.color}30`,
                            borderRadius: "7px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            color: group.color,
                            fontWeight: "700",
                          }}
                        >
                          S{s.set}:{" "}
                          {formatProgressSet(s, ex.logType || "weight_reps")}
                        </div>
                      ))}
                    </div>
                  )}
                  {validSets.length === 0 && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#333",
                        marginTop: "4px",
                      }}
                    >
                      Exercise checked off — no weights recorded.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
export default WorkoutCalendar;
