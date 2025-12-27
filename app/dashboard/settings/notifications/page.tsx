"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface NotificationPreferences {
  notification_enabled: boolean;
  morning_checkin_time: string;
  evening_checkin_enabled: boolean;
  evening_checkin_time: string;
  weekly_summary_day: number;
  insight_notifications: boolean;
  streak_reminders: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notification_enabled: true,
    morning_checkin_time: "08:00",
    evening_checkin_enabled: false,
    evening_checkin_time: "20:00",
    weekly_summary_day: 0,
    insight_notifications: true,
    streak_reminders: true,
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
        setPreferences(data);
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

  const handleToggle = (field: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleTimeChange = (field: "morning_checkin_time" | "evening_checkin_time", value: string) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDayChange = (value: number) => {
    setPreferences((prev) => ({
      ...prev,
      weekly_summary_day: value,
    }));
  };

  const daysOfWeek = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

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
        <p className="text-[#6B6B6B] text-base">Manage when and how you receive reminders</p>
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

      <div className="bg-white rounded-2xl border border-[#E8E0DB] p-6 space-y-8">
        {/* Morning Check-in */}
        <div className="border-b border-[#E8E0DB] pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-[#3D3D3D] mb-1">Morning Check-in</h3>
              <p className="text-[#6B6B6B] text-base">
                A gentle reminder to log how you slept
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notification_enabled && preferences.notification_enabled}
                onChange={() => handleToggle("notification_enabled")}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[#E8E0DB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff74b1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff74b1]"></div>
            </label>
          </div>
          {preferences.notification_enabled && (
            <div className="mt-4">
              <label className="block text-[#6B6B6B] text-base mb-2 font-medium">
                Time:
              </label>
              <input
                type="time"
                value={preferences.morning_checkin_time}
                onChange={(e) => handleTimeChange("morning_checkin_time", e.target.value)}
                className="px-4 py-2 rounded-xl border border-[#E8E0DB] text-base focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
              />
            </div>
          )}
        </div>

        {/* Evening Reflection */}
        <div className="border-b border-[#E8E0DB] pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-[#3D3D3D] mb-1">Evening Reflection</h3>
              <p className="text-[#6B6B6B] text-base">
                Reminder to capture anything you missed
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.evening_checkin_enabled}
                onChange={() => handleToggle("evening_checkin_enabled")}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[#E8E0DB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff74b1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff74b1]"></div>
            </label>
          </div>
          {preferences.evening_checkin_enabled && (
            <div className="mt-4">
              <label className="block text-[#6B6B6B] text-base mb-2 font-medium">
                Time:
              </label>
              <input
                type="time"
                value={preferences.evening_checkin_time}
                onChange={(e) => handleTimeChange("evening_checkin_time", e.target.value)}
                className="px-4 py-2 rounded-xl border border-[#E8E0DB] text-base focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
              />
            </div>
          )}
        </div>

        {/* Streak Reminders */}
        <div className="border-b border-[#E8E0DB] pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#3D3D3D] mb-1">Streak Reminders</h3>
              <p className="text-[#6B6B6B] text-base">
                Nudge if you haven&apos;t logged and have an active streak
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.streak_reminders}
                onChange={() => handleToggle("streak_reminders")}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[#E8E0DB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff74b1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff74b1]"></div>
            </label>
          </div>
        </div>

        {/* Insight Alerts */}
        <div className="border-b border-[#E8E0DB] pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#3D3D3D] mb-1">Insight Alerts</h3>
              <p className="text-[#6B6B6B] text-base">
                Notify when Lisa finds a new pattern
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.insight_notifications}
                onChange={() => handleToggle("insight_notifications")}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[#E8E0DB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff74b1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff74b1]"></div>
            </label>
          </div>
        </div>

        {/* Weekly Summary */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-[#3D3D3D] mb-1">Weekly Summary</h3>
              <p className="text-[#6B6B6B] text-base">
                Your week&apos;s progress every week
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={true} // Always enabled for now
                disabled
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[#ff74b1] rounded-full cursor-not-allowed opacity-50"></div>
            </label>
          </div>
          <div className="mt-4">
            <label className="block text-[#6B6B6B] text-base mb-2 font-medium">
              Day:
            </label>
            <select
              value={preferences.weekly_summary_day}
              onChange={(e) => handleDayChange(parseInt(e.target.value))}
              className="px-4 py-2 rounded-xl border border-[#E8E0DB] text-base focus:outline-none focus:ring-2 focus:ring-[#ff74b1] cursor-pointer"
            >
              {daysOfWeek.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
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

