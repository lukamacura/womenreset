"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Nutrition } from "./NutritionList";

type DateRange = 7 | 30 | 90;

type NutritionChartsProps = {
  nutrition: Nutrition[];
  dateRange: DateRange;
};

export default function NutritionCharts({
  nutrition,
  dateRange,
}: NutritionChartsProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    
    // Calculate start date (dateRange days ago, at start of day)
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    // Calculate end date (today, at end of day)
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // Filter nutrition entries within the date range
    const filteredNutrition = nutrition.filter((n) => {
      const consumedAt = new Date(n.consumed_at);
      return consumedAt >= startDate && consumedAt <= endDate;
    });

    // Group by date
    const dateMap = new Map<string, { count: number; totalCalories: number; calorieCount: number }>();

    filteredNutrition.forEach((n) => {
      const date = new Date(n.consumed_at);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      const existing = dateMap.get(dateKey) || {
        count: 0,
        totalCalories: 0,
        calorieCount: 0,
      };

      dateMap.set(dateKey, {
        count: existing.count + 1,
        totalCalories: existing.totalCalories + (n.calories || 0),
        calorieCount: existing.calorieCount + (n.calories !== null ? 1 : 0),
      });
    });

    // Generate all dates in range (including today)
    // Compare dates at the day level, not datetime level
    const allDates: string[] = [];
    const currentDate = new Date(startDate);
    const todayDateString = now.toISOString().split("T")[0]; // Today's date as YYYY-MM-DD
    
    while (true) {
      const currentDateString = currentDate.toISOString().split("T")[0];
      allDates.push(currentDateString);
      
      // Stop if we've reached today
      if (currentDateString >= todayDateString) {
        break;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build chart data
    const data = allDates.map((dateKey) => {
      const stats = dateMap.get(dateKey) || {
        count: 0,
        totalCalories: 0,
        calorieCount: 0,
      };

      const avgCalories =
        stats.calorieCount > 0
          ? Number((stats.totalCalories / stats.calorieCount).toFixed(0))
          : 0;

      const totalCalories = stats.totalCalories;

      // Format date for display
      const date = new Date(dateKey);
      const displayDate =
        dateRange <= 7
          ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      return {
        date: displayDate,
        dateKey,
        count: stats.count,
        avgCalories,
        totalCalories,
      };
    });

    return data;
  }, [nutrition, dateRange]);

  const hasCalorieData = useMemo(() => {
    return nutrition.some((n) => n.calories !== null);
  }, [nutrition]);

  if (nutrition.length === 0) {
    return (
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-12 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No data to display
        </h3>
        <p className="text-sm text-muted-foreground">
          Log some nutrition entries to see trends over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entries per Day Chart */}
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-5 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Entries per Day
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="entriesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff74b1" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="currentColor"
              style={{ fontSize: "12px", fill: "currentColor", opacity: 0.7 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="currentColor"
              style={{ fontSize: "12px", fill: "currentColor", opacity: 0.7 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 116, 177, 0.3)",
                borderRadius: "8px",
                color: "#3D3D3D",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#ff74b1"
              strokeWidth={2}
              fill="url(#entriesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Calories per Day Chart (only if calorie data exists) */}
      {hasCalorieData && (
        <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-5 shadow-xl">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Total Calories per Day
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                style={{ fontSize: "12px", fill: "currentColor", opacity: 0.7 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="currentColor"
                style={{ fontSize: "12px", fill: "currentColor", opacity: 0.7 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  borderRadius: "8px",
                  color: "#3D3D3D",
                }}
              />
              <Area
                type="monotone"
                dataKey="totalCalories"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="url(#caloriesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

