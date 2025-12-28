import { useMemo } from 'react';
import { useSymptomLogs } from './useSymptomLogs';

interface WeekSummary {
  totalLogged: number;
  mostFrequentSymptom: {
    name: string;
    icon: string;
    count: number;
  } | null;
  averageSeverity: number;
}

export function useWeekSummary(): WeekSummary & { loading: boolean; error: string | null; refetch: () => Promise<void> } {
  const { logs, loading, error, refetch } = useSymptomLogs(7); // Last 7 days

  const summary = useMemo(() => {
    const weekLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    });

    const totalLogged = weekLogs.length;

    // Calculate most frequent symptom
    const symptomCounts = new Map<string, { name: string; icon: string; count: number }>();
    weekLogs.forEach((log) => {
      if (log.symptoms) {
        const key = log.symptom_id;
        const existing = symptomCounts.get(key) || {
          name: log.symptoms.name,
          icon: log.symptoms.icon,
          count: 0,
        };
        existing.count += 1;
        symptomCounts.set(key, existing);
      }
    });

    let mostFrequent: { name: string; icon: string; count: number } | null = null;
    symptomCounts.forEach((value) => {
      if (!mostFrequent || value.count > mostFrequent.count) {
        mostFrequent = value;
      }
    });

    // Calculate average severity
    const averageSeverity =
      weekLogs.length > 0
        ? weekLogs.reduce((sum, log) => sum + log.severity, 0) / weekLogs.length
        : 0;

    return {
      totalLogged,
      mostFrequentSymptom: mostFrequent,
      averageSeverity: Math.round(averageSeverity * 10) / 10, // Round to 1 decimal
    };
  }, [logs]);

  return {
    ...summary,
    loading,
    error,
    refetch,
  };
}

