"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

const TRIAL_DAYS = 7;
const CHAT_URL = "https://app.vectorshift.ai/chatbots/deployed/68f8cbbb5fd286eb2fdfe742";

type TrialMeta = { trial_start?: string };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (mounted) {
          setErr(error.message);
          setLoading(false);
        }
        return;
      }

      const u = data.user;
      if (!u) {
        router.replace("/login?redirectedFrom=/dashboard");
        return;
      }

      // If trial_start is missing (old user), set it now
      const meta = (u.user_metadata ?? {}) as TrialMeta;
      if (!meta.trial_start) {
        const nowIso = new Date().toISOString();
        const { data: upd, error: updErr } = await supabase.auth.updateUser({
          data: { trial_start: nowIso },
        });
        if (updErr) {
          if (mounted) {
            setErr(updErr.message);
            setLoading(false);
          }
          return;
        }
        setUser(upd?.user ?? u);
      } else {
        setUser(u);
      }

      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const { daysLeft, expired, startDate } = useMemo(() => {
    const startIso = (user?.user_metadata as TrialMeta | undefined)?.trial_start;
    const start = startIso ? new Date(startIso) : null;
    const now = new Date();
    let left = TRIAL_DAYS;
    if (start) {
      const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
      left = Math.max(0, TRIAL_DAYS - diffDays);
    }
    return { daysLeft: left, expired: left <= 0, startDate: start };
  }, [user]);

  if (loading)
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="text-gray-400">Loading…</div>
      </main>
    );
  if (err)
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p className="text-rose-400">Error: {err}</p>
      </main>
    );

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {!expired ? (
        <div className="space-y-3">
          <p className="text-gray-200">Your trial is active.</p>
          {startDate && (
            <p className="text-gray-400 text-sm">
              Started on: {startDate.toLocaleDateString()}
            </p>
          )}
          <a
            href={CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded bg-primary font-bold text-black px-4 py-2"
          >
            Open Chatbot
          </a>
          <p className="text-gray-500 text-xs">Days left: {daysLeft}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-200 font-medium">Your trial has expired.</p>
          <p className="text-gray-400 text-sm">Chatbot access is closed.</p>
          <p className="text-gray-500 text-xs">Days left: 0</p>
        </div>
      )}

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        }}
        className="text-sm text-gray-400 underline cursor-pointer"
      >
        Log out
      </button>
    </main>
  );
}
