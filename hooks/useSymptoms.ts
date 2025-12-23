import { useState, useEffect } from 'react';
import type { Symptom } from '@/lib/symptom-tracker-constants';

interface UseSymptomsResult {
  symptoms: Symptom[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSymptoms(): UseSymptomsResult {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSymptoms = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/symptoms', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch symptoms');
      }

      const { data } = await response.json();
      setSymptoms(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSymptoms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSymptoms();
  }, []);

  return {
    symptoms,
    loading,
    error,
    refetch: fetchSymptoms,
  };
}

