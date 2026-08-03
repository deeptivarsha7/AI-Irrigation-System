"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createFarm } from "@/lib/api";
import { COLORS } from "@/lib/theme";

const SOIL_TYPES = [
  { name: "Loamy", icon: "🟤", note: "Balanced, holds water well" },
  { name: "Clay", icon: "🧱", note: "Dense, drains slowly" },
  { name: "Sandy", icon: "🏖️", note: "Light, drains fast" },
  { name: "Black", icon: "⬛", note: "Rich in cotton-growing regions" },
  { name: "Red", icon: "🟥", note: "Common in southern India" },
  { name: "Alluvial", icon: "🌊", note: "Fertile, river-deposited" },
  { name: "Silty", icon: "🌾", note: "Smooth, moisture-retentive" },
  { name: "Peaty", icon: "🍂", note: "High organic content" },
  { name: "Chalky", icon: "⛰️", note: "Alkaline, free-draining" },
];

const STEPS_INFO = [
  { icon: "📍", label: "Location", desc: "Pinpoints your field for accurate weather forecasts" },
  { icon: "🌱", label: "Soil type", desc: "Shapes how we calculate water retention" },
  { icon: "📏", label: "Area", desc: "Scales irrigation volume recommendations" },
];

function NewFarmContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [areaHectares, setAreaHectares] = useState("");
  const [soilType, setSoilType] = useState("Loamy");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const selectedSoil = SOIL_TYPES.find((s) => s.name === soilType) ?? SOIL_TYPES[0];

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. Enter coordinates manually.");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const farm = await createFarm({
        name,
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        area_hectares: parseFloat(areaHectares),
        soil_type: soilType,
      });
      router.push(`/farms/${farm.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the field. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { fontFamily: "var(--font-body)", color: COLORS.ink };
  const labelStyle = { color: `${COLORS.ink}80`, fontFamily: "var(--font-mono)" };
  const inputClass =
    "mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-4 py-2.5 outline-none transition focus:shadow-[0_0_0_4px_rgba(143,188,90,0.25)]";

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-6 py-12 lg:px-16"
      style={{
        background: `radial-gradient(140% 100% at 15% 0%, ${COLORS.meadowDeep} 0%, ${COLORS.meadow} 40%, ${COLORS.meadowLight} 75%, ${COLORS.cream} 100%)`,
      }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" viewBox="0 0 1200 900" fill="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M -80 ${90 + i * 160} Q 300 ${20 + i * 160} 600 ${140 + i * 160} T 1300 ${100 + i * 160}`}
            stroke={COLORS.forest}
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="orb orb-a" style={{ background: COLORS.sun }} />
      <div className="orb orb-b" style={{ background: COLORS.water }} />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-start">
        {/* LEFT — context, tips, live preview */}
        <div className="w-full mt-4 lg:mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-semibold mb-6"
            style={{ color: COLORS.forest, fontFamily: "var(--font-body)" }}
          >
            ← Back to dashboard
          </Link>

          <p
            className="text-[11px] uppercase tracking-[0.2em] font-bold"
            style={{ color: COLORS.terracotta, fontFamily: "var(--font-mono)" }}
          >
            New field
          </p>
          <h1
            className="text-3xl md:text-[2.4rem] font-bold mt-2 leading-tight"
            style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}
          >
            Every prediction starts
            <br />
            with knowing the ground.
          </h1>
          <p className="text-sm md:text-base mt-3 leading-relaxed max-w-md" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>
            A few details about your field let us model exactly how much water it needs, and when.
          </p>

          <div className="flex flex-col gap-3 mt-7 max-w-md">
            {STEPS_INFO.map((s) => (
              <div
                key={s.label}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: `${COLORS.cream}80`, border: `1px solid ${COLORS.forest}14` }}
              >
                <span className="text-lg leading-none mt-0.5">{s.icon}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-body)" }}>
                    {s.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-body)" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Live field preview card */}
          <div className="mt-8 max-w-md">
            <p
              className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2"
              style={{ color: `${COLORS.forest}90`, fontFamily: "var(--font-mono)" }}
            >
              Live preview
            </p>
            <div
              className="preview-card relative rounded-2xl p-5 overflow-hidden"
              style={{
                backgroundColor: COLORS.cream,
                boxShadow: `0 20px 40px -18px ${COLORS.forest}35`,
                border: `1px solid ${COLORS.forest}14`,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[4px]"
                style={{ background: `linear-gradient(90deg, ${COLORS.leaf}, ${COLORS.sun})` }}
              />
              <div className="flex items-start justify-between mt-1">
                <h3
                  className="text-lg font-bold leading-snug"
                  style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}
                >
                  {name || "Your field name"}
                </h3>
                <span className="text-2xl leading-none">{selectedSoil.icon}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: `${COLORS.ink}75`, fontFamily: "var(--font-body)" }}>
                📍 {location || "Location pending"}
              </p>
              <div className="flex flex-wrap gap-2 mt-4 text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>
                <span
                  className="px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: `${COLORS.leafDeep}15`, color: COLORS.leafDeep }}
                >
                  {areaHectares ? `${areaHectares} ha` : "— ha"}
                </span>
                <span
                  className="px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: `${COLORS.forest}12`, color: COLORS.forest }}
                >
                  {soilType} soil
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="w-full card-in">
          <div
            className="relative rounded-[22px] px-8 py-8 md:px-10 md:py-10 overflow-hidden"
            style={{
              backgroundColor: COLORS.cream,
              boxShadow: `0 28px 56px -20px ${COLORS.forest}38`,
              border: `1px solid ${COLORS.forest}14`,
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, ${COLORS.leaf}, ${COLORS.sun})` }}
            />

            <h2
              className="text-2xl font-bold mt-2"
              style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}
            >
              Field details
            </h2>
            <p className="text-sm mt-1 mb-6" style={{ color: `${COLORS.ink}85`, fontFamily: "var(--font-body)" }}>
              Takes under a minute — you can always edit later.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>
                  Field name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  className={inputClass}
                  placeholder="Green Valley Farm"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={inputStyle}
                  className={inputClass}
                  placeholder="Chennai, Tamil Nadu"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>
                    Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="text-xs font-semibold hover:underline disabled:opacity-50"
                    style={{ color: COLORS.clay, fontFamily: "var(--font-body)" }}
                  >
                    {locating ? "Locating…" : "📍 Use my location"}
                  </button>
                </div>
                <div className="flex gap-3 mt-1.5">
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    style={inputStyle}
                    className={`w-1/2 ${inputClass}`}
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    style={inputStyle}
                    className={`w-1/2 ${inputClass}`}
                    placeholder="Longitude"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>
                  Area (hectares)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={areaHectares}
                  onChange={(e) => setAreaHectares(e.target.value)}
                  style={inputStyle}
                  className={inputClass}
                  placeholder="18.5"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>
                  Soil type
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {SOIL_TYPES.map((s) => {
                    const active = soilType === s.name;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setSoilType(s.name)}
                        className="soil-chip flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition"
                        style={{
                          backgroundColor: active ? `${COLORS.leaf}20` : "white",
                          border: active ? `2px solid ${COLORS.leafDeep}` : "2px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <span className="text-xl">{s.icon}</span>
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: active ? COLORS.leafDeep : COLORS.ink, fontFamily: "var(--font-body)" }}
                        >
                          {s.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mt-2" style={{ color: `${COLORS.ink}70`, fontFamily: "var(--font-body)" }}>
                  {selectedSoil.icon} {selectedSoil.note}
                </p>
              </div>

              {error && (
                <p
                  className="text-sm rounded-lg px-3 py-2.5 font-medium"
                  style={{ color: COLORS.clay, backgroundColor: `${COLORS.clay}15`, fontFamily: "var(--font-body)" }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.sunDeep})`,
                  color: COLORS.forestDeep,
                  fontFamily: "var(--font-display)",
                  boxShadow: `0 14px 28px -10px ${COLORS.sun}90`,
                }}
                className="mt-1 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 font-bold rounded-xl py-3 transition"
              >
                {loading ? "Creating field…" : "Create field"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .orb { position: absolute; border-radius: 9999px; filter: blur(80px); opacity: 0.18; pointer-events: none; }
        .orb-a { width: 260px; height: 260px; top: -60px; right: 10%; animation: drift-a 12s ease-in-out infinite; }
        .orb-b { width: 200px; height: 200px; bottom: -40px; left: 6%; animation: drift-b 14s ease-in-out infinite; }
        @keyframes drift-a { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-14px, 12px); } }
        @keyframes drift-b { 0%,100% { transform: translate(0,0); } 50% { transform: translate(12px, -14px); } }

        .card-in { animation: card-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes card-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

        .preview-card { transition: box-shadow 0.2s ease; }
        .soil-chip:hover { transform: translateY(-1px); }

        @media (prefers-reduced-motion: reduce) {
          .orb-a, .orb-b, .card-in { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function NewFarmPage() {
  return (
    <ProtectedRoute>
      <NewFarmContent />
    </ProtectedRoute>
  );
}