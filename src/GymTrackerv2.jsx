import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── LOCALSTORAGE HELPERS ─────────────────────────────────────────────────────
const STORAGE_KEY = "ironlog_data_v1";

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch (e) {
    console.warn("Failed to load saved IronLog data from localStorage", e);
    return null;
  }
}

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save IronLog data to localStorage", e);
  }
}

// ─── BASE MUSCLE GROUPS ───────────────────────────────────────────────────────
const BASE_MUSCLE_GROUPS = {
  chest: {
    label: "Chest", icon: "◈", color: "#FF4D4D",
    exercises: [
      { id: "c1", name: "Barbell Bench Press",   sets: "4x6-8",   tip: "Arnold's #1 chest builder. Retract scapula, drive feet into floor.", instructor: "Arnold Schwarzenegger" },
      { id: "c2", name: "Incline Dumbbell Press", sets: "3x10-12", tip: "30-45° incline hits upper chest. Control the eccentric.",            instructor: "Jeff Nippard" },
      { id: "c3", name: "Cable Chest Fly",        sets: "3x12-15", tip: "Keep slight elbow bend, squeeze at center. Mind-muscle connection.", instructor: "Chris Bumstead" },
      { id: "c4", name: "Decline Push-Up",        sets: "3x15-20", tip: "Feet elevated higher = more upper chest activation.",                instructor: "Athlean-X" },
      { id: "c5", name: "Dumbbell Pullover",       sets: "3x12",    tip: "Expands ribcage, stretches pec minor. Keep slight elbow bend.",      instructor: "Dorian Yates" },
    ]
  },
  back: {
    label: "Back", icon: "◉", color: "#4D9FFF",
    exercises: [
      { id: "b1", name: "Deadlift",                    sets: "4x4-6",   tip: "King of all lifts. Bar over mid-foot, hip hinge, neutral spine.",   instructor: "Ed Coan" },
      { id: "b2", name: "Pull-Up / Weighted Pull-Up",  sets: "4x6-10",  tip: "Full ROM. Think elbows to hips, not pulling bar to chest.",         instructor: "Athlean-X" },
      { id: "b3", name: "Barbell Row",                 sets: "4x8-10",  tip: "Hinge 45°, row to lower chest. Controlled negative.",              instructor: "Dorian Yates" },
      { id: "b4", name: "Seated Cable Row",            sets: "3x12",    tip: "Chest up, drive elbows back, squeeze rhomboids at peak.",           instructor: "Lee Haney" },
      { id: "b5", name: "Lat Pulldown",                sets: "3x10-12", tip: "Wide grip, lean back slightly, pull to upper chest.",               instructor: "Jeff Nippard" },
      { id: "b6", name: "Face Pull",                   sets: "3x15-20", tip: "External rotation is key. Prevents shoulder injury long-term.",     instructor: "Athlean-X" },
    ]
  },
  shoulders: {
    label: "Shoulders", icon: "◇", color: "#FFD700",
    exercises: [
      { id: "s1", name: "Overhead Press (Barbell)", sets: "4x6-8",   tip: "Full lockout at top, slight layback. Core tight throughout.",        instructor: "Mark Rippetoe" },
      { id: "s2", name: "Dumbbell Lateral Raise",   sets: "4x12-15", tip: "Lead with elbows, slight forward lean. Don't swing!",               instructor: "John Meadows" },
      { id: "s3", name: "Arnold Press",              sets: "3x10-12", tip: "Rotation engages all three delt heads. Slow and controlled.",       instructor: "Arnold Schwarzenegger" },
      { id: "s4", name: "Rear Delt Fly",             sets: "3x15",    tip: "Bent over, neutral spine. Squeeze rear delts, not traps.",          instructor: "Chris Bumstead" },
      { id: "s5", name: "Cable Upright Row",         sets: "3x12",    tip: "Elbows flared wide, pull to chin height. Protects rotator cuff.",   instructor: "Jeff Nippard" },
    ]
  },
  biceps: {
    label: "Biceps", icon: "◑", color: "#FF8C42",
    exercises: [
      { id: "bi1", name: "Barbell Curl",          sets: "3x8-10",  tip: "Don't swing. Supinate fully at the top. Full stretch at bottom.", instructor: "Scott Herman" },
      { id: "bi2", name: "Incline Dumbbell Curl", sets: "3x10-12", tip: "Stretch under load. Best long head activator.",                   instructor: "John Meadows" },
      { id: "bi3", name: "Hammer Curl",           sets: "3x10",    tip: "Builds brachialis and brachioradialis for arm thickness.",        instructor: "Athlean-X" },
      { id: "bi4", name: "Preacher Curl",         sets: "3x12",    tip: "Eliminates cheating. Peak contraction is everything here.",       instructor: "Larry Scott" },
    ]
  },
  triceps: {
    label: "Triceps", icon: "◐", color: "#9B59B6",
    exercises: [
      { id: "t1", name: "Close-Grip Bench Press",      sets: "4x8-10",  tip: "Elbows tucked, shoulder-width grip. Triceps do 60% of bench work.", instructor: "Mark Bell" },
      { id: "t2", name: "Overhead Tricep Extension",   sets: "3x12",    tip: "Long head stretch. Keep elbows pointing forward.",                   instructor: "Jeff Nippard" },
      { id: "t3", name: "Tricep Pushdown (Rope)",      sets: "3x12-15", tip: "Flare wrists at bottom. Full extension every rep.",                  instructor: "Chris Bumstead" },
      { id: "t4", name: "Skull Crusher",               sets: "3x10",    tip: "Lower to forehead, keep elbows stationary. Massive long head.",      instructor: "Dorian Yates" },
    ]
  },
  legs: {
    label: "Legs", icon: "▽", color: "#2ECC71",
    exercises: [
      { id: "l1", name: "Barbell Back Squat",    sets: "4x6-8",   tip: "Depth below parallel. Knees track toes. Chest up.",                 instructor: "Mark Rippetoe" },
      { id: "l2", name: "Romanian Deadlift",     sets: "3x10-12", tip: "Hip hinge master. Feel hamstring stretch, not lower back.",          instructor: "Jeff Nippard" },
      { id: "l3", name: "Leg Press",             sets: "4x12",    tip: "High foot placement = more glute/ham. Low = quad dominant.",        instructor: "Tom Platz" },
      { id: "l4", name: "Leg Curl (Lying)",      sets: "3x12-15", tip: "Full ROM. Point toes down to maximize hamstring stretch.",           instructor: "John Meadows" },
      { id: "l5", name: "Bulgarian Split Squat", sets: "3x10 each",tip:"Best unilateral leg exercise. Rear foot elevated, torso upright.",  instructor: "Chris Bumstead" },
      { id: "l6", name: "Standing Calf Raise",   sets: "4x15-20", tip: "Full stretch at bottom. 2-sec pause. Calves love volume.",           instructor: "Arnold Schwarzenegger" },
    ]
  },
  core: {
    label: "Core", icon: "○", color: "#1ABC9C",
    exercises: [
      { id: "co1", name: "Cable Crunch",       sets: "3x15-20", tip: "Crunch with abs, not hips. Elbows to knees.",                 instructor: "Athlean-X" },
      { id: "co2", name: "Hanging Leg Raise",  sets: "3x12-15", tip: "No swinging. Posterior pelvic tilt at the top.",              instructor: "Jeff Nippard" },
      { id: "co3", name: "Ab Wheel Rollout",   sets: "3x10",    tip: "Brace hard. Don't let lower back sag. Advanced move.",        instructor: "Athlean-X" },
      { id: "co4", name: "Plank",              sets: "3x45-60s",tip: "Neutral spine, squeeze glutes, push ground away.",           instructor: "Stuart McGill" },
    ]
  },
  forearms: {
    label: "Forearms", icon: "⌇", color: "#E67E22",
    exercises: [
      { id: "f1", name: "Wrist Curl",     sets: "3x15-20", tip: "Full ROM on the wrist. Slow eccentric builds grip strength.",       instructor: "John Meadows" },
      { id: "f2", name: "Reverse Curl",   sets: "3x12",    tip: "Overhand grip. Targets brachioradialis and extensors.",             instructor: "Athlean-X" },
      { id: "f3", name: "Farmer's Carry", sets: "3x30m",   tip: "Walk with heavy dumbbells. Best functional forearm builder.",       instructor: "Dan John" },
    ]
  },
  glutes: {
    label: "Glutes", icon: "◍", color: "#E91E63",
    exercises: [
      { id: "g1", name: "Hip Thrust (Barbell)", sets: "4x10-12", tip: "Chin tucked, drive through heels. Full hip extension at top.", instructor: "Bret Contreras" },
      { id: "g2", name: "Cable Kickback",        sets: "3x15 each",tip:"Slight forward lean. Squeeze glute at top, not just kick.",   instructor: "Bret Contreras" },
      { id: "g3", name: "Sumo Deadlift",         sets: "3x8",     tip: "Wide stance activates glutes more than conventional.",        instructor: "Jeff Nippard" },
      { id: "g4", name: "Abductor Machine",      sets: "3x15-20", tip: "Works glute med. Essential for hip stability and shape.",     instructor: "Chris Bumstead" },
    ]
  },
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_SPLIT = {
  Mon: ["chest", "triceps"], Tue: ["back", "biceps"], Wed: ["legs"],
  Thu: ["shoulders", "forearms"], Fri: ["chest", "back"], Sat: ["glutes", "core"], Sun: [],
};

// ─── DATE UTILITIES ───────────────────────────────────────────────────────────
const NOW            = new Date();
const TODAY_DATE_STR = formatDateLocal(NOW);                        // e.g. "3/27/2026"
const TODAY_IDX      = NOW.getDay() === 0 ? 6 : NOW.getDay() - 1; // Mon=0…Sun=6

/** Returns true if the given weekday index (Mon=0…Sun=6) is strictly in the future this week */
function isFutureDay(dayIdx) {
  return dayIdx > TODAY_IDX;
}



/**
 * Return the first day-of-week (Mon=0) offset for a given month.
 * Used to know how many blank cells precede day 1 in the calendar grid.
 */
function monthStartOffset(year, month) {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;                 // convert to Mon=0
}

/** All days in a month */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}





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

// ─── HELPER: Transform weightLogs → recharts data for one exercise ────────────
function getChartData(sessions) {
  if (!sessions || !Object.keys(sessions).length) return [];
  return Object.entries(sessions)
    .map(([dateKey, sets]) => {
      const datePart = dateKey.includes(" · ") ? dateKey.split(" · ")[1] : dateKey;
      const weights  = sets.map(s => parseFloat(s.weight)).filter(w => !isNaN(w) && w > 0);
      if (!weights.length) return null;
      const parsed = new Date(datePart);
      return { date: datePart, maxWeight: Math.max(...weights), ts: isNaN(parsed) ? 0 : parsed.getTime() };
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts)
    .map(({ date, maxWeight }) => ({ date, maxWeight }));
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0F1117",border:`1px solid ${color}60`,borderRadius:"10px",padding:"10px 14px",fontSize:"13px" }}>
      <div style={{ color:"#666",fontSize:"11px",marginBottom:"4px",letterSpacing:"1px" }}>{label}</div>
      <div style={{ color,fontWeight:"700",fontSize:"16px" }}>{payload[0].value} <span style={{ fontSize:"12px",fontWeight:"400" }}>kg</span></div>
      <div style={{ color:"#555",fontSize:"11px",marginTop:"2px" }}>Max weight lifted</div>
    </div>
  );
}

// ─── CUSTOM DOT (highlights PB) ───────────────────────────────────────────────
function CustomDot({ cx, cy, payload, color, data }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => d.maxWeight));
  const isPB   = payload.maxWeight === maxVal;
  return (
    <g>
      <circle cx={cx} cy={cy} r={isPB?7:4} fill={color} opacity={isPB?1:0.85}
        stroke={isPB?"#fff":color} strokeWidth={isPB?2:0}/>
      {isPB && (
        <text x={cx} y={cy-14} textAnchor="middle" fill="#FFD700"
          fontSize="9" fontWeight="700" letterSpacing="1" fontFamily="'DM Sans',sans-serif">PB</text>
      )}
    </g>
  );
}
function formatDateLocal(date) {
  if (!date) return null;

  // If already YYYY-MM-DD → return as is
  if (typeof date === "string" && date.includes("-")) {
    return date;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, '0') + "-" +
    String(d.getDate()).padStart(2, '0');
}

// ─── PROGRESS GRAPH ───────────────────────────────────────────────────────────
const ProgressGraph = ({ weightLogs, muscleGroups }) => {
  const loggedExercises = useMemo(() => {
    return Object.values(muscleGroups)
      .flatMap(g => g.exercises.map(ex => ({ ...ex, groupColor: g.color, groupLabel: g.label, groupIcon: g.icon })))
      .filter(ex => {
        const s = weightLogs[ex.id];
        return s && Object.values(s).some(sets => sets.some(set => parseFloat(set.weight) > 0));
      });
  }, [weightLogs, muscleGroups]);

  const [selectedExId, setSelectedExId] = useState(() => loggedExercises[0]?.id ?? "");
  const validId  = loggedExercises.find(e => e.id === selectedExId)?.id ?? loggedExercises[0]?.id ?? "";
  const selectedEx = loggedExercises.find(e => e.id === validId);

  const chartData = useMemo(() => {
    if (!validId || !weightLogs[validId]) return [];
    return getChartData(weightLogs[validId]);
  }, [weightLogs, validId]);

  const lineColor   = selectedEx?.groupColor ?? "#FF4D4D";
  const maxWeight   = chartData.length ? Math.max(...chartData.map(d => d.maxWeight)) : 0;
  const firstWeight = chartData[0]?.maxWeight ?? 0;
  const lastWeight  = chartData[chartData.length-1]?.maxWeight ?? 0;
  const improvement = firstWeight > 0 ? (((lastWeight-firstWeight)/firstWeight)*100).toFixed(1) : null;

  if (!loggedExercises.length) {
    return (
      <div style={{ background:"#0F1117",border:"1px solid #1E2130",borderRadius:"16px",padding:"36px 20px",textAlign:"center",marginBottom:"24px" }}>
        <div style={{ fontSize:"38px",marginBottom:"10px" }}>📉</div>
        <div style={{ fontSize:"15px",fontWeight:"700",color:"#555" }}>No progress data yet</div>
        <div style={{ fontSize:"12px",color:"#333",marginTop:"6px",lineHeight:1.6 }}>Log weights on any exercise to see your<br/>strength curve appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ background:"#0F1117",border:"1px solid #1E2130",borderRadius:"16px",padding:"20px",marginBottom:"24px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px" }}>
        <div>
          <div style={sectionTitle}>PROGRESS GRAPH</div>
          <div style={{ fontSize:"16px",fontWeight:"700",color:"#F0F0F0" }}>{selectedEx?.name ?? "—"}</div>
          {selectedEx && <div style={{ fontSize:"11px",color:selectedEx.groupColor,marginTop:"3px" }}>{selectedEx.groupIcon} {selectedEx.groupLabel}</div>}
        </div>
        <select value={validId} onChange={e => setSelectedExId(e.target.value)} style={{ ...iInput,padding:"8px 10px",fontSize:"12px",appearance:"none",cursor:"pointer",borderColor:lineColor+"60",background:lineColor+"10",color:lineColor,fontWeight:"700",width:"auto",minWidth:"140px" }}>
          {Object.entries(muscleGroups).map(([gKey, group]) => {
            const exs = loggedExercises.filter(e => group.exercises.some(ge => ge.id === e.id));
            if (!exs.length) return null;
            return (
              <optgroup key={gKey} label={`${group.icon} ${group.label}`}>
                {exs.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </optgroup>
            );
          })}
        </select>
      </div>

      {chartData.length > 0 && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"20px" }}>
          {[
            { label:"Personal Best", value:`${maxWeight} kg`, color:"#FFD700" },
            { label:"Sessions",      value:chartData.length,  color:lineColor },
            { label:"Progress",      value:improvement!=null?`${improvement>0?"+":""}${improvement}%`:"—", color:improvement>0?"#2ECC71":improvement<0?"#FF4D4D":"#666" },
          ].map(s => (
            <div key={s.label} style={{ background:"#080A0F",borderRadius:"10px",padding:"10px",border:"1px solid #1E2130",textAlign:"center" }}>
              <div style={{ fontSize:"17px",fontWeight:"900",color:s.color }}>{s.value}</div>
              <div style={{ fontSize:"10px",color:"#444",marginTop:"2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {chartData.length === 0 ? (
        <div style={{ textAlign:"center",padding:"28px 10px",border:"1px dashed #1E2130",borderRadius:"12px",color:"#333" }}>
          <div style={{ fontSize:"28px",marginBottom:"6px" }}>🏋️</div>
          <div style={{ fontSize:"13px",color:"#444" }}>No weight data for this exercise yet.</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={chartData} margin={{ top:18, right:12, left:-10, bottom:4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1D26" horizontal vertical={false}/>
            <XAxis dataKey="date" tick={{ fill:"#444",fontSize:10,fontFamily:"'DM Sans',sans-serif" }} tickLine={false} axisLine={{ stroke:"#1E2130" }} interval="preserveStartEnd"/>
            <YAxis tick={{ fill:"#444",fontSize:10,fontFamily:"'DM Sans',sans-serif" }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}kg`} domain={["auto","auto"]} width={44}/>
            <Tooltip content={<CustomTooltip color={lineColor}/>} cursor={{ stroke:lineColor,strokeWidth:1,strokeDasharray:"4 4",opacity:0.4 }}/>
            <ReferenceLine y={maxWeight} stroke="#FFD700" strokeDasharray="4 4" strokeOpacity={0.4}
              label={{ value:"PB",position:"insideTopRight",fill:"#FFD700",fontSize:9,fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}/>
            <Line type="monotone" dataKey="maxWeight" stroke={lineColor} strokeWidth={2.5}
              dot={<CustomDot color={lineColor} data={chartData}/>}
              activeDot={{ r:6, stroke:"#fff", strokeWidth:2, fill:lineColor }}
              isAnimationActive animationDuration={600} animationEasing="ease-out"/>
          </LineChart>
        </ResponsiveContainer>
      )}
      {chartData.length > 0 && <div style={{ fontSize:"10px",color:"#2A2D3A",textAlign:"center",marginTop:"10px" }}>Showing max weight per session · Dots mark each workout</div>}
    </div>
  );
};

// ─── WORKOUT CALENDAR ─────────────────────────────────────────────────────────
/**
 * WorkoutCalendar
 * Shows the current month. Days with logged data get a coloured dot.
 * Clicking a past/today date opens a panel showing every exercise logged that day
 * with their sets/weight if available.
 */

const WorkoutCalendar = ({ weightLogs, muscleGroups }) => {
    console.log("Component Rendered");
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected,  setSelected]  = useState(null); // Date object

  // Build a map: "M/D/YYYY" → Set of exIds that have data that day
  console.log("weightLogs:", weightLogs);
 const activeDays = useMemo(() => {
  const map = {};

  Object.entries(weightLogs).forEach(([exId, sessions]) => {
    Object.keys(sessions).forEach(dateKey => {
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

  const allExercises = Object.values(muscleGroups).flatMap(g =>
    g.exercises.map(ex => ({ ...ex }))
  );

  const result = [];

  allExercises.forEach(ex => {
    const sessions = weightLogs[ex.id];
    if (!sessions) return;

    console.log("Exercise:", ex.id); // 🔥
    console.log("Session keys:", Object.keys(sessions)); // 🔥

    const matchingKeys = Object.keys(sessions).filter(k => {
      const dp = k.includes(" · ") ? k.split(" · ")[1] : k;

      console.log("Checking key:", k, "→", dp); // 🔥

      return dp === selectedDateStr;
    });

    console.log("Matching keys:", matchingKeys); // 🔥

    if (!matchingKeys.length) return;

    const sets = matchingKeys.flatMap(k => sessions[k]);

    console.log("Final sets for this day:", sets); // 🔥

    result.push({ ex, sets });
  });

  return result;
}, [selectedDateStr, weightLogs, muscleGroups]);

  const offset   = monthStartOffset(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells    = Array(offset).fill(null).concat(Array.from({ length: totalDays }, (_, i) => i + 1));
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();

  const goBack = () => {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
    setSelected(null);
  };
  const goFwd = () => {
    // Don't allow navigating past current month
    if (viewYear === todayY && viewMonth === todayM) return;
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
    setSelected(null);
  };

  const atCurrentMonth = viewYear === todayY && viewMonth === todayM;

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });

  const handleDayClick = (day) => {
    if (!day) return;
    const d = new Date(viewYear, viewMonth, day);
    // Can't select future dates
    const isToday = d.getFullYear()===todayY && d.getMonth()===todayM && d.getDate()===todayD;
    const isPast  = d < new Date(todayY, todayM, todayD);
    if (!isToday && !isPast) return;
    setSelected(prev => (prev && formatDateLocal(prev) === formatDateLocal(d)) ? null : d);
  };

  return (
    <div style={{ background:"#0F1117",border:"1px solid #1E2130",borderRadius:"16px",padding:"20px",marginBottom:"24px" }}>
      {/* Month nav */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
        <button onClick={goBack} style={{ background:"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"8px",color:"#888",padding:"6px 12px",cursor:"pointer",fontSize:"16px",fontFamily:"'DM Sans',sans-serif" }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={sectionTitle}>WORKOUT CALENDAR</div>
          <div style={{ fontSize:"15px",fontWeight:"700",color:"#F0F0F0",marginTop:"-8px" }}>{monthLabel}</div>
        </div>
        <button onClick={goFwd} style={{ background: atCurrentMonth?"#111":"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"8px",color:atCurrentMonth?"#2A2D3A":"#888",padding:"6px 12px",cursor:atCurrentMonth?"not-allowed":"pointer",fontSize:"16px",fontFamily:"'DM Sans',sans-serif" }} disabled={atCurrentMonth}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"6px" }}>
        {["M","T","W","T","F","S","S"].map((d,i) => (
          <div key={i} style={{ textAlign:"center",fontSize:"10px",color: i>=5?"#444":"#555",fontWeight:"700",letterSpacing:"1px",padding:"4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px" }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx}/>;
          const thisDate   = new Date(viewYear, viewMonth, day);
          const dateStr =
  viewYear + "-" +
  String(viewMonth + 1).padStart(2, "0") + "-" +
  String(day).padStart(2, "0");
          const isToday    = viewYear===todayY && viewMonth===todayM && day===todayD;
          const isPast     = thisDate < new Date(todayY, todayM, todayD);
          const isFuture   = !isToday && !isPast;
          const hasData    = !!activeDays[dateStr];
          const isSelected = selected && formatDateLocal(selected) === dateStr;
          const isWeekend  = idx % 7 >= 5;

          return (
            <button key={idx} onClick={() => handleDayClick(day)} disabled={isFuture} style={{
              position:"relative",
              padding:"8px 4px",
              borderRadius:"9px",
              border: isSelected ? "1.5px solid #FF4D4D" : "1.5px solid transparent",
              background: isSelected ? "#FF4D4D20" : isToday ? "#1A1D26" : "transparent",
              cursor: isFuture ? "not-allowed" : "pointer",
              opacity: isFuture ? 0.2 : 1,
              display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
              transition:"all 0.15s",
            }}>
              <span style={{
                fontSize:"13px",
                fontWeight: isToday ? "900" : "500",
                color: isSelected?"#FF4D4D" : isToday?"#FF4D4D" : isWeekend?"#3A3D4A" : "#888",
                fontFamily:"'DM Sans',sans-serif",
              }}>{day}</span>
              {hasData && (
                <span style={{
                  width:"5px",height:"5px",borderRadius:"50%",
                  background: isSelected?"#FF4D4D":"#00AA00",
                  flexShrink:0,
                }}/>
              )}
              {!hasData && <span style={{ width:"5px",height:"5px" }}/>}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex",gap:"14px",marginTop:"12px",justifyContent:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",color:"#444" }}>
          <span style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#00AA00",display:"inline-block" }}/>
          Workout logged
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",color:"#444" }}>
          <span style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#FF4D4D",display:"inline-block" }}/>
          Selected
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",color:"#333" }}>
          <span style={{ opacity:0.25,fontSize:"12px" }}>15</span>
          Future (locked)
        </div>
      </div>

      {/* Day history panel */}
      {selected && (
        <div style={{ marginTop:"18px",borderTop:"1px solid #1E2130",paddingTop:"16px",animation:"fadeSlide 0.2s ease" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
            <div>
              <div style={{ fontSize:"13px",fontWeight:"700",color:"#F0F0F0" }}>
                {selected.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
              </div>
              <div style={{ fontSize:"11px",color:"#555",marginTop:"2px" }}>
                {dayHistory.length > 0 ? `${dayHistory.length} exercise${dayHistory.length>1?"s":""} logged` : "No workout data for this day"}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background:"none",border:"none",color:"#444",fontSize:"18px",cursor:"pointer",padding:"0" }}>✕</button>
          </div>

          {dayHistory.length === 0 ? (
            <div style={{ textAlign:"center",padding:"24px 10px",border:"1px dashed #1E2130",borderRadius:"12px" }}>
              <div style={{ fontSize:"28px",marginBottom:"6px" }}>🏖️</div>
              <div style={{ fontSize:"13px",color:"#444" }}>No exercises were logged on this day.</div>
            </div>
          ) : (
            dayHistory.map(({ ex, sets }) => {
              const groupEntry = Object.entries(muscleGroups).find(([,g]) => g.exercises.some(e => e.id === ex.id));
              const group = groupEntry ? groupEntry[1] : { color:"#888",icon:"●",label:"" };
              const validSets = sets.filter(s => s.weight || s.reps);
              return (
                <div key={ex.id} style={{ background:"#080A0F",border:`1px solid ${group.color}25`,borderRadius:"12px",padding:"14px",marginBottom:"8px",borderLeft:`3px solid ${group.color}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"7px",marginBottom: validSets.length?"10px":"0" }}>
                    <span style={{ fontSize:"14px",color:group.color }}>{group.icon}</span>
                    <div>
                      <div style={{ fontSize:"14px",fontWeight:"700",color:"#F0F0F0",display:"flex",alignItems:"center",gap:"6px" }}>
                        {ex.name}
                        {ex.isCustom && <span style={{ fontSize:"9px",background:"#FF8C4230",color:"#FF8C42",borderRadius:"4px",padding:"1px 5px",fontWeight:"700",letterSpacing:"1px" }}>CUSTOM</span>}
                      </div>
                      <div style={{ fontSize:"11px",color:group.color,marginTop:"1px" }}>{group.label}</div>
                    </div>
                  </div>
                  {validSets.length > 0 && (
                    <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
                      {validSets.map((s, i) => (
                        <div key={i} style={{ background:group.color+"18",border:`1px solid ${group.color}30`,borderRadius:"7px",padding:"4px 10px",fontSize:"12px",color:group.color,fontWeight:"700" }}>
                          S{s.set}: {s.weight||"–"}kg × {s.reps||"–"}
                        </div>
                      ))}
                    </div>
                  )}
                  {validSets.length === 0 && (
                    <div style={{ fontSize:"11px",color:"#333",marginTop:"4px" }}>Exercise checked off — no weights recorded.</div>
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

// ─── WEIGHT MODAL ─────────────────────────────────────────────────────────────
function WeightModal({ exercise, onClose, onSave, existing }) {
  const [entries, setEntries] = useState(existing?.length ? existing : [{ set:1, weight:"", reps:"" }]);
  const addSet    = () => setEntries(p => [...p, { set:p.length+1, weight:"", reps:"" }]);
  const removeSet = (i) => setEntries(p => p.filter((_,idx)=>idx!==i).map((e,idx)=>({...e,set:idx+1})));
  const update    = (i,field,val) => setEntries(p => { const u=[...p]; u[i]={...u[i],[field]:val}; return u; });

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#0F1117",border:"1px solid #2A2D3A",borderRadius:"18px",padding:"26px",width:"100%",maxWidth:"400px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
          <div><div style={iLabel}>LOG WEIGHTS</div><div style={{ fontSize:"18px",fontWeight:"700",color:"#F0F0F0" }}>{exercise.name}</div></div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#555",fontSize:"22px",cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"32px 1fr 1fr 24px",gap:"8px",marginBottom:"8px" }}>
          {["#","KG","REPS",""].map(h=><div key={h} style={iLabel}>{h}</div>)}
        </div>
        {entries.map((e,i)=>(
          <div key={i} style={{ display:"grid",gridTemplateColumns:"32px 1fr 1fr 24px",gap:"8px",marginBottom:"8px",alignItems:"center" }}>
            <div style={{ fontSize:"13px",color:"#666",fontWeight:"700",textAlign:"center" }}>{i+1}</div>
            <input type="number" placeholder="0" value={e.weight} onChange={v=>update(i,"weight",v.target.value)} style={iInput}/>
            <input type="number" placeholder="0" value={e.reps}   onChange={v=>update(i,"reps",  v.target.value)} style={iInput}/>
            <button onClick={()=>removeSet(i)} style={{ background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:"18px",padding:"0",lineHeight:1 }}>×</button>
          </div>
        ))}
        <button onClick={addSet} style={{ width:"100%",background:"#1A1D26",border:"1px dashed #3A3D4A",borderRadius:"8px",color:"#888",padding:"9px",cursor:"pointer",fontSize:"12px",marginTop:"4px",fontFamily:"'DM Sans',sans-serif" }}>+ Add Set</button>
        <button onClick={()=>{onSave(entries);onClose();}} style={{ width:"100%",background:"linear-gradient(135deg,#FF4D4D,#FF8C42)",border:"none",borderRadius:"10px",color:"#fff",padding:"13px",cursor:"pointer",fontSize:"15px",fontWeight:"700",marginTop:"14px",fontFamily:"'DM Sans',sans-serif" }}>Save Session</button>
      </div>
    </div>
  );
}

// ─── CUSTOM EXERCISE MODAL ────────────────────────────────────────────────────
function CustomExerciseModal({ muscleGroups, defaultMuscle, onClose, onSave }) {
  const [name,setName]             = useState("");
  const [sets,setSets]             = useState("3x10-12");
  const [tip,setTip]               = useState("");
  const [targetMuscle,setTargetMuscle] = useState(defaultMuscle||Object.keys(muscleGroups)[0]);

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
        <div style={{ marginBottom:"14px" }}><label style={iLabel}>Exercise Name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Machine Chest Fly" style={iInput}/></div>
        <div style={{ marginBottom:"14px" }}><label style={iLabel}>Sets × Reps</label><input value={sets} onChange={e=>setSets(e.target.value)} placeholder="e.g. 3x10-12" style={iInput}/></div>
        <div style={{ marginBottom:"14px" }}>
          <label style={iLabel}>Target Muscle Group</label>
          <select value={targetMuscle} onChange={e=>setTargetMuscle(e.target.value)} style={{ ...iInput,appearance:"none",cursor:"pointer" }}>
            {Object.entries(muscleGroups).map(([k,g])=><option key={k} value={k}>{g.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:"22px" }}><label style={iLabel}>Notes / Tips (optional)</label><textarea value={tip} onChange={e=>setTip(e.target.value)} placeholder="Your form cues or technique notes..." rows={3} style={{ ...iInput,resize:"none",lineHeight:"1.6" }}/></div>
        <button onClick={handleSave} disabled={!name.trim()} style={{ width:"100%",background:name.trim()?"linear-gradient(135deg,#FF4D4D,#FF8C42)":"#1A1D26",border:"none",borderRadius:"10px",color:name.trim()?"#fff":"#444",padding:"14px",cursor:name.trim()?"pointer":"not-allowed",fontSize:"15px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>Add Exercise</button>
      </div>
    </div>
  );
}

// ─── DAY SPLIT EDITOR ─────────────────────────────────────────────────────────
function SplitEditorModal({ day, currentMuscles, muscleGroups, onClose, onSave }) {
  const [selected,setSelected] = useState([...currentMuscles]);
  const toggle = k => setSelected(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k]);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#0F1117",border:"1px solid #2A2D3A",borderRadius:"18px",padding:"26px",width:"100%",maxWidth:"420px",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
          <div><div style={iLabel}>EDIT WORKOUT SPLIT</div><div style={{ fontSize:"22px",fontWeight:"700",color:"#F0F0F0" }}>{day}</div></div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#555",fontSize:"22px",cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ fontSize:"12px",color:"#444",marginBottom:"20px" }}>Select muscle groups for {day}</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"22px" }}>
          {Object.entries(muscleGroups).map(([key,group])=>{
            const active=selected.includes(key);
            return (
              <button key={key} onClick={()=>toggle(key)} style={{ background:active?group.color+"20":"#0D0F17",border:`2px solid ${active?group.color:"#1E2130"}`,borderRadius:"13px",padding:"16px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"5px",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif" }}>
                <span style={{ fontSize:"22px",color:active?group.color:"#333" }}>{group.icon}</span>
                <span style={{ fontSize:"12px",fontWeight:"700",color:active?group.color:"#444" }}>{group.label}</span>
                {active&&<span style={{ fontSize:"9px",color:group.color,background:group.color+"15",borderRadius:"4px",padding:"1px 6px",letterSpacing:"1px" }}>✓ ON</span>}
              </button>
            );
          })}
        </div>
        {selected.length===0&&<div style={{ background:"#1A1400",border:"1px solid #FFD70030",borderRadius:"10px",padding:"10px 14px",fontSize:"12px",color:"#FFD700",marginBottom:"16px" }}>⚠ No muscles selected — this day will be a Rest Day</div>}
        <div style={{ display:"flex",gap:"10px" }}>
          <button onClick={onClose} style={{ flex:1,background:"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"10px",color:"#888",padding:"13px",cursor:"pointer",fontSize:"13px",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
          <button onClick={()=>{onSave(selected);onClose();}} style={{ flex:2,background:"linear-gradient(135deg,#FF4D4D,#FF8C42)",border:"none",borderRadius:"10px",color:"#fff",padding:"13px",cursor:"pointer",fontSize:"15px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>Save Split</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function GymTracker() {
  const today = weekdays[TODAY_IDX];

  const [loading,                  setLoading]                  = useState(true);
  const [activeTab,                setActiveTab]                = useState("today");
  const [selectedDay,              setSelectedDay]              = useState(today);
  const [completedExercises,       setCompletedExercises]       = useState({});
  const [weightLogs,               setWeightLogs]               = useState({});
  console.log("PARENT weightLogs:", weightLogs);
  const [customExercises,          setCustomExercises]          = useState({});
  const [weeklySplit,              setWeeklySplit]              = useState(DEFAULT_SPLIT);
  const [modalExercise,            setModalExercise]            = useState(null);
  const [showCustomModal,          setShowCustomModal]          = useState(false);
  const [customModalDefaultMuscle, setCustomModalDefaultMuscle] = useState(null);
  const [splitEditorDay,           setSplitEditorDay]           = useState(null);
  const [expandedGroup,            setExpandedGroup]            = useState(null);
  const [backupMsg,                setBackupMsg]                = useState("");
  const fileInputRef = useRef();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromLocalStorage();
    console.log("Loaded from storage:", stored);
    if (stored) {
      if (stored?.weightLogs && Object.keys(stored.weightLogs).length > 0) {
  setWeightLogs(stored.weightLogs);
}
      if (stored.customExercises) setCustomExercises(stored.customExercises);
      if (stored.completedExercises) setCompletedExercises(stored.completedExercises);
      if (stored.weeklySplit) setWeeklySplit(stored.weeklySplit);
    }
    setLoading(false);
  }, []);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    if (loading) return;
    saveToLocalStorage({
      weightLogs,
      customExercises,
      completedExercises,
      weeklySplit
    });
  }, [loading, weightLogs, customExercises, completedExercises, weeklySplit]);

  // Derived: is the selected day in the future?
  const selectedDayIdx   = weekdays.indexOf(selectedDay);
  const selectedIsFuture = isFutureDay(selectedDayIdx);

  const muscleGroups = useMemo(() => Object.fromEntries(
    Object.entries(BASE_MUSCLE_GROUPS).map(([key,group]) => [
      key, { ...group, exercises:[...group.exercises,...(customExercises[key]||[])] },
    ])
  ), [customExercises]);

  const todayMuscles    = weeklySplit[selectedDay] || [];
  const todayExercises  = todayMuscles.flatMap(mg => (muscleGroups[mg]?.exercises||[]).map(ex=>({...ex,muscleGroup:mg})));
  const completedCount  = todayExercises.filter(e=>completedExercises[e.id]).length;
  const progress        = todayExercises.length>0?(completedCount/todayExercises.length)*100:0;
  const totalCustom     = Object.values(customExercises).flat().length;
  const allExerciseCount = Object.values(muscleGroups).reduce((s,g)=>s+g.exercises.length,0);
  const totalLogged     = Object.keys(weightLogs).length;
  const removeLogForDay = useCallback((exId, selectedDay) => {
  setWeightLogs(prev => {
    const logs = prev[exId];
    if (!logs) return prev;

    const updatedLogs = { ...logs };

    Object.keys(updatedLogs).forEach(key => {
      if (key.startsWith(selectedDay)) {
        delete updatedLogs[key];
      }
    });

    return {
      ...prev,
      [exId]: updatedLogs
    };
  });
}, []);

  const toggleExercise = useCallback((exId) => {
  setCompletedExercises(prev => {
    const isNowSelected = !prev[exId];

    // If deselecting → remove logs
    if (!isNowSelected) {
      removeLogForDay(exId, selectedDay);
    }

    return {
      ...prev,
      [exId]: isNowSelected
    };
  });
}, [selectedDay, removeLogForDay]);
  // saveWeights: always uses TODAY's actual date regardless of which day is viewed
  const saveWeights = useCallback((exId, entries) => {
  const todayDate = new Date();

  // Get selected day index safely
  const dayMap = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6
};



const selectedDayIndex = dayMap[selectedDay];

  // Current day index (Mon=0…Sun=6)
  const currentDayIndex =
    todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1;

  const diff = selectedDayIndex - currentDayIndex;

  const targetDate = new Date();
  targetDate.setDate(todayDate.getDate() + diff);

  const dateStr =
    targetDate.getFullYear() + "-" +
    String(targetDate.getMonth() + 1).padStart(2, "0") + "-" +
    String(targetDate.getDate()).padStart(2, "0");

  const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const dateKey = `${dayNames[selectedDayIndex]} · ${dateStr}`;

  console.log("Saving dateKey:", dateKey);
  console.log("Selected day index:", selectedDay); // DEBUG

  setWeightLogs(p => ({
    ...p,
    [exId]: {
      ...(p[exId] || {}),
      [dateKey]: entries
    }
  }));
}, [selectedDay]);
  const getLastLog = useCallback(exId => {
    const logs = weightLogs[exId];
    if (!logs) return null;
    const keys = Object.keys(logs);
    return keys.length ? logs[keys[keys.length-1]] : null;
  }, [weightLogs]);

  const addCustomExercise    = useCallback((ex,k)=>setCustomExercises(p=>({...p,[k]:[...(p[k]||[]),ex]})),[]);
  const deleteCustomExercise = useCallback((k,id)=>setCustomExercises(p=>({...p,[k]:(p[k]||[]).filter(e=>e.id!==id)})),[]);

  const handleBackup = () => {
    const data = { completedExercises, weightLogs, customExercises, weeklySplit, exportedAt:new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`ironlog-backup-${TODAY_DATE_STR.replace(/\//g,"-")}.json`;
    a.click(); URL.revokeObjectURL(url);
    setBackupMsg("✓ Backup downloaded successfully!");
    setTimeout(()=>setBackupMsg(""),3500);
  };

  const handleRestore = e => {
    const file=e.target.files[0]; if (!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try {
        const d=JSON.parse(ev.target.result);
        if (d.weightLogs)         setWeightLogs(d.weightLogs);
        if (d.completedExercises) setCompletedExercises(d.completedExercises);
        if (d.customExercises)    setCustomExercises(d.customExercises);
        if (d.weeklySplit)        setWeeklySplit(d.weeklySplit);
        setBackupMsg("✓ Data restored! Welcome back.");
      } catch { setBackupMsg("✗ Invalid backup file."); }
      setTimeout(()=>setBackupMsg(""),3500);
    };
    reader.readAsText(file); e.target.value="";
  };

  const handleClear = () => {
  if (window.confirm("⚠️  This will DELETE all your data including weight logs, custom exercises, and your workout split.\n\nBackup your data first if you want to keep it.\n\nAre you sure?")) {

    localStorage.removeItem(STORAGE_KEY);

    setWeightLogs({});
    setCompletedExercises({});
    setCustomExercises({});
    setWeeklySplit(DEFAULT_SPLIT);

    setBackupMsg("✓ All data cleared.");
    setTimeout(()=>setBackupMsg(""),3500);

    // 🔥 THIS IS THE FINAL FIX
    window.location.reload();
  }
};
  // ── Exercise Card ──
  const ExerciseCard = useCallback(({ ex, group, showDelete }) => {
    const done      = completedExercises[ex.id];
    const lastLog   = getLastLog(ex.id);
    const muscleKey = ex.muscleGroup || Object.keys(muscleGroups).find(k=>muscleGroups[k].exercises.some(e=>e.id===ex.id));
    // Disable logging if viewing a future day
    const canLog    = !selectedIsFuture;

    return (
      <div style={{ background:done?`${group.color}12`:"#0F1117",border:`1px solid ${done?group.color+"50":"#1E2130"}`,borderRadius:"14px",padding:"15px",marginBottom:"10px",transition:"all 0.25s" }}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:"11px" }}>
          <button onClick={()=>canLog&&toggleExercise(ex.id)} disabled={!canLog} style={{ width:"26px",height:"26px",borderRadius:"8px",border:`2px solid ${done?group.color:"#2A2D3A"}`,background:done?group.color:"transparent",cursor:canLog?"pointer":"not-allowed",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"13px",marginTop:"1px",transition:"all 0.2s" }}>{done?"✓":""}</button>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px",flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap" }}>
                <span style={{ fontSize:"15px",fontWeight:"700",textDecoration:done?"line-through":"none",color:done?"#555":"#F0F0F0" }}>{ex.name}</span>
                {ex.isCustom&&<span style={{ fontSize:"9px",background:"#FF8C4230",color:"#FF8C42",borderRadius:"4px",padding:"1px 6px",fontWeight:"700",letterSpacing:"1px",flexShrink:0 }}>CUSTOM</span>}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:"6px",flexShrink:0 }}>
                <span style={{ background:group.color+"20",color:group.color,borderRadius:"7px",padding:"2px 9px",fontSize:"11px",fontWeight:"700" }}>{ex.sets}</span>
                {showDelete&&ex.isCustom&&<button onClick={()=>deleteCustomExercise(muscleKey,ex.id)} style={{ background:"#2A0A0A",border:"1px solid #441010",borderRadius:"6px",color:"#FF4D4D",cursor:"pointer",fontSize:"11px",padding:"2px 7px",fontFamily:"'DM Sans',sans-serif",fontWeight:"700" }}>del</button>}
              </div>
            </div>
            {ex.tip&&<div style={{ fontSize:"12px",color:"#555",marginTop:"5px",fontStyle:"italic",lineHeight:1.5 }}>"{ex.tip}"</div>}
            {ex.instructor&&ex.instructor!=="Custom"&&<div style={{ fontSize:"11px",color:"#333",marginTop:"2px" }}>— {ex.instructor}</div>}
            {lastLog&&<div style={{ fontSize:"11px",color:group.color,marginTop:"7px",fontWeight:"600" }}>Last: {lastLog.filter(s=>s.weight||s.reps).map(s=>`${s.weight||"–"}kg×${s.reps||"–"}`).join(" · ")}</div>}
            {/* Log weights only allowed for today or past days */}
            {canLog
              ? <button onClick={()=>setModalExercise(ex)} style={{ marginTop:"10px",background:group.color+"18",border:`1px solid ${group.color}35`,borderRadius:"8px",color:group.color,padding:"6px 14px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>⚖ Log Weights</button>
              : <div style={{ marginTop:"10px",fontSize:"11px",color:"#333",fontStyle:"italic" }}>🔒 Logging available on {today} only</div>
            }
          </div>
        </div>
      </div>
    );
  }, [completedExercises, getLastLog, muscleGroups, toggleExercise, deleteCustomExercise, selectedIsFuture, today]);

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

      {/* HEADER */}
      <div style={{ padding:"20px 20px 0",position:"sticky",top:0,zIndex:100,background:"#080A0F" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px" }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue'",fontSize:"30px",letterSpacing:"3px",lineHeight:1,color:"#FF4D4D" }}>IRON LOG</div>
            <div style={{ fontSize:"10px",color:"#444",letterSpacing:"2.5px",textTransform:"uppercase",marginTop:"2px" }}>Bodybuilding Tracker</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"10px",color:"#444",letterSpacing:"1px" }}>TODAY</div>
            <div style={{ fontSize:"18px",fontWeight:"900" }}>{NOW.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:"4px",background:"#0D0F17",borderRadius:"12px",padding:"4px" }}>
          {[["today","Today"],["library","Library"],["progress","Progress"]].map(([key,label])=>(
            <button key={key} onClick={()=>setActiveTab(key)} style={{ flex:1,padding:"10px 4px",borderRadius:"9px",border:"none",cursor:"pointer",background:activeTab===key?"linear-gradient(135deg,#FF4D4D,#FF6B35)":"transparent",color:activeTab===key?"#fff":"#555",fontSize:"12px",fontWeight:"700",letterSpacing:"0.5px",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif" }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"18px 20px 100px",animation:"fadeSlide 0.3s ease" }}>

        {/* ══════════════ TODAY TAB ══════════════ */}
        {activeTab==="today" && (
          <div>
            {/* Day picker — future days dimmed but still selectable to view the split */}
            <div style={{ display:"flex",gap:"5px",marginBottom:"12px",overflowX:"auto",paddingBottom:"2px" }}>
              {weekdays.map((day,idx)=>{
                const isFuture = isFutureDay(idx);
                const isActive = selectedDay===day;
                return (
                  <button key={day} onClick={()=>setSelectedDay(day)} style={{
                    minWidth:"48px",padding:"9px 4px",borderRadius:"10px",border:"none",cursor:"pointer",
                    background: isActive?"linear-gradient(135deg,#FF4D4D,#FF6B35)":"#0F1117",
                    color: isActive?"#fff": isFuture?"#2A2D3A": day===today?"#FF8C42":"#555",
                    fontSize:"11px",fontWeight:"700",letterSpacing:"0.5px",flexShrink:0,
                    outline: day===today&&!isActive?"1px solid #FF8C4240":"none",
                    fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",
                    position:"relative",
                  }}>
                    {day}
                    {isFuture&&<span style={{ position:"absolute",top:"3px",right:"3px",fontSize:"7px",color:"#333" }}>🔒</span>}
                  </button>
                );
              })}
            </div>

            {/* Future-day banner */}
            {selectedIsFuture && (
              <div style={{ background:"#1A1400",border:"1px solid #FFD70030",borderRadius:"12px",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px" }}>
                <span style={{ fontSize:"20px" }}>🔒</span>
                <div>
                  <div style={{ fontSize:"13px",fontWeight:"700",color:"#FFD700" }}>Future Day</div>
                  <div style={{ fontSize:"11px",color:"#666",marginTop:"2px" }}>You can view the planned split but cannot log weights or tick exercises until {selectedDay} arrives.</div>
                </div>
              </div>
            )}

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
              <div style={{ fontSize:"12px",color:"#444" }}>{todayMuscles.length>0?todayMuscles.map(mg=>muscleGroups[mg]?.label).join(" + "):"Rest Day"}</div>
              <button onClick={()=>setSplitEditorDay(selectedDay)} style={{ background:"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"8px",color:"#FF8C42",padding:"6px 13px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>✏ Edit Split</button>
            </div>

            {todayExercises.length>0&&!selectedIsFuture&&(
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
                      {todayMuscles.map(mg=><span key={mg} style={{ background:muscleGroups[mg]?.color+"20",color:muscleGroups[mg]?.color,fontSize:"10px",fontWeight:"700",padding:"2px 7px",borderRadius:"5px",letterSpacing:"1px",textTransform:"uppercase",border:`1px solid ${muscleGroups[mg]?.color}40` }}>{muscleGroups[mg]?.label}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {todayExercises.length===0?(
              <div style={{ textAlign:"center",padding:"52px 20px",color:"#333" }}>
                <div style={{ fontSize:"44px",marginBottom:"10px" }}>😴</div>
                <div style={{ fontSize:"20px",fontWeight:"700",color:"#555" }}>Rest Day</div>
                <div style={{ fontSize:"13px",marginTop:"6px" }}>Recovery is where gains are made.</div>
                <button onClick={()=>setSplitEditorDay(selectedDay)} style={{ marginTop:"20px",background:"#1A1D26",border:"1px solid #2A2D3A",borderRadius:"10px",color:"#FF8C42",padding:"12px 24px",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>+ Add Muscles for {selectedDay}</button>
              </div>
            ):(
              <>
                {todayMuscles.map(mg=>{
                  const group=muscleGroups[mg]; if (!group) return null;
                  return (
                    <div key={mg} style={{ marginBottom:"22px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px" }}>
                        <span style={{ fontSize:"16px",color:group.color }}>{group.icon}</span>
                        <span style={{ fontSize:"12px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:group.color }}>{group.label}</span>
                        <div style={{ flex:1,height:"1px",background:`linear-gradient(90deg,${group.color}40,transparent)` }}/>
                      </div>
                      {group.exercises.map(ex=><ExerciseCard key={ex.id} ex={{...ex,muscleGroup:mg}} group={group} showDelete={true}/>)}
                    </div>
                  );
                })}
                {!selectedIsFuture&&<button onClick={()=>{setCustomModalDefaultMuscle(todayMuscles[0]||null);setShowCustomModal(true);}} style={{ width:"100%",background:"#0D0F17",border:"1px dashed #2A2D3A",borderRadius:"13px",color:"#FF8C42",padding:"15px",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif",marginTop:"4px" }}>+ Add Custom Exercise</button>}
              </>
            )}
          </div>
        )}

        {/* ══════════════ LIBRARY TAB ══════════════ */}
        {activeTab==="library"&&(
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
              <div style={{ fontSize:"11px",color:"#444",letterSpacing:"1.5px" }}>{allExerciseCount} TOTAL · {totalCustom>0?`${totalCustom} CUSTOM`:"NO CUSTOM YET"}</div>
              <button onClick={()=>{setCustomModalDefaultMuscle(null);setShowCustomModal(true);}} style={{ background:"linear-gradient(135deg,#FF4D4D,#FF8C42)",border:"none",borderRadius:"9px",color:"#fff",padding:"8px 16px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif" }}>+ Custom</button>
            </div>
            {Object.entries(muscleGroups).map(([key,group])=>(
              <div key={key} style={{ marginBottom:"10px" }}>
                <button onClick={()=>setExpandedGroup(expandedGroup===key?null:key)} style={{ width:"100%",background:expandedGroup===key?`${group.color}15`:"#0F1117",border:`1px solid ${expandedGroup===key?group.color+"50":"#1E2130"}`,borderRadius:"13px",padding:"14px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:"#F0F0F0",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"11px" }}>
                    <span style={{ fontSize:"20px",color:group.color }}>{group.icon}</span>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:"15px",fontWeight:"700" }}>{group.label}</div>
                      <div style={{ fontSize:"11px",color:"#444" }}>{group.exercises.length} exercises{(customExercises[key]||[]).length>0?` · ${(customExercises[key]||[]).length} custom`:""}</div>
                    </div>
                  </div>
                  <span style={{ color:group.color,fontSize:"18px",transition:"transform 0.2s",transform:expandedGroup===key?"rotate(90deg)":"none" }}>›</span>
                </button>
                {expandedGroup===key&&(
                  <div style={{ marginTop:"8px",animation:"fadeSlide 0.2s ease" }}>
                    {group.exercises.map(ex=>(
                      <div key={ex.id} style={{ background:"#0A0C12",border:"1px solid #1E2130",borderRadius:"12px",padding:"14px 15px",marginBottom:"8px",borderLeft:`3px solid ${group.color}` }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:"6px",flex:1,flexWrap:"wrap" }}>
                            <span style={{ fontSize:"14px",fontWeight:"700" }}>{ex.name}</span>
                            {ex.isCustom&&<span style={{ fontSize:"9px",background:"#FF8C4230",color:"#FF8C42",borderRadius:"4px",padding:"1px 5px",fontWeight:"700",letterSpacing:"1px" }}>CUSTOM</span>}
                          </div>
                          <div style={{ display:"flex",gap:"7px",flexShrink:0,alignItems:"center" }}>
                            <span style={{ background:group.color+"20",color:group.color,borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontWeight:"700" }}>{ex.sets}</span>
                            {ex.isCustom&&<button onClick={()=>deleteCustomExercise(key,ex.id)} style={{ background:"#2A0A0A",border:"1px solid #441010",borderRadius:"6px",color:"#FF4D4D",cursor:"pointer",fontSize:"11px",padding:"2px 7px",fontFamily:"'DM Sans',sans-serif",fontWeight:"700" }}>del</button>}
                          </div>
                        </div>
                        {ex.tip&&<div style={{ fontSize:"12px",color:"#555",marginTop:"6px",lineHeight:1.5 }}>💡 {ex.tip}</div>}
                        {ex.instructor&&ex.instructor!=="Custom"&&<div style={{ fontSize:"11px",color:"#333",marginTop:"3px" }}>Coach: {ex.instructor}</div>}
                      </div>
                    ))}
                    <button onClick={()=>{setCustomModalDefaultMuscle(key);setShowCustomModal(true);}} style={{ width:"100%",background:"transparent",border:`1px dashed ${group.color}50`,borderRadius:"10px",color:group.color,padding:"11px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"'DM Sans',sans-serif",marginTop:"4px" }}>+ Add custom to {group.label}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ PROGRESS TAB ══════════════ */}
        {activeTab==="progress"&&(
          <div>
            {/* Stats */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"22px" }}>
              {[
                { label:"Exercises Logged", value:totalLogged,      icon:"📊", color:"#FF4D4D" },
                { label:"Completed Today",  value:completedCount,   icon:"✅", color:"#2ECC71" },
                { label:"Total Exercises",  value:allExerciseCount, icon:"💪", color:"#4D9FFF" },
                { label:"Custom Exercises", value:totalCustom,      icon:"✨", color:"#FFD700" },
              ].map(s=>(
                <div key={s.label} style={{ background:"#0F1117",border:"1px solid #1E2130",borderRadius:"15px",padding:"16px",borderTop:`3px solid ${s.color}` }}>
                  <div style={{ fontSize:"26px",marginBottom:"3px" }}>{s.icon}</div>
                  <div style={{ fontSize:"26px",fontWeight:"900",color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:"11px",color:"#444",letterSpacing:"0.5px",marginTop:"2px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress Graph */}
            <ProgressGraph weightLogs={weightLogs} muscleGroups={muscleGroups}/>

            {/* Workout Calendar */}
            <WorkoutCalendar weightLogs={weightLogs} muscleGroups={muscleGroups}/>

            {/* Backup & Restore */}
            <div style={{ background:"#0F1117",border:"1px solid #1E2130",borderRadius:"16px",padding:"20px",marginBottom:"24px" }}>
              <div style={sectionTitle}>BACKUP & RESTORE</div>
              {backupMsg&&<div style={{ background:backupMsg.startsWith("✓")?"#0D2A1A":"#2A0D0D",border:`1px solid ${backupMsg.startsWith("✓")?"#2ECC7150":"#FF4D4D50"}`,borderRadius:"10px",padding:"10px 14px",fontSize:"13px",fontWeight:"600",color:backupMsg.startsWith("✓")?"#2ECC71":"#FF6B6B",marginBottom:"14px" }}>{backupMsg}</div>}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"14px" }}>
                <button onClick={handleBackup} style={{ background:"#0D1F14",border:"1px solid #2ECC7130",borderRadius:"13px",color:"#2ECC71",padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px" }}>
                  <span style={{ fontSize:"26px" }}>💾</span>
                  <span style={{ fontSize:"13px",fontWeight:"700" }}>Backup Data</span>
                  <span style={{ fontSize:"10px",color:"#2ECC7170",fontWeight:"400" }}>Export as JSON</span>
                </button>
                <button onClick={()=>fileInputRef.current?.click()} style={{ background:"#0D141F",border:"1px solid #4D9FFF30",borderRadius:"13px",color:"#4D9FFF",padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px" }}>
                  <span style={{ fontSize:"26px" }}>📂</span>
                  <span style={{ fontSize:"13px",fontWeight:"700" }}>Restore Data</span>
                  <span style={{ fontSize:"10px",color:"#4D9FFF70",fontWeight:"400" }}>Import JSON file</span>
                </button>
                <button onClick={handleClear} style={{ background:"#1F0D0D",border:"1px solid #FF4D4D30",borderRadius:"13px",color:"#FF4D4D",padding:"16px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px" }}>
                  <span style={{ fontSize:"26px" }}>🗑️</span>
                  <span style={{ fontSize:"13px",fontWeight:"700" }}>Clear All</span>
                  <span style={{ fontSize:"10px",color:"#FF4D4D70",fontWeight:"400" }}>Delete everything</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display:"none" }} onChange={handleRestore}/>
              <div style={{ fontSize:"11px",color:"#2A2D3A",lineHeight:1.6 }}>Backup includes: weight logs, custom exercises, weekly split, and completion history.</div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalExercise&&<WeightModal exercise={modalExercise} onClose={()=>setModalExercise(null)} onSave={entries=>saveWeights(modalExercise.id,entries)} existing={getLastLog(modalExercise.id)}/>}
      {showCustomModal&&<CustomExerciseModal muscleGroups={muscleGroups} defaultMuscle={customModalDefaultMuscle} onClose={()=>setShowCustomModal(false)} onSave={addCustomExercise}/>}
      {splitEditorDay&&<SplitEditorModal day={splitEditorDay} currentMuscles={weeklySplit[splitEditorDay]||[]} muscleGroups={muscleGroups} onClose={()=>setSplitEditorDay(null)} onSave={muscles=>setWeeklySplit(p=>({...p,[splitEditorDay]:muscles}))}/>}
    </div>
  );
}