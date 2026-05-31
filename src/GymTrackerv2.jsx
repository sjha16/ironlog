import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

import WeightModal from "./components/modals/WeightModal";
import CustomExerciseModal from "./components/modals/CustomExerciseModal";
import WorkoutCalendar from "./components/WorkoutCalender";
import SplitEditorModal from "./components/modals/SplitEditorModal";
import ProgressGraph from "./components/ProgressGraph";
import {
  STORAGE_KEY,
  saveToLocalStorage,
  loadFromLocalStorage,
} from "./utils/storage";
import {
  NOW,
  weekdays,
  TODAY_IDX,
  isFutureDay,
  getTargetDateStr,
  getWeekDates,
  formatDateLocal,
  formatWeekRange,
} from "./utils/dateUtils";

import { BASE_MUSCLE_GROUPS, DEFAULT_SPLIT } from "./data/muscleGroups";
import { sectionTitle } from "./styles/theme";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function GymTracker() {
  const today = weekdays[TODAY_IDX];

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDay, setSelectedDay] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);

  const [weightLogs, setWeightLogs] = useState({});
  const [dayStatus, setDayStatus] = useState({});

  const [customExercises, setCustomExercises] = useState({});
  const [weeklySplit, setWeeklySplit] = useState(DEFAULT_SPLIT);
  const [splitHistory, setSplitHistory] = useState({});
  const [modalExercise, setModalExercise] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalDefaultMuscle, setCustomModalDefaultMuscle] =
    useState(null);
  const [splitEditorDay, setSplitEditorDay] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [workoutSessions, setWorkoutSessions] = useState({});
  const [editingPastEntry, setEditingPastEntry] = useState(false);
  const fileInputRef = useRef();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromLocalStorage();
    console.log("Loaded from storage:", stored);

    if (stored) {
      if (stored.weightLogs) setWeightLogs(stored.weightLogs);
      if (stored.customExercises) setCustomExercises(stored.customExercises);
      if (stored.weeklySplit) setWeeklySplit(stored.weeklySplit);
      if (stored.splitHistory) setSplitHistory(stored.splitHistory);
      if (stored.workoutSessions) {
        setWorkoutSessions(normalizeWorkoutSessions(stored.workoutSessions));
      }
      if (stored.dayStatus) {
        setDayStatus(stored.dayStatus);
      }
    }

    setLoading(false);
  }, []);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    if (loading) return;
    saveToLocalStorage({
      weightLogs,
      customExercises,
      weeklySplit,
      splitHistory,
      workoutSessions,
      dayStatus,
    });
  }, [
    loading,
    weightLogs,
    customExercises,
    dayStatus,
    weeklySplit,
    splitHistory,
    workoutSessions,
  ]);

  const startWorkout = () => {
    const dateStr = getTargetDateStr(today);

    setWorkoutSessions((prev) => {
      const daySessions = prev[dateStr] || [];

      // prevent double-start if one is already active
      if (daySessions.some((s) => !s.endTime)) return prev;

      return {
        ...prev,
        [dateStr]: [
          ...daySessions,
          {
            startTime: new Date().toISOString(),
            endTime: null,
            durationMin: null,
          },
        ],
      };
    });
  };

  const endWorkout = () => {
    const dateStr = getTargetDateStr(today);

    setWorkoutSessions((prev) => {
      const daySessions = prev[dateStr];
      if (!daySessions || daySessions.length === 0) return prev;

      let openIndex = -1;
      for (let i = daySessions.length - 1; i >= 0; i--) {
        if (!daySessions[i].endTime) {
          openIndex = i;
          break;
        }
      }

      if (openIndex === -1) return prev;

      const endTime = new Date().toISOString();
      const durationMin = Math.max(
        1,
        Math.round(
          (new Date(endTime) - new Date(daySessions[openIndex].startTime)) /
            60000,
        ),
      );

      const updatedDaySessions = daySessions.map((s, idx) =>
        idx === openIndex
          ? {
              ...s,
              endTime,
              durationMin,
            }
          : s,
      );

      return {
        ...prev,
        [dateStr]: updatedDaySessions,
      };
    });
  };
  const formatMinutes = (min) => {
    if (min == null) return "--";
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    return `${h} hr ${m} min`;
  };
  const formatLastLog = (lastLog, logType) => {
    if (!Array.isArray(lastLog) || lastLog.length === 0) return "";

    const parts = lastLog
      .filter((s) => s.weight || s.reps || s.time)
      .map((s) => {
        if (logType === "timer") {
          return `${s.time || "–"} sec`;
        }

        if (logType === "reps_only") {
          return `${s.reps || "–"} reps`;
        }

        if (logType === "weight_time") {
          return `${s.weight || "–"}kg × ${s.time || "–"} sec`;
        }

        return `${s.weight || "–"}kg × ${s.reps || "–"}`;
      });

    return parts.join(" · ");
  };
  // Derived: is the selected day in the future?
  const selectedDayIdx = weekdays.indexOf(selectedDay);
  const selectedWeekDates = useMemo(
    () => getWeekDates(weekOffset),
    [weekOffset],
  );
  const selectedDateStr = formatDateLocal(selectedWeekDates[selectedDayIdx]);
  const selectedIsFuture = weekOffset === 0 && isFutureDay(selectedDayIdx);
  const selectedWeekRange = useMemo(
    () => formatWeekRange(selectedWeekDates),
    [selectedWeekDates],
  );

  const getWeekdayForDate = useCallback(
    (dateStr) => {
      const date = new Date(`${dateStr}T00:00:00`);
      if (Number.isNaN(date.getTime())) return selectedDay;

      const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
      return weekdays[dayIdx];
    },
    [selectedDay],
  );

  const getLoggedSplitForDate = useCallback(
    (dateStr) => {
      const exerciseMuscleMap = {};

      Object.entries(BASE_MUSCLE_GROUPS).forEach(([muscleKey, group]) => {
        group.exercises.forEach((ex) => {
          exerciseMuscleMap[ex.id] = muscleKey;
        });
      });

      Object.entries(customExercises).forEach(([muscleKey, exercises]) => {
        (exercises || []).forEach((ex) => {
          exerciseMuscleMap[ex.id] = muscleKey;
        });
      });

      const loggedMuscles = [];

      Object.entries(weightLogs).forEach(([exId, logs]) => {
        const muscleKey = exerciseMuscleMap[exId];
        if (!muscleKey || loggedMuscles.includes(muscleKey)) return;

        const hasLogForDate = Object.keys(logs || {}).some((key) =>
          key.endsWith(dateStr),
        );

        if (hasLogForDate) loggedMuscles.push(muscleKey);
      });

      return loggedMuscles;
    },
    [customExercises, weightLogs],
  );

  const splitsMatch = useCallback((a = [], b = []) => {
    if (a.length !== b.length) return false;
    return a.every((item, idx) => item === b[idx]);
  }, []);

  const ensureSplitSnapshot = useCallback(
    (dateStr, source = "weekly") => {
      if (!dateStr) return;

      setSplitHistory((prev) => {
        const weekday = getWeekdayForDate(dateStr);
        const snapshot =
          source === "logs"
            ? getLoggedSplitForDate(dateStr)
            : weeklySplit[weekday] || [];

        if (Array.isArray(prev[dateStr])) {
          if (
            source === "logs" &&
            snapshot.length > 0 &&
            !splitsMatch(prev[dateStr], snapshot)
          ) {
            return {
              ...prev,
              [dateStr]: [...snapshot],
            };
          }

          return prev;
        }

        return {
          ...prev,
          [dateStr]: [...snapshot],
        };
      });
    },
    [getLoggedSplitForDate, getWeekdayForDate, splitsMatch, weeklySplit],
  );

  // Historical dates must render from splitHistory only so old weeks do not inherit the current weekly split.
  const getVisibleSplitForDate = useCallback(
    (dateStr, day, offset) => {
      if (offset === 0) return weeklySplit[day] || [];
      const loggedSplit = getLoggedSplitForDate(dateStr);
      if (loggedSplit.length > 0) return loggedSplit;
      return splitHistory[dateStr] || [];
    },
    [getLoggedSplitForDate, splitHistory, weeklySplit],
  );

  const updateSplitSnapshot = useCallback((dateStr, newSplit) => {
    if (!dateStr) return;

    setSplitHistory((prev) => ({
      ...prev,
      [dateStr]: [...newSplit],
    }));
  }, []);

  useEffect(() => {
    if (loading) return;
    ensureSplitSnapshot(selectedDateStr, weekOffset === 0 ? "weekly" : "logs");
  }, [ensureSplitSnapshot, loading, selectedDateStr, weekOffset]);

  const muscleGroups = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(BASE_MUSCLE_GROUPS).map(([key, group]) => [
          key,
          {
            ...group,
            exercises: [...group.exercises, ...(customExercises[key] || [])],
          },
        ]),
      ),
    [customExercises],
  );

  const todayMuscles = useMemo(
    () => getVisibleSplitForDate(selectedDateStr, selectedDay, weekOffset),
    [getVisibleSplitForDate, selectedDateStr, selectedDay, weekOffset],
  );
  const todayExercises = useMemo(
    () =>
      todayMuscles.flatMap((mg) =>
        (muscleGroups[mg]?.exercises || []).map((ex) => ({
          ...ex,
          muscleGroup: mg,
        })),
      ),
    [muscleGroups, todayMuscles],
  );
  const normalizeWorkoutSessions = (sessions) => {
    if (!sessions || typeof sessions !== "object") return {};

    const out = {};

    Object.entries(sessions).forEach(([dateKey, value]) => {
      if (Array.isArray(value)) {
        out[dateKey] = value;
      } else if (value && typeof value === "object") {
        out[dateKey] = [value];
      }
    });

    return out;
  };

  const isTodaySelected = weekOffset === 0 && selectedDay === today;

  // const hasWorkoutDataForSelectedDay =
  //   (workoutSessions[selectedDateStr]?.length || 0) > 0 ||
  //   Object.keys(weightLogs).some((exId) =>
  //     Object.keys(weightLogs[exId] || {}).some((key) =>
  //       key.endsWith(selectedDateStr),
  //     ),
  //   );

  const currentDayStatus = dayStatus[selectedDateStr];

  const shouldAskDayType = isTodaySelected && !currentDayStatus;

  // const effectiveDayStatus =
  //   currentDayStatus || (hasWorkoutDataForSelectedDay ? "workout" : null);
  const selectedDaySessions = useMemo(
    () => workoutSessions[selectedDateStr] || [],
    [workoutSessions, selectedDateStr],
  );
  const activeSession = selectedDaySessions.find((s) => !s.endTime) || null;
  const totalSelectedMinutes = selectedDaySessions.reduce(
    (sum, s) => sum + (s.durationMin || 0),
    0,
  );
  const isRestDay = currentDayStatus === "rest";
  const isWorkoutDay = currentDayStatus === "workout";
  //const selectedSession = workoutSessions[selectedDateStr] || null;

  const selectedExercises = useMemo(() => {
    const seen = new Set();

    return todayExercises.filter((ex) => {
      if (seen.has(ex.id)) return false;
      seen.add(ex.id);
      return true;
    });
  }, [todayExercises]);

  const selectedMuscles = useMemo(() => {
    return [...todayMuscles];
  }, [todayMuscles]);

  const selectedExercisesByMuscle = useMemo(
    () =>
      selectedExercises.reduce((acc, ex) => {
        if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
        acc[ex.muscleGroup].push(ex);
        return acc;
      }, {}),
    [selectedExercises],
  );

  const selectedWeekLoggedDates = useMemo(() => {
    const dates = new Set();
    const datePattern = /\d{4}-\d{2}-\d{2}/;

    Object.values(weightLogs).forEach((logs) => {
      Object.keys(logs || {}).forEach((dateKey) => {
        const match = dateKey.match(datePattern);
        if (match) dates.add(match[0]);
      });
    });

    Object.entries(workoutSessions).forEach(([dateStr, sessions]) => {
      if (Array.isArray(sessions) && sessions.length > 0) {
        dates.add(dateStr);
      }
    });

    return dates;
  }, [weightLogs, workoutSessions]);

  const completedCount = selectedExercises.filter((ex) => {
    const logs = weightLogs[ex.id];
    if (!logs) return false;

    return Object.keys(logs).some((key) => key.includes(selectedDateStr));
  }).length;

  const progress =
    todayExercises.length > 0 ? (completedCount / todayExercises.length) * 100 : 0;
  const totalCustom = Object.values(customExercises).flat().length;
  const allExerciseCount = Object.values(muscleGroups).reduce(
    (s, g) => s + g.exercises.length,
    0,
  );
  const totalLogged = Object.keys(weightLogs).length;
  const workoutStreak = useMemo(() => {
    const workoutDates = new Set();
    const datePattern = /\d{4}-\d{2}-\d{2}/;

    Object.entries(workoutSessions).forEach(([dateStr, sessions]) => {
      if (Array.isArray(sessions) && sessions.length > 0) {
        workoutDates.add(dateStr);
      }
    });

    Object.values(weightLogs).forEach((logs) => {
      Object.keys(logs || {}).forEach((dateKey) => {
        const match = dateKey.match(datePattern);
        if (match) workoutDates.add(match[0]);
      });
    });

    const sortedDates = [...workoutDates].sort();
    const formatDay = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    let current = 0;
    const latestDateStr = sortedDates[sortedDates.length - 1];
    const cursor = latestDateStr ? new Date(`${latestDateStr}T00:00:00`) : null;

    while (cursor && workoutDates.has(formatDay(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    let best = 0;
    let running = 0;
    let previous = null;

    sortedDates.forEach((dateStr) => {
      const date = new Date(`${dateStr}T00:00:00`);
      const isConsecutive =
        previous && Math.round((date - previous) / 86400000) === 1;

      running = isConsecutive ? running + 1 : 1;
      best = Math.max(best, running);
      previous = date;
    });

    return { current, best };
  }, [weightLogs, workoutSessions]);

  // saveWeights: uses selected day’s actual calendar date
  const saveWeights = useCallback(
    (exId, entries) => {
      const dateKey = `${selectedDay} · ${selectedDateStr}`;

      setWeightLogs((prev) => {
        const logs = prev[exId] || {};

        // 🔥 DELETE case
        if (!entries || entries.length === 0) {
          const updated = { ...logs };
          delete updated[dateKey];

          if (Object.keys(updated).length === 0) {
            const newState = { ...prev };
            delete newState[exId];
            return newState;
          }

          return {
            ...prev,
            [exId]: updated,
          };
        }

        // ✅ SAVE case
        return {
          ...prev,
          [exId]: {
            ...logs,
            [dateKey]: entries,
          },
        };
      });
    },
    [selectedDay, selectedDateStr],
  );
  const getLastLogForExercise = useCallback(
    (exId) => {
      const logs = weightLogs[exId];
      if (!logs) return null;

      const entries = Object.entries(logs);
      if (entries.length === 0) return null;

      const sorted = entries.sort((a, b) => {
        const dateA = new Date(a[0].split(" · ")[1]);
        const dateB = new Date(b[0].split(" · ")[1]);
        return dateA - dateB;
      });

      return sorted[sorted.length - 1][1];
    },
    [weightLogs],
  );

  const getLogForSelectedDay = useCallback(
    (exId) => {
      const logs = weightLogs[exId];
      if (!logs) return null;

      const entry = Object.entries(logs).find(([key]) =>
        key.endsWith(selectedDateStr),
      );

      return entry ? entry[1] : null;
    },
    [selectedDateStr, weightLogs],
  );

  const addCustomExercise = useCallback(
    (ex, k) =>
      setCustomExercises((p) => ({ ...p, [k]: [...(p[k] || []), ex] })),
    [],
  );
  const deleteCustomExercise = useCallback(
    (k, id) =>
      setCustomExercises((p) => ({
        ...p,
        [k]: (p[k] || []).filter((e) => e.id !== id),
      })),
    [],
  );

  const handleBackup = async () => {
    try {
      const data = {
        weightLogs,
        customExercises,
        workoutSessions,
        dayStatus,
        weeklySplit,
        splitHistory,
        exportedAt: new Date().toISOString(),
      };

      const fileName = `ironlog-backup-${Date.now()}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      if (Capacitor.getPlatform() === "web") {
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();

        URL.revokeObjectURL(url);

        setBackupMsg("✓ Backup downloaded!");
      } else {
        // 🔥 SAVE WITH UTF-8 (CRITICAL FIX)
        await Filesystem.writeFile({
          path: fileName,
          data: jsonData,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        const fileUri = await Filesystem.getUri({
          directory: Directory.Cache,
          path: fileName,
        });

        await Share.share({
          title: "IronLog Backup",
          url: fileUri.uri,
        });

        setBackupMsg("✓ Backup shared!");
        setTimeout(() => setBackupMsg(""), 3500);
      }
    } catch (error) {
      console.error("Backup error:", error);
      setBackupMsg("❌ Backup failed");
    }
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.weightLogs) setWeightLogs(d.weightLogs);
        //if (d.completedExercises) setCompletedExercises(d.completedExercises);
        if (d.customExercises) setCustomExercises(d.customExercises);
        if (d.dayStatus) setDayStatus(d.dayStatus);
        if (d.workoutSessions) setWorkoutSessions(d.workoutSessions);
        if (d.weeklySplit) setWeeklySplit(d.weeklySplit);
        setSplitHistory(d.splitHistory || {});
        setBackupMsg("✓ Data restored! Welcome back.");
      } catch {
        setBackupMsg("✗ Invalid backup file.");
      }
      setTimeout(() => setBackupMsg(""), 3500);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClear = () => {
    if (
      window.confirm(
        "⚠️  This will DELETE all your data including weight logs, custom exercises, and your workout split.\n\nBackup your data first if you want to keep it.\n\nAre you sure?",
      )
    ) {
      localStorage.removeItem(STORAGE_KEY);

      setWeightLogs({});
      //setCompletedExercises({});
      setCustomExercises({});
      setWeeklySplit(DEFAULT_SPLIT);
      setSplitHistory({});
      setWorkoutSessions({});
      setDayStatus({});

      setBackupMsg("✓ All data cleared.");
      setTimeout(() => setBackupMsg(""), 3500);

      // 🔥 THIS IS THE FINAL FIX
      window.location.reload();
    }
  };
  // ── Exercise Card ──
  const ExerciseCard = useCallback(
    ({ ex, group, showDelete }) => {
      const done = (() => {
        const logs = weightLogs[ex.id];
        if (!logs) return false;

        return Object.keys(logs).some((key) => key.endsWith(selectedDateStr));
      })();
      const lastLog = getLastLogForExercise(ex.id);
      const muscleKey =
        ex.muscleGroup ||
        Object.keys(muscleGroups).find((k) =>
          muscleGroups[k].exercises.some((e) => e.id === ex.id),
        );
      // Disable logging if viewing a future day
      const canLog =
        editingPastEntry ||
        (isTodaySelected && isWorkoutDay && !!activeSession);
      const isPastDay = !isTodaySelected && !selectedIsFuture;

      return (
        <div
          style={{
            background: done ? `${group.color}12` : "#0F1117",
            border: `1px solid ${done ? group.color + "50" : "#1E2130"}`,
            borderRadius: "14px",
            padding: "15px",
            marginBottom: "10px",
            transition: "all 0.25s",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "11px" }}
          >
            <button
              onClick={() => canLog && setModalExercise(ex)}
              disabled={!canLog}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "8px",
                border: `2px solid ${done ? group.color : "#2A2D3A"}`,
                background: done ? group.color : "transparent",
                cursor: canLog ? "pointer" : "not-allowed",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "13px",
                marginTop: "1px",
                transition: "all 0.2s",
              }}
            >
              {done ? "✓" : ""}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      textDecoration: done ? "line-through" : "none",
                      color: done ? "#555" : "#F0F0F0",
                    }}
                  >
                    {ex.name}
                  </span>
                  {ex.isCustom && (
                    <span
                      style={{
                        fontSize: "9px",
                        background: "#FF8C4230",
                        color: "#FF8C42",
                        borderRadius: "4px",
                        padding: "1px 6px",
                        fontWeight: "700",
                        letterSpacing: "1px",
                        flexShrink: 0,
                      }}
                    >
                      CUSTOM
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      background: group.color + "20",
                      color: group.color,
                      borderRadius: "7px",
                      padding: "2px 9px",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    {ex.sets}
                  </span>
                  {showDelete && ex.isCustom && (
                    <button
                      onClick={() => deleteCustomExercise(muscleKey, ex.id)}
                      style={{
                        background: "#2A0A0A",
                        border: "1px solid #441010",
                        borderRadius: "6px",
                        color: "#FF4D4D",
                        cursor: "pointer",
                        fontSize: "11px",
                        padding: "2px 7px",
                        fontFamily: "'DM Sans',sans-serif",
                        fontWeight: "700",
                      }}
                    >
                      del
                    </button>
                  )}
                </div>
              </div>
              {ex.tip && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    marginTop: "5px",
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}
                >
                  "{ex.tip}"
                </div>
              )}
              {ex.instructor && ex.instructor !== "Custom" && (
                <div
                  style={{ fontSize: "11px", color: "#333", marginTop: "2px" }}
                >
                  — {ex.instructor}
                </div>
              )}
              {lastLog && (
                <div
                  style={{
                    fontSize: "11px",
                    color: group.color,
                    marginTop: "7px",
                    fontWeight: "600",
                  }}
                >
                  Last: {formatLastLog(lastLog, ex.logType || "weight_reps")}
                </div>
              )}
              {/* Log weights only allowed after workout starts on today */}
              {canLog ? (
                <button
                  onClick={() => setModalExercise(ex)}
                  style={{
                    marginTop: "10px",
                    background: group.color + "18",
                    border: `1px solid ${group.color}35`,
                    borderRadius: "8px",
                    color: group.color,
                    padding: "6px 14px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "700",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  ⚖ Log Weights
                </button>
              ) : (
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "11px",
                    color: "#333",
                    fontStyle: "italic",
                  }}
                >
                  {isPastDay ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#333",
                          fontStyle: "italic",
                        }}
                      >
                        📖 Past workout — view only
                      </span>

                      <button
                        onClick={() => {
                          setEditingPastEntry(true);
                          setModalExercise(ex);
                        }}
                        style={{
                          background: "#1A1D26",
                          border: "1px solid #2A2D3A",
                          borderRadius: "6px",
                          color: "#888",
                          fontSize: "10px",
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontWeight: "700",
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ) : selectedDaySessions.length > 0 ? (
                    "✅ Workout completed"
                  ) : (
                    "🔒 Start workout to log exercises"
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    },
    [
      weightLogs,
      muscleGroups,
      deleteCustomExercise,
      selectedDateStr,
      selectedIsFuture,
      activeSession,
      editingPastEntry,
      getLastLogForExercise,
      isWorkoutDay,
      isTodaySelected,
      selectedDaySessions,
    ],
  );

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080A0F",
          color: "#FF4D4D",
          fontSize: "20px",
          fontWeight: "700",
        }}
      >
        Loading IronLog...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080A0F",
        color: "#F0F0F0",
        fontFamily: "'DM Sans',sans-serif",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
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
      <div
        style={{
          padding: "20px 20px 0",
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#080A0F",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "18px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: "30px",
                letterSpacing: "3px",
                lineHeight: 1,
                color: "#FF4D4D",
              }}
            >
              IRON LOG
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#444",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              Bodybuilding Tracker
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{ fontSize: "10px", color: "#444", letterSpacing: "1px" }}
            >
              TODAY
            </div>
            <div style={{ fontSize: "18px", fontWeight: "900" }}>
              {NOW.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "#0D0F17",
            borderRadius: "12px",
            padding: "4px",
          }}
        >
          {[
            ["today", "Today"],
            ["library", "Library"],
            ["progress", "Progress"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1,
                padding: "10px 4px",
                borderRadius: "9px",
                border: "none",
                cursor: "pointer",
                background:
                  activeTab === key
                    ? "linear-gradient(135deg,#FF4D4D,#FF6B35)"
                    : "transparent",
                color: activeTab === key ? "#fff" : "#555",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.5px",
                transition: "all 0.2s",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ padding: "18px 20px 100px", animation: "fadeSlide 0.3s ease" }}
      >
        {/* ══════════════ TODAY TAB ══════════════ */}
        {currentDayStatus && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 10px",
              borderRadius: "999px",
              marginBottom: "12px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.5px",
              background:
                currentDayStatus === "workout" ? "#15311F" : "#1C1A12",
              color: currentDayStatus === "workout" ? "#2ECC71" : "#FFD700",
              border:
                currentDayStatus === "workout"
                  ? "1px solid #2ECC7130"
                  : "1px solid #FFD70030",
            }}
          >
            {currentDayStatus === "workout" ? "Workout Day" : "Rest Day"}
          </div>
        )}
        {currentDayStatus && (
          <button
            onClick={() =>
              setDayStatus((prev) => {
                const updated = { ...prev };
                delete updated[selectedDateStr];
                return updated;
              })
            }
            style={{
              marginLeft: "10px",
              background: "#1A1D26",
              border: "1px solid #2A2D3A",
              borderRadius: "8px",
              color: "#888",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            Change
          </button>
        )}

        {shouldAskDayType && (
          <div
            style={{
              background: "#10141C",
              border: "1px solid #2A2D3A",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#F0F0F0",
                marginBottom: "8px",
              }}
            >
              Is this a workout day or a rest day?
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() =>
                  setDayStatus((prev) => ({
                    ...prev,
                    [selectedDateStr]: "workout",
                  }))
                }
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg,#2ECC71,#27AE60)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  padding: "10px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                Workout Day
              </button>

              <button
                onClick={() =>
                  setDayStatus((prev) => ({
                    ...prev,
                    [selectedDateStr]: "rest",
                  }))
                }
                style={{
                  flex: 1,
                  background: "#1A1D26",
                  border: "1px solid #2A2D3A",
                  borderRadius: "10px",
                  color: "#888",
                  padding: "10px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                Rest Day
              </button>
            </div>
          </div>
        )}

        {activeTab === "today" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <button
                onClick={() => setWeekOffset((offset) => offset - 1)}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  border: "1px solid #2A2D3A",
                  background: "#1A1D26",
                  color: "#FF8C42",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: "900",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Previous week"
              >
                ‹
              </button>

              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: "#F0F0F0",
                  fontSize: "13px",
                  fontWeight: "800",
                  letterSpacing: "0.3px",
                }}
              >
                {selectedWeekRange}
              </div>

              <button
                onClick={() =>
                  setWeekOffset((offset) => Math.min(offset + 1, 0))
                }
                disabled={weekOffset === 0}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  border: "1px solid #2A2D3A",
                  background: weekOffset === 0 ? "#111" : "#1A1D26",
                  color: weekOffset === 0 ? "#2A2D3A" : "#FF8C42",
                  cursor: weekOffset === 0 ? "not-allowed" : "pointer",
                  fontSize: "18px",
                  fontWeight: "900",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Next week"
              >
                ›
              </button>
            </div>
            {/* Day picker — future days dimmed but still selectable to view the split */}
            <div
              style={{
                display: "flex",
                gap: "5px",
                marginBottom: "12px",
                overflowX: "auto",
                paddingBottom: "2px",
              }}
            >
              {weekdays.map((day, idx) => {
                const dateStr = formatDateLocal(selectedWeekDates[idx]);
                const isFuture = weekOffset === 0 && isFutureDay(idx);
                const isActive = selectedDay === day;
                const hasLoggedData = selectedWeekLoggedDates.has(dateStr);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      minWidth: "48px",
                      flex: 1,
                      padding: "9px 4px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      background: isActive
                        ? "linear-gradient(135deg,#FF4D4D,#FF6B35)"
                        : "#0F1117",
                      color: isActive
                        ? "#fff"
                        : isFuture
                          ? "#2A2D3A"
                          : day === today
                            ? "#FF8C42"
                            : "#555",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.5px",
                      outline:
                        day === today && !isActive
                          ? "1px solid #FF8C4240"
                          : "none",
                      fontFamily: "'DM Sans',sans-serif",
                      transition: "all 0.15s",
                      position: "relative",
                      minHeight: "36px",
                    }}
                  >
                    {day}
                    {hasLoggedData && !isFuture && (
                      <span
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: "4px",
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: isActive ? "#fff" : "#00AA00",
                          transform: "translateX(-50%)",
                        }}
                      />
                    )}
                    {isFuture && (
                      <span
                        style={{
                          position: "absolute",
                          top: "3px",
                          right: "3px",
                          fontSize: "7px",
                          color: "#333",
                        }}
                      >
                        🔒
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Future-day banner */}
            {selectedIsFuture && (
              <div
                style={{
                  background: "#1A1400",
                  border: "1px solid #FFD70030",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "20px" }}>🔒</span>
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#FFD700",
                    }}
                  >
                    Future Day
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#666",
                      marginTop: "2px",
                    }}
                  >
                    You can view the planned split but cannot log weights or
                    tick exercises until {selectedDay} arrives.
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#444" }}>
                {selectedMuscles.length > 0
                  ? selectedMuscles
                      .map((mg) => muscleGroups[mg]?.label)
                      .join(" + ")
                  : "Rest Day"}
              </div>
              {currentDayStatus !== "rest" && (
                <button
                  onClick={() => {
                    if (currentDayStatus === "rest") return;
                    setSplitEditorDay(selectedDay);
                  }}
                  style={{
                    background: "#1A1D26",
                    border: "1px solid #2A2D3A",
                    borderRadius: "8px",
                    color: "#FF8C42",
                    padding: "6px 13px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "700",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  ✏ Edit Split
                </button>
              )}
            </div>

            {/* WORKOUT SESSION SECTION */}

            {/* ONLY SHOW START/END BUTTONS ON TODAY */}
            {isTodaySelected && isWorkoutDay && (
              <>
                {!activeSession ? (
                  <button
                    onClick={startWorkout}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "none",
                      background: "linear-gradient(135deg,#2ECC71,#27AE60)",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "15px",
                      cursor: "pointer",
                      marginBottom: "14px",
                    }}
                  >
                    ▶ Start Workout
                  </button>
                ) : (
                  <div
                    style={{
                      background: "#11161F",
                      border: "1px solid #1F2937",
                      borderRadius: "14px",
                      padding: "14px",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        color: "#2ECC71",
                        fontWeight: "700",
                        marginBottom: "6px",
                      }}
                    >
                      Workout in Progress
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#888",
                        marginBottom: "10px",
                      }}
                    >
                      Started:{" "}
                      {new Date(activeSession.startTime).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </div>

                    <button
                      onClick={endWorkout}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "linear-gradient(135deg,#FF4D4D,#E74C3C)",
                        color: "#fff",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      ⏹ End Workout
                    </button>
                  </div>
                )}
              </>
            )}
            {isTodaySelected && isRestDay && (
              <div
                style={{
                  background: "#10141C",
                  border: "1px solid #2A2D3A",
                  borderRadius: "14px",
                  padding: "14px",
                  marginBottom: "14px",
                  textAlign: "center",
                  color: "#666",
                }}
              >
                🏖️ Rest day — no workout scheduled
              </div>
            )}

            {/* SHOW WORKOUT SUMMARY FOR ANY DAY */}
            {selectedDaySessions.length > 0 && (
              <div
                style={{
                  background: "#10141C",
                  border: "1px solid #2A2D3A",
                  borderRadius: "14px",
                  padding: "14px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    color: "#2ECC71",
                    fontWeight: "700",
                    marginBottom: "6px",
                  }}
                >
                  {isTodaySelected
                    ? "Today's Workout Summary"
                    : "Workout Summary"}
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    color: "#888",
                    lineHeight: 1.6,
                  }}
                >
                  <div>
                    Total Duration:{" "}
                    <strong style={{ color: "#F0F0F0" }}>
                      {formatMinutes(totalSelectedMinutes)}
                    </strong>
                  </div>
                  <div>Sessions: {selectedDaySessions.length}</div>
                </div>
              </div>
            )}
            {selectedExercises.length > 0 && !selectedIsFuture && (
              <div
                style={{
                  background: "linear-gradient(135deg,#0F1117,#141720)",
                  borderRadius: "18px",
                  padding: "20px",
                  marginBottom: "20px",
                  border: "1px solid #1E2130",
                  animation: progress === 100 ? "glow 2s infinite" : "none",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "18px" }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "76px",
                      height: "76px",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="76" height="76" viewBox="0 0 76 76">
                      <circle
                        cx="38"
                        cy="38"
                        r="32"
                        fill="none"
                        stroke="#1E2130"
                        strokeWidth="6"
                      />
                      <circle
                        cx="38"
                        cy="38"
                        r="32"
                        fill="none"
                        stroke={progress === 100 ? "#2ECC71" : "#FF4D4D"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 32}`}
                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress / 100)}`}
                        transform="rotate(-90 38 38)"
                        style={{ transition: "stroke-dashoffset 0.5s ease" }}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "900",
                        color: progress === 100 ? "#2ECC71" : "#FF4D4D",
                      }}
                    >
                      {Math.round(progress)}%
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "900",
                        lineHeight: 1.2,
                      }}
                    >
                      {progress === 100
                        ? "🔥 Crushed It!"
                        : `${completedCount} / ${todayExercises.length} done`}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        marginTop: "2px",
                      }}
                    >
                      exercises completed
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "5px",
                        marginTop: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {selectedMuscles.map((mg) => (
                        <span
                          key={mg}
                          style={{
                            background: muscleGroups[mg]?.color + "20",
                            color: muscleGroups[mg]?.color,
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 7px",
                            borderRadius: "5px",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            border: `1px solid ${muscleGroups[mg]?.color}40`,
                          }}
                        >
                          {muscleGroups[mg]?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentDayStatus === "rest" ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "52px 20px",
                  color: "#333",
                }}
              >
                <div style={{ fontSize: "44px", marginBottom: "10px" }}>😴</div>
                <div
                  style={{ fontSize: "20px", fontWeight: "700", color: "#555" }}
                >
                  Rest Day
                </div>
                <div style={{ fontSize: "13px", marginTop: "6px" }}>
                  Recovery is where gains are made.
                </div>
                <button
                  onClick={() => {
                    if (currentDayStatus === "rest") return;
                    setSplitEditorDay(selectedDay);
                  }}
                  style={{
                    marginTop: "20px",
                    background: "#1A1D26",
                    border: "1px solid #2A2D3A",
                    borderRadius: "10px",
                    color: currentDayStatus === "rest" ? "#555" : "#FF8C42",
                    padding: "12px 24px",
                    cursor:
                      currentDayStatus === "rest" ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: "700",
                    fontFamily: "'DM Sans',sans-serif",
                    opacity: currentDayStatus === "rest" ? 0.7 : 1,
                  }}
                >
                  {currentDayStatus === "rest"
                    ? "🔒 Rest Day — Split Locked"
                    : `+ Add Muscles for ${selectedDay}`}
                </button>
              </div>
            ) : (
              <>
                {selectedMuscles.map((mg) => {
                  const group = muscleGroups[mg];
                  if (!group) return null;
                  const exercises = selectedExercisesByMuscle[mg] || [];
                  return (
                    <div key={mg} style={{ marginBottom: "22px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "10px",
                        }}
                      >
                        <span style={{ fontSize: "16px", color: group.color }}>
                          {group.icon}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "2px",
                            textTransform: "uppercase",
                            color: group.color,
                          }}
                        >
                          {group.label}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: "1px",
                            background: `linear-gradient(90deg,${group.color}40,transparent)`,
                          }}
                        />
                      </div>
                      {exercises.map((ex) => (
                        <ExerciseCard
                          key={ex.id}
                          ex={ex}
                          group={group}
                          showDelete={true}
                        />
                      ))}
                    </div>
                  );
                })}
                {!selectedIsFuture && (
                  <button
                    onClick={() => {
                      setCustomModalDefaultMuscle(todayMuscles[0] || null);
                      setShowCustomModal(true);
                    }}
                    style={{
                      width: "100%",
                      background: "#0D0F17",
                      border: "1px dashed #2A2D3A",
                      borderRadius: "13px",
                      color: "#FF8C42",
                      padding: "15px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "700",
                      fontFamily: "'DM Sans',sans-serif",
                      marginTop: "4px",
                    }}
                  >
                    + Add Custom Exercise
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════ LIBRARY TAB ══════════════ */}
        {activeTab === "library" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#444",
                  letterSpacing: "1.5px",
                }}
              >
                {allExerciseCount} TOTAL ·{" "}
                {totalCustom > 0 ? `${totalCustom} CUSTOM` : "NO CUSTOM YET"}
              </div>
              <button
                onClick={() => {
                  setCustomModalDefaultMuscle(null);
                  setShowCustomModal(true);
                }}
                style={{
                  background: "linear-gradient(135deg,#FF4D4D,#FF8C42)",
                  border: "none",
                  borderRadius: "9px",
                  color: "#fff",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "700",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                + Custom
              </button>
            </div>
            {Object.entries(muscleGroups).map(([key, group]) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <button
                  onClick={() =>
                    setExpandedGroup(expandedGroup === key ? null : key)
                  }
                  style={{
                    width: "100%",
                    background:
                      expandedGroup === key ? `${group.color}15` : "#0F1117",
                    border: `1px solid ${expandedGroup === key ? group.color + "50" : "#1E2130"}`,
                    borderRadius: "13px",
                    padding: "14px 18px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "#F0F0F0",
                    fontFamily: "'DM Sans',sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "11px",
                    }}
                  >
                    <span style={{ fontSize: "20px", color: group.color }}>
                      {group.icon}
                    </span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "15px", fontWeight: "700" }}>
                        {group.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "#444" }}>
                        {group.exercises.length} exercises
                        {(customExercises[key] || []).length > 0
                          ? ` · ${(customExercises[key] || []).length} custom`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      color: group.color,
                      fontSize: "18px",
                      transition: "transform 0.2s",
                      transform:
                        expandedGroup === key ? "rotate(90deg)" : "none",
                    }}
                  >
                    ›
                  </span>
                </button>
                {expandedGroup === key && (
                  <div
                    style={{
                      marginTop: "8px",
                      animation: "fadeSlide 0.2s ease",
                    }}
                  >
                    {group.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        style={{
                          background: "#0A0C12",
                          border: "1px solid #1E2130",
                          borderRadius: "12px",
                          padding: "14px 15px",
                          marginBottom: "8px",
                          borderLeft: `3px solid ${group.color}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flex: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{ fontSize: "14px", fontWeight: "700" }}
                            >
                              {ex.name}
                            </span>
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
                              display: "flex",
                              gap: "7px",
                              flexShrink: 0,
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                background: group.color + "20",
                                color: group.color,
                                borderRadius: "6px",
                                padding: "2px 8px",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                            >
                              {ex.sets}
                            </span>
                            {ex.isCustom && (
                              <button
                                onClick={() => deleteCustomExercise(key, ex.id)}
                                style={{
                                  background: "#2A0A0A",
                                  border: "1px solid #441010",
                                  borderRadius: "6px",
                                  color: "#FF4D4D",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  padding: "2px 7px",
                                  fontFamily: "'DM Sans',sans-serif",
                                  fontWeight: "700",
                                }}
                              >
                                del
                              </button>
                            )}
                          </div>
                        </div>
                        {ex.tip && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#555",
                              marginTop: "6px",
                              lineHeight: 1.5,
                            }}
                          >
                            💡 {ex.tip}
                          </div>
                        )}
                        {ex.instructor && ex.instructor !== "Custom" && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#333",
                              marginTop: "3px",
                            }}
                          >
                            Coach: {ex.instructor}
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setCustomModalDefaultMuscle(key);
                        setShowCustomModal(true);
                      }}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: `1px dashed ${group.color}50`,
                        borderRadius: "10px",
                        color: group.color,
                        padding: "11px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "700",
                        fontFamily: "'DM Sans',sans-serif",
                        marginTop: "4px",
                      }}
                    >
                      + Add custom to {group.label}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ PROGRESS TAB ══════════════ */}
        {activeTab === "progress" && (
          <div>
            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "22px",
              }}
            >
              {[
                {
                  label: "Workout Streak",
                  value: workoutStreak.current,
                  suffix: workoutStreak.current === 1 ? "day" : "days",
                  helper: `Best: ${workoutStreak.best}`,
                  icon: "🔥",
                  color: "#FF9F1C",
                },
                {
                  label: "Exercises Logged",
                  value: totalLogged,
                  icon: "📊",
                  color: "#FF4D4D",
                },
                {
                  label: "Completed Today",
                  value: completedCount,
                  icon: "✅",
                  color: "#2ECC71",
                },
                {
                  label: "Total Exercises",
                  value: allExerciseCount,
                  icon: "💪",
                  color: "#4D9FFF",
                },
                {
                  label: "Custom Exercises",
                  value: totalCustom,
                  icon: "✨",
                  color: "#FFD700",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#0F1117",
                    border: "1px solid #1E2130",
                    borderRadius: "15px",
                    padding: "16px",
                    borderTop: `3px solid ${s.color}`,
                  }}
                >
                  <div style={{ fontSize: "26px", marginBottom: "3px" }}>
                    {s.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: "900",
                      color: s.color,
                    }}
                  >
                    {s.value}
                    {s.suffix && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: "#666",
                          marginLeft: "5px",
                        }}
                      >
                        {s.suffix}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#444",
                      letterSpacing: "0.5px",
                      marginTop: "2px",
                    }}
                  >
                    {s.label}
                  </div>
                  {s.helper && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#555",
                        marginTop: "4px",
                        fontWeight: "700",
                      }}
                    >
                      {s.helper}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progress Graph */}
            <ProgressGraph
              weightLogs={weightLogs}
              muscleGroups={muscleGroups}
            />

            {/* Workout Calendar */}
            <WorkoutCalendar
              weightLogs={weightLogs}
              muscleGroups={muscleGroups}
            />

            {/* Backup & Restore */}
            <div
              style={{
                background: "#0F1117",
                border: "1px solid #1E2130",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <div style={sectionTitle}>BACKUP & RESTORE</div>
              {backupMsg && (
                <div
                  style={{
                    background: backupMsg.startsWith("✓")
                      ? "#0D2A1A"
                      : "#2A0D0D",
                    border: `1px solid ${backupMsg.startsWith("✓") ? "#2ECC7150" : "#FF4D4D50"}`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: backupMsg.startsWith("✓") ? "#2ECC71" : "#FF6B6B",
                    marginBottom: "14px",
                  }}
                >
                  {backupMsg}
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <button
                  onClick={handleBackup}
                  style={{
                    background: "#0D1F14",
                    border: "1px solid #2ECC7130",
                    borderRadius: "13px",
                    color: "#2ECC71",
                    padding: "16px 8px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "26px" }}>💾</span>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>
                    Backup Data
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#2ECC7170",
                      fontWeight: "400",
                    }}
                  >
                    Export as JSON
                  </span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "#0D141F",
                    border: "1px solid #4D9FFF30",
                    borderRadius: "13px",
                    color: "#4D9FFF",
                    padding: "16px 8px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "26px" }}>📂</span>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>
                    Restore Data
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#4D9FFF70",
                      fontWeight: "400",
                    }}
                  >
                    Import JSON file
                  </span>
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    background: "#1F0D0D",
                    border: "1px solid #FF4D4D30",
                    borderRadius: "13px",
                    color: "#FF4D4D",
                    padding: "16px 8px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "26px" }}>🗑️</span>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>
                    Clear All
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#FF4D4D70",
                      fontWeight: "400",
                    }}
                  >
                    Delete everything
                  </span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleRestore}
              />
              <div
                style={{ fontSize: "11px", color: "#2A2D3A", lineHeight: 1.6 }}
              >
                Backup includes: weight logs, custom exercises, weekly split,
                split snapshots, and completion history.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalExercise && (
        <WeightModal
          exercise={modalExercise}
          onClose={() => {
            setEditingPastEntry(false);
            setModalExercise(null);
          }}
          onSave={(entries) => {
            saveWeights(modalExercise.id, entries);
            setEditingPastEntry(false);
          }}
          existing={getLogForSelectedDay(modalExercise.id)}
        />
      )}
      {showCustomModal && (
        <CustomExerciseModal
          muscleGroups={muscleGroups}
          defaultMuscle={customModalDefaultMuscle}
          onClose={() => setShowCustomModal(false)}
          onSave={addCustomExercise}
        />
      )}
      {splitEditorDay && (
        <SplitEditorModal
          day={splitEditorDay}
          currentMuscles={getVisibleSplitForDate(
            selectedDateStr,
            splitEditorDay,
            weekOffset,
          )}
          muscleGroups={muscleGroups}
          onClose={() => setSplitEditorDay(null)}
          onSave={(muscles) => {
            if (weekOffset === 0) {
              setWeeklySplit((p) => ({ ...p, [splitEditorDay]: muscles }));
            } else {
              updateSplitSnapshot(selectedDateStr, muscles);
            }
          }}
        />
      )}
    </div>
  );
}
