// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
export function CustomTooltip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0F1117",
        border: `1px solid ${color}60`,
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          color: "#666",
          fontSize: "11px",
          marginBottom: "4px",
          letterSpacing: "1px",
        }}
      >
        {label}
      </div>
      <div style={{ color, fontWeight: "700", fontSize: "16px" }}>
        {payload[0].value}{" "}
        <span style={{ fontSize: "12px", fontWeight: "400" }}>kg</span>
      </div>
      <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>
        Max weight lifted
      </div>
    </div>
  );
}

// ─── CUSTOM DOT (highlights PB) ───────────────────────────────────────────────
export function CustomDot({ cx, cy, payload, color, data }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map((d) => d.maxWeight));
  const isPB = payload.maxWeight === maxVal;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={isPB ? 7 : 4}
        fill={color}
        opacity={isPB ? 1 : 0.85}
        stroke={isPB ? "#fff" : color}
        strokeWidth={isPB ? 2 : 0}
      />
      {isPB && (
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fill="#FFD700"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1"
          fontFamily="'DM Sans',sans-serif"
        >
          PB
        </text>
      )}
    </g>
  );
}
// ─── HELPER: Transform weightLogs → recharts data for one exercise ────────────
export function getChartData(sessions) {
  if (!sessions || !Object.keys(sessions).length) return [];
  return Object.entries(sessions)
    .map(([dateKey, sets]) => {
      const datePart = dateKey.includes(" · ")
        ? dateKey.split(" · ")[1]
        : dateKey;
      const weights = sets
        .map((s) => parseFloat(s.weight))
        .filter((w) => !isNaN(w) && w > 0);
      if (!weights.length) return null;
      const parsed = new Date(datePart);
      return {
        date: datePart,
        maxWeight: Math.max(...weights),
        ts: isNaN(parsed) ? 0 : parsed.getTime(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts)
    .map(({ date, maxWeight }) => ({ date, maxWeight }));
}
