"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getFarm,
  Farm,
  apiFetch,
  getSensors,
  getSensorReadings,
  createSensor,
  Sensor,
  SensorReading,
  getPrediction,
  Prediction,
  getIrrigationEvents,
  logIrrigationEvent,
  IrrigationEvent,
  getSchedule,
  Schedule,
  ScheduleEvent,
} from "@/lib/api";
import { COLORS } from "@/lib/theme";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall_mm: number;
  condition: string;
  forecast: { date: string; min_temp: number; max_temp: number; expected_rainfall_mm: number; condition: string }[];
  fetched_at: string;
  stale: boolean;
}

const SOIL_ICONS: Record<string, string> = {
  loamy: "🟤", clay: "🧱", sandy: "🏖️", silty: "🌾",
  peaty: "🍂", chalky: "⛰️", black: "⬛", red: "🟥", alluvial: "🌊",
};

const CONDITION_ICONS: Record<string, string> = {
  Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
  Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️",
};

const SENSOR_TYPE_ICONS: Record<string, string> = {
  soil_moisture: "💧",
  temperature: "🌡️",
  humidity: "💨",
};

const NEED_COLORS: Record<string, string> = {
  Low: COLORS.leafDeep,
  Medium: COLORS.sunDeep,
  High: COLORS.clay,
};

const NEED_ICONS: Record<string, string> = {
  Low: "🟢",
  Medium: "🟡",
  High: "🔴",
};

function soilIcon(soilType: string) {
  return SOIL_ICONS[soilType.toLowerCase().trim()] ?? "🌱";
}

function conditionIcon(condition: string) {
  return CONDITION_ICONS[condition] ?? "🌤️";
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function sensorTypeLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function PredictionSection({ farmId }: { farmId: number }) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getPrediction(farmId);
        setPrediction(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't generate a prediction right now.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [farmId]);

  const needColor = prediction ? NEED_COLORS[prediction.irrigation_need] ?? COLORS.forest : COLORS.forest;
  const needIcon = prediction ? NEED_ICONS[prediction.irrigation_need] ?? "💧" : "💧";

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
          Irrigation prediction
        </h2>
        <span
          className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${COLORS.terracotta}18`, color: COLORS.terracotta, fontFamily: "var(--font-mono)" }}
        >
          ML-powered
        </span>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>
          Running prediction model…
        </p>
      )}

      {error && !loading && (
        <p
          className="text-sm rounded-xl px-4 py-3 font-medium"
          style={{ color: COLORS.clay, backgroundColor: `${COLORS.clay}15`, fontFamily: "var(--font-body)" }}
        >
          {error}
        </p>
      )}

      {!loading && prediction && (
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.forest}14`, boxShadow: `0 20px 44px -20px ${COLORS.forest}35` }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[4px]"
            style={{ background: `linear-gradient(90deg, ${needColor}, ${COLORS.sun})` }}
          />

          {prediction.confidence === "estimated" && (
            <div className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full w-fit" style={{ backgroundColor: `${COLORS.sunDeep}15`, border: `1px solid ${COLORS.sunDeep}40` }}>
              <span className="text-xs">⚠️</span>
              <span className="text-[11px] font-semibold" style={{ color: COLORS.sunDeep, fontFamily: "var(--font-mono)" }}>
                No soil sensor yet — estimated using typical {prediction.soil_moisture_used}% moisture for this soil type
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{needIcon}</span>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
                  Irrigation need
                </p>
                <p className="text-2xl font-bold" style={{ color: needColor, fontFamily: "var(--font-display)" }}>
                  {prediction.irrigation_need}
                </p>
              </div>
            </div>

            <div className="sm:ml-auto sm:text-right">
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
                Recommended water
              </p>
              <p className="text-2xl font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
                {prediction.water_required_mm} mm
              </p>
            </div>
          </div>

          <p className="text-sm mt-4 pt-4 leading-relaxed" style={{ color: COLORS.ink, borderTop: `1px solid ${COLORS.forest}12`, fontFamily: "var(--font-body)" }}>
            {prediction.recommendation}
          </p>

          <div className="flex flex-wrap gap-2 mt-4 text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>
            <span className="px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: `${COLORS.forest}10`, color: COLORS.forest }}>
              Season: {prediction.season}
            </span>
            <span className="px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: `${COLORS.forest}10`, color: COLORS.forest }}>
              Confidence: {prediction.confidence}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function dayLabel(dayOffset: number, dateStr: string) {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  return formatDay(dateStr);
}

function ScheduleSection({ farmId }: { farmId: number }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getSchedule(farmId);
        setSchedule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't build a schedule right now.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [farmId]);

  const needColor = schedule ? NEED_COLORS[schedule.need_level] ?? COLORS.forest : COLORS.forest;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
          Irrigation schedule
        </h2>
        <span
          className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${COLORS.water}18`, color: COLORS.water, fontFamily: "var(--font-mono)" }}
        >
          Weather-aware
        </span>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>
          Building schedule…
        </p>
      )}

      {error && !loading && (
        <p
          className="text-sm rounded-xl px-4 py-3 font-medium"
          style={{ color: COLORS.clay, backgroundColor: `${COLORS.clay}15`, fontFamily: "var(--font-body)" }}
        >
          {error}
        </p>
      )}

      {!loading && schedule && (
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.forest}14`, boxShadow: `0 20px 44px -20px ${COLORS.forest}35` }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[4px]"
            style={{ background: `linear-gradient(90deg, ${needColor}, ${COLORS.water})` }}
          />

          <div className="flex flex-wrap gap-3 mb-5">
            <div className="flex-1 min-w-[120px]">
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
                Total required
              </p>
              <p className="text-xl font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
                {schedule.total_water_required_mm} mm
              </p>
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
                Scheduled
              </p>
              <p className="text-xl font-bold" style={{ color: COLORS.leafDeep, fontFamily: "var(--font-display)" }}>
                {schedule.scheduled_mm} mm
              </p>
            </div>
            {schedule.unscheduled_mm > 0 && (
              <div className="flex-1 min-w-[120px]">
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
                  Unscheduled
                </p>
                <p className="text-xl font-bold" style={{ color: COLORS.sunDeep, fontFamily: "var(--font-display)" }}>
                  {schedule.unscheduled_mm} mm
                </p>
              </div>
            )}
          </div>

          {schedule.events.length === 0 ? (
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: `${COLORS.forest}08`, border: `1px dashed ${COLORS.forest}30` }}
            >
              <p className="text-sm" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-body)" }}>
                {schedule.summary}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {schedule.events.map((event: ScheduleEvent, i: number) => (
                <div
                  key={`${event.date}-${i}`}
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: `${COLORS.forest}08`, border: `1px solid ${COLORS.forest}12` }}
                >
                  <div
                    className="flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 shrink-0"
                    style={{ backgroundColor: `${needColor}15`, minWidth: "64px" }}
                  >
                    <span className="text-xs font-bold" style={{ color: needColor, fontFamily: "var(--font-mono)" }}>
                      {dayLabel(event.day_offset, event.date)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-body)" }}>
                        💧 {event.water_amount_mm} mm — {event.time_slot}
                      </p>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: `${COLORS.ink}75`, fontFamily: "var(--font-body)" }}>
                      {event.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs mt-4 pt-4 leading-relaxed" style={{ color: `${COLORS.ink}70`, borderTop: `1px solid ${COLORS.forest}12`, fontFamily: "var(--font-body)" }}>
            {schedule.summary}
          </p>
        </div>
      )}
    </div>
  );
}

function WeeklyIrrigationChart({ events }: { events: IrrigationEvent[] }) {
  const days: { label: string; date: string; mm: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: dateKey,
      mm: 0,
    });
  }

  events.forEach((event) => {
    const dateKey = event.irrigated_at.slice(0, 10);
    const day = days.find((d) => d.date === dateKey);
    if (day) day.mm += event.water_amount_mm;
  });

  const hasAnyData = days.some((d) => d.mm > 0);

  if (!hasAnyData) return null;

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.forest}12` }}>
      <p className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
        Last 7 days
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${COLORS.forest}15`} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.ink, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: COLORS.ink, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            formatter={(value) => [`${value} mm`, "Irrigated"]}
            contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.forest}20`, fontFamily: "var(--font-body)", fontSize: 12 }}
          />
          <Bar dataKey="mm" fill={COLORS.water} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function IrrigationHistorySection({ farmId }: { farmId: number }) {
  const [events, setEvents] = useState<IrrigationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadEvents() {
    setLoading(true);
    try {
      const data = await getIrrigationEvents(farmId);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await logIrrigationEvent(farmId, {
        water_amount_mm: parseFloat(amount),
        irrigated_at: new Date(when).toISOString(),
      });
      setAmount("");
      setShowForm(false);
      await loadEvents();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't log this event.");
    } finally {
      setSaving(false);
    }
  }

  function formatWhen(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
          Irrigation history
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-bold px-4 py-2 rounded-full transition hover:brightness-105 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${COLORS.water}, ${COLORS.leafDeep})`,
            color: COLORS.cream,
            fontFamily: "var(--font-body)",
          }}
        >
          {showForm ? "Cancel" : "💧 Log irrigation"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleLog}
          className="rounded-2xl p-5 mb-4 flex flex-col sm:flex-row gap-3 items-end"
          style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.forest}14` }}
        >
          <div className="flex-1 w-full">
            <label className="text-xs uppercase tracking-wide font-semibold" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-mono)" }}>
              Water applied (mm)
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-3 py-2.5 outline-none"
              style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}
              placeholder="25"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs uppercase tracking-wide font-semibold" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-mono)" }}>
              When
            </label>
            <input
              type="datetime-local"
              required
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-3 py-2.5 outline-none"
              style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-60"
            style={{ backgroundColor: COLORS.leafDeep, color: COLORS.cream, fontFamily: "var(--font-body)" }}
          >
            {saving ? "Logging…" : "Log"}
          </button>
          {formError && (
            <p className="text-sm w-full" style={{ color: COLORS.clay, fontFamily: "var(--font-body)" }}>{formError}</p>
          )}
        </form>
      )}

      {loading && (
        <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>Loading history…</p>
      )}

      {!loading && events.length === 0 && (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ backgroundColor: `${COLORS.cream}90`, border: `1px dashed ${COLORS.forest}30` }}
        >
          <p className="text-sm" style={{ color: `${COLORS.ink}70`, fontFamily: "var(--font-body)" }}>
            No irrigation logged yet. Logging events helps predictions account for your field&apos;s actual watering history.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <>
          <WeeklyIrrigationChart events={events} />
          <div className="flex flex-col gap-2">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.forest}12` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💧</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-body)" }}>
                      {event.water_amount_mm} mm
                    </p>
                    <p className="text-xs" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
                      {formatWhen(event.irrigated_at)}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] uppercase font-bold px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${COLORS.forest}10`, color: COLORS.forest, fontFamily: "var(--font-mono)" }}
                >
                  {event.source}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SensorTimelineChart({ readings, sensorType }: { readings: SensorReading[]; sensorType: string }) {
  if (readings.length < 2) return null;

  const chartData = [...readings]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .slice(-20)
    .map((r) => ({
      time: new Date(r.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: r.value,
    }));

  const lineColor = sensorType === "soil_moisture" ? COLORS.water : sensorType === "temperature" ? COLORS.sunDeep : COLORS.leafDeep;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.forest}10` }}>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
        Trend
      </p>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <Tooltip
            formatter={(value) => [value, sensorTypeLabel(sensorType)]}
            contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.forest}20`, fontFamily: "var(--font-body)", fontSize: 11 }}
            labelStyle={{ fontSize: 10 }}
          />
          <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SensorsSection({ farmId }: { farmId: number }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [latestReadings, setLatestReadings] = useState<Record<number, number | null>>({});
  const [allReadings, setAllReadings] = useState<Record<number, SensorReading[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sensorType, setSensorType] = useState("soil_moisture");
  const [sensorId, setSensorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadSensors() {
    setLoading(true);
    try {
      const all = await getSensors();
      const forFarm = all.filter((s) => s.farm_id === farmId);
      setSensors(forFarm);

      const readings: Record<number, number | null> = {};
      const fullReadings: Record<number, SensorReading[]> = {};
      await Promise.all(
        forFarm.map(async (s) => {
          try {
            const r = await getSensorReadings(s.id);
            readings[s.id] = r.length > 0 ? r[0].value : null;
            fullReadings[s.id] = r;
          } catch {
            readings[s.id] = null;
            fullReadings[s.id] = [];
          }
        })
      );
      setLatestReadings(readings);
      setAllReadings(fullReadings);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSensors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  async function handleAddSensor(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await createSensor({ farm_id: farmId, sensor_type: sensorType, sensor_identifier: sensorId });
      setSensorId("");
      setShowForm(false);
      await loadSensors();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't add sensor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
          Sensors
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-bold px-4 py-2 rounded-full transition hover:brightness-105 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.sunDeep})`,
            color: COLORS.forestDeep,
            fontFamily: "var(--font-body)",
          }}
        >
          {showForm ? "Cancel" : "+ Add sensor"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddSensor}
          className="rounded-2xl p-5 mb-4 flex flex-col sm:flex-row gap-3 items-end"
          style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.forest}14` }}
        >
          <div className="flex-1 w-full">
            <label className="text-xs uppercase tracking-wide font-semibold" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-mono)" }}>
              Sensor type
            </label>
            <select
              value={sensorType}
              onChange={(e) => setSensorType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-3 py-2.5 outline-none"
              style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}
            >
              <option value="soil_moisture">Soil Moisture</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs uppercase tracking-wide font-semibold" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-mono)" }}>
              Sensor ID / serial number
            </label>
            <input
              type="text"
              required
              value={sensorId}
              onChange={(e) => setSensorId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-3 py-2.5 outline-none"
              style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}
              placeholder="SM-001"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-60"
            style={{ backgroundColor: COLORS.leafDeep, color: COLORS.cream, fontFamily: "var(--font-body)" }}
          >
            {saving ? "Adding…" : "Add"}
          </button>
          {formError && (
            <p className="text-sm w-full" style={{ color: COLORS.clay, fontFamily: "var(--font-body)" }}>{formError}</p>
          )}
        </form>
      )}

      {loading && (
        <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>Loading sensors…</p>
      )}

      {!loading && sensors.length === 0 && (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ backgroundColor: `${COLORS.cream}90`, border: `1px dashed ${COLORS.forest}30` }}
        >
          <p className="text-sm" style={{ color: `${COLORS.ink}70`, fontFamily: "var(--font-body)" }}>
            No sensors registered for this field yet.
          </p>
        </div>
      )}

      {!loading && sensors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.forest}14`, boxShadow: `0 12px 28px -16px ${COLORS.forest}30` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{SENSOR_TYPE_ICONS[sensor.sensor_type] ?? "📡"}</span>
                <span
                  className="text-[10px] uppercase font-bold px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: sensor.status === "active" ? `${COLORS.leafDeep}18` : `${COLORS.clay}18`,
                    color: sensor.status === "active" ? COLORS.leafDeep : COLORS.clay,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {sensor.status}
                </span>
              </div>
              <p className="text-sm font-bold mt-3" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-body)" }}>
                {sensorTypeLabel(sensor.sensor_type)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: `${COLORS.ink}70`, fontFamily: "var(--font-mono)" }}>
                {sensor.sensor_identifier}
              </p>
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.forest}10` }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: `${COLORS.ink}60`, fontFamily: "var(--font-mono)" }}>
                  Latest reading
                </p>
                <p className="text-xl font-bold mt-0.5" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
                  {latestReadings[sensor.id] != null ? latestReadings[sensor.id] : "—"}
                  {latestReadings[sensor.id] != null && sensor.sensor_type === "soil_moisture" ? "%" : ""}
                </p>
              </div>
              <SensorTimelineChart readings={allReadings[sensor.id] ?? []} sensorType={sensor.sensor_type} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FarmDetailContent({ farmId }: { farmId: number }) {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [error, setError] = useState("");
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getFarm(farmId);
        setFarm(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load this field.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [farmId]);

  useEffect(() => {
    async function loadWeather() {
      try {
        const data = await apiFetch(`/farms/${farmId}/weather`);
        setWeather(data);
      } catch (err) {
        setWeatherError(err instanceof Error ? err.message : "Weather unavailable right now.");
      } finally {
        setWeatherLoading(false);
      }
    }
    loadWeather();
  }, [farmId]);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: `radial-gradient(140% 100% at 15% 0%, ${COLORS.meadowDeep} 0%, ${COLORS.meadow} 55%, ${COLORS.meadowLight} 85%, ${COLORS.cream} 100%)`,
      }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" viewBox="0 0 1200 900" fill="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M -80 ${90 + i * 160} Q 300 ${20 + i * 160} 600 ${140 + i * 160} T 1300 ${100 + i * 160}`} stroke={COLORS.forest} strokeWidth="1.5" />
        ))}
      </svg>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 lg:px-12 lg:py-14">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-semibold mb-6"
          style={{ color: COLORS.forest, fontFamily: "var(--font-body)" }}
        >
          ← Back to dashboard
        </Link>

        {loading && (
          <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>Loading field…</p>
        )}

        {error && (
          <p
            className="text-sm rounded-xl px-4 py-3 font-medium"
            style={{ color: COLORS.clay, backgroundColor: `${COLORS.clay}15`, fontFamily: "var(--font-body)" }}
          >
            {error}
          </p>
        )}

        {!loading && !error && farm && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: COLORS.terracotta, fontFamily: "var(--font-mono)" }}>
                  Field profile
                </p>
                <h1 className="text-3xl md:text-4xl font-bold mt-1 flex items-center gap-3" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
                  {farm.name}
                  <span className="text-2xl">{soilIcon(farm.soil_type)}</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: `${COLORS.ink}85`, fontFamily: "var(--font-body)" }}>
                  📍 {farm.location}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: `${COLORS.cream}c0`, color: COLORS.forest, fontFamily: "var(--font-mono)" }}>
                  {farm.area_hectares} ha
                </span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full capitalize" style={{ backgroundColor: `${COLORS.cream}c0`, color: COLORS.forest, fontFamily: "var(--font-mono)" }}>
                  {farm.soil_type} soil
                </span>
                {farm.crop_type && farm.crop_type !== "unspecified" && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full capitalize" style={{ backgroundColor: `${COLORS.sunDeep}18`, color: COLORS.sunDeep, fontFamily: "var(--font-mono)" }}>
                    🌾 {farm.crop_type}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
                Weather
              </h2>

              {weatherLoading && (
                <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>Fetching live weather…</p>
              )}

              {weatherError && !weatherLoading && (
                <p
                  className="text-sm rounded-xl px-4 py-3 font-medium"
                  style={{ color: COLORS.clay, backgroundColor: `${COLORS.clay}15`, fontFamily: "var(--font-body)" }}
                >
                  {weatherError}
                </p>
              )}

              {!weatherLoading && weather && (
                <div
                  className="rounded-2xl p-6 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(160deg, ${COLORS.forestDeep} 0%, ${COLORS.forest} 60%, ${COLORS.meadowDeep} 100%)`,
                    boxShadow: `0 24px 48px -20px ${COLORS.forest}45`,
                  }}
                >
                  {weather.stale && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full w-fit" style={{ backgroundColor: `${COLORS.sun}25`, border: `1px solid ${COLORS.sun}50` }}>
                      <span className="text-xs">⚠️</span>
                      <span className="text-[11px] font-semibold" style={{ color: COLORS.sun, fontFamily: "var(--font-mono)" }}>
                        Showing last known data — live update unavailable
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{conditionIcon(weather.condition)}</span>
                      <div>
                        <p className="text-4xl font-bold" style={{ color: COLORS.cream, fontFamily: "var(--font-display)" }}>
                          {Math.round(weather.temperature)}°C
                        </p>
                        <p className="text-sm" style={{ color: `${COLORS.cream}90`, fontFamily: "var(--font-body)" }}>
                          {weather.condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6 sm:ml-auto">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: `${COLORS.cream}60`, fontFamily: "var(--font-mono)" }}>Humidity</p>
                        <p className="text-lg font-bold" style={{ color: COLORS.cream, fontFamily: "var(--font-display)" }}>{weather.humidity}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: `${COLORS.cream}60`, fontFamily: "var(--font-mono)" }}>Rainfall</p>
                        <p className="text-lg font-bold" style={{ color: COLORS.cream, fontFamily: "var(--font-display)" }}>{weather.rainfall_mm} mm</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mt-6 pt-5" style={{ borderTop: `1px solid ${COLORS.cream}20` }}>
                    {weather.forecast.map((day) => (
                      <div key={day.date} className="text-center">
                        <p className="text-[10px] uppercase font-semibold" style={{ color: `${COLORS.cream}70`, fontFamily: "var(--font-mono)" }}>
                          {formatDay(day.date)}
                        </p>
                        <p className="text-lg mt-1">{conditionIcon(day.condition)}</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: COLORS.cream, fontFamily: "var(--font-body)" }}>
                          {Math.round(day.max_temp)}° <span style={{ color: `${COLORS.cream}60` }}>{Math.round(day.min_temp)}°</span>
                        </p>
                        {day.expected_rainfall_mm > 0 && (
                          <p className="text-[10px] mt-0.5" style={{ color: COLORS.water, fontFamily: "var(--font-mono)" }}>
                            💧{day.expected_rainfall_mm}mm
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <PredictionSection farmId={farmId} />
            <ScheduleSection farmId={farmId} />
            <IrrigationHistorySection farmId={farmId} />
            <SensorsSection farmId={farmId} />
          </>
        )}
      </div>
    </div>
  );
}

export default function FarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute>
      <FarmDetailContent farmId={parseInt(id, 10)} />
    </ProtectedRoute>
  );
}