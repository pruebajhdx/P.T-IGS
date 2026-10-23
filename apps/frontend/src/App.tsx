import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { CallList } from './components/CallList';
import { SimulateCallModal } from './components/SimulateCallModal';
import { ClusterMonitoringModal } from './components/ClusterMonitoringModal';
import {
  fetchCalls,
  fetchStats,
  toggleCallSpam,
  subscribeToCallsStream,
  CallSession,
  CallStats,
} from './services/api';

export const App: React.FC = () => {
  const [calls, setCalls] = useState<CallSession[]>([]);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [spamFilter, setSpamFilter] = useState('');
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);

  // Load calls and stats from API
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [fetchedCalls, fetchedStats] = await Promise.all([
        fetchCalls({ search: searchTerm, is_spam: spamFilter }),
        fetchStats(),
      ]);
      setCalls(fetchedCalls);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to load calls/stats', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, spamFilter]);

  // Initial fetch and on filter change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Server-Sent Events (SSE) subscription
  useEffect(() => {
    const unsubscribe = subscribeToCallsStream(
      (event, data) => {
        if (event === 'connected') {
          if (data?.instance) setServedBy(data.instance);
        } else if (event === 'call.created') {
          // Prepend new call to list without full reload
          setCalls((prev) => {
            if (prev.some((c) => c.callId === data.callId)) return prev;
            return [data, ...prev];
          });
          // Update stats incrementally
          setStats((prev) => ({
            ...prev,
            totalCalls: prev.totalCalls + 1,
            recurringCalls: data.hasCalledBefore ? prev.recurringCalls + 1 : prev.recurringCalls,
          }));
        } else if (event === 'call.spam_toggled') {
          // Update call spam status in-place
          setCalls((prev) =>
            prev.map((c) => (c.id === data.id ? { ...c, isSpam: data.isSpam } : c))
          );
          // Refresh stats accurately
          fetchStats().then(setStats).catch(() => {});
        }
      },
      (status) => {
        setStreamStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleSpam = async (id: string, isSpam: boolean) => {
    // Optimistic UI update
    setCalls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isSpam } : c))
    );

    try {
      const updated = await toggleCallSpam(id, isSpam);
      setCalls((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (err) {
      console.error('Failed to toggle spam status', err);
      // Revert on error
      loadData(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header
        streamStatus={streamStatus}
        servedBy={servedBy}
        onRefresh={() => loadData()}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onOpenMonitoring={() => setIsMonitoringOpen(true)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* KPI Overview Cards */}
        <StatsOverview stats={stats} />

        {/* Real-time Call List & Controls */}
        <CallList
          calls={calls}
          onToggleSpam={handleToggleSpam}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          spamFilter={spamFilter}
          onSpamFilterChange={setSpamFilter}
        />
      </main>

      {/* Simulator Modal */}
      <SimulateCallModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onCallSent={() => loadData(true)}
      />

      {/* Cluster Monitoring & Observability Modal */}
      <ClusterMonitoringModal
        isOpen={isMonitoringOpen}
        onClose={() => setIsMonitoringOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <p>Sistema de Gestión de Llamadas Entrantes • Stack Laravel 11, React 18, Redis Idempotency Cache & Nginx Load Balancer</p>
      </footer>
    </div>
  );
};

export default App;

