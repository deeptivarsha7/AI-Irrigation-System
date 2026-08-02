"use client";

import { ReactNode } from "react";
import { COLORS } from "@/lib/theme";

const FEATURES = [
  { emoji: "🌱", label: "Field & crop setup" },
  { emoji: "🌧️", label: "Weather forecasts" },
  { emoji: "💧", label: "Smart irrigation" },
];

const TRUST = [
  { emoji: "🔒", label: "Secure login" },
  { emoji: "🌐", label: "22 languages" },
  { emoji: "🌾", label: "Built for farmers" },
];

export default function AuthLayout({
  title,
  eyebrow,
  subtitle,
  children,
}: {
  title: string;
  eyebrow: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14 px-8 py-12 lg:px-16 xl:px-20"
      style={{
        background: `radial-gradient(140% 100% at 15% 0%, ${COLORS.meadowDeep} 0%, ${COLORS.meadowDeep} 30%, ${COLORS.meadow} 55%, ${COLORS.meadow} 78%, ${COLORS.meadowLight} 94%, ${COLORS.cream} 100%)`,
      }}
    >
      {/* Green vignette for extra depth at the edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${COLORS.meadowDeep}40 0%, transparent 20%, transparent 78%, ${COLORS.forest}38 100%)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${COLORS.meadowDeep}32 0%, transparent 16%, transparent 84%, ${COLORS.meadowDeep}28 100%)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(120% 90% at 50% 50%, transparent 45%, ${COLORS.forest}18 100%)`,
        }}
      />

      {/* Shared background texture — spans whole page, no seams */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none" viewBox="0 0 1200 900" fill="none">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M -80 ${90 + i * 130} Q 300 ${20 + i * 130} 600 ${140 + i * 130} T 1300 ${100 + i * 130}`}
            stroke={COLORS.forest}
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <svg className="absolute inset-0 w-full h-full opacity-[0.45] pointer-events-none">
        <defs>
          <pattern id="dotgrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="1.6" fill={COLORS.meadowDeep} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      <div className="orb orb-a" style={{ background: COLORS.sun }} />
      <div className="orb orb-b" style={{ background: COLORS.water }} />
      <div className="orb orb-c" style={{ background: COLORS.leaf }} />

      {/* Live badge — top right */}
      <div
        className="absolute top-6 right-6 lg:top-10 lg:right-12 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: `${COLORS.cream}c0`, border: `1px solid ${COLORS.forest}20` }}
      >
        <span className="relative flex h-2 w-2">
          <span className="pulse-ring absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: COLORS.leaf }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: COLORS.leafDeep }} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: COLORS.forest, fontFamily: "var(--font-mono)" }}>
          Live monitoring
        </span>
      </div>

      {/* LEFT — headline + hero scene */}
      <div className="relative z-10 w-full max-w-xl mt-14 lg:mt-0 lg:mr-2">
        <h1
          className="text-[2.7rem] md:text-[3.4rem] leading-[0.98] font-bold tracking-tight"
          style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}
        >
          Know your
          <br />
          field&apos;s thirst
          <br />
          <span className="relative inline-block" style={{ color: COLORS.sunDeep }}>
            before it does.
            <svg className="absolute left-0 -bottom-1.5 w-full" height="8" viewBox="0 0 220 8" fill="none" preserveAspectRatio="none">
              <path d="M2 5 C 40 -1, 80 9, 120 4 C 150 0, 180 8, 218 3" stroke={COLORS.sunDeep} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </span>
        </h1>

        <p className="text-[15px] mt-5 max-w-md leading-relaxed font-medium" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>
          Live soil data, weather forecasts, and irrigation guidance for every field you tend — in your language.
        </p>

        <div className="flex flex-wrap gap-2.5 mt-5">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full" style={{ backgroundColor: `${COLORS.cream}90`, border: `1px solid ${COLORS.forest}18` }}>
              <span className="text-base">{f.emoji}</span>
              <span className="text-[12px] font-medium" style={{ color: COLORS.forest, fontFamily: "var(--font-body)" }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* hero scene */}
        <div
          className="relative w-[92%] h-[185px] md:h-[215px] rounded-2xl overflow-hidden mt-8"
          style={{ boxShadow: `0 24px 56px -22px ${COLORS.forest}45`, border: `1px solid ${COLORS.forest}18` }}
        >
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${COLORS.water} 0%, #cfe9f7 55%, ${COLORS.meadowLight} 100%)` }}>
            <div className="sun-arc">
              <div className="sun-disc" style={{ backgroundColor: COLORS.sun, boxShadow: `0 0 30px 10px ${COLORS.sun}70` }} />
            </div>
            <svg className="cloud cloud-1" width="72" height="27" viewBox="0 0 70 26" fill="none">
              <ellipse cx="18" cy="16" rx="16" ry="10" fill="#fff" fillOpacity="0.9" />
              <ellipse cx="34" cy="10" rx="14" ry="10" fill="#fff" fillOpacity="0.9" />
              <ellipse cx="50" cy="16" rx="16" ry="9" fill="#fff" fillOpacity="0.9" />
            </svg>
            <svg className="cloud cloud-2" width="54" height="20" viewBox="0 0 70 26" fill="none">
              <ellipse cx="18" cy="16" rx="16" ry="10" fill="#fff" fillOpacity="0.75" />
              <ellipse cx="34" cy="10" rx="14" ry="10" fill="#fff" fillOpacity="0.75" />
              <ellipse cx="50" cy="16" rx="16" ry="9" fill="#fff" fillOpacity="0.75" />
            </svg>
            {[8, 18, 28, 38, 48, 58, 68, 78, 88].map((left, i) => (
              <span key={left} className="raindrop" style={{ left: `${left}%`, animationDelay: `${(i % 5) * 0.3 + 2.2}s`, backgroundColor: "#ffffffb0" }} />
            ))}
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-[46%]" style={{ background: `linear-gradient(180deg, ${COLORS.meadowDeep} 0%, ${COLORS.forest} 100%)` }} />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
            <span className="ripple" style={{ borderColor: `${COLORS.water}80` }} />
            <svg width="150" height="140" viewBox="0 0 140 150" className="plant-loop">
              <ellipse cx="70" cy="132" rx="30" ry="7" fill="#000" opacity="0.12" />
              <path d="M70 132 C 70 100, 70 70, 70 40" stroke={COLORS.leafDeep} strokeWidth="4" strokeLinecap="round" fill="none" className="stem-path" />
              <path d="M70 88 C 45 84, 34 62, 40 44 C 62 48, 74 66, 70 88 Z" fill={COLORS.leaf} className="leaf-left" />
              <path d="M70 66 C 95 62, 106 42, 100 26 C 78 30, 66 46, 70 66 Z" fill={COLORS.leafDeep} className="leaf-right" />
              <circle cx="70" cy="36" r="9" fill={COLORS.sun} className="bloom" />
              <circle cx="70" cy="36" r="4" fill={COLORS.sunDeep} className="bloom-center" />
            </svg>
          </div>
          <span className="float-emoji" style={{ left: "20%", animationDelay: "2.4s" }}>💧</span>
          <span className="float-emoji" style={{ left: "76%", animationDelay: "3.6s" }}>💧</span>
        </div>

        <p className="text-[18px] mt-5 font-medium" style={{ color: COLORS.ink, fontFamily: "var(--font-body)" }}>
          From cloudburst to root — nothing missed 🌾
        </p>
      </div>

      {/* RIGHT — form card, same background, no seam */}
      <div className="relative z-10 w-full flex flex-col items-center card-in mt-8 lg:mt-4 lg:ml-2" style={{ maxWidth: "360px" }}>
        <div
          className="relative w-full rounded-[22px] px-7 py-7 overflow-hidden"
          style={{
            backgroundColor: COLORS.cream,
            boxShadow: `0 28px 56px -20px ${COLORS.forest}38, 0 8px 20px -12px ${COLORS.forest}22, 0 1.5px 0 rgba(255,255,255,0.7) inset`,
            border: `1px solid ${COLORS.forest}14`,
          }}
        >
          <svg className="absolute -right-4 -top-4 opacity-[0.14] pointer-events-none" width="90" height="90" viewBox="0 0 90 90">
            <path d="M45 10 C 15 26, 10 62, 45 80 C 80 62, 75 26, 45 10 Z" fill="none" stroke={COLORS.leafDeep} strokeWidth="2" />
            <path d="M45 18 L45 74" stroke={COLORS.leafDeep} strokeWidth="1.5" />
          </svg>

          <div className="absolute top-4 left-7 right-7 h-[3px] rounded-full glow-bar" style={{ background: `linear-gradient(90deg, ${COLORS.water}, ${COLORS.sun})` }} />

          <p className="relative text-[10px] uppercase tracking-[0.2em] font-bold mt-3" style={{ color: COLORS.terracotta, fontFamily: "var(--font-mono)" }}>
            {eyebrow}
          </p>
          <h2 className="relative text-[1.4rem] font-bold mt-1" style={{ color: COLORS.ink, fontFamily: "var(--font-display)" }}>
            {title}
          </h2>
          <p className="relative text-[13px] mt-1 mb-5" style={{ color: `${COLORS.ink}85`, fontFamily: "var(--font-body)" }}>
            {subtitle}
          </p>
          <div className="relative">{children}</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-5">
          {TRUST.map((t) => (
            <div key={t.label} className="flex items-center gap-1.5">
              <span className="text-xs">{t.emoji}</span>
              <span className="text-[11px] font-medium" style={{ color: `${COLORS.forest}90`, fontFamily: "var(--font-body)" }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .orb { position: absolute; border-radius: 9999px; filter: blur(70px); opacity: 0.2; pointer-events: none; }
        .orb-a { width: 260px; height: 260px; top: -60px; left: 10%; animation: drift-a 12s ease-in-out infinite; }
        .orb-b { width: 220px; height: 220px; bottom: -40px; right: 8%; animation: drift-b 14s ease-in-out infinite; }
        .orb-c { width: 160px; height: 160px; top: 40%; right: 30%; animation: drift-a 16s ease-in-out infinite reverse; }
        @keyframes drift-a { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-16px, 14px); } }
        @keyframes drift-b { 0%,100% { transform: translate(0,0); } 50% { transform: translate(14px, -14px); } }

        .pulse-ring { animation: pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse-ring { 0% { opacity: 0.6; transform: scale(1); } 100% { opacity: 0; transform: scale(2.2); } }

        .sun-arc { position: absolute; left: 8%; top: 60%; width: 84%; height: 1px; animation: arc-move 8s ease-in-out infinite; }
        .sun-disc { position: absolute; width: 26px; height: 26px; border-radius: 9999px; top: -60px; }
        @keyframes arc-move { 0% { left: 4%; top: 85%; } 50% { left: 50%; top: 8%; } 100% { left: 96%; top: 85%; } }

        .cloud { position: absolute; top: 14%; opacity: 0.9; animation: cloud-drift 9s linear infinite; }
        .cloud-1 { animation-duration: 11s; }
        .cloud-2 { top: 26%; animation-duration: 15s; animation-delay: -4s; }
        @keyframes cloud-drift { from { transform: translateX(-20%); } to { transform: translateX(340%); } }

        .raindrop { position: absolute; top: 30%; width: 2px; height: 14px; border-radius: 2px; transform: rotate(8deg); animation: fall 1.2s linear infinite; opacity: 0; }
        @keyframes fall { 0% { transform: translateY(0) rotate(8deg); opacity: 0; } 8% { opacity: 1; } 55% { opacity: 1; } 65% { transform: translateY(70px) rotate(8deg); opacity: 0; } 100% { opacity: 0; } }

        .plant-loop { animation: plant-cycle 8s ease-in-out infinite; transform-origin: 70px 132px; }
        @keyframes plant-cycle { 0% { transform: scale(0.86); opacity: 0.85; } 45% { transform: scale(1); opacity: 1; } 75% { transform: scale(1.02); opacity: 1; } 88% { transform: scale(0.92); opacity: 0.7; } 100% { transform: scale(0.86); opacity: 0.85; } }
        .stem-path { stroke-dasharray: 100; stroke-dashoffset: 100; animation: grow-stem 8s ease-in-out infinite; }
        @keyframes grow-stem { 0% { stroke-dashoffset: 100; } 30% { stroke-dashoffset: 0; } 88% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 100; } }
        .leaf-left, .leaf-right { transform-origin: 70px 70px; transform: scale(0); opacity: 0; animation: unfurl 8s ease-in-out infinite; }
        .leaf-left { animation-delay: 0.1s; }
        .leaf-right { animation-delay: 0.4s; }
        @keyframes unfurl { 0% { transform: scale(0); opacity: 0; } 15% { transform: scale(0); opacity: 0; } 40% { transform: scale(1); opacity: 1; } 85% { transform: scale(1); opacity: 1; } 100% { transform: scale(0); opacity: 0; } }
        .bloom, .bloom-center { transform-origin: 70px 36px; transform: scale(0); opacity: 0; animation: bloom-cycle 8s ease-in-out infinite; }
        @keyframes bloom-cycle { 0% { transform: scale(0); opacity: 0; } 55% { transform: scale(0); opacity: 0; } 66% { transform: scale(1.25); opacity: 1; } 75% { transform: scale(1); opacity: 1; } 90% { transform: scale(1); opacity: 1; } 100% { transform: scale(0); opacity: 0; } }

        .ripple { position: absolute; left: 50%; bottom: 8px; width: 40px; height: 12px; border: 2px solid; border-radius: 9999px; transform: translateX(-50%) scaleX(1); opacity: 0; animation: ripple-out 4s ease-out infinite; }
        @keyframes ripple-out { 0% { opacity: 0; } 30% { opacity: 0.7; transform: translateX(-50%) scaleX(0.6); } 100% { opacity: 0; transform: translateX(-50%) scaleX(2.6); } }

        .float-emoji { position: absolute; bottom: 40%; font-size: 13px; animation: float-up 5s ease-in infinite; opacity: 0; }
        @keyframes float-up { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.9; } 80% { opacity: 0.5; } 100% { transform: translateY(-60px); opacity: 0; } }

        .glow-bar { box-shadow: 0 0 10px 1px rgba(79, 159, 214, 0.4); }
        .card-in { animation: card-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes card-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) {
          .orb-a, .orb-b, .orb-c, .pulse-ring, .sun-arc, .cloud, .raindrop, .plant-loop, .stem-path, .leaf-left, .leaf-right, .bloom, .bloom-center, .ripple, .float-emoji, .card-in {
            animation: none !important;
          }
          .stem-path { stroke-dashoffset: 0; }
          .leaf-left, .leaf-right, .bloom, .bloom-center { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}