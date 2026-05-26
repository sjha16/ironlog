import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  getChartData,
  CustomTooltip,
  CustomDot,
} from "../utils/progressChartsHelpers";
//import { BASE_MUSCLE_GROUPS, DEFAULT_SPLIT } from "../../data/muscleGroup";
import { iInput, sectionTitle } from "../styles/theme";

// ─── PROGRESS GRAPH ───────────────────────────────────────────────────────────
const ProgressGraph = ({ weightLogs, muscleGroups }) => {
  const loggedExercises = useMemo(() => {
    return Object.values(muscleGroups)
      .flatMap((g) =>
        g.exercises.map((ex) => ({
          ...ex,
          groupColor: g.color,
          groupLabel: g.label,
          groupIcon: g.icon,
        })),
      )
      .filter((ex) => {
        const s = weightLogs[ex.id];
        return (
          s &&
          Object.values(s).some((sets) =>
            sets.some((set) => parseFloat(set.weight) > 0),
          )
        );
      });
  }, [weightLogs, muscleGroups]);

  const [selectedExId, setSelectedExId] = useState(
    () => loggedExercises[0]?.id ?? "",
  );
  const validId =
    loggedExercises.find((e) => e.id === selectedExId)?.id ??
    loggedExercises[0]?.id ??
    "";
  const selectedEx = loggedExercises.find((e) => e.id === validId);

  const chartData = useMemo(() => {
    if (!validId || !weightLogs[validId]) return [];
    return getChartData(weightLogs[validId]);
  }, [weightLogs, validId]);

  const lineColor = selectedEx?.groupColor ?? "#FF4D4D";
  const maxWeight = chartData.length
    ? Math.max(...chartData.map((d) => d.maxWeight))
    : 0;
  const firstWeight = chartData[0]?.maxWeight ?? 0;
  const lastWeight = chartData[chartData.length - 1]?.maxWeight ?? 0;
  const improvement =
    firstWeight > 0
      ? (((lastWeight - firstWeight) / firstWeight) * 100).toFixed(1)
      : null;

  if (!loggedExercises.length) {
    return (
      <div
        style={{
          background: "#0F1117",
          border: "1px solid #1E2130",
          borderRadius: "16px",
          padding: "36px 20px",
          textAlign: "center",
          marginBottom: "24px",
        }}
      >
        <div style={{ fontSize: "38px", marginBottom: "10px" }}>📉</div>
        <div style={{ fontSize: "15px", fontWeight: "700", color: "#555" }}>
          No progress data yet
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#333",
            marginTop: "6px",
            lineHeight: 1.6,
          }}
        >
          Log weights on any exercise to see your
          <br />
          strength curve appear here.
        </div>
      </div>
    );
  }

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={sectionTitle}>PROGRESS GRAPH</div>
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#F0F0F0" }}
          >
            {selectedEx?.name ?? "—"}
          </div>
          {selectedEx && (
            <div
              style={{
                fontSize: "11px",
                color: selectedEx.groupColor,
                marginTop: "3px",
              }}
            >
              {selectedEx.groupIcon} {selectedEx.groupLabel}
            </div>
          )}
        </div>
        <select
          value={validId}
          onChange={(e) => setSelectedExId(e.target.value)}
          style={{
            ...iInput,
            padding: "8px 10px",
            fontSize: "12px",
            appearance: "none",
            cursor: "pointer",
            borderColor: lineColor + "60",
            background: lineColor + "10",
            color: lineColor,
            fontWeight: "700",
            width: "auto",
            minWidth: "140px",
          }}
        >
          {Object.entries(muscleGroups).map(([gKey, group]) => {
            const exs = loggedExercises.filter((e) =>
              group.exercises.some((ge) => ge.id === e.id),
            );
            if (!exs.length) return null;
            return (
              <optgroup key={gKey} label={`${group.icon} ${group.label}`}>
                {exs.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      {chartData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              label: "Personal Best",
              value: `${maxWeight} kg`,
              color: "#FFD700",
            },
            { label: "Sessions", value: chartData.length, color: lineColor },
            {
              label: "Progress",
              value:
                improvement != null
                  ? `${improvement > 0 ? "+" : ""}${improvement}%`
                  : "—",
              color:
                improvement > 0
                  ? "#2ECC71"
                  : improvement < 0
                    ? "#FF4D4D"
                    : "#666",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#080A0F",
                borderRadius: "10px",
                padding: "10px",
                border: "1px solid #1E2130",
                textAlign: "center",
              }}
            >
              <div
                style={{ fontSize: "17px", fontWeight: "900", color: s.color }}
              >
                {s.value}
              </div>
              <div
                style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {chartData.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "28px 10px",
            border: "1px dashed #1E2130",
            borderRadius: "12px",
            color: "#333",
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "6px" }}>🏋️</div>
          <div style={{ fontSize: "13px", color: "#444" }}>
            No weight data for this exercise yet.
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart
            data={chartData}
            margin={{ top: 18, right: 12, left: -10, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1A1D26"
              horizontal
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fill: "#444",
                fontSize: 10,
                fontFamily: "'DM Sans',sans-serif",
              }}
              tickLine={false}
              axisLine={{ stroke: "#1E2130" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{
                fill: "#444",
                fontSize: 10,
                fontFamily: "'DM Sans',sans-serif",
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}kg`}
              domain={["auto", "auto"]}
              width={44}
            />
            <Tooltip
              content={<CustomTooltip color={lineColor} />}
              cursor={{
                stroke: lineColor,
                strokeWidth: 1,
                strokeDasharray: "4 4",
                opacity: 0.4,
              }}
            />
            <ReferenceLine
              y={maxWeight}
              stroke="#FFD700"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{
                value: "PB",
                position: "insideTopRight",
                fill: "#FFD700",
                fontSize: 9,
                fontWeight: "700",
                fontFamily: "'DM Sans',sans-serif",
              }}
            />
            <Line
              type="monotone"
              dataKey="maxWeight"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={<CustomDot color={lineColor} data={chartData} />}
              activeDot={{
                r: 6,
                stroke: "#fff",
                strokeWidth: 2,
                fill: lineColor,
              }}
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      {chartData.length > 0 && (
        <div
          style={{
            fontSize: "10px",
            color: "#2A2D3A",
            textAlign: "center",
            marginTop: "10px",
          }}
        >
          Showing max weight per session · Dots mark each workout
        </div>
      )}
    </div>
  );
};
export default ProgressGraph;
