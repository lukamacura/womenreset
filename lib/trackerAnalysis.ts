/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
interface Symptom {
  id: string;
  name: string;
  severity: number;
  notes?: string;
  occurred_at: string;
}

interface Nutrition {
  id: string;
  food_item: string;
  meal_type: string;
  calories?: number;
  notes?: string;
  consumed_at: string;
}

interface Fitness {
  id: string;
  exercise_name: string;
  exercise_type: string;
  duration_minutes?: number;
  calories_burned?: number;
  intensity?: string;
  notes?: string;
  performed_at: string;
}

interface TrackerSummary {
  symptoms: {
    total: number;
    byName: Record<string, { count: number; avgSeverity: number; trend: string }>;
    avgSeverity: number;
    trend: string;
    recent: Symptom[];
  };
  nutrition: {
    total: number;
    avgCalories: number;
    byMealType: Record<string, number>;
    recent: Nutrition[];
  };
  fitness: {
    total: number;
    avgWorkoutsPerWeek: number;
    byType: Record<string, number>;
    avgDuration: number;
    recent: Fitness[];
  };
  patterns: {
    correlations: string[];
    insights: string[];
  };
}

// Fetch tracker data for a user
export async function fetchTrackerData(
  userId: string,
  days: number = 30
): Promise<{
  symptoms: Symptom[];
  nutrition: Nutrition[];
  fitness: Fitness[];
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();

  const [symptomsResult, nutritionResult, fitnessResult] = await Promise.all([
    supabaseClient
      .from("symptoms")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", cutoffISO)
      .order("occurred_at", { ascending: false }),
    supabaseClient
      .from("nutrition")
      .select("*")
      .eq("user_id", userId)
      .gte("consumed_at", cutoffISO)
      .order("consumed_at", { ascending: false }),
    supabaseClient
      .from("fitness")
      .select("*")
      .eq("user_id", userId)
      .gte("performed_at", cutoffISO)
      .order("performed_at", { ascending: false }),
  ]);

  return {
    symptoms: symptomsResult.data || [],
    nutrition: nutritionResult.data || [],
    fitness: fitnessResult.data || [],
  };
}

// Analyze patterns and generate insights
export function analyzeTrackerData(
  symptoms: Symptom[],
  nutrition: Nutrition[],
  fitness: Fitness[]
): TrackerSummary {
  // Symptoms analysis
  const symptomByName: Record<string, { severities: number[]; dates: Date[] }> = {};
  let totalSeverity = 0;

  symptoms.forEach((s) => {
    if (!symptomByName[s.name]) {
      symptomByName[s.name] = { severities: [], dates: [] };
    }
    symptomByName[s.name].severities.push(s.severity);
    symptomByName[s.name].dates.push(new Date(s.occurred_at));
    totalSeverity += s.severity;
  });

  const symptomStats: Record<string, { count: number; avgSeverity: number; trend: string }> = {};
  Object.keys(symptomByName).forEach((name) => {
    const data = symptomByName[name];
    const count = data.severities.length;
    const avgSeverity = data.severities.reduce((a, b) => a + b, 0) / count;
    
    // Calculate trend (comparing first half vs second half)
    let trend = "stable";
    if (count >= 4) {
      const mid = Math.floor(count / 2);
      const firstHalf = data.severities.slice(0, mid);
      const secondHalf = data.severities.slice(mid);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const change = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (change < -10) trend = "decreasing";
      else if (change > 10) trend = "increasing";
    }
    
    symptomStats[name] = { count, avgSeverity: Math.round(avgSeverity * 10) / 10, trend };
  });

  const avgSeverity = symptoms.length > 0 ? totalSeverity / symptoms.length : 0;
  
  // Calculate overall symptom trend
  let overallTrend = "stable";
  if (symptoms.length >= 4) {
    const mid = Math.floor(symptoms.length / 2);
    const firstHalf = symptoms.slice(0, mid);
    const secondHalf = symptoms.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b.severity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.severity, 0) / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    if (change < -10) overallTrend = "decreasing";
    else if (change > 10) overallTrend = "increasing";
  }

  // Nutrition analysis
  const mealTypeCount: Record<string, number> = {};
  let totalCalories = 0;
  let calorieCount = 0;

  nutrition.forEach((n) => {
    mealTypeCount[n.meal_type] = (mealTypeCount[n.meal_type] || 0) + 1;
    if (n.calories) {
      totalCalories += n.calories;
      calorieCount++;
    }
  });

  const avgCalories = calorieCount > 0 ? Math.round(totalCalories / calorieCount) : 0;

  // Fitness analysis
  const exerciseTypeCount: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;
  const workoutDates = fitness.map((f) => new Date(f.performed_at));

  fitness.forEach((f) => {
    exerciseTypeCount[f.exercise_type] = (exerciseTypeCount[f.exercise_type] || 0) + 1;
    if (f.duration_minutes) {
      totalDuration += f.duration_minutes;
      durationCount++;
    }
  });

  const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  // Calculate workouts per week
  let avgWorkoutsPerWeek = 0;
  if (workoutDates.length > 0) {
    const oldest = new Date(Math.min(...workoutDates.map((d) => d.getTime())));
    const newest = new Date(Math.max(...workoutDates.map((d) => d.getTime())));
    const daysDiff = Math.max(1, (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = daysDiff / 7;
    avgWorkoutsPerWeek = weeks > 0 ? Math.round((fitness.length / weeks) * 10) / 10 : fitness.length;
  }

  // Pattern detection and correlations
  const correlations: string[] = [];
  const insights: string[] = [];

  // Check if workout days correlate with lower symptoms
  if (symptoms.length > 0 && fitness.length > 0) {
    const workoutDays = new Set(
      fitness.map((f) => new Date(f.performed_at).toDateString())
    );
    const symptomDays = symptoms.map((s) => ({
      date: new Date(s.occurred_at).toDateString(),
      severity: s.severity,
    }));

    const workoutDaySymptoms = symptomDays.filter((s) => workoutDays.has(s.date));
    const nonWorkoutDaySymptoms = symptomDays.filter((s) => !workoutDays.has(s.date));

    if (workoutDaySymptoms.length > 0 && nonWorkoutDaySymptoms.length > 0) {
      const workoutAvg = workoutDaySymptoms.reduce((a, b) => a + b.severity, 0) / workoutDaySymptoms.length;
      const nonWorkoutAvg = nonWorkoutDaySymptoms.reduce((a, b) => a + b.severity, 0) / nonWorkoutDaySymptoms.length;
      
      if (workoutAvg < nonWorkoutAvg - 1) {
        correlations.push(`Workout days show ${Math.round(((nonWorkoutAvg - workoutAvg) / nonWorkoutAvg) * 100)}% lower symptom severity`);
      }
    }
  }

  // Check nutrition patterns
  if (nutrition.length > 0) {
    const breakfastCount = mealTypeCount["breakfast"] || 0;
    const totalMeals = nutrition.length;
    if (breakfastCount / totalMeals < 0.3) {
      insights.push("Breakfast logging is infrequent - consider tracking morning meals for better insights");
    }
  }

  // Check fitness consistency
  if (fitness.length > 0) {
    if (avgWorkoutsPerWeek < 2) {
      insights.push("Exercise frequency is low - consider increasing to 2-3 times per week for better symptom management");
    } else if (avgWorkoutsPerWeek >= 3) {
      insights.push("Great exercise consistency! This likely contributes to better symptom management");
    }
  }

  // Symptom frequency insights
  Object.entries(symptomStats).forEach(([name, stats]) => {
    if (stats.count >= 5 && stats.avgSeverity >= 7) {
      insights.push(`"${name}" appears frequently with high severity (avg ${stats.avgSeverity}/10) - consider discussing with healthcare provider`);
    }
    if (stats.trend === "decreasing") {
      insights.push(`Good news: "${name}" symptoms are trending downward`);
    } else if (stats.trend === "increasing") {
      insights.push(`"${name}" symptoms are increasing - let's discuss strategies to manage this`);
    }
  });

  return {
    symptoms: {
      total: symptoms.length,
      byName: symptomStats,
      avgSeverity: Math.round(avgSeverity * 10) / 10,
      trend: overallTrend,
      recent: symptoms.slice(0, 5),
    },
    nutrition: {
      total: nutrition.length,
      avgCalories,
      byMealType: mealTypeCount,
      recent: nutrition.slice(0, 5),
    },
    fitness: {
      total: fitness.length,
      avgWorkoutsPerWeek,
      byType: exerciseTypeCount,
      avgDuration,
      recent: fitness.slice(0, 5),
    },
    patterns: {
      correlations,
      insights,
    },
  };
}

// Format tracker summary for AI context
export function formatTrackerSummary(summary: TrackerSummary): string {
  const parts: string[] = [];

  parts.push("=== USER TRACKER DATA (Last 30 days) ===");

  // Symptoms
  parts.push("\nSYMPTOMS:");
  if (summary.symptoms.total === 0) {
    parts.push("- No symptoms logged");
  } else {
    parts.push(`- Total logged: ${summary.symptoms.total}`);
    parts.push(`- Average severity: ${summary.symptoms.avgSeverity}/10`);
    parts.push(`- Overall trend: ${summary.symptoms.trend}`);
    
    if (Object.keys(summary.symptoms.byName).length > 0) {
      parts.push("- By symptom:");
      Object.entries(summary.symptoms.byName).forEach(([name, stats]) => {
        parts.push(`  • ${name}: ${stats.count} occurrences, avg severity ${stats.avgSeverity}/10, trend: ${stats.trend}`);
      });
    }
  }

  // Nutrition
  parts.push("\nNUTRITION:");
  if (summary.nutrition.total === 0) {
    parts.push("- No nutrition entries logged");
  } else {
    parts.push(`- Total entries: ${summary.nutrition.total}`);
    if (summary.nutrition.avgCalories > 0) {
      parts.push(`- Average calories per entry: ${summary.nutrition.avgCalories}`);
    }
    if (Object.keys(summary.nutrition.byMealType).length > 0) {
      parts.push("- By meal type:");
      Object.entries(summary.nutrition.byMealType).forEach(([type, count]) => {
        parts.push(`  • ${type}: ${count} entries`);
      });
    }
  }

  // Fitness
  parts.push("\nFITNESS:");
  if (summary.fitness.total === 0) {
    parts.push("- No workouts logged");
  } else {
    parts.push(`- Total workouts: ${summary.fitness.total}`);
    parts.push(`- Average workouts per week: ${summary.fitness.avgWorkoutsPerWeek}`);
    if (summary.fitness.avgDuration > 0) {
      parts.push(`- Average duration: ${summary.fitness.avgDuration} minutes`);
    }
    if (Object.keys(summary.fitness.byType).length > 0) {
      parts.push("- By exercise type:");
      Object.entries(summary.fitness.byType).forEach(([type, count]) => {
        parts.push(`  • ${type}: ${count} workouts`);
      });
    }
  }

  // Patterns and insights
  if (summary.patterns.correlations.length > 0 || summary.patterns.insights.length > 0) {
    parts.push("\nPATTERNS & INSIGHTS:");
    summary.patterns.correlations.forEach((corr) => parts.push(`- ${corr}`));
    summary.patterns.insights.forEach((insight) => parts.push(`- ${insight}`));
  }

  parts.push("\n=== END TRACKER DATA ===\n");

  return parts.join("\n");
}

