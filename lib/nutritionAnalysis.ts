import type { Nutrition } from '@/components/nutrition/NutritionList';
import type { HydrationLog } from '@/hooks/useHydration';

/**
 * Analyze food-symptom correlations
 */
export function analyzeFoodSymptomCorrelations(
  nutrition: Nutrition[],
  symptomLogs: Array<{ logged_at: string; symptom_name?: string; severity: number }>
): Array<{ foodTag: string; symptomName: string; correlation: number; description: string }> {
  const correlations: Array<{ foodTag: string; symptomName: string; correlation: number; description: string }> = [];
  const triggerFoods = ['caffeine', 'alcohol', 'spicy_food', 'sugar_refined_carbs', 'processed_food'];

  triggerFoods.forEach((foodTag) => {
    const foodTagDays = new Set(
      nutrition
        .filter((n) => n.food_tags?.includes(foodTag))
        .map((n) => new Date(n.consumed_at).toDateString())
    );

    if (foodTagDays.size === 0) return;

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

      if (foodDayAvg > otherDayAvg * 1.2 && foodTagDays.size >= 3) {
        const topSymptom = symptomsOnFoodDays.reduce((acc, s) => {
          const count = symptomsOnFoodDays.filter((x) => x.symptomName === s.symptomName).length;
          return count > (acc.count || 0) ? { symptomName: s.symptomName, count } : acc;
        }, { symptomName: '', count: 0 });

        if (topSymptom.symptomName) {
          const correlation = (foodDayAvg / otherDayAvg) * 100;
          const foodTagLabel = foodTag.replace(/_/g, ' ');
          correlations.push({
            foodTag,
            symptomName: topSymptom.symptomName,
            correlation: Math.round(correlation),
            description: `On days you logged ${foodTagLabel}, you had ${Math.round(correlation)}% more ${topSymptom.symptomName}`,
          });
        }
      }
    }
  });

  return correlations;
}

/**
 * Analyze hydration patterns
 */
export function analyzeHydrationPatterns(
  hydration: HydrationLog[],
  symptomLogs: Array<{ logged_at: string; severity: number }> = []
): {
  weeklyAverage: number;
  dailyBreakdown: Record<string, number>;
  lowHydrationDays: string[];
  correlationWithSymptoms?: number;
} {
  const hydrationByDay: Record<string, number> = {};
  hydration.forEach((h) => {
    const day = new Date(h.logged_at).toDateString();
    hydrationByDay[day] = (hydrationByDay[day] || 0) + h.glasses;
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekHydration = hydration.filter((h) => new Date(h.logged_at) >= weekAgo);
  const weekDays = new Set(weekHydration.map((h) => new Date(h.logged_at).toDateString())).size;
  const weeklyAverage = weekDays > 0 ? Math.round((weekHydration.reduce((sum, h) => sum + h.glasses, 0) / weekDays) * 10) / 10 : 0;

  const lowHydrationDays = Object.entries(hydrationByDay)
    .filter(([_, glasses]) => glasses < 6)
    .map(([day]) => day);

  let correlationWithSymptoms: number | undefined;
  if (symptomLogs.length > 0 && lowHydrationDays.length > 0) {
    const highHydrationDays = Object.entries(hydrationByDay)
      .filter(([_, glasses]) => glasses >= 6)
      .map(([day]) => day);

    const lowHydrationSymptoms = symptomLogs.filter((s) =>
      lowHydrationDays.includes(new Date(s.logged_at).toDateString())
    );
    const highHydrationSymptoms = symptomLogs.filter((s) =>
      highHydrationDays.includes(new Date(s.logged_at).toDateString())
    );

    if (lowHydrationSymptoms.length > 0 && highHydrationSymptoms.length > 0) {
      const lowAvg = lowHydrationSymptoms.reduce((sum, s) => sum + s.severity, 0) / lowHydrationSymptoms.length;
      const highAvg = highHydrationSymptoms.reduce((sum, s) => sum + s.severity, 0) / highHydrationSymptoms.length;
      correlationWithSymptoms = Math.round(((lowAvg - highAvg) / highAvg) * 100);
    }
  }

  return {
    weeklyAverage,
    dailyBreakdown: hydrationByDay,
    lowHydrationDays,
    correlationWithSymptoms,
  };
}

/**
 * Analyze meal timing patterns
 */
export function analyzeMealTiming(nutrition: Nutrition[]): {
  breakfastFrequency: number;
  mealDistribution: Record<string, number>;
  caffeineTiming: { morning: number; afternoon: number; evening: number };
  skipBreakfastDays: number;
} {
  const breakfastCount = nutrition.filter((n) => n.meal_type === 'breakfast').length;
  const totalMeals = nutrition.length;
  const breakfastFrequency = totalMeals > 0 ? (breakfastCount / totalMeals) * 100 : 0;

  const mealDistribution: Record<string, number> = {};
  nutrition.forEach((n) => {
    mealDistribution[n.meal_type] = (mealDistribution[n.meal_type] || 0) + 1;
  });

  const caffeineEntries = nutrition.filter((n) => n.food_tags?.includes('caffeine'));
  const caffeineTiming = { morning: 0, afternoon: 0, evening: 0 };
  caffeineEntries.forEach((n) => {
    const hour = new Date(n.consumed_at).getHours();
    if (hour >= 6 && hour < 12) caffeineTiming.morning++;
    else if (hour >= 12 && hour < 18) caffeineTiming.afternoon++;
    else if (hour >= 18) caffeineTiming.evening++;
  });

  // Calculate skip breakfast days (days with other meals but no breakfast)
  const daysWithMeals = new Set(nutrition.map((n) => new Date(n.consumed_at).toDateString()));
  const daysWithBreakfast = new Set(
    nutrition
      .filter((n) => n.meal_type === 'breakfast')
      .map((n) => new Date(n.consumed_at).toDateString())
  );
  const skipBreakfastDays = Array.from(daysWithMeals).filter((day) => !daysWithBreakfast.has(day)).length;

  return {
    breakfastFrequency,
    mealDistribution,
    caffeineTiming,
    skipBreakfastDays,
  };
}

/**
 * Calculate food progress (compare weeks)
 */
export function calculateFoodProgress(nutrition: Nutrition[]): {
  triggerFoodReduction: Record<string, { before: number; after: number; change: number }>;
  supportiveFoodIncrease: Record<string, { before: number; after: number; change: number }>;
} {
  if (nutrition.length < 14) {
    return { triggerFoodReduction: {}, supportiveFoodIncrease: {} };
  }

  const sortedNutrition = [...nutrition].sort((a, b) =>
    new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime()
  );
  const firstWeek = sortedNutrition.slice(0, Math.floor(sortedNutrition.length / 2));
  const secondWeek = sortedNutrition.slice(Math.floor(sortedNutrition.length / 2));

  const triggerFoods = ['caffeine', 'alcohol', 'spicy_food', 'sugar_refined_carbs', 'processed_food'];
  const supportiveFoods = ['phytoestrogens', 'calcium_rich', 'omega_3s', 'fiber', 'protein'];

  const triggerFoodReduction: Record<string, { before: number; after: number; change: number }> = {};
  const supportiveFoodIncrease: Record<string, { before: number; after: number; change: number }> = {};

  triggerFoods.forEach((tag) => {
    const before = firstWeek.filter((n) => n.food_tags?.includes(tag)).length;
    const after = secondWeek.filter((n) => n.food_tags?.includes(tag)).length;
    const change = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
    if (before > 0 || after > 0) {
      triggerFoodReduction[tag] = { before, after, change };
    }
  });

  supportiveFoods.forEach((tag) => {
    const before = firstWeek.filter((n) => n.food_tags?.includes(tag)).length;
    const after = secondWeek.filter((n) => n.food_tags?.includes(tag)).length;
    const change = before > 0 ? Math.round(((after - before) / before) * 100) : 0;
    if (before > 0 || after > 0) {
      supportiveFoodIncrease[tag] = { before, after, change };
    }
  });

  return { triggerFoodReduction, supportiveFoodIncrease };
}

/**
 * Detect frequent trigger foods
 */
export function detectTriggerFoods(nutrition: Nutrition[], days: number = 7): Array<{ tag: string; count: number; frequency: number }> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - days);
  const weekNutrition = nutrition.filter((n) => new Date(n.consumed_at) >= weekAgo);

  const triggerFoods = ['caffeine', 'alcohol', 'spicy_food', 'sugar_refined_carbs', 'processed_food'];
  const tagCounts: Record<string, number> = {};

  weekNutrition.forEach((n) => {
    n.food_tags?.forEach((tag) => {
      if (triggerFoods.includes(tag)) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
  });

  return Object.entries(tagCounts)
    .filter(([_, count]) => count >= 3)
    .map(([tag, count]) => ({
      tag,
      count,
      frequency: Math.round((count / weekNutrition.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

