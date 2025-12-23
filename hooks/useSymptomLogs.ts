import { useState, useEffect } from 'react';
import type { SymptomLog } from '@/lib/symptom-tracker-constants';

interface UseSymptomLogsResult {
  logs: SymptomLog[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSymptomLogs(days: number = 30): UseSymptomLogsResult {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/symptom-logs?days=${days}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch symptom logs');
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
    fetchLogs();
  }, [days]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
}

