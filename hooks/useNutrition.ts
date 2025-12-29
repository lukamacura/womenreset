import { useState, useEffect } from 'react';
import type { Nutrition } from '@/components/nutrition/NutritionList';

interface UseNutritionResult {
  nutrition: Nutrition[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNutrition(days: number = 30): UseNutritionResult {
  const [nutrition, setNutrition] = useState<Nutrition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNutrition = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const response = await fetch(
        `/api/nutrition?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch nutrition entries');
      }

      const { data } = await response.json();
      // Ensure food_tags is always an array (handle null/undefined from DB)
      const normalizedData = (data || []).map((entry: Nutrition) => ({
        ...entry,
        food_tags: Array.isArray(entry.food_tags) ? entry.food_tags : [],
      }));
      setNutrition(normalizedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setNutrition([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNutrition();
  }, [days]);

  return {
    nutrition,
    loading,
    error,
    refetch: fetchNutrition,
  };
}

