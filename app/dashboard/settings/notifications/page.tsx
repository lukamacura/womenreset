"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface NotificationPreferences {
  notification_enabled: boolean;
  weekly_insights_enabled: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notification_enabled: true,
    weekly_insights_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications/preferences");
      if (!response.ok) throw new Error("Failed to fetch preferences");
      const { data } = await response.json();
      if (data) {
        setPreferences({
          notification_enabled: data.notification_enabled ?? true,
          weekly_insights_enabled: data.weekly_insights_enabled ?? true,
        });
      }
    } catch (err) {
      console.error("Error fetching preferences:", err);
      setError(err instanceof Error ? err.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save preferences");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    setPreferences((prev) => ({
      ...prev,
      notification_enabled: !prev.notification_enabled,
    }));
  };

  const handleWeeklyInsightsToggle = () => {
    setPreferences((prev) => ({
      ...prev,
      weekly_insights_enabled: !prev.weekly_insights_enabled,
    }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 sm:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-[#E8E0DB]/30 rounded" />
          <div className="h-32 w-full bg-[#E8E0DB]/30 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#3D3D3D] mb-2">Notification Settings</h1>
        <p className="text-[#6B6B6B] text-base">Manage when you receive reminders</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 text-base">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800 text-base">
          Preferences saved successfully!
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8E0DB] p-6 space-y-6">
        {/* Daily Reminder */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-[#3D3D3D] mb-1">Daily Reminder</h3>
            <p className="text-[#6B6B6B] text-base">
              Get a gentle nudge to track your symptoms
            </p>
            <p className="text-[#6B6B6B] text-sm mt-1 italic">
              Sent once daily in the morning
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={preferences.notification_enabled}
              onChange={handleToggle}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-[#E8E0DB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff74b1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff74b1]"></div>
          </label>
        </div>

        {/* Weekly Insights */}
        <div className="border-t border-[#E8E0DB] pt-6 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-[#3D3D3D] mb-1">Weekly Insights</h3>
            <p className="text-[#6B6B6B] text-base">
              Get a summary of your week&apos;s symptom patterns
            </p>
            <p className="text-[#6B6B6B] text-sm mt-1 italic">
              Sent once weekly on Mondays
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={preferences.weekly_insights_enabled}
              onChange={handleWeeklyInsightsToggle}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-[#E8E0DB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff74b1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff74b1]"></div>
          </label>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E8E0DB] pt-6">
          <h4 className="text-lg font-semibold text-[#3D3D3D] mb-3">How notifications work</h4>
          <ul className="space-y-2 text-[#6B6B6B] text-base">
            <li className="flex items-start gap-2">
              <span className="text-[#ff74b1] mt-1">•</span>
              <span>Daily reminder to track your symptoms</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ff74b1] mt-1">•</span>
              <span>Weekly insights summary of your patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ff74b1] mt-1">•</span>
              <span>Important app updates</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-white hover:bg-[#F5EDE8] text-[#3D3D3D] font-semibold rounded-xl transition-colors cursor-pointer border border-[#E8E0DB] text-base"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-[#ff74b1] hover:bg-[#d85a9a] text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

