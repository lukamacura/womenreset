/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import type { SymptomLog } from "./symptom-tracker-constants";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
interface SymptomLogWithName extends SymptomLog {
  symptom_name?: string;
  symptom_icon?: string;
}

interface Nutrition {
  id: string;
  food_item: string;
  meal_type: string;
  calories?: number;
  food_tags?: string[];
  feeling_after?: 'energized' | 'no_change' | 'sluggish' | 'bloated' | null;
  notes?: string;
  consumed_at: string;
}

interface HydrationLog {
  id: string;
  user_id: string;
  glasses: number;
  logged_at: string;
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

export interface PlainLanguageInsight {
  text: string;
  type: 'progress' | 'pattern' | 'correlation' | 'time-of-day' | 'trigger' | 'food-correlation' | 'hydration' | 'food-progress' | 'meal-timing';
  priority: 'high' | 'medium' | 'low';
  // Context data for generating "Ask Lisa" prompts
  symptomName?: string;
  triggerName?: string;
  timeOfDay?: string;
  percentage?: number;
  changeDirection?: 'up' | 'down';
  changePercent?: number;
  foodTag?: string;
  hydrationLevel?: number;
}

export interface TrackerSummary {
  symptoms: {
    total: number;
    byName: Record<string, { count: number; avgSeverity: number; trend: string }>;
    avgSeverity: number;
    trend: string;
    recent: SymptomLogWithName[];
  };
  nutrition: {
    total: number;
    avgCalories: number;
    byMealType: Record<string, number>;
    foodTags: Record<string, number>;
    feelingAfter: Record<string, number>;
    recent: Nutrition[];
  };
  hydration: {
    totalGlasses: number;
    weeklyAverage: number;
    dailyBreakdown: Record<string, number>;
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
  plainLanguageInsights: PlainLanguageInsight[];
}

// Fetch tracker data for a user
export async function fetchTrackerData(
  userId: string,
  days: number = 30
): Promise<{
  symptomLogs: SymptomLogWithName[];
  nutrition: Nutrition[];
  fitness: Fitness[];
  hydration: HydrationLog[];
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();

  const [symptomLogsResult, nutritionResult, fitnessResult, hydrationResult] = await Promise.all([
    supabaseClient
      .from("symptom_logs")
      .select(`
        *,
        symptoms (name, icon)
      `)
      .eq("user_id", userId)
      .gte("logged_at", cutoffISO)
      .order("logged_at", { ascending: false }),
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
    supabaseClient
      .from("hydration_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", cutoffISO)
      .order("logged_at", { ascending: false }),
  ]);

  // Transform symptom logs to include name and icon
  const symptomLogs: SymptomLogWithName[] = (symptomLogsResult.data || []).map((log: any) => ({
    ...log,
    symptom_name: log.symptoms?.name,
    symptom_icon: log.symptoms?.icon,
  }));

  // Normalize nutrition food_tags to always be arrays
  const nutrition: Nutrition[] = (nutritionResult.data || []).map((n: any) => ({
    ...n,
    food_tags: Array.isArray(n.food_tags) ? n.food_tags : [],
  }));

  return {
    symptomLogs,
    nutrition,
    fitness: fitnessResult.data || [],
    hydration: hydrationResult.data || [],
  };
}

// Generate plain-language insights
function generatePlainLanguageInsights(
  symptomLogs: SymptomLogWithName[],
  nutrition: Nutrition[],
  fitness: Fitness[],
  hydration: HydrationLog[] = []
): PlainLanguageInsight[] {
  const insights: PlainLanguageInsight[] = [];

  // Nutrition-specific insights (can be generated even without symptoms)
  
  // Food-symptom correlations
  if (nutrition.length > 0 && symptomLogs.length > 0) {
    const triggerFoods = ['caffeine', 'alcohol', 'spicy_food', 'sugar_refined_carbs', 'processed_food'];
    
    triggerFoods.forEach((foodTag) => {
      // Find days with this food tag
      const foodTagDays = new Set(
        nutrition
          .filter((n) => n.food_tags?.includes(foodTag))
          .map((n) => new Date(n.consumed_at).toDateString())
      );

      if (foodTagDays.size === 0) return;

      // Check symptom frequency on days with vs without this food
      const symptomDays = symptomLogs.map((s) => ({
        date: new Date(s.logged_at).toDateString(),
        symptomName: s.symptom_name || 'Unknown',
        severity: s.severity,
      }));

      const symptomsOnFoodDays = symptomDays.filter((s) => foodTagDays.has(s.date));
      const symptomsOnOtherDays = symptomDays.filter((s) => !foodTagDays.has(s.date));

      if (symptomsOnFoodDays.length > 0 && symptomsOnOtherDays.length > 0) {
        const foodDayAvg = symptomsOnFoodDays.reduce((sum, s) => sum + s.severity, 0) / symptomsOnFoodDays.length;
        const otherDayAvg = symptomsOnOtherDays.reduce((sum, s) => sum + s.severity, 0) / symptomsOnOtherDays.length;

        if (foodDayAvg > otherDayAvg * 1.3 && foodTagDays.size >= 3) {
          const foodTagLabel = foodTag.replace(/_/g, ' ');
          const topSymptom = symptomsOnFoodDays.reduce((acc, s) => {
            const count = symptomsOnFoodDays.filter((x) => x.symptomName === s.symptomName).length;
            return count > (acc.count || 0) ? { symptomName: s.symptomName, count } : acc;
          }, { symptomName: '', count: 0 });

          if (topSymptom.symptomName) {
            insights.push({
              text: `On days you logged ${foodTagLabel}, you had ${Math.round((foodDayAvg / otherDayAvg) * 100)}% more ${topSymptom.symptomName}`,
              type: 'food-correlation',
              priority: 'high',
              symptomName: topSymptom.symptomName,
              foodTag,
            });
          }
        }
      }
    });
  }

  // Hydration patterns
  if (hydration.length > 0 && symptomLogs.length > 0) {
    const hydrationByDay: Record<string, number> = {};
    hydration.forEach((h) => {
      const day = new Date(h.logged_at).toDateString();
      hydrationByDay[day] = (hydrationByDay[day] || 0) + h.glasses;
    });

    const lowHydrationDays = Object.entries(hydrationByDay)
      .filter(([_, glasses]) => glasses < 6)
      .map(([day]) => day);
    const highHydrationDays = Object.entries(hydrationByDay)
      .filter(([_, glasses]) => glasses >= 6)
      .map(([day]) => day);

    if (lowHydrationDays.length > 0 && highHydrationDays.length > 0) {
      const lowHydrationSymptoms = symptomLogs.filter((s) =>
        lowHydrationDays.includes(new Date(s.logged_at).toDateString())
      );
      const highHydrationSymptoms = symptomLogs.filter((s) =>
        highHydrationDays.includes(new Date(s.logged_at).toDateString())
      );

      if (lowHydrationSymptoms.length > 0 && highHydrationSymptoms.length > 0) {
        const lowAvg = lowHydrationSymptoms.reduce((sum, s) => sum + s.severity, 0) / lowHydrationSymptoms.length;
        const highAvg = highHydrationSymptoms.reduce((sum, s) => sum + s.severity, 0) / highHydrationSymptoms.length;

        if (lowAvg > highAvg * 1.2 && lowHydrationDays.length >= 3) {
          const avgGlasses = lowHydrationDays.reduce((sum, day) => sum + (hydrationByDay[day] || 0), 0) / lowHydrationDays.length;
          insights.push({
            text: `Your symptoms are worse on low-hydration days (avg ${Math.round(avgGlasses)} glasses). Try aiming for 6+ glasses daily.`,
            type: 'hydration',
            priority: 'high',
            hydrationLevel: Math.round(avgGlasses),
          });
        }
      }
    }

    // Weekly hydration average
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekHydration = hydration.filter((h) => new Date(h.logged_at) >= weekAgo);
    if (weekHydration.length > 0) {
      const weekDays = new Set(weekHydration.map((h) => new Date(h.logged_at).toDateString())).size;
      const totalGlasses = weekHydration.reduce((sum, h) => sum + h.glasses, 0);
      const avgGlasses = weekDays > 0 ? totalGlasses / weekDays : 0;

      if (avgGlasses < 6) {
        insights.push({
          text: `You averaged ${Math.round(avgGlasses)} glasses of water this week — try for 6+`,
          type: 'hydration',
          priority: 'medium',
          hydrationLevel: Math.round(avgGlasses),
        });
      }
    }
  }

  // Meal timing patterns
  if (nutrition.length >= 10) {
    const breakfastCount = nutrition.filter((n) => n.meal_type === 'breakfast').length;
    const totalMeals = nutrition.length;
    const breakfastPercentage = (breakfastCount / totalMeals) * 100;

    if (breakfastPercentage < 30) {
      const skipDays = Math.round((1 - breakfastPercentage / 100) * 7);
      insights.push({
        text: `You skip breakfast ${skipDays} days a week — this may affect energy levels`,
        type: 'meal-timing',
        priority: 'medium',
      });
    }

    // Caffeine timing
    const caffeineEntries = nutrition.filter((n) => n.food_tags?.includes('caffeine'));
    if (caffeineEntries.length >= 5) {
      const afternoonCaffeine = caffeineEntries.filter((n) => {
        const hour = new Date(n.consumed_at).getHours();
        return hour >= 14;
      }).length;

      if (afternoonCaffeine / caffeineEntries.length > 0.5) {
        insights.push({
          text: `Most of your caffeine is after 2pm — this can disrupt sleep`,
          type: 'meal-timing',
          priority: 'high',
        });
      }
    }
  }

  // Food progress tracking
  if (nutrition.length >= 14) {
    const sortedNutrition = [...nutrition].sort((a, b) =>
      new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime()
    );
    const firstWeek = sortedNutrition.slice(0, Math.floor(sortedNutrition.length / 2));
    const secondWeek = sortedNutrition.slice(Math.floor(sortedNutrition.length / 2));

    const triggerFoods = ['caffeine', 'alcohol', 'spicy_food', 'sugar_refined_carbs', 'processed_food'];
    const supportiveFoods = ['phytoestrogens', 'calcium_rich', 'omega_3s', 'fiber', 'protein'];

    triggerFoods.forEach((tag) => {
      const firstWeekCount = firstWeek.filter((n) => n.food_tags?.includes(tag)).length;
      const secondWeekCount = secondWeek.filter((n) => n.food_tags?.includes(tag)).length;

      if (firstWeekCount > 0 && secondWeekCount === 0) {
        const tagLabel = tag.replace(/_/g, ' ');
        insights.push({
          text: `Great progress: You've had ${secondWeek.length} days without ${tagLabel} this week — up from ${firstWeekCount} last week`,
          type: 'food-progress',
          priority: 'high',
          foodTag: tag,
        });
      }
    });

    supportiveFoods.forEach((tag) => {
      const firstWeekCount = firstWeek.filter((n) => n.food_tags?.includes(tag)).length;
      const secondWeekCount = secondWeek.filter((n) => n.food_tags?.includes(tag)).length;

      if (firstWeekCount > 0 && secondWeekCount > firstWeekCount * 1.3) {
        const tagLabel = tag.replace(/_/g, ' ');
        const increase = Math.round(((secondWeekCount - firstWeekCount) / firstWeekCount) * 100);
        insights.push({
          text: `Your ${tagLabel} intake increased ${increase}% this month`,
          type: 'food-progress',
          priority: 'high',
          foodTag: tag,
        });
      }
    });
  }

  // Trigger food alerts
  if (nutrition.length >= 7) {
    const triggerFoods = ['caffeine', 'alcohol', 'spicy_food', 'sugar_refined_carbs', 'processed_food'];
    const weekNutrition = nutrition.filter((n) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(n.consumed_at) >= weekAgo;
    });

    triggerFoods.forEach((tag) => {
      const count = weekNutrition.filter((n) => n.food_tags?.includes(tag)).length;
      if (count >= 5) {
        const tagLabel = tag.replace(/_/g, ' ');
        insights.push({
          text: `Frequent ${tagLabel} intake detected this week (${count} times) — consider reducing to see if symptoms improve`,
          type: 'food-correlation',
          priority: 'high',
          foodTag: tag,
        });
      }
    });
  }

  // Continue with existing symptom-based insights
  if (symptomLogs.length === 0) {
    return insights;
  }

  // Group logs by symptom name
  const logsBySymptom: Record<string, SymptomLogWithName[]> = {};
  symptomLogs.forEach((log) => {
    const name = log.symptom_name || 'Unknown';
    if (!logsBySymptom[name]) {
      logsBySymptom[name] = [];
    }
    logsBySymptom[name].push(log);
  });

  // Time-of-day analysis
  const timeOfDayCounts: Record<string, Record<string, number>> = {};
  Object.entries(logsBySymptom).forEach(([symptomName, logs]) => {
    timeOfDayCounts[symptomName] = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    logs.forEach((log) => {
      const timeOfDay = log.time_of_day || getTimeOfDayFromDate(log.logged_at);
      if (timeOfDay && timeOfDayCounts[symptomName][timeOfDay]) {
        timeOfDayCounts[symptomName][timeOfDay]++;
      }
    });
  });

  // Find most common time of day for each symptom
  Object.entries(timeOfDayCounts).forEach(([symptomName, counts]) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total >= 3) {
      const maxCount = Math.max(...Object.values(counts));
      const maxTimeOfDay = Object.entries(counts).find(([_, count]) => count === maxCount)?.[0];
      if (maxTimeOfDay && maxCount / total > 0.4) {
        const timeLabel = {
          morning: '6am-12pm',
          afternoon: '12pm-6pm',
          evening: '6pm-10pm',
          night: '10pm-6am',
        }[maxTimeOfDay] || maxTimeOfDay;
        insights.push({
          text: `${symptomName} happen most between ${timeLabel}`,
          type: 'time-of-day',
          priority: 'medium',
        });
      }
    }
  });

  // Trigger analysis
  const triggerFrequency: Record<string, Record<string, number>> = {};
  Object.entries(logsBySymptom).forEach(([symptomName, logs]) => {
    triggerFrequency[symptomName] = {};
    logs.forEach((log) => {
      (log.triggers || []).forEach((trigger) => {
        triggerFrequency[symptomName][trigger] = (triggerFrequency[symptomName][trigger] || 0) + 1;
      });
    });
  });

  Object.entries(triggerFrequency).forEach(([symptomName, triggers]) => {
    const totalLogs = logsBySymptom[symptomName].length;
    Object.entries(triggers).forEach(([trigger, count]) => {
      const percentage = Math.round((count / totalLogs) * 100);
      if (percentage >= 50 && totalLogs >= 3) {
        insights.push({
          text: `${trigger} appears in ${percentage}% of your ${symptomName} logs. Might be worth experimenting with cutting back.`,
          type: 'trigger',
          priority: 'high',
          symptomName,
          triggerName: trigger,
          percentage,
        });
      }
    });
  });

  // Progress analysis (compare last 2 weeks vs first 2 weeks)
  if (symptomLogs.length >= 10) {
    const sortedLogs = [...symptomLogs].sort((a, b) => 
      new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    const firstHalf = sortedLogs.slice(0, Math.floor(sortedLogs.length / 2));
    const secondHalf = sortedLogs.slice(Math.floor(sortedLogs.length / 2));

    Object.entries(logsBySymptom).forEach(([symptomName, allLogs]) => {
      const firstHalfLogs = allLogs.filter(log => 
        firstHalf.some(f => f.id === log.id)
      );
      const secondHalfLogs = allLogs.filter(log => 
        secondHalf.some(s => s.id === log.id)
      );

      if (firstHalfLogs.length >= 3 && secondHalfLogs.length >= 3) {
        const firstCount = firstHalfLogs.length;
        const secondCount = secondHalfLogs.length;
        const firstAvgSeverity = firstHalfLogs.reduce((sum, log) => sum + log.severity, 0) / firstCount;
        const secondAvgSeverity = secondHalfLogs.reduce((sum, log) => sum + log.severity, 0) / secondCount;

        const countChange = ((secondCount - firstCount) / firstCount) * 100;
        const severityChange = ((secondAvgSeverity - firstAvgSeverity) / firstAvgSeverity) * 100;

        if (countChange < -20 && severityChange < -10) {
          insights.push({
            text: `Great news: Your ${symptomName} are down ${Math.round(Math.abs(countChange))}% this week. Severity also dropped from moderate to mild. Whatever you're doing, keep it up!`,
            type: 'progress',
            priority: 'high',
            symptomName,
            changeDirection: 'down',
            changePercent: Math.round(Math.abs(countChange)),
          });
        } else if (countChange > 20 || severityChange > 10) {
          insights.push({
            text: `${symptomName} have increased ${Math.round(countChange)}% - let's discuss strategies to manage this`,
            type: 'progress',
            priority: 'high',
            symptomName,
            changeDirection: 'up',
            changePercent: Math.round(countChange),
          });
        }
      }
    });
  }

  // Day of week patterns
  const dayOfWeekCounts: Record<string, Record<string, number>> = {};
  Object.entries(logsBySymptom).forEach(([symptomName, logs]) => {
    dayOfWeekCounts[symptomName] = {};
    logs.forEach((log) => {
      const day = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekCounts[symptomName][day] = (dayOfWeekCounts[symptomName][day] || 0) + 1;
    });
  });

  Object.entries(dayOfWeekCounts).forEach(([symptomName, days]) => {
    const total = Object.values(days).reduce((a, b) => a + b, 0);
    if (total >= 5) {
      const maxDay = Object.entries(days).reduce((max, [day, count]) => 
        count > max[1] ? [day, count] : max, ['', 0]
      );
      const maxDayPercentage = (maxDay[1] / total) * 100;
      if (maxDayPercentage > 30) {
        insights.push({
          text: `${symptomName} peak on ${maxDay[0]}s`,
          type: 'pattern',
          priority: 'medium',
        });
      }
    }
  });

  // Sleep correlation with other symptoms (e.g., brain fog)
  Object.entries(logsBySymptom).forEach(([symptomName, logs]) => {
    if (symptomName === "Insomnia" || symptomName === "Sleep issues") {
      // Find days with sleep issues
      const sleepIssueDays = new Set(
        logs.map(log => new Date(log.logged_at).toDateString())
      );

      // Check correlation with brain fog or other symptoms
      Object.entries(logsBySymptom).forEach(([otherSymptomName, otherLogs]) => {
        if (otherSymptomName !== symptomName && otherSymptomName.toLowerCase().includes('brain')) {
          const brainFogOnSleepDays = otherLogs.filter(log =>
            sleepIssueDays.has(new Date(log.logged_at).toDateString())
          ).length;
          const brainFogOnOtherDays = otherLogs.filter(log =>
            !sleepIssueDays.has(new Date(log.logged_at).toDateString())
          ).length;

          if (brainFogOnSleepDays > 0 && brainFogOnOtherDays > 0) {
            const ratio = brainFogOnSleepDays / (brainFogOnSleepDays + brainFogOnOtherDays);
            if (ratio >= 0.6 && logs.length >= 5) {
              insights.push({
                text: `On days you log poor sleep, ${otherSymptomName} is 2x more likely. Improving sleep might help with clarity.`,
                type: 'correlation',
                priority: 'high',
                symptomName: otherSymptomName,
              });
            }
          }
        }
      });
    }
  });

  // Nutrition correlation (if available)
  if (nutrition.length > 0 && symptomLogs.length > 0) {
    const nutritionDays = new Set(
      nutrition.map((n) => new Date(n.consumed_at).toDateString())
    );
    const symptomDays = symptomLogs.map((s) => ({
      date: new Date(s.logged_at).toDateString(),
      severity: s.severity,
    }));

    const nutritionDaySymptoms = symptomDays.filter((s) => nutritionDays.has(s.date));
    const nonNutritionDaySymptoms = symptomDays.filter((s) => !nutritionDays.has(s.date));

    if (nutritionDaySymptoms.length > 0 && nonNutritionDaySymptoms.length > 0) {
      const nutritionAvg = nutritionDaySymptoms.reduce((a, b) => a + b.severity, 0) / nutritionDaySymptoms.length;
      const nonNutritionAvg = nonNutritionDaySymptoms.reduce((a, b) => a + b.severity, 0) / nonNutritionDaySymptoms.length;
      
      if (nonNutritionAvg > nutritionAvg + 0.5) {
        insights.push({
          text: `Your symptoms are ${Math.round(((nonNutritionAvg - nutritionAvg) / nonNutritionAvg) * 100)}% worse on days you skip logging meals`,
          type: 'correlation',
          priority: 'medium',
        });
      }
    }
  }

  // Sort insights by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights.slice(0, 8); // Limit to top 8 insights
}

// Helper to get time of day from date
function getTimeOfDayFromDate(dateString: string): 'morning' | 'afternoon' | 'evening' | 'night' | null {
  const date = new Date(dateString);
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

// Analyze patterns and generate insights
export function analyzeTrackerData(
  symptomLogs: SymptomLogWithName[],
  nutrition: Nutrition[],
  fitness: Fitness[],
  hydration: HydrationLog[] = []
): TrackerSummary {
  // Symptoms analysis
  const symptomByName: Record<string, { severities: number[]; dates: Date[] }> = {};
  let totalSeverity = 0;

  symptomLogs.forEach((log) => {
    const name = log.symptom_name || 'Unknown';
    if (!symptomByName[name]) {
      symptomByName[name] = { severities: [], dates: [] };
    }
    symptomByName[name].severities.push(log.severity);
    symptomByName[name].dates.push(new Date(log.logged_at));
    totalSeverity += log.severity;
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

  const avgSeverity = symptomLogs.length > 0 ? totalSeverity / symptomLogs.length : 0;
  
  // Calculate overall symptom trend
  let overallTrend = "stable";
  if (symptomLogs.length >= 4) {
    const mid = Math.floor(symptomLogs.length / 2);
    const firstHalf = symptomLogs.slice(0, mid);
    const secondHalf = symptomLogs.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b.severity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.severity, 0) / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    if (change < -10) overallTrend = "decreasing";
    else if (change > 10) overallTrend = "increasing";
  }

  // Nutrition analysis
  const mealTypeCount: Record<string, number> = {};
  const foodTagCount: Record<string, number> = {};
  const feelingAfterCount: Record<string, number> = {};
  let totalCalories = 0;
  let calorieCount = 0;

  nutrition.forEach((n) => {
    mealTypeCount[n.meal_type] = (mealTypeCount[n.meal_type] || 0) + 1;
    if (n.calories) {
      totalCalories += n.calories;
      calorieCount++;
    }
    // Count food tags
    if (n.food_tags && Array.isArray(n.food_tags)) {
      n.food_tags.forEach((tag) => {
        foodTagCount[tag] = (foodTagCount[tag] || 0) + 1;
      });
    }
    // Count feeling_after
    if (n.feeling_after) {
      feelingAfterCount[n.feeling_after] = (feelingAfterCount[n.feeling_after] || 0) + 1;
    }
  });

  const avgCalories = calorieCount > 0 ? Math.round(totalCalories / calorieCount) : 0;

  // Hydration analysis
  const hydrationDailyBreakdown: Record<string, number> = {};
  let totalHydrationGlasses = 0;

  hydration.forEach((h) => {
    const day = new Date(h.logged_at).toDateString();
    hydrationDailyBreakdown[day] = (hydrationDailyBreakdown[day] || 0) + h.glasses;
    totalHydrationGlasses += h.glasses;
  });

  // Calculate weekly hydration average
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekHydration = hydration.filter((h) => new Date(h.logged_at) >= weekAgo);
  const weekDays = new Set(weekHydration.map((h) => new Date(h.logged_at).toDateString())).size;
  const weeklyHydrationAverage = weekDays > 0 ? Math.round((weekHydration.reduce((sum, h) => sum + h.glasses, 0) / weekDays) * 10) / 10 : 0;

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
  if (symptomLogs.length > 0 && fitness.length > 0) {
    const workoutDays = new Set(
      fitness.map((f) => new Date(f.performed_at).toDateString())
    );
    const symptomDays = symptomLogs.map((s) => ({
      date: new Date(s.logged_at).toDateString(),
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

  // Symptom frequency insights (updated for 1-3 scale)
  Object.entries(symptomStats).forEach(([name, stats]) => {
    if (stats.count >= 5 && stats.avgSeverity >= 2.5) {
      insights.push(`"${name}" appears frequently with high severity (avg ${stats.avgSeverity}/3) - consider discussing with healthcare provider`);
    }
    if (stats.trend === "decreasing") {
      insights.push(`Good news: "${name}" symptoms are trending downward`);
    } else if (stats.trend === "increasing") {
      insights.push(`"${name}" symptoms are increasing - let's discuss strategies to manage this`);
    }
  });

  // Generate plain-language insights
  const plainLanguageInsights = generatePlainLanguageInsights(symptomLogs, nutrition, fitness, hydration);

  return {
    symptoms: {
      total: symptomLogs.length,
      byName: symptomStats,
      avgSeverity: Math.round(avgSeverity * 10) / 10,
      trend: overallTrend,
      recent: symptomLogs.slice(0, 5),
    },
    nutrition: {
      total: nutrition.length,
      avgCalories,
      byMealType: mealTypeCount,
      foodTags: foodTagCount,
      feelingAfter: feelingAfterCount,
      recent: nutrition.slice(0, 5),
    },
    hydration: {
      totalGlasses: totalHydrationGlasses,
      weeklyAverage: weeklyHydrationAverage,
      dailyBreakdown: hydrationDailyBreakdown,
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
    plainLanguageInsights,
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
    parts.push(`- Average severity: ${summary.symptoms.avgSeverity}/3`);
    parts.push(`- Overall trend: ${summary.symptoms.trend}`);
    
    if (Object.keys(summary.symptoms.byName).length > 0) {
      parts.push("- By symptom:");
      Object.entries(summary.symptoms.byName).forEach(([name, stats]) => {
        parts.push(`  • ${name}: ${stats.count} occurrences, avg severity ${stats.avgSeverity}/3, trend: ${stats.trend}`);
      });
    }
  }

  // Nutrition
  parts.push("\nNUTRITION (Fuel Check):");
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
    if (Object.keys(summary.nutrition.foodTags).length > 0) {
      parts.push("- Food tags (menopause-relevant):");
      Object.entries(summary.nutrition.foodTags).forEach(([tag, count]) => {
        const tagLabel = tag.replace(/_/g, ' ');
        parts.push(`  • ${tagLabel}: ${count} times`);
      });
    }
    if (Object.keys(summary.nutrition.feelingAfter).length > 0) {
      parts.push("- Feeling after meals:");
      Object.entries(summary.nutrition.feelingAfter).forEach(([feeling, count]) => {
        parts.push(`  • ${feeling.replace(/_/g, ' ')}: ${count} times`);
      });
    }
    
    // Recent food logs (last 48 hours) - useful for symptom correlation
    const recentNutrition = summary.nutrition.recent.filter((n) => {
      const consumedAt = new Date(n.consumed_at);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return consumedAt >= twoDaysAgo;
    });
    
    if (recentNutrition.length > 0) {
      parts.push("- Recent food logs (last 48 hours):");
      recentNutrition.slice(0, 10).forEach((n) => {
        const tags = n.food_tags && n.food_tags.length > 0 
          ? ` [${n.food_tags.map(t => t.replace(/_/g, ' ')).join(', ')}]`
          : '';
        const feeling = n.feeling_after ? ` (felt: ${n.feeling_after.replace(/_/g, ' ')})` : '';
        parts.push(`  • ${n.food_item} (${n.meal_type})${tags}${feeling}`);
      });
    }
  }

  // Hydration
  parts.push("\nHYDRATION:");
  if (summary.hydration.totalGlasses === 0) {
    parts.push("- No hydration logged");
  } else {
    parts.push(`- Total glasses: ${summary.hydration.totalGlasses}`);
    parts.push(`- Weekly average: ${summary.hydration.weeklyAverage} glasses/day`);
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
