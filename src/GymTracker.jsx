import { auth, provider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine
} from "recharts";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// ─── BASE MUSCLE GROUPS ───────────────────────────────────────────────────────
const BASE_MUSCLE_GROUPS = {
  chest: {
    label: "Chest", icon: "◈", color: "#FF4D4D",
    exercises: [
      { id: "c1", name: "Barbell Bench Press", sets: "4x6-8", tip: "Arnold's #1 chest builder. Retract scapula, drive feet into floor.", instructor: "Arnold Schwarzenegger" },
      { id: "c2", name: "Incline Dumbbell Press", sets: "3x10-12", tip: "30-45° incline hits upper chest. Control the eccentric.", instructor: "Jeff Nippard" },
      { id: "c3", name: "Cable Chest Fly", sets: "3x12-15", tip: "Keep slight elbow bend, squeeze at center. Mind-muscle connection.", instructor: "Chris Bumstead" },
      { id: "c4", name: "Decline Push-Up", sets: "3x15-20", tip: "Feet elevated higher = more upper chest activation.", instructor: "Athlean-X" },
      { id: "c5", name: "Dumbbell Pullover", sets: "3x12", tip: "Expands ribcage, stretches pec minor. Keep slight elbow bend.", instructor: "Dorian Yates" },
    ]
  },
  back: {
    label: "Back", icon: "◉", color: "#4D9FFF",
    exercises: [
      { id: "b1", name: "Deadlift", sets: "4x4-6", tip: "King of all lifts. Bar over mid-foot, hip hinge, neutral spine.", instructor: "Ed Coan" },
      { id: "b2", name: "Pull-Up / Weighted Pull-Up", sets: "4x6-10", tip: "Full ROM. Think elbows to hips, not pulling bar to chest.", instructor: "Athlean-X" },
      { id: "b3", name: "Barbell Row", sets: "4x8-10", tip: "Hinge 45°, row to lower chest. Controlled negative.", instructor: "Dorian Yates" },
      { id: "b4", name: "Seated Cable Row", sets: "3x12", tip: "Chest up, drive elbows back, squeeze rhomboids at peak.", instructor: "Lee Haney" },
      { id: "b5", name: "Lat Pulldown", sets: "3x10-12", tip: "Wide grip, lean back slightly, pull to upper chest.", instructor: "Jeff Nippard" },
      { id: "b6", name: "Face Pull", sets: "3x15-20", tip: "External rotation is key. Prevents shoulder injury long-term.", instructor: "Athlean-X" },
    ]
  },
  shoulders: {
    label: "Shoulders", icon: "◇", color: "#FFD700",
    exercises: [
      { id: "s1", name: "Overhead Press (Barbell)", sets: "4x6-8", tip: "Full lockout at top, slight layback. Core tight throughout.", instructor: "Mark Rippetoe" },
      { id: "s2", name: "Dumbbell Lateral Raise", sets: "4x12-15", tip: "Lead with elbows, slight forward lean. Don't swing!", instructor: "John Meadows" },
      { id: "s3", name: "Arnold Press", sets: "3x10-12", tip: "Rotation engages all three delt heads. Slow and controlled.", instructor: "Arnold Schwarzenegger" },
      { id: "s4", name: "Rear Delt Fly", sets: "3x15", tip: "Bent over, neutral spine. Squeeze rear delts, not traps.", instructor: "Chris Bumstead" },
      { id: "s5", name: "Cable Upright Row", sets: "3x12", tip: "Elbows flared wide, pull to chin height. Protects rotator cuff.", instructor: "Jeff Nippard" },
    ]
  },
  biceps: {
    label: "Biceps", icon: "◑", color: "#FF8C42",
    exercises: [
      { id: "bi1", name: "Barbell Curl", sets: "3x8-10", tip: "Don't swing. Supinate fully at the top. Full stretch at bottom.", instructor: "Scott Herman" },
      { id: "bi2", name: "Incline Dumbbell Curl", sets: "3x10-12", tip: "Stretch under load. Best long head activator.", instructor: "John Meadows" },
      { id: "bi3", name: "Hammer Curl", sets: "3x10", tip: "Builds brachialis and brachioradialis for arm thickness.", instructor: "Athlean-X" },
      { id: "bi4", name: "Preacher Curl", sets: "3x12", tip: "Eliminates cheating. Peak contraction is everything here.", instructor: "Larry Scott" },
    ]
  },
  triceps: {
    label: "Triceps", icon: "◐", color: "#9B59B6",
    exercises: [
      { id: "t1", name: "Close-Grip Bench Press", sets: "4x8-10", tip: "Elbows tucked, shoulder-width grip. Triceps do 60% of bench work.", instructor: "Mark Bell" },
      { id: "t2", name: "Overhead Tricep Extension", sets: "3x12", tip: "Long head stretch. Keep elbows pointing forward.", instructor: "Jeff Nippard" },
      { id: "t3", name: "Tricep Pushdown (Rope)", sets: "3x12-15", tip: "Flare wrists at bottom. Full extension every rep.", instructor: "Chris Bumstead" },
      { id: "t4", name: "Skull Crusher", sets: "3x10", tip: "Lower to forehead, keep elbows stationary. Massive long head.", instructor: "Dorian Yates" },
    ]
  },
  legs: {
    label: "Legs", icon: "▽", color: "#2ECC71",
    exercises: [
      { id: "l1", name: "Barbell Back Squat", sets: "4x6-8", tip: "Depth below parallel. Knees track toes. Chest up.", instructor: "Mark Rippetoe" },
      { id: "l2", name: "Romanian Deadlift", sets: "3x10-12", tip: "Hip hinge master. Feel hamstring stretch, not lower back.", instructor: "Jeff Nippard" },
      { id: "l3", name: "Leg Press", sets: "4x12", tip: "High foot placement = more glute/ham. Low = quad dominant.", instructor: "Tom Platz" },
      { id: "l4", name: "Leg Curl (Lying)", sets: "3x12-15", tip: "Full ROM. Point toes down to maximize hamstring stretch.", instructor: "John Meadows" },
      { id: "l5", name: "Bulgarian Split Squat", sets: "3x10 each", tip: "Best unilateral leg exercise. Rear foot elevated, torso upright.", instructor: "Chris Bumstead" },
      { id: "l6", name: "Standing Calf Raise", sets: "4x15-20", tip: "Full stretch at bottom. 2-sec pause. Calves love volume.", instructor: "Arnold Schwarzenegger" },
    ]
  },
  core: {
    label: "Core", icon: "○", color: "#1ABC9C",
    exercises: [
      { id: "co1", name: "Cable Crunch", sets: "3x15-20", tip: "Crunch with abs, not hips. Elbows to knees.", instructor: "Athlean-X" },
      { id: "co2", name: "Hanging Leg Raise", sets: "3x12-15", tip: "No swinging. Posterior pelvic tilt at the top.", instructor: "Jeff Nippard" },
      { id: "co3", name: "Ab Wheel Rollout", sets: "3x10", tip: "Brace hard. Don't let lower back sag. Advanced move.", instructor: "Athlean-X" },
      { id: "co4", name: "Plank", sets: "3x45-60s", tip: "Neutral spine, squeeze glutes, push ground away.", instructor: "Stuart McGill" },
    ]
  },
  forearms: {
    label: "Forearms", icon: "⌇", color: "#E67E22",
    exercises: [
      { id: "f1", name: "Wrist Curl", sets: "3x15-20", tip: "Full ROM on the wrist. Slow eccentric builds grip strength.", instructor: "John Meadows" },
      { id: "f2", name: "Reverse Curl", sets: "3x12", tip: "Overhand grip. Targets brachioradialis and extensors.", instructor: "Athlean-X" },
      { id: "f3", name: "Farmer's Carry", sets: "3x30m", tip: "Walk with heavy dumbbells. Best functional forearm builder.", instructor: "Dan John" },
    ]
  },
  glutes: {
    label: "Glutes", icon: "◍", color: "#E91E63",
    exercises: [
      { id: "g1", name: "Hip Thrust (Barbell)", sets: "4x10-12", tip: "Chin tucked, drive through heels. Full hip extension at top.", instructor: "Bret Contreras" },
      { id: "g2", name: "Cable Kickback", sets: "3x15 each", tip: "Slight forward lean. Squeeze glute at top, not just kick.", instructor: "Bret Contreras" },
      { id: "g3", name: "Sumo Deadlift", sets: "3x8", tip: "Wide stance activates glutes more than conventional.", instructor: "Jeff Nippard" },
      { id: "g4", name: "Abductor Machine", sets: "3x15-20", tip: "Works glute med. Essential for hip stability and shape.", instructor: "Chris Bumstead" },
    ]
  },
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_SPLIT = {
  Mon: ["chest", "triceps"], Tue: ["back", "biceps"], Wed: ["legs"],
  Thu: ["shoulders", "forearms"], Fri: ["chest", "back"], Sat: ["glutes", "core"], Sun: [],
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const iInput = {
  background: "#1A1D26", border: "1px solid #2A2D3A", borderRadius: "8px",
  color: "#F0F0F0", padding: "10px 12px", fontSize: "14px", outline: "none",
  width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};
const iLabel = {
  fontSize: "10px", color: "#555", letterSpacing: "1.5px", marginBottom: "6px",
  display: "block", fontWeight: "700", textTransform: "uppercase",
};
const sectionTitle = {
  fontSize: "11px", color: "#444", letterSpacing: "2px", fontWeight: "700",
  marginBottom: "14px", textTransform: "uppercase",
};

// ─── HELPER: Transform weightLogs → recharts-ready data for one exercise ──────
/**
 * getChartData
 * @param {Object} sessions  - weightLogs[exId]: { "Mon · 3/24/2026": [{set,weight,reps},...] }
 * @returns {Array}          - [{ date: "3/24", maxWeight: 65 }, ...]  sorted by date asc
 */
function getChartData(sessions) {
  if (!sessions || Object.keys(sessions).length === 0) return [];

  return Object.entries(sessions)
    .map(([dateKey, sets]) => {
      // dateKey format: "Mon · 3/24/2026"  → extract the date part after " · "
      const datePart = dateKey.includes(" · ") ? dateKey.split(" · ")[1] : dateKey;

      // Extract max weight from all sets in this session (ignore empty/non-numeric)
      const weights = sets
        .map(s => parseFloat(s.weight))
        .filter(w => !isNaN(w) && w > 0);

      if (weights.length === 0) return null;

      const maxWeight = Math.max(...weights);

      // Parse date for proper chronological sorting
      const parsed = new Date(datePart);
      const timestamp = isNaN(parsed.getTime()) ? 0 : parsed.getTime();

      return { date: datePart, maxWeight, timestamp };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp)  // sort chronologically
    .map(({ date, maxWeight }) => ({ date, maxWeight }));   // drop internal timestamp
}

// ─── CUSTOM RECHARTS TOOLTIP ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0F1117", border: `1px solid ${color}60`,
      borderRadius: "10px", padding: "10px 14px", fontSize: "13px",
    }}>
      <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px", letterSpacing: "1px" }}>{label}</div>
      <div style={{ color, fontWeight: "700", fontSize: "16px" }}>
        {payload[0].value} <span style={{ fontSize: "12px", fontWeight: "400" }}>kg</span>
      </div>
      <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>Max weight lifted</div>
    </div>
  );
}

// ─── CUSTOM RECHARTS DOT ──────────────────────────────────────────────────────
function CustomDot({ cx, cy, payload, color, data }) {
  // Highlight personal best dot
  const maxVal = Math.max(...data.map(d => d.maxWeight));
  const isPB = payload.maxWeight === maxVal;
  return (
    <g>
      <circle cx={cx} cy={cy} r={isPB ? 7 : 4} fill={color} opacity={isPB ? 1 : 0.85}
        stroke={isPB ? "#fff" : color} strokeWidth={isPB ? 2 : 0}/>
      {isPB && (
        <text x={cx} y={cy - 14} textAnchor="middle" fill="#FFD700"
          fontSize="9" fontWeight="700" letterSpacing="1" fontFamily="'DM Sans', sans-serif">
          PB
        </text>
      )}
    </g>
  );
}

// ─── PROGRESS GRAPH COMPONENT ─────────────────────────────────────────────────
/**
 * ProgressGraph
 * Self-contained — receives weightLogs + all exercises, manages its own selection.
 * Memoised to avoid re-renders when other parts of the app update.
 */
const ProgressGraph = ({ weightLogs, muscleGroups }) => {
  // Only exercises that actually have logged data
  const loggedExercises = useMemo(() => {
    const allExercises = Object.values(muscleGroups).flatMap(g =>
      g.exercises.map(ex => ({ ...ex, groupColor: g.color, groupLabel: g.label, groupIcon: g.icon }))
    );
    return allExercises.filter(ex => {
      const sessions = weightLogs[ex.id];
      if (!sessions) return false;
      // Must have at least one set with a real weight value
      return Object.values(sessions).some(sets =>
        sets.some(s => parseFloat(s.weight) > 0)
      );
    });
  }, [weightLogs, muscleGroups]);

  const [selectedExId, setSelectedExId] = useState(() => loggedExercises[0]?.id ?? "");

  // Sync selectedExId if it disappears from logged list (e.g., data cleared)
  const validSelectedId = loggedExercises.find(e => e.id === selectedExId)
    ? selectedExId
    : loggedExercises[0]?.id ?? "";

  const selectedEx = loggedExercises.find(e => e.id === validSelectedId);

  // Derive chart data — only recomputed when the relevant session changes
  const chartData = useMemo(() => {
    if (!validSelectedId || !weightLogs[validSelectedId]) return [];
    return getChartData(weightLogs[validSelectedId]);
  }, [weightLogs, validSelectedId]);

  const lineColor = selectedEx?.groupColor ?? "#FF4D4D";

  // Summary stats
  const maxWeight   = chartData.length ? Math.max(...chartData.map(d => d.maxWeight)) : 0;
  const firstWeight = chartData.length ? chartData[0].maxWeight : 0;
  const lastWeight  = chartData.length ? chartData[chartData.length - 1].maxWeight : 0;
  const improvement = firstWeight > 0 ? (((lastWeight - firstWeight) / firstWeight) * 100).toFixed(1) : null;

  const handleSelect = useCallback((e) => setSelectedExId(e.target.value), []);

  // ── Empty state — no logs at all ──
  if (loggedExercises.length === 0) {
    return (
      <div style={{
        background: "#0F1117", border: "1px solid #1E2130", borderRadius: "16px",
        padding: "36px 20px", textAlign: "center", marginBottom: "24px",
      }}>
        <div style={{ fontSize: "38px", marginBottom: "10px" }}>📉</div>
        <div style={{ fontSize: "15px", fontWeight: "700", color: "#555" }}>No progress data yet</div>
        <div style={{ fontSize: "12px", color: "#333", marginTop: "6px", lineHeight: 1.6 }}>
          Log weights on any exercise to see your<br/>strength progress visualised here.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#0F1117", border: "1px solid #1E2130", borderRadius: "16px",
      padding: "20px", marginBottom: "24px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={sectionTitle}>PROGRESS GRAPH</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#F0F0F0" }}>
            {selectedEx ? selectedEx.name : "—"}
          </div>
          {selectedEx && (
            <div style={{ fontSize: "11px", color: selectedEx.groupColor, marginTop: "3px" }}>
              {selectedEx.groupIcon} {selectedEx.groupLabel}
            </div>
          )}
        </div>

        {/* Exercise selector */}
        <div style={{ minWidth: "140px" }}>
          <select
            value={validSelectedId}
            onChange={handleSelect}
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
            {/* Group by muscle */}
            {Object.entries(muscleGroups).map(([gKey, group]) => {
              const groupExercises = loggedExercises.filter(e =>
                group.exercises.some(ge => ge.id === e.id)
              );
              if (groupExercises.length === 0) return null;
              return (
                <optgroup key={gKey} label={`${group.icon} ${group.label}`}>
                  {groupExercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>

      {/* Stats row */}
      {chartData.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
          {[
            { label: "Personal Best", value: `${maxWeight} kg`, color: "#FFD700" },
            { label: "Sessions", value: chartData.length, color: lineColor },
            {
              label: "Progress",
              value: improvement !== null
                ? `${improvement > 0 ? "+" : ""}${improvement}%`
                : "—",
              color: improvement > 0 ? "#2ECC71" : improvement < 0 ? "#FF4D4D" : "#666",
            },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "#080A0F", borderRadius: "10px", padding: "10px",
              border: "1px solid #1E2130", textAlign: "center",
            }}>
              <div style={{ fontSize: "17px", fontWeight: "900", color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "10px", color: "#444", marginTop: "2px", letterSpacing: "0.5px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart — or no-data message for selected exercise */}
      {chartData.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "28px 10px",
          border: "1px dashed #1E2130", borderRadius: "12px", color: "#333",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "6px" }}>🏋️</div>
          <div style={{ fontSize: "13px", color: "#444" }}>No weight data for this exercise yet.</div>
          <div style={{ fontSize: "12px", color: "#2A2D3A", marginTop: "4px" }}>Log a session to see your curve.</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={chartData} margin={{ top: 18, right: 12, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id={`grad_${validSelectedId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.18}/>
                <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1A1D26"
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tick={{ fill: "#444", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
              tickLine={false}
              axisLine={{ stroke: "#1E2130" }}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{ fill: "#444", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}kg`}
              domain={["auto", "auto"]}
              width={44}
            />

            <Tooltip
              content={<CustomTooltip color={lineColor}/>}
              cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.4 }}
            />

            {/* Personal-best reference line */}
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
                fontFamily: "'DM Sans', sans-serif",
              }}
            />

            <Line
              type="monotone"
              dataKey="maxWeight"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={<CustomDot color={lineColor} data={chartData}/>}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: lineColor }}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {chartData.length > 0 && (
        <div style={{ fontSize: "10px", color: "#2A2D3A", textAlign: "center", marginTop: "10px", letterSpacing: "0.5px" }}>
          Showing max weight per session · Dots mark each workout
        </div>
      )}
    </div>
  );
};

// ─── WEIGHT MODAL ─────────────────────────────────────────────────────────────
function WeightModal({ exercise, onClose, onSave, existing }) {
  const [entries, setEntries] = useState(existing?.length ? existing : [{ set: 1, weight: "", reps: "" }]);
  const addSet    = () => setEntries(p => [...p, { set: p.length + 1, weight: "", reps: "" }]);
  const removeSet = (i) => setEntries(p => p.filter((_, idx) => idx !== i).map((e, idx) => ({ ...e, set: idx + 1 })));
  const update    = (i, field, val) => setEntries(p => { const u = [...p]; u[i] = { ...u[i], [field]: val }; return u; });

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#0F1117",border:"1px solid #2A2D3A",borderRadius:"18px",padding:"26px",width:"100%",maxWidth:"400px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
          <div><div style={iLabel}>LOG WEIGHTS</div><div style={{ fontSize:"18px",fontWeight:"700",color:"#F0F0F0" }}>{exercise.name}</div></div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#555",fontSize:"22px",cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"32px 1fr 1fr 24px",gap:"8px",marginBottom:"8px" }}>
          {["#","KG","REPS",""].map(h => <div key={h} style={iLabel}>{h}</div>)}
        </div>
        {entries.map((e, i) => (
          <div key={i} style={{ display:"grid",gridTemplateColumns:"32px 1fr 1fr 24px",gap:"8px",marginBottom:"8px",alignItems:"center" }}>
            <div style={{ fontSize:"13px",color:"#666",fontWeight:"700",textAlign:"center" }}>{i+1}</div>
            <input type="number" placeholder="0" value={e.weight} onChange={v => update(i,"weight",v.target.value)} style={iInput}/>
            <input type="number" placeholder="0" value={e.reps}   onChange={v => update(i,"reps",  v.target.value)} style={iInput}/>
            <button onClick={() => removeSet(i)} style={{ background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:"18px",padding:"0",lineHeight:1 }}>×</button>
          </div>
        ))}
        <button onClick={addSet} style={{ width:"100%",background:"#1A1D26",border:"1px dashed #3A3D4A",borderRadius:"8px",color:"#888",padding:"9px",cursor:"pointer",fontSize:"12px",marginTop:"4px",fontFamily:"'DM Sans',sans-serif" }}>+ Add Set</button>
        <button onClick={() => { onSave(entries); onClose(); }} style={{ width:"100%",background:"linear-gradient(135deg,#FF4D4D,#FF8C42)",border:"none",borderRadius:"10px",color:"#fff",padding:"13px",cursor:"pointer",fontSize:"15px",fontWeight:"700",marginTop:"14px",fontFamily:"'DM Sans',sans-serif" }}>Save Session</button>
      </div>
    </div>
  );
}

// ─── CUSTOM EXERCISE MODAL ────────────────────────────────────────────────────
function CustomExerciseModal({ muscleGroups, defaultMuscle, onClose, onSave }) {
  const [name, setName]               = useState("");
  const [sets, setSets]               = useState("3x10-12");
  const [tip, setTip]                 = useState("");
  const [targetMuscle, setTargetMuscle] = useState(defaultMuscle || Object.keys(muscleGroups)[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id:"custom_"+Date.now(), name:name.trim(), sets:sets||"3x10", tip, instructor:"Custom", isCustom:true }, targetMuscle);
    onClose();
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#0F1117",border:"1px solid #2A2D3A",borderRadius:"18px",padding:"26px",width:"100%",maxWidth:"420px",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"22px" }}>
          <div><div style={iLabel}>NEW EXERCISE</div><div style={{ fontSize:"20px",fontWeight:"700",color:"#F0F0F0" }}>Custom Exercise</div></div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#555",fontSize:"22px",cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ marginBottom:"14px" }}>
          <label style={iLabel}>Exercise Name *</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Machine Chest Fly" style={iInput}/>
        </div>
        <div style={{ marginBottom:"14px" }}>
          <label style={iLabel}>Sets × Reps</label>
          <input value={sets} onChange={e=>setSets(e.target.value)} placeholder="e.g. 3x10-12" style={iInput}/>
        </div>
        <div style={{ marginBottom:"14px" }}>
          <label style={iLabel}>Target Muscle Group</label>
          <select value={targetMuscle} onChange={e=>setTargetMuscle(e.target.value)} style={{ ...iInput,appearance:"none",cursor:"pointer" }}>
            {Object.entries(muscleGroups).map(([k,g]) => <option key={k} value={k}>{g.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:"22px" }}>
          <label style={iLabel}>Notes / Tips (optional)</label>
          <textarea value={tip} onChange={e=>setTip(e.target.value)} placeholder="Your form cues or technique notes..." rows={3} style={{ ...iInput,resize:"none",lineHeight:"1.6" }}/>
        </div>
        <button onClick={handleSave} disabled={!name.trim()} style={{
          width:"100%",background:name.trim()?"linear-gradient(135deg,#FF4D4D,#FF8C42)":"#1A1D26",
          border:"none",borderRadius:"10px",color:name.trim()?"#fff":"#444",
          padding:"14px",cursor:name.trim()?"pointer":"not-allowed",fontSize:"15px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif"
        }}>Add Exercise</button>
      </div>
    </div>
  );
}

// ─── DAY SPLIT EDITOR ─────────────────────────────────────────────────────────
function SplitEditorModal({ day, currentMuscles, muscleGroups, onClose, onSave }) {
  const [selected, setSelected] = useState([...currentMuscles]);
  const toggle = (k) => setSelected(p => p.includes(k) ? p.filter(x=>x!==k) : [...p,k]);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#0F1117",border:"1px solid #2A2D3A",borderRadius:"18px",padding:"26px",width:"100%",maxWidth:"420px",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
          <div><div style={iLabel}>EDIT WORKOUT SPLIT</div><div style={{ fontSize:"22px",fontWeight:"700",color:"#F0F0F0" }}>{day}</div></div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#555",fontSize:"22px",cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ fontSize:"12px",color:"#444",marginBottom:"20px" }}>Select muscle groups for {day}</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"22px" }}>
          {Object.entries(muscleGroups).map(([key, group]) => {
            const active = selected.includes(key);
            return (
              <button key={key} onClick={() => toggle(key)} style={{
                background:active?group.color+"20":"#0D0F17",
                border:`2px solid ${active?group.color:"#1E2130"}`,
                borderRadius:"13px",padding:"16px 10px",cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:"5px",
                transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"
              }}>
                <span style={{ fontSize:"22px",color:active?group.color:"#333" }}>{group.icon}</span>
                <span style={{ fontSize:"12px",fontWeight:"700",color:active?group.color:"#444" }}>{group.label}</span>
                {active && <span style={{ fontSize:"9px",color:group.color,background:group.color+"15",borderRadius:"4px",padding:"1px 6px",letterSpacing:"1px" }}>✓ ON</span>}
              </button>
            );
          })}
        </div>
        {selected.length === 0 && (
          <div style={{ background:"#1A1400",border:"1px solid #FFD70030",borderRadius:"10px",padding:"10px 14px",fontSize:"12px",color:"#FFD700",marginBottom:"16px" }}>
            ⚠ No muscles selected — this day will be a Rest Day
          </div>
        )}
        <div style={{ display:"flex",gap:"10px" }}>
          <button onClick={onClose} style={{ flex:1,background:"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"10px",color:"#888",padding:"13px",cursor:"pointer",fontSize:"13px",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
          <button onClick={() => { onSave(selected); onClose(); }} style={{ flex:2,background:"linear-gradient(135deg,#FF4D4D,#FF8C42)",border:"none",borderRadius:"10px",color:"#fff",padding:"13px",cursor:"pointer",fontSize:"15px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>Save Split</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function GymTracker() {

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const today      = weekdays[todayIndex];

  const [activeTab,             setActiveTab]             = useState("today");
  const [selectedDay,           setSelectedDay]           = useState(today);
  const [completedExercises,    setCompletedExercises]    = useState({});
  const [weightLogs,            setWeightLogs]            = useState({});
  const [customExercises,       setCustomExercises]       = useState({});
  const [weeklySplit,           setWeeklySplit]           = useState(DEFAULT_SPLIT);
  const [modalExercise,         setModalExercise]         = useState(null);
  const [showCustomModal,       setShowCustomModal]       = useState(false);
  const [customModalDefaultMuscle, setCustomModalDefaultMuscle] = useState(null);
  const [splitEditorDay,        setSplitEditorDay]        = useState(null);
  const [expandedGroup,         setExpandedGroup]         = useState(null);
  const [backupMsg,             setBackupMsg]             = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prevUser, setPrevUser] = useState(null); // Track previous user for logout detection
  const [hasLoadedData, setHasLoadedData] = useState(false); // Track if data was successfully loaded from Firebase
  const [selectedDate,          setSelectedDate]          = useState(null); // For calendar date selection in exercise history
  const fileInputRef = useRef();

  // Helper to check if data is empty (for preventing save of empty state on new users)
  const isDataEmpty = useCallback(() => {
    return Object.keys(weightLogs).length === 0 &&
           Object.keys(customExercises).length === 0 &&
           Object.keys(completedExercises).length === 0 &&
           JSON.stringify(weeklySplit) === JSON.stringify(DEFAULT_SPLIT);
  }, [weightLogs, customExercises, completedExercises, weeklySplit]);

// 🔥 AUTHENTICATE & LOAD FROM FIREBASE
useEffect(() => {
  // Setup auth listener
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    setHasLoadedData(false); // Reset load flag on user change
    
    // Load data when user is authenticated
    if (currentUser) {
      try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.weightLogs) setWeightLogs(data.weightLogs);
          if (data.customExercises) setCustomExercises(data.customExercises);
          if (data.completedExercises) setCompletedExercises(data.completedExercises);
          if (data.weeklySplit) setWeeklySplit(data.weeklySplit);

          setHasLoadedData(true); // Mark that data was loaded
          console.log("✅ Data loaded from Firebase!");
        } else {
          console.log("📝 No data found - creating new user profile");
        }
      } catch (error) {
        console.error("❌ Error loading data:", error);
      }
    }
    
    setLoading(false); // Stop loading after auth check (regardless of data)
  });

  return () => unsubscribe();
}, []);

// 🔥 CLEAR DATA ONLY ON EXPLICIT LOGOUT
useEffect(() => {
  // Only clear if user WAS logged in and NOW is null (explicit logout)
  // Don't clear on initial load when prevUser and user are both null
  if (prevUser !== null && user === null) {
    // User explicitly logged out
    setCompletedExercises({});
    setWeightLogs({});
    setCustomExercises({});
    setWeeklySplit(DEFAULT_SPLIT);
  }
  
  // Update previous user for next comparison
  setPrevUser(user);
}, [user, prevUser]);

  // Merge base + custom exercises
  const muscleGroups = useMemo(() => Object.fromEntries(
    Object.entries(BASE_MUSCLE_GROUPS).map(([key, group]) => [
      key,
      { ...group, exercises: [...group.exercises, ...(customExercises[key] || [])] },
    ])
  ), [customExercises]);

  const todayMuscles    = weeklySplit[selectedDay] || [];
  const todayExercises  = todayMuscles.flatMap(mg =>
    (muscleGroups[mg]?.exercises || []).map(ex => ({ ...ex, muscleGroup: mg }))
  );
  const completedCount  = todayExercises.filter(e => completedExercises[e.id]).length;
  const progress        = todayExercises.length > 0 ? (completedCount / todayExercises.length) * 100 : 0;
  const totalCustom     = Object.values(customExercises).flat().length;
  const allExerciseCount = Object.values(muscleGroups).reduce((s, g) => s + g.exercises.length, 0);
  const totalLogged     = Object.keys(weightLogs).length;

  const saveWeights = useCallback((exId, entries) => {
    // Calculate the actual date for the selected day of the week
    const today = new Date();
    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert Sunday=0 to 6, Mon=1 to 0, etc.
    const selectedIndex = weekdays.indexOf(selectedDay);
    const dayDiff = selectedIndex - todayIndex;
    const logDate = new Date(today);
    logDate.setDate(today.getDate() + dayDiff);
    
    // Prevent logging for future dates
    if (logDate > today) {
      alert("Cannot log exercises for future dates.");
      return;
    }
    
    const dateKey = `${selectedDay} · ${logDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`;
    setWeightLogs(p => ({ ...p, [exId]: { ...(p[exId] || {}), [dateKey]: entries } }));
  }, [selectedDay]);

  const toggleExercise = useCallback((id) => {
    const isCompleting = !completedExercises[id];
    setCompletedExercises(p => ({ ...p, [id]: !p[id] }));
    if (isCompleting) {
      // When marking as completed, log a completion entry
      const completionEntry = [{ set: 'completed', weight: '', reps: '' }];
      saveWeights(id, completionEntry);
    } else {
      // When unmarking, remove the completion entry if it exists
      // This is complex, perhaps just leave it
    }
  }, [completedExercises, saveWeights]);
  const handleLogin = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login error:", error);
  }
};

const handleLogout = async () => {
  // Save data before logging out
  if (user) {
    try {
      await setDoc(doc(db, "users", user.uid), {
        weightLogs,
        customExercises,
        completedExercises,
        weeklySplit
      }, { merge: true });
      console.log("✅ Data saved before logout");
    } catch (error) {
      console.error("❌ Error saving before logout:", error);
    }
  }
  await signOut(auth);
};

  const getLastLog = useCallback((exId) => {
    const logs = weightLogs[exId];
    if (!logs) return null;
    const keys = Object.keys(logs);
    return keys.length ? logs[keys[keys.length - 1]] : null;
  }, [weightLogs]);

  const addCustomExercise    = useCallback((exercise, muscleKey) =>
    setCustomExercises(p => ({ ...p, [muscleKey]: [...(p[muscleKey]||[]), exercise] })), []);

  const deleteCustomExercise = useCallback((muscleKey, exId) =>
    setCustomExercises(p => ({ ...p, [muscleKey]: (p[muscleKey]||[]).filter(e => e.id !== exId) })), []);

  // ── Backup & Restore ──
  const handleBackup = () => {
    const data = { completedExercises, weightLogs, customExercises, weeklySplit, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `ironlog-backup-${new Date().toLocaleDateString().replace(/\//g,"-")}.json`;
    a.click(); URL.revokeObjectURL(url);
    setBackupMsg("✓ Backup downloaded successfully!");
    setTimeout(() => setBackupMsg(""), 3500);
  };
  

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.weightLogs)           setWeightLogs(data.weightLogs);
        if (data.completedExercises)   setCompletedExercises(data.completedExercises);
        if (data.customExercises)      setCustomExercises(data.customExercises);
        if (data.weeklySplit)          setWeeklySplit(data.weeklySplit);
        setBackupMsg("✓ Data restored! Welcome back.");
      } catch {
        setBackupMsg("✗ Invalid backup file. Please try again.");
      }
      setTimeout(() => setBackupMsg(""), 3500);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Exercise Card ──
  const ExerciseCard = useCallback(({ ex, group, showDelete }) => {
    const done     = completedExercises[ex.id];
    const lastLog  = getLastLog(ex.id);
    const muscleKey = ex.muscleGroup ||
      Object.keys(muscleGroups).find(k => muscleGroups[k].exercises.some(e => e.id === ex.id));

    return (
      <div style={{
        background: done ? `${group.color}12` : "#0F1117",
        border: `1px solid ${done ? group.color+"50" : "#1E2130"}`,
        borderRadius:"14px", padding:"15px", marginBottom:"10px", transition:"all 0.25s",
      }}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:"11px" }}>
          <button onClick={() => toggleExercise(ex.id)} style={{
            width:"26px",height:"26px",borderRadius:"8px",border:`2px solid ${done?group.color:"#2A2D3A"}`,
            background:done?group.color:"transparent",cursor:"pointer",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"13px",marginTop:"1px",transition:"all 0.2s",
          }}>{done?"✓":""}</button>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px",flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap" }}>
                <span style={{ fontSize:"15px",fontWeight:"700",textDecoration:done?"line-through":"none",color:done?"#555":"#F0F0F0" }}>{ex.name}</span>
                {ex.isCustom && <span style={{ fontSize:"9px",background:"#FF8C4230",color:"#FF8C42",borderRadius:"4px",padding:"1px 6px",fontWeight:"700",letterSpacing:"1px",flexShrink:0 }}>CUSTOM</span>}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:"6px",flexShrink:0 }}>
                <span style={{ background:group.color+"20",color:group.color,borderRadius:"7px",padding:"2px 9px",fontSize:"11px",fontWeight:"700" }}>{ex.sets}</span>
                {showDelete && ex.isCustom && (
                  <button onClick={() => deleteCustomExercise(muscleKey, ex.id)} style={{ background:"#2A0A0A",border:"1px solid #441010",borderRadius:"6px",color:"#FF4D4D",cursor:"pointer",fontSize:"11px",padding:"2px 7px",fontFamily:"'DM Sans',sans-serif",fontWeight:"700" }}>del</button>
                )}
              </div>
            </div>
            {ex.tip && <div style={{ fontSize:"12px",color:"#555",marginTop:"5px",fontStyle:"italic",lineHeight:1.5 }}>"{ex.tip}"</div>}
            {ex.instructor && ex.instructor!=="Custom" && <div style={{ fontSize:"11px",color:"#333",marginTop:"2px" }}>— {ex.instructor}</div>}
            {lastLog && (
              <div style={{ fontSize:"11px",color:group.color,marginTop:"7px",fontWeight:"600" }}>
                Last: {lastLog.filter(s=>s.weight||s.reps).map(s=>`${s.weight||"–"}kg×${s.reps||"–"}`).join(" · ")}
              </div>
            )}
            <button onClick={() => setModalExercise(ex)} style={{
              marginTop:"10px",background:group.color+"18",border:`1px solid ${group.color}35`,
              borderRadius:"8px",color:group.color,padding:"6px 14px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif",
            }}>⚖ Log Weights</button>
          </div>
        </div>
      </div>
    );
  }, [completedExercises, getLastLog, muscleGroups, toggleExercise, deleteCustomExercise]);
  // 🔥 AUTO SAVE TO FIREBASE
useEffect(() => {
  if (!user || loading || (!hasLoadedData && isDataEmpty())) return;

  const saveData = async () => {
    try {
      await setDoc(doc(db, "users", user.uid), {
        weightLogs,
        customExercises,
        completedExercises,
        weeklySplit
      }, { merge: true });
      console.log("✅ Data saved to Firebase");
    } catch (error) {
      console.error("❌ Error saving to Firebase:", error);
    }
  };

  const timer = setTimeout(saveData, 500); // debounce saves
  return () => clearTimeout(timer);
}, [weightLogs, customExercises, completedExercises, weeklySplit, user, loading, hasLoadedData, isDataEmpty]);

// 🔥 SAVE DATA BEFORE BROWSER CLOSES
useEffect(() => {
  if (!user || loading || (!hasLoadedData && isDataEmpty())) return;

  const handleBeforeUnload = async (e) => {
    try {
      // Send a synchronous request to save data on close
      const saveData = async () => {
        await setDoc(doc(db, "users", user.uid), {
          weightLogs,
          customExercises,
          completedExercises,
          weeklySplit
        }, { merge: true });
      };
      
      // Important: In beforeunload, we can't truly wait for async
      // But we can trigger the save and hope it completes
      saveData();
    } catch (error) {
      console.error("Error saving before close:", error);
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [user, weightLogs, customExercises, completedExercises, weeklySplit, loading, hasLoadedData, isDataEmpty]);
if (loading) {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#080A0F",
      color: "#FF4D4D",
      fontSize: "20px",
      fontWeight: "700"
    }}>
      Loading IronLog...
    </div>
  );
}
  return (
    <div style={{ minHeight:"100vh",background:"#080A0F",color:"#F0F0F0",fontFamily:"'DM Sans',sans-serif",maxWidth:"480px",margin:"0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,900&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0F1117}::-webkit-scrollbar-thumb{background:#2A2D3A;border-radius:2px}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
        select option,select optgroup{background:#1A1D26;color:#F0F0F0}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(255,77,77,0.3)}50%{box-shadow:0 0 40px rgba(255,77,77,0.65)}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding:"20px 20px 0",position:"sticky",top:0,zIndex:100,background:"#080A0F" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px" }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue'",fontSize:"30px",letterSpacing:"3px",lineHeight:1,color:"#FF4D4D" }}>IRON LOG</div>
            <div style={{ fontSize:"10px",color:"#444",letterSpacing:"2.5px",textTransform:"uppercase",marginTop:"2px" }}>Bodybuilding Tracker</div>
          </div>
          <div style={{ textAlign: "right" }}>
  {!user ? (
    <button onClick={handleLogin} style={{
      padding: "6px 10px",
      borderRadius: "6px",
      border: "none",
      background: "#FF4D4D",
      color: "#fff",
      cursor: "pointer",
      fontSize: "12px"
    }}>
      Login
    </button>
  ) : (
    <div>
      <div style={{ fontSize: "10px" }}>
        {user.displayName}
      </div>
      <button onClick={handleLogout} style={{
        padding: "4px 8px",
        borderRadius: "6px",
        border: "none",
        background: "#555",
        color: "#fff",
        cursor: "pointer",
        fontSize: "10px"
      }}>
        Logout
      </button>
    </div>
  )}
</div>
        </div>
        <div style={{ display:"flex",gap:"4px",background:"#0D0F17",borderRadius:"12px",padding:"4px" }}>
          {[["today","Today"],["library","Library"],["progress","Progress"]].map(([key,label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex:1,padding:"10px 4px",borderRadius:"9px",border:"none",cursor:"pointer",
              background:activeTab===key?"linear-gradient(135deg,#FF4D4D,#FF6B35)":"transparent",
              color:activeTab===key?"#fff":"#555",fontSize:"12px",fontWeight:"700",
              letterSpacing:"0.5px",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif",
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"18px 20px 100px",animation:"fadeSlide 0.3s ease" }}>

        {/* ══════════════════════════ TODAY TAB ══════════════════════════ */}
        {activeTab === "today" && (
          <div>
            <div style={{ display:"flex",gap:"5px",marginBottom:"16px",overflowX:"auto",paddingBottom:"2px" }}>
              {weekdays.map(day => {
                // Calculate if this day is in the future
                const today = new Date();
                const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
                const dayIndex = weekdays.indexOf(day);
                const dayDiff = dayIndex - todayIndex;
                const dayDate = new Date(today);
                dayDate.setDate(today.getDate() + dayDiff);
                const isFuture = dayDate > today && dayDate.toDateString() !== today.toDateString();
                return (
                  <button key={day} onClick={() => !isFuture && setSelectedDay(day)} style={{
                    minWidth:"48px",padding:"9px 4px",borderRadius:"10px",border:"none",cursor:isFuture?"not-allowed":"pointer",
                    background:selectedDay===day?"linear-gradient(135deg,#FF4D4D,#FF6B35)":isFuture?"#1A1D26":"#0F1117",
                    color:selectedDay===day?"#fff":day===today?"#FF8C42":isFuture?"#333":"#555",
                    fontSize:"11px",fontWeight:"700",letterSpacing:"0.5px",flexShrink:0,
                    outline:day===today&&selectedDay!==day?"1px solid #FF8C4240":"none",
                    fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",
                    opacity:isFuture?0.5:1,
                  }}>{day}</button>
                );
              })}
            </div>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
              <div style={{ fontSize:"12px",color:"#444" }}>
                {todayMuscles.length>0 ? todayMuscles.map(mg=>muscleGroups[mg]?.label).join(" + ") : "Rest Day"}
              </div>
              <button onClick={() => setSplitEditorDay(selectedDay)} style={{ background:"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"8px",color:"#FF8C42",padding:"6px 13px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>✏ Edit Split</button>
            </div>

            {todayExercises.length > 0 && (
              <div style={{ background:"linear-gradient(135deg,#0F1117,#141720)",borderRadius:"18px",padding:"20px",marginBottom:"20px",border:"1px solid #1E2130",animation:progress===100?"glow 2s infinite":"none" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"18px" }}>
                  <div style={{ position:"relative",width:"76px",height:"76px",flexShrink:0 }}>
                    <svg width="76" height="76" viewBox="0 0 76 76">
                      <circle cx="38" cy="38" r="32" fill="none" stroke="#1E2130" strokeWidth="6"/>
                      <circle cx="38" cy="38" r="32" fill="none" stroke={progress===100?"#2ECC71":"#FF4D4D"} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${2*Math.PI*32}`} strokeDashoffset={`${2*Math.PI*32*(1-progress/100)}`}
                        transform="rotate(-90 38 38)" style={{ transition:"stroke-dashoffset 0.5s ease" }}/>
                    </svg>
                    <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",fontWeight:"900",color:progress===100?"#2ECC71":"#FF4D4D" }}>{Math.round(progress)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize:"20px",fontWeight:"900",lineHeight:1.2 }}>{progress===100?"🔥 Crushed It!":`${completedCount} / ${todayExercises.length} done`}</div>
                    <div style={{ fontSize:"12px",color:"#555",marginTop:"2px" }}>exercises completed</div>
                    <div style={{ display:"flex",gap:"5px",marginTop:"8px",flexWrap:"wrap" }}>
                      {todayMuscles.map(mg=>(
                        <span key={mg} style={{ background:muscleGroups[mg]?.color+"20",color:muscleGroups[mg]?.color,fontSize:"10px",fontWeight:"700",padding:"2px 7px",borderRadius:"5px",letterSpacing:"1px",textTransform:"uppercase",border:`1px solid ${muscleGroups[mg]?.color}40` }}>{muscleGroups[mg]?.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {todayExercises.length === 0 ? (
              <div style={{ textAlign:"center",padding:"52px 20px",color:"#333" }}>
                <div style={{ fontSize:"44px",marginBottom:"10px" }}>😴</div>
                <div style={{ fontSize:"20px",fontWeight:"700",color:"#555" }}>Rest Day</div>
                <div style={{ fontSize:"13px",marginTop:"6px" }}>Recovery is where gains are made.</div>
                <button onClick={() => setSplitEditorDay(selectedDay)} style={{ marginTop:"20px",background:"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"10px",color:"#FF8C42",padding:"12px 24px",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>+ Add Muscles for {selectedDay}</button>
              </div>
            ) : (
              <>
                {todayMuscles.map(mg => {
                  const group = muscleGroups[mg];
                  if (!group) return null;
                  return (
                    <div key={mg} style={{ marginBottom:"22px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px" }}>
                        <span style={{ fontSize:"16px",color:group.color }}>{group.icon}</span>
                        <span style={{ fontSize:"12px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:group.color }}>{group.label}</span>
                        <div style={{ flex:1,height:"1px",background:`linear-gradient(90deg,${group.color}40,transparent)` }}/>
                      </div>
                      {group.exercises.map(ex => (
                        <ExerciseCard key={ex.id} ex={{ ...ex, muscleGroup:mg }} group={group} showDelete={true}/>
                      ))}
                    </div>
                  );
                })}
                <button onClick={() => { setCustomModalDefaultMuscle(todayMuscles[0]||null); setShowCustomModal(true); }} style={{ width:"100%",background:"#0D0F17",border:"1px dashed #2A2D3A",borderRadius:"13px",color:"#FF8C42",padding:"15px",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif",marginTop:"4px" }}>+ Add Custom Exercise</button>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════ LIBRARY TAB ══════════════════════════ */}
        {activeTab === "library" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
              <div style={{ fontSize:"11px",color:"#444",letterSpacing:"1.5px" }}>
                {allExerciseCount} TOTAL · {totalCustom>0?`${totalCustom} CUSTOM`:"NO CUSTOM YET"}
              </div>
              <button onClick={() => { setCustomModalDefaultMuscle(null); setShowCustomModal(true); }} style={{ background:"linear-gradient(135deg,#FF4D4D,#FF8C42)",border:"none",borderRadius:"9px",color:"#fff",padding:"8px 16px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>+ Custom</button>
            </div>
            {Object.entries(muscleGroups).map(([key, group]) => (
              <div key={key} style={{ marginBottom:"10px" }}>
                <button onClick={() => setExpandedGroup(expandedGroup===key?null:key)} style={{ width:"100%",background:expandedGroup===key?`${group.color}15`:"#0F1117",border:`1px solid ${expandedGroup===key?group.color+"50":"#1E2130"}`,borderRadius:"13px",padding:"14px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:"#F0F0F0",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"11px" }}>
                    <span style={{ fontSize:"20px",color:group.color }}>{group.icon}</span>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:"15px",fontWeight:"700" }}>{group.label}</div>
                      <div style={{ fontSize:"11px",color:"#444" }}>{group.exercises.length} exercises{(customExercises[key]||[]).length>0?` · ${(customExercises[key]||[]).length} custom`:""}</div>
                    </div>
                  </div>
                  <span style={{ color:group.color,fontSize:"18px",transition:"transform 0.2s",transform:expandedGroup===key?"rotate(90deg)":"none" }}>›</span>
                </button>
                {expandedGroup === key && (
                  <div style={{ marginTop:"8px",animation:"fadeSlide 0.2s ease" }}>
                    {group.exercises.map(ex => (
                      <div key={ex.id} style={{ background:"#0A0C12",border:"1px solid #1E2130",borderRadius:"12px",padding:"14px 15px",marginBottom:"8px",borderLeft:`3px solid ${group.color}` }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:"6px",flex:1,flexWrap:"wrap" }}>
                            <span style={{ fontSize:"14px",fontWeight:"700" }}>{ex.name}</span>
                            {ex.isCustom && <span style={{ fontSize:"9px",background:"#FF8C4230",color:"#FF8C42",borderRadius:"4px",padding:"1px 5px",fontWeight:"700",letterSpacing:"1px" }}>CUSTOM</span>}
                          </div>
                          <div style={{ display:"flex",gap:"7px",flexShrink:0,alignItems:"center" }}>
                            <span style={{ background:group.color+"20",color:group.color,borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontWeight:"700" }}>{ex.sets}</span>
                            {ex.isCustom && <button onClick={() => deleteCustomExercise(key,ex.id)} style={{ background:"#2A0A0A",border:"1px solid #441010",borderRadius:"6px",color:"#FF4D4D",cursor:"pointer",fontSize:"11px",padding:"2px 7px",fontFamily:"'DM Sans',sans-serif",fontWeight:"700" }}>del</button>}
                          </div>
                        </div>
                        {ex.tip && <div style={{ fontSize:"12px",color:"#555",marginTop:"6px",lineHeight:1.5 }}>💡 {ex.tip}</div>}
                        {ex.instructor && ex.instructor!=="Custom" && <div style={{ fontSize:"11px",color:"#333",marginTop:"3px" }}>Coach: {ex.instructor}</div>}
                      </div>
                    ))}
                    <button onClick={() => { setCustomModalDefaultMuscle(key); setShowCustomModal(true); }} style={{ width:"100%",background:"transparent",border:`1px dashed ${group.color}50`,borderRadius:"10px",color:group.color,padding:"11px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif",marginTop:"4px" }}>+ Add custom to {group.label}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════ PROGRESS TAB ══════════════════════════ */}
        {activeTab === "progress" && (
          <div>
            {/* Stats grid */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"22px" }}>
              {[
                { label:"Exercises Logged", value:totalLogged,      icon:"📊", color:"#FF4D4D" },
                { label:"Completed Today",  value:completedCount,   icon:"✅", color:"#2ECC71" },
                { label:"Total Exercises",  value:allExerciseCount, icon:"💪", color:"#4D9FFF" },
                { label:"Custom Exercises", value:totalCustom,      icon:"✨", color:"#FFD700" },
              ].map(s => (
                <div key={s.label} style={{ background:"#0F1117",border:"1px solid #1E2130",borderRadius:"15px",padding:"16px",borderTop:`3px solid ${s.color}` }}>
                  <div style={{ fontSize:"26px",marginBottom:"3px" }}>{s.icon}</div>
                  <div style={{ fontSize:"26px",fontWeight:"900",color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:"11px",color:"#444",letterSpacing:"0.5px",marginTop:"2px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── PROGRESS GRAPH ── */}
            <ProgressGraph weightLogs={weightLogs} muscleGroups={muscleGroups}/>

            {/* ── Backup & Restore ── */}
            <div style={{ background:"#0F1117",border:"1px solid #1E2130",borderRadius:"16px",padding:"20px",marginBottom:"24px" }}>
              <div style={sectionTitle}>BACKUP & RESTORE</div>
              {backupMsg && (
                <div style={{
                  background:backupMsg.startsWith("✓")?"#0D2A1A":"#2A0D0D",
                  border:`1px solid ${backupMsg.startsWith("✓")?"#2ECC7150":"#FF4D4D50"}`,
                  borderRadius:"10px",padding:"10px 14px",fontSize:"13px",fontWeight:"600",
                  color:backupMsg.startsWith("✓")?"#2ECC71":"#FF6B6B",marginBottom:"14px",
                }}>{backupMsg}</div>
              )}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px" }}>
                <button onClick={handleBackup} style={{ background:"#0D1F14",border:"1px solid #2ECC7130",borderRadius:"13px",color:"#2ECC71",padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px" }}>
                  <span style={{ fontSize:"26px" }}>💾</span>
                  <span style={{ fontSize:"13px",fontWeight:"700" }}>Backup Data</span>
                  <span style={{ fontSize:"10px",color:"#2ECC7170",fontWeight:"400" }}>Export as JSON</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{ background:"#0D141F",border:"1px solid #4D9FFF30",borderRadius:"13px",color:"#4D9FFF",padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px" }}>
                  <span style={{ fontSize:"26px" }}>📂</span>
                  <span style={{ fontSize:"13px",fontWeight:"700" }}>Restore Data</span>
                  <span style={{ fontSize:"10px",color:"#4D9FFF70",fontWeight:"400" }}>Import JSON file</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display:"none" }} onChange={handleRestore}/>
              <div style={{ fontSize:"11px",color:"#2A2D3A",lineHeight:1.6 }}>
                Backup includes: weight logs, custom exercises, weekly split, and completion history.
              </div>
            </div>

            {/* ── Exercise History log ── */}
            <div style={sectionTitle}>EXERCISE HISTORY</div>
            {Object.keys(weightLogs).length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  tileContent={({ date, view }) => {
                    // Highlight dates that have logs
                    if (view === 'month') {
                      const dateStr = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                      let hasWeightLogs = false;
                      let hasCompletionLogs = false;
                      Object.values(weightLogs).forEach(sessions => {
                        Object.keys(sessions).forEach(dateKey => {
                          const datePart = dateKey.includes(" · ") ? dateKey.split(" · ")[1] : dateKey;
                          if (datePart === dateStr) {
                            sessions[dateKey].forEach(entry => {
                              if (entry.set === 'completed') {
                                hasCompletionLogs = true;
                              } else if (entry.weight || entry.reps) {
                                hasWeightLogs = true;
                              }
                            });
                          }
                        });
                      });
                      if (hasWeightLogs) {
                        return <div style={{ fontSize: '8px', color: '#4D9FFF' }}>●</div>;
                      } else if (hasCompletionLogs) {
                        return <div style={{ fontSize: '6px', color: '#888' }}>NW</div>;
                      }
                      return null;
                    }
                  }}
                  style={{
                    background: "#0F1117",
                    border: "1px solid #1E2130",
                    borderRadius: "14px",
                    color: "#F0F0F0",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <style>
                  {`
                    .react-calendar {
                      background: #0F1117 !important;
                      border: 1px solid #1E2130 !important;
                      border-radius: 14px !important;
                      color: #F0F0F0 !important;
                      font-family: 'DM Sans', sans-serif !important;
                    }
                    .react-calendar__tile {
                      background: #0F1117 !important;
                      color: #F0F0F0 !important;
                    }
                    .react-calendar__tile:enabled:hover,
                    .react-calendar__tile:enabled:focus {
                      background: #1E2130 !important;
                    }
                    .react-calendar__tile--active {
                      background: #4D9FFF !important;
                      color: #fff !important;
                    }
                    .react-calendar__navigation button {
                      color: #F0F0F0 !important;
                    }
                    .react-calendar__navigation button:enabled:hover,
                    .react-calendar__navigation button:enabled:focus {
                      background: #1E2130 !important;
                    }
                    .react-calendar__month-view__weekdays__weekday {
                      color: #555 !important;
                    }
                  `}
                </style>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    style={{
                      marginTop: "10px",
                      background: "#4D9FFF",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Show All Dates
                  </button>
                )}
              </div>
            )}
            {Object.keys(weightLogs).length === 0 ? (
              <div style={{ textAlign:"center",padding:"36px 20px",color:"#2A2D3A",background:"#0F1117",borderRadius:"14px" }}>
                <div style={{ fontSize:"36px",marginBottom:"8px" }}>📈</div>
                <div style={{ fontSize:"15px",fontWeight:"700",color:"#444" }}>No logs yet</div>
                <div style={{ fontSize:"12px",marginTop:"5px",color:"#333" }}>Start logging exercises to track your progress over time.</div>
              </div>
            ) : (
              Object.entries(weightLogs).map(([exId, sessions]) => {
                const allEx     = Object.values(muscleGroups).flatMap(g => g.exercises);
                const ex        = allEx.find(e => e.id === exId);
                const groupEntry = Object.entries(muscleGroups).find(([,g]) => g.exercises.some(e => e.id === exId));
                if (!ex || !groupEntry) return null;
                const [, gVal] = groupEntry;

                // Filter sessions by selected date if one is selected
                const filteredSessions = selectedDate
                  ? Object.entries(sessions).filter(([dateKey]) => {
                      const datePart = dateKey.includes(" · ") ? dateKey.split(" · ")[1] : dateKey;
                      const sessionDate = new Date(datePart);
                      return sessionDate.toDateString() === selectedDate.toDateString();
                    })
                  : Object.entries(sessions);

                // Skip if no sessions match the filter
                if (filteredSessions.length === 0) return null;

                return (
                  <div key={exId} style={{ background:"#0F1117",border:`1px solid ${gVal.color}20`,borderRadius:"14px",padding:"16px",marginBottom:"10px",borderLeft:`3px solid ${gVal.color}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"7px",marginBottom:"12px" }}>
                      <span style={{ color:gVal.color,fontSize:"14px" }}>{gVal.icon}</span>
                      <span style={{ fontSize:"14px",fontWeight:"700" }}>{ex.name}</span>
                      {ex.isCustom && <span style={{ fontSize:"9px",background:"#FF8C4230",color:"#FF8C42",borderRadius:"4px",padding:"1px 5px",fontWeight:"700" }}>CUSTOM</span>}
                    </div>
                    {filteredSessions.map(([dateKey, entries]) => (
                      <div key={dateKey} style={{ marginBottom:"10px" }}>
                        <div style={{ fontSize:"11px",color:"#3A3D4A",marginBottom:"5px",letterSpacing:"1px" }}>{dateKey}</div>
                        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                          {(() => {
                            const hasCompleted = entries.some(e => e.set === 'completed');
                            const setEntries = entries.filter(e => e.set !== 'completed' && (e.weight || e.reps));
                            if (hasCompleted) {
                              const setText = setEntries.length > 0 
                                ? setEntries.map(e => `S${e.set}: ${e.weight||"–"}kg × ${e.reps||"–"}`).join(', ')
                                : 'no logged weights';
                              return (
                                <div style={{ background:gVal.color+"18",border:`1px solid ${gVal.color}30`,borderRadius:"7px",padding:"5px 10px",fontSize:"12px",color:gVal.color,fontWeight:"700" }}>
                                  Completed - {setText}
                                </div>
                              );
                            } else {
                              return entries.filter(e=>e.weight||e.reps).map((e,i)=>(
                                <div key={i} style={{ background:gVal.color+"18",border:`1px solid ${gVal.color}30`,borderRadius:"7px",padding:"5px 10px",fontSize:"12px",color:gVal.color,fontWeight:"700" }}>
                                  S{e.set}: {e.weight||"–"}kg × {e.reps||"–"}
                                </div>
                              ));
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }).filter(Boolean) // Remove null entries
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {modalExercise && (
        <WeightModal exercise={modalExercise} onClose={() => setModalExercise(null)}
          onSave={(entries) => saveWeights(modalExercise.id, entries)} existing={getLastLog(modalExercise.id)}/>
      )}
      {showCustomModal && (
        <CustomExerciseModal muscleGroups={muscleGroups} defaultMuscle={customModalDefaultMuscle}
          onClose={() => setShowCustomModal(false)} onSave={addCustomExercise}/>
      )}
      {splitEditorDay && (
        <SplitEditorModal day={splitEditorDay} currentMuscles={weeklySplit[splitEditorDay]||[]}
          muscleGroups={muscleGroups} onClose={() => setSplitEditorDay(null)}
          onSave={(muscles) => setWeeklySplit(p => ({ ...p, [splitEditorDay]: muscles }))}/>
      )}
    </div>
  );
}
