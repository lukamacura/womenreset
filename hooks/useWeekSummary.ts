import { useMemo } from 'react';
import { useSymptomLogs } from './useSymptomLogs';
import type { SymptomLog } from '@/lib/symptom-tracker-constants';

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/117acbca-7710-4e6c-a5b5-905727104271',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/useWeekSummary.ts:30',message:'Processing log for symptom counting',data:{hasSymptoms:!!log.symptoms,symptomId:log.symptom_id,symptomsData:log.symptoms,iconValue:log.symptoms?.icon,iconType:typeof log.symptoms?.icon},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (log.symptoms) {
        const key = log.symptom_id;
        const existing = symptomCounts.get(key) || {
          name: log.symptoms.name,
          icon: log.symptoms.icon,
          count: 0,
        };
        existing.count += 1;
        symptomCounts.set(key, existing);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/117acbca-7710-4e6c-a5b5-905727104271',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/useWeekSummary.ts:40',message:'Symptom count updated',data:{key,name:existing.name,icon:existing.icon,count:existing.count},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/117acbca-7710-4e6c-a5b5-905727104271',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/useWeekSummary.ts:42',message:'Log missing symptoms data',data:{symptomId:log.symptom_id,logKeys:Object.keys(log)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    });

    let mostFrequent: { name: string; icon: string; count: number } | null = null;
    symptomCounts.forEach((value) => {
      if (!mostFrequent || value.count > mostFrequent.count) {
        mostFrequent = value;
      }
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/117acbca-7710-4e6c-a5b5-905727104271',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hooks/useWeekSummary.ts:48',message:'Most frequent symptom determined',data:{mostFrequent,iconValue:mostFrequent?.icon,iconType:typeof mostFrequent?.icon,iconLength:mostFrequent?.icon?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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

