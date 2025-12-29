import { useState, useEffect, useMemo } from 'react';

export type HydrationLog = {
  id: string;
  user_id: string;
  glasses: number;
  logged_at: string;
  created_at: string;
  updated_at: string;
};

interface UseHydrationResult {
  logs: HydrationLog[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Computed values
  todayGlasses: number;
  weeklyAverage: number;
}

export function useHydration(days: number = 30): UseHydrationResult {
  const [logs, setLogs] = useState<HydrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHydration = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const response = await fetch(
        `/api/hydration?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch hydration logs');
      }

      const { data } = await response.json();
      setLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHydration();
  }, [days]);

  // Calculate today's glasses
  const todayGlasses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return logs
      .filter((log) => {
        const logDate = new Date(log.logged_at);
        return logDate >= today && logDate < tomorrow;
      })
      .reduce((sum, log) => sum + log.glasses, 0);
  }, [logs]);

  // Calculate weekly average
  const weeklyAverage = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weekLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      return logDate >= weekAgo;
    });

    if (weekLogs.length === 0) return 0;

    const totalGlasses = weekLogs.reduce((sum, log) => sum + log.glasses, 0);
    const uniqueDays = new Set(
      weekLogs.map((log) => new Date(log.logged_at).toDateString())
    ).size;

    return uniqueDays > 0 ? Math.round((totalGlasses / uniqueDays) * 10) / 10 : 0;
  }, [logs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchHydration,
    todayGlasses,
    weeklyAverage,
  };
}

