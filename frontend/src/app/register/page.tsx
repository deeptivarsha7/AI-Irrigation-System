"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { registerUser } from "@/lib/api";
import { COLORS } from "@/lib/theme";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी (Hindi)" },
  { value: "bn", label: "বাংলা (Bengali)" },
  { value: "mr", label: "मराठी (Marathi)" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
  { value: "gu", label: "ગુજરાતી (Gujarati)" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { value: "or", label: "ଓଡ଼ିଆ (Odia)" },
  { value: "ml", label: "മലയാളം (Malayalam)" },
  { value: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { value: "as", label: "অসমীয়া (Assamese)" },
  { value: "mai", label: "मैथिली (Maithili)" },
  { value: "sat", label: "ᱥᱟᱱᱛᱟᱲᱤ (Santali)" },
  { value: "ks", label: "کٲشُر (Kashmiri)" },
  { value: "ne", label: "नेपाली (Nepali)" },
  { value: "sd", label: "سنڌي (Sindhi)" },
  { value: "doi", label: "डोगरी (Dogri)" },
  { value: "kok", label: "कोंकणी (Konkani)" },
  { value: "mni", label: "মৈতৈলোন্ (Manipuri)" },
  { value: "brx", label: "बड़ो (Bodo)" },
  { value: "sa", label: "संस्कृतम् (Sanskrit)" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerUser({ name, phone_number: phone, password, preferred_language: language });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { fontFamily: "var(--font-body)", color: COLORS.ink };
  const labelStyle = { color: `${COLORS.ink}80`, fontFamily: "var(--font-mono)" };

  return (
    <AuthLayout eyebrow="Get started" title="Create your account" subtitle="Register to start managing your fields.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>Full name</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-4 py-3 outline-none transition focus:shadow-[0_0_0_4px_rgba(123,201,111,0.3)]"
            placeholder="Ramesh Kumar"
          />
        </div>

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
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-4 py-3 outline-none transition focus:shadow-[0_0_0_4px_rgba(123,201,111,0.3)]"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide font-semibold" style={labelStyle}>Preferred language</label>
          <select
            value={language} onChange={(e) => setLanguage(e.target.value)}
            style={inputStyle}
            className="mt-1.5 w-full rounded-xl border-2 border-black/10 bg-white px-4 py-3 outline-none transition focus:shadow-[0_0_0_4px_rgba(123,201,111,0.3)]"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
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
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-sm text-center mt-2" style={{ color: `${COLORS.ink}80`, fontFamily: "var(--font-body)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: COLORS.clay }} className="font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}