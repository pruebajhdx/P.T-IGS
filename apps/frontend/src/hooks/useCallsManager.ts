import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchCalls,
  fetchStats,
  toggleCallSpam,
  subscribeToCallsStream,
  CallSession,
  CallStats,
} from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export interface UseCallsManagerResult {
  allCalls: CallSession[];
  stats: CallStats;
  liveStats: CallStats;
  validCallsCount: number;
  spamCallsCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  streamStatus: 'connected' | 'reconnecting' | 'disconnected';
  servedBy: string | undefined;
  loadData: (isSilent?: boolean, maxRetries?: number, delayMs?: number) => Promise<void>;
  handleToggleSpam: (id: string, isSpam: boolean) => Promise<void>;
  handleCallSent: (newCall?: CallSession, isDuplicate?: boolean) => void;
}

export function useCallsManager(): UseCallsManagerResult {
  const { addNotification } = useNotifications();

  const [allCalls, setAllCalls] = useState<CallSession[]>([]);
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    recurringCalls: 0,
    spamCalls: 0,
    avgDurationSeconds: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('reconnecting');
  const [servedBy, setServedBy] = useState<string | undefined>();

  // Load calls and stats from API with exponential retry resilience
  const loadData = useCallback(async (isSilent = false, maxRetries = 4, delayMs = 1000) => {
    if (!isSilent) setIsRefreshing(true);
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const [fetchedCalls, fetchedStats] = await Promise.all([
          fetchCalls({ limit: 200 }),
          fetchStats(),
        ]);
        setAllCalls(fetchedCalls);
        setStats(fetchedStats);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) {
          console.error('Failed to load calls/stats after retries', err);
          setIsLoading(false);
          setIsRefreshing(false);
        } else {
          await new Promise((res) => setTimeout(res, delayMs * attempt));
        }
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Server-Sent Events (SSE) subscription
  useEffect(() => {
    const unsubscribe = subscribeToCallsStream(
      (event, data) => {
        if (event === 'connected') {
          if (data?.instance) setServedBy(data.instance);
          loadData(true);
        } else if (event === 'call.created') {
          setAllCalls((prev) => {
            if (prev.some((c) => c.callId === data.callId || c.id === data.id)) return prev;
            return [data, ...prev];
          });

          addNotification({
            type: 'incoming_call',
            title: 'Llamada Entrante Registrada',
            call: data,
            durationMs: 5000,
          });

          fetchStats().then(setStats).catch(() => {});
        } else if (event === 'call.updated' || event === 'call.spam_toggled') {
          setAllCalls((prev) =>
            prev.map((c) => (c.callId === data.callId || c.id === data.id ? { ...c, ...data } : c))
          );
          fetchStats().then(setStats).catch(() => {});
        }
      },
      (status) => {
        setStreamStatus(status);
      }
    );

    return () => unsubscribe();
  }, [addNotification, loadData]);

  // Optimistic spam toggle mutation
  const handleToggleSpam = useCallback(
    async (id: string, isSpam: boolean) => {
      setAllCalls((prev) =>
        prev.map((call) =>
          call.id === id || call.callId === id ? { ...call, isSpam } : call
        )
      );

      try {
        const updated = await toggleCallSpam(id, isSpam);
        setAllCalls((prev) =>
          prev.map((call) =>
            call.id === id || call.callId === id ? updated : call
          )
        );

        addNotification({
          type: isSpam ? 'warning' : 'success',
          title: isSpam ? 'Llamada Marcada como Spam' : 'Llamada Desmarcada de Spam',
          message: `El número ${updated.phoneNumber} ha sido actualizado correctamente.`,
          durationMs: 3500,
        });

        const newStats = await fetchStats();
        setStats(newStats);
      } catch (err: any) {
        // Rollback on error
        setAllCalls((prev) =>
          prev.map((call) =>
            call.id === id || call.callId === id ? { ...call, isSpam: !isSpam } : call
          )
        );
        addNotification({
          type: 'error',
          title: 'Error al cambiar estado de spam',
          message: err.message || 'No se pudo comunicar con el servidor',
          durationMs: 5000,
        });
      }
    },
    [addNotification]
  );

  const validCallsCount = useMemo(() => allCalls.filter((c) => !c.isSpam).length, [allCalls]);
  const spamCallsCount = useMemo(() => allCalls.filter((c) => c.isSpam).length, [allCalls]);

  const liveStats = useMemo<CallStats>(() => {
    const total = allCalls.length;
    const recurring = allCalls.filter((c) => c.hasCalledBefore).length;
    const spam = allCalls.filter((c) => c.isSpam).length;
    const avgDuration =
      total > 0
        ? Math.round(allCalls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0) / total)
        : 0;

    return {
      totalCalls: total,
      recurringCalls: recurring,
      spamCalls: spam,
      avgDurationSeconds: avgDuration || stats.avgDurationSeconds,
    };
  }, [allCalls, stats]);

  const handleCallSent = useCallback((newCall?: CallSession, isDuplicate?: boolean) => {
    if (newCall && !isDuplicate) {
      setAllCalls((prev) => {
        if (prev.some((c) => c.callId === newCall.callId || c.id === newCall.id)) return prev;
        return [newCall, ...prev];
      });
    }
    fetchStats().then(setStats).catch(() => {});
  }, []);

  return {
    allCalls,
    stats,
    liveStats,
    validCallsCount,
    spamCallsCount,
    isLoading,
    isRefreshing,
    streamStatus,
    servedBy,
    loadData,
    handleToggleSpam,
    handleCallSent,
  };
}

