"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Fitness } from "./FitnessList";

type DateRange = 7 | 30 | 90;

type FitnessChartsProps = {
  fitness: Fitness[];
  dateRange: DateRange;
};

export default function FitnessCharts({
  fitness,
  dateRange,
}: FitnessChartsProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    const filteredFitness = fitness.filter((f) => {
      const performedAt = new Date(f.performed_at);
      return performedAt >= startDate;
    });

    // Group by date
    const dateMap = new Map<string, { 
      count: number; 
      totalDuration: number; 
      durationCount: number;
      totalCalories: number; 
      calorieCount: number;
    }>();

    filteredFitness.forEach((f) => {
      const date = new Date(f.performed_at);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      const existing = dateMap.get(dateKey) || {
        count: 0,
        totalDuration: 0,
        durationCount: 0,
        totalCalories: 0,
        calorieCount: 0,
      };

      dateMap.set(dateKey, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + (f.duration_minutes || 0),
        durationCount: existing.durationCount + (f.duration_minutes !== null ? 1 : 0),
        totalCalories: existing.totalCalories + (f.calories_burned || 0),
        calorieCount: existing.calorieCount + (f.calories_burned !== null ? 1 : 0),
      });
    });

    // Generate all dates in range
    const allDates: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      allDates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build chart data
    const data = allDates.map((dateKey) => {
      const stats = dateMap.get(dateKey) || {
        count: 0,
        totalDuration: 0,
        durationCount: 0,
        totalCalories: 0,
        calorieCount: 0,
      };

      const totalDuration = Math.round(stats.totalDuration);
      const totalCalories = Math.round(stats.totalCalories);

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
        totalDuration,
        totalCalories,
      };
    });

    return data;
  }, [fitness, dateRange]);

  const hasDurationData = useMemo(() => {
    return fitness.some((f) => f.duration_minutes !== null);
  }, [fitness]);

  const hasCalorieData = useMemo(() => {
    return fitness.some((f) => f.calories_burned !== null);
  }, [fitness]);

  if (fitness.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-background/60 p-12 text-center">
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
          Log some workouts to see trends over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entries per Day Chart */}
      <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Workouts per Day
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
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
                backgroundColor: "var(--color-background)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                color: "var(--color-foreground)",
              }}
            />
            <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total Duration per Day Chart (only if duration data exists) */}
      {hasDurationData && (
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Total Duration per Day (minutes)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
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
                  backgroundColor: "var(--color-background)",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  color: "var(--color-foreground)",
                }}
              />
              <Line
                type="monotone"
                dataKey="totalDuration"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: "var(--color-primary)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Calories Burned per Day Chart (only if calorie data exists) */}
      {hasCalorieData && (
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Calories Burned per Day
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
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
                  backgroundColor: "var(--color-background)",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  color: "var(--color-foreground)",
                }}
              />
              <Line
                type="monotone"
                dataKey="totalCalories"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: "var(--color-primary)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

