import { COLORS } from "@/lib/theme";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: COLORS.cream }}
    >
      <span className="text-5xl mb-4">📡</span>
      <h1 className="text-2xl font-bold mb-2" style={{ color: COLORS.forestDeep, fontFamily: "var(--font-display)" }}>
        You&apos;re offline
      </h1>
      <p className="text-sm max-w-sm" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-body)" }}>
        This page needs an internet connection. Reconnect and try again — anything you already loaded should still be available.
      </p>
    </div>
  );
}