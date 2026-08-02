"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { getFarms, Farm } from "@/lib/api";
import { COLORS } from "@/lib/theme";

const SOIL_ICONS: Record<string, string> = {
  loamy: "🟤",
  clay: "🧱",
  sandy: "🏖️",
  silty: "🌾",
  peaty: "🍂",
  chalky: "⛰️",
  black: "⬛",
  red: "🟥",
  alluvial: "🌊",
};

function soilIcon(soilType: string) {
  const key = soilType.toLowerCase().trim();
  return SOIL_ICONS[key] ?? "🌱";
}

function DashboardContent() {
  const { logout } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getFarms();
        setFarms(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load your farms. Try refreshing.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalHectares = farms.reduce((sum, f) => sum + f.area_hectares, 0);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: `radial-gradient(140% 100% at 15% 0%, ${COLORS.meadowDeep} 0%, ${COLORS.meadowDeep} 25%, ${COLORS.meadow} 50%, ${COLORS.meadow} 75%, ${COLORS.meadowLight} 92%, ${COLORS.cream} 100%)`,
      }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.1] pointer-events-none" viewBox="0 0 1200 900" fill="none">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M -80 ${90 + i * 130} Q 300 ${20 + i * 130} 600 ${140 + i * 130} T 1300 ${100 + i * 130}`}
            stroke={COLORS.forest}
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <svg className="absolute inset-0 w-full h-full opacity-[0.4] pointer-events-none">
        <defs>
          <pattern id="dashgrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="1.6" fill={COLORS.meadowDeep} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dashgrid)" />
      </svg>
      <div className="orb orb-a" style={{ background: COLORS.sun }} />
      <div className="orb orb-b" style={{ background: COLORS.water }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 lg:px-12 lg:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.2em] font-bold"
              style={{ color: COLORS.terracotta, fontFamily: "var(--font-mono)" }}
            >
              Field overview
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold mt-1"
              style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}
            >
              Your fields
            </h1>

            {!loading && farms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: `${COLORS.cream}c0`, color: COLORS.forest, fontFamily: "var(--font-body)" }}
                >
                  {farms.length} {farms.length === 1 ? "field" : "fields"} registered
                </span>
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: `${COLORS.cream}c0`, color: COLORS.forest, fontFamily: "var(--font-body)" }}
                >
                  {totalHectares.toFixed(1)} ha under management
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/farms/new"
              className="text-sm font-bold px-5 py-2.5 rounded-full transition hover:brightness-105 active:scale-[0.98] whitespace-nowrap"
              style={{
                background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.sunDeep})`,
                color: COLORS.forestDeep,
                boxShadow: `0 12px 24px -10px ${COLORS.sun}90`,
                fontFamily: "var(--font-body)",
              }}
            >
              + Add a field
            </Link>
            <button
              onClick={logout}
              className="text-sm font-semibold px-5 py-2.5 rounded-full transition hover:brightness-95"
              style={{
                backgroundColor: `${COLORS.cream}c0`,
                color: COLORS.forest,
                border: `1px solid ${COLORS.forest}25`,
                fontFamily: "var(--font-body)",
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {loading && (
          <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>
            Loading your fields...
          </p>
        )}

        {error && (
          <p
            className="text-sm rounded-xl px-4 py-3 font-medium mb-6"
            style={{ color: COLORS.clay, backgroundColor: `${COLORS.clay}15`, fontFamily: "var(--font-body)" }}
          >
            {error}
          </p>
        )}

        {!loading && !error && farms.length === 0 && (
          <div
            className="rounded-[28px] px-8 py-10 md:px-14 md:py-14 relative overflow-hidden flex flex-col lg:flex-row items-center gap-10"
            style={{
              backgroundColor: COLORS.cream,
              boxShadow: `0 28px 60px -24px ${COLORS.forest}40`,
              border: `1px solid ${COLORS.forest}14`,
            }}
          >
            <svg className="absolute -right-8 -top-8 opacity-[0.1] pointer-events-none" width="180" height="180" viewBox="0 0 90 90">
              <path d="M45 10 C 15 26, 10 62, 45 80 C 80 62, 75 26, 45 10 Z" fill="none" stroke={COLORS.leafDeep} strokeWidth="2" />
              <path d="M45 18 L45 74" stroke={COLORS.leafDeep} strokeWidth="1.5" />
            </svg>

            <div className="flex-1 relative z-10 text-center lg:text-left">
              <p
                className="text-[11px] uppercase tracking-[0.2em] font-bold"
                style={{ color: COLORS.terracotta, fontFamily: "var(--font-mono)" }}
              >
                Nothing planted yet
              </p>
              <h2
                className="text-2xl md:text-[2rem] font-bold mt-2 leading-tight"
                style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}
              >
                Every field on this dashboard
                <br />
                starts as an empty plot.
              </h2>
              <p
                className="text-[15px] mt-3 max-w-md mx-auto lg:mx-0 leading-relaxed"
                style={{ color: `${COLORS.ink}90`, fontFamily: "var(--font-body)" }}
              >
                Add your first field with its location and soil type, and we&apos;ll start tracking sensors, weather, and irrigation timing for it.
              </p>
              <Link
                href="/farms/new"
                className="inline-block mt-6 text-sm font-bold px-6 py-3 rounded-xl transition hover:brightness-105 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.sunDeep})`,
                  color: COLORS.forestDeep,
                  boxShadow: `0 14px 28px -10px ${COLORS.sun}90`,
                  fontFamily: "var(--font-body)",
                }}
              >
                Add your first field
              </Link>
            </div>

            {/* Live monitoring grid: six field tiles with independently fluctuating
                moisture levels, a scanning line sweeping over them, and an irrigation
                pulse ring that highlights each tile in turn. */}
            <div
              className="relative w-full lg:w-[360px] h-[220px] rounded-2xl overflow-hidden shrink-0 px-4 pt-4 pb-9"
              style={{
                background: `linear-gradient(160deg, ${COLORS.forestDeep} 0%, ${COLORS.forest} 60%, ${COLORS.meadowDeep} 100%)`,
                boxShadow: `0 20px 44px -18px ${COLORS.forest}45`,
                border: `1px solid ${COLORS.forest}18`,
              }}
            >
              {/* faint dot backdrop */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.1]" width="100%" height="100%">
                <defs>
                  <pattern id="monitorgrid" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill={COLORS.cream} />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#monitorgrid)" />
              </svg>

              {/* scanning sweep */}
              <div className="scan-line" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.water}, transparent)` }} />

              {/* tile grid */}
              <div className="relative z-10 grid grid-cols-3 grid-rows-2 gap-2.5 h-full">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className={`tile tile-ring-${n} relative rounded-lg overflow-hidden`}
                    style={{ backgroundColor: `${COLORS.cream}14`, border: `1px solid ${COLORS.cream}25` }}
                  >
                    <div
                      className={`moisture-fill moisture-${n} absolute bottom-0 left-0 right-0`}
                      style={{ background: `linear-gradient(180deg, ${COLORS.water}90, ${COLORS.water}30)` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[13px] opacity-80">{soilIcon(["loamy", "clay", "sandy", "silty", "black", "red"][n - 1])}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p
                className="absolute bottom-2.5 left-0 right-0 text-center text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: `${COLORS.cream}90`, fontFamily: "var(--font-mono)" }}
              >
                Live moisture monitoring, every field
              </p>
            </div>
          </div>
        )}

        {!loading && !error && farms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {farms.map((farm) => (
              <Link
                key={farm.id}
                href={`/farms/${farm.id}`}
                className="farm-card rounded-2xl p-5 block relative overflow-hidden"
                style={{
                  backgroundColor: COLORS.cream,
                  boxShadow: `0 12px 28px -14px ${COLORS.forest}35`,
                  border: `1px solid ${COLORS.forest}14`,
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-[5px]"
                  style={{ background: `linear-gradient(90deg, ${COLORS.leaf}, ${COLORS.sun})` }}
                />
                <div className="flex items-start justify-between mt-2">
                  <h3
                    className="text-lg font-bold leading-snug"
                    style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}
                  >
                    {farm.name}
                  </h3>
                  <span className="text-xl leading-none" aria-hidden="true">
                    {soilIcon(farm.soil_type)}
                  </span>
                </div>
                <p
                  className="text-sm mt-1 flex items-center gap-1"
                  style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-body)" }}
                >
                  📍 {farm.location}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>
                  <span
                    className="px-2.5 py-1 rounded-full font-semibold"
                    style={{ backgroundColor: `${COLORS.leafDeep}15`, color: COLORS.leafDeep }}
                  >
                    {farm.area_hectares} ha
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-full font-semibold capitalize"
                    style={{ backgroundColor: `${COLORS.forest}12`, color: COLORS.forest }}
                  >
                    {farm.soil_type} soil
                  </span>
                </div>
                <div
                  className="mt-4 pt-3 text-xs font-semibold flex items-center gap-1"
                  style={{ borderTop: `1px solid ${COLORS.forest}12`, color: COLORS.terracotta, fontFamily: "var(--font-body)" }}
                >
                  View field details →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .orb { position: absolute; border-radius: 9999px; filter: blur(80px); opacity: 0.16; pointer-events: none; }
        .orb-a { width: 300px; height: 300px; top: -80px; right: 10%; }
        .orb-b { width: 240px; height: 240px; bottom: -60px; left: 6%; }

        .farm-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        .farm-card:hover {
          transform: translateY(-3px);
          border-color: ${COLORS.leaf}50;
        }

        /* scanning sweep line */
        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 22px;
          top: -22px;
          filter: blur(1px);
          animation: sweep 3.4s linear infinite;
          z-index: 5;
        }
        @keyframes sweep {
          0% { top: -22px; opacity: 0; }
          8% { opacity: 0.9; }
          92% { opacity: 0.9; }
          100% { top: 100%; opacity: 0; }
        }

        /* moisture fill, independent oscillation per tile */
        .moisture-fill { animation: moist-wave 4s ease-in-out infinite; }
        .moisture-1 { animation-delay: 0s; }
        .moisture-2 { animation-delay: 0.4s; }
        .moisture-3 { animation-delay: 0.8s; }
        .moisture-4 { animation-delay: 1.2s; }
        .moisture-5 { animation-delay: 1.6s; }
        .moisture-6 { animation-delay: 2s; }
        @keyframes moist-wave {
          0%, 100% { height: 32%; }
          50% { height: 76%; }
        }

        /* irrigation pulse ring, one tile lit at a time across a 6s cycle */
        .tile { transition: border-color 0.2s ease; }
        .tile-ring-1 { animation: ring-1 6s ease-in-out infinite; }
        .tile-ring-2 { animation: ring-2 6s ease-in-out infinite; }
        .tile-ring-3 { animation: ring-3 6s ease-in-out infinite; }
        .tile-ring-4 { animation: ring-4 6s ease-in-out infinite; }
        .tile-ring-5 { animation: ring-5 6s ease-in-out infinite; }
        .tile-ring-6 { animation: ring-6 6s ease-in-out infinite; }

        @keyframes ring-1 { 0%, 2% { box-shadow: 0 0 0 2px ${COLORS.water}; } 14%, 100% { box-shadow: 0 0 0 0px transparent; } }
        @keyframes ring-2 { 0%, 16% { box-shadow: 0 0 0 0px transparent; } 18% { box-shadow: 0 0 0 2px ${COLORS.water}; } 30%, 100% { box-shadow: 0 0 0 0px transparent; } }
        @keyframes ring-3 { 0%, 32% { box-shadow: 0 0 0 0px transparent; } 34% { box-shadow: 0 0 0 2px ${COLORS.water}; } 46%, 100% { box-shadow: 0 0 0 0px transparent; } }
        @keyframes ring-4 { 0%, 48% { box-shadow: 0 0 0 0px transparent; } 50% { box-shadow: 0 0 0 2px ${COLORS.water}; } 62%, 100% { box-shadow: 0 0 0 0px transparent; } }
        @keyframes ring-5 { 0%, 64% { box-shadow: 0 0 0 0px transparent; } 66% { box-shadow: 0 0 0 2px ${COLORS.water}; } 78%, 100% { box-shadow: 0 0 0 0px transparent; } }
        @keyframes ring-6 { 0%, 80% { box-shadow: 0 0 0 0px transparent; } 82% { box-shadow: 0 0 0 2px ${COLORS.water}; } 94%, 100% { box-shadow: 0 0 0 0px transparent; } }

        @media (prefers-reduced-motion: reduce) {
          .scan-line, .moisture-fill, .tile-ring-1, .tile-ring-2, .tile-ring-3, .tile-ring-4, .tile-ring-5, .tile-ring-6, .farm-card {
            animation: none !important;
            transition: none !important;
          }
          .scan-line { opacity: 0; }
          .moisture-fill { height: 55%; }
        }
      `}</style>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}