"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const qp = useSearchParams();
  const redirectTarget = useRef(qp.get("redirectedFrom") || "/dashboard");

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) { setErr(error.message); return; }

      router.replace(redirectTarget.current);
      // refresh ponekad pomogne App Router-u da odmah vidi auth stanje u klijentu
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6">Log in</h1>

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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {err && <p className="text-rose-400 text-sm mt-3">{err}</p>}

      <p className="text-sm text-gray-400 mt-4">
        You do not have an account? <Link href="/register" className="underline">Sign up</Link>
      </p>
    </div>
  );
}
