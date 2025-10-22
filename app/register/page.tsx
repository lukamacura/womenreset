"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();

      // Start the 7-day trial at sign-up
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { trial_start: nowIso } },
      });
      if (error) {
        setErr(error.message);
        return;
      }

      // If email confirmation is disabled, a session may exist immediately
      const hasSession = !!(await supabase.auth.getSession()).data.session;
      if (hasSession) {
        router.replace("/dashboard");
        router.refresh();
        return;
      } else {
        setInfo("Check your email to confirm registration, then log in.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6">Register</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border border-white/20 bg-transparent rounded px-3 py-2"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border border-white/20 bg-transparent rounded px-3 py-2"
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
        />
        <button
          className="w-full bg-white text-black px-4 py-2 rounded disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      {err && <p className="text-rose-400 text-sm mt-3">{err}</p>}
      {info && <p className="text-emerald-300 text-sm mt-3">{info}</p>}

      <p className="text-sm text-gray-400 mt-4">
        Already have an account? <a href="/login" className="underline">Log in</a>
      </p>
    </main>
  );
}
