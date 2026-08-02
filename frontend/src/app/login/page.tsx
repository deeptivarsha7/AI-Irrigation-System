"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { loginUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser({ phone_number: phone, password });
      setToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { fontFamily: "var(--font-body)", color: COLORS.ink };
  const labelStyle = { color: `${COLORS.ink}80`, fontFamily: "var(--font-mono)" };

  return (
    <AuthLayout eyebrow="Welcome back" title="Log in" subtitle="Access your fields and live sensor data.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>Phone number</label>
          <input
            type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
            className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-4 py-3 outline-none transition focus:shadow-[0_0_0_4px_rgba(123,201,111,0.3)]"
            placeholder="9876543210"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-4 py-3 outline-none transition focus:shadow-[0_0_0_4px_rgba(123,201,111,0.3)]"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm rounded-lg px-3 py-2.5 font-medium" style={{ color: COLORS.clay, backgroundColor: `${COLORS.clay}15`, fontFamily: "var(--font-body)" }}>
            {error}
          </p>
        )}

        <button
          type="submit" disabled={loading}
          style={{
            background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.sunDeep})`,
            color: COLORS.forestDeep,
            fontFamily: "var(--font-display)",
            boxShadow: `0 12px 24px -8px ${COLORS.sun}80`,
          }}
          className="mt-2 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 font-bold rounded-xl py-3 transition"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="text-sm text-center mt-2" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-body)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: COLORS.clay }} className="font-semibold hover:underline">
            Register
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}