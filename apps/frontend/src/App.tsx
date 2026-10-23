import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { CallList } from './components/CallList';
import { SimulateCallModal } from './components/SimulateCallModal';
import { ClusterMonitoringModal } from './components/ClusterMonitoringModal';
import { ToastContainer } from './components/ToastContainer';
import { FloatingSimulationDock } from './components/FloatingSimulationDock';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import {
  fetchCalls,
  fetchStats,
  toggleCallSpam,
  subscribeToCallsStream,
  CallSession,
  CallStats,
} from './services/api';

const MainDashboard: React.FC = () => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [spamFilter, setSpamFilter] = useState('');
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);

  // Load all calls and stats from API
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [fetchedCalls, fetchedStats] = await Promise.all([
        fetchCalls({ limit: 100 }),
        fetchStats(),
      ]);
      setAllCalls(fetchedCalls);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to load calls/stats', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
        } else if (event === 'call.created') {
          // Prepend new call to list without full reload, avoiding duplicates
          setAllCalls((prev) => {
            if (prev.some((c) => c.callId === data.callId || c.id === data.id)) return prev;
            return [data, ...prev];
          });

          // Trigger rich incoming call toast notification
          addNotification({
            type: 'incoming_call',
            title: 'Llamada Entrante Registrada',
            call: data,
            durationMs: 5000,
          });

          // Synchronize stats directly with the backend to ensure 100% precision
          fetchStats().then(setStats).catch(() => {});
        } else if (event === 'call.spam_toggled') {
          // Update call spam status in-place
          setAllCalls((prev) =>
            prev.map((c) => (c.id === data.id || c.callId === data.callId ? { ...c, isSpam: data.isSpam } : c))
          );
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
  }, [addNotification]);

  const handleToggleSpam = async (id: string, isSpam: boolean) => {
    // Instant optimistic UI update
    setAllCalls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isSpam } : c))
    );

    try {
      const updated = await toggleCallSpam(id, isSpam);
      setAllCalls((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
      const newStats = await fetchStats();
      setStats(newStats);

      addNotification({
        type: isSpam ? 'warning' : 'success',
        title: isSpam ? 'Marcada como Spam' : 'Desmarcada de Spam',
        message: `Llamada ${updated.callId} (${updated.phoneNumber}) actualizada.`,
        durationMs: 3000,
      });
    } catch (err) {
      console.error('Failed to toggle spam status', err);
      addNotification({
        type: 'error',
        title: 'Error de Actualización',
        message: 'No se pudo actualizar el estado de spam en el servidor.',
        durationMs: 4000,
      });
      // Revert on error
      loadData(true);
    }
  };

  // Instant reactive client-side filtering without reloading or network roundtrips
  const filteredCalls = useMemo(() => {
    return allCalls.filter((call) => {
      // 1. Spam filter:
      if (spamFilter === 'true' && !call.isSpam) return false;
      if (spamFilter === 'false' && call.isSpam) return false;

      // 2. Search term:
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesPhone = call.phoneNumber.toLowerCase().includes(query);
        const matchesAgent = call.agent.toLowerCase().includes(query);
        const matchesCallId = call.callId.toLowerCase().includes(query);
        if (!matchesPhone && !matchesAgent && !matchesCallId) return false;
      }

      return true;
    });
  }, [allCalls, spamFilter, searchTerm]);

  // Dynamic counts for tab badges
  const validCallsCount = useMemo(() => allCalls.filter((c) => !c.isSpam).length, [allCalls]);
  const spamCallsCount = useMemo(() => allCalls.filter((c) => c.isSpam).length, [allCalls]);

  // Real-time computed stats derived directly from in-memory allCalls for 0ms reactivity
  const liveStats = useMemo<CallStats>(() => {
    const total = Math.max(allCalls.length, stats.totalCalls);
    const recurring = allCalls.filter((c) => c.hasCalledBefore).length;
    const spam = allCalls.filter((c) => c.isSpam).length;
    const totalDuration = allCalls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const avgDuration = allCalls.length > 0 ? totalDuration / allCalls.length : stats.avgDurationSeconds;

    return {
      totalCalls: total,
      recurringCalls: Math.max(recurring, stats.recurringCalls),
      spamCalls: spam,
      avgDurationSeconds: avgDuration || stats.avgDurationSeconds,
    };
  }, [allCalls, stats]);

  // Handler for newly emitted calls from simulations (both single and batch)
  const handleCallSent = useCallback((newCall?: CallSession, isDuplicate?: boolean) => {
    if (newCall && !isDuplicate) {
      setAllCalls((prev) => {
        if (prev.some((c) => c.callId === newCall.callId || c.id === newCall.id)) return prev;
        return [newCall, ...prev];
      });
    }
    // Synchronize stats in background
    fetchStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Header
        streamStatus={streamStatus}
        servedBy={servedBy}
        onRefresh={() => loadData()}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onOpenMonitoring={() => setIsMonitoringOpen(true)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-7">
        {/* KPI Overview Cards with 0ms Reactivity */}
        <StatsOverview stats={liveStats} />

        {/* Real-time Call List & Controls */}
        <CallList
          calls={filteredCalls}
          allCallsCount={allCalls.length}
          validCallsCount={validCallsCount}
          spamCallsCount={spamCallsCount}
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
        onCallSent={handleCallSent}
      />

      {/* Cluster Monitoring & Observability Modal */}
      <ClusterMonitoringModal
        isOpen={isMonitoringOpen}
        onClose={() => setIsMonitoringOpen(false)}
      />

      {/* Floating Simulation Dock (active while simulation runs in background) */}
      <FloatingSimulationDock
        onOpenModal={() => setIsSimulateOpen(true)}
        isModalOpen={isSimulateOpen}
      />

      {/* Floating Notifications & Toasts */}
      <ToastContainer />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-5 px-4 text-center text-xs text-slate-500">
        <p>Sistema de Gestión de Telefonía en Tiempo Real • Laravel 11, React 18, Redis Idempotency & Nginx Load Balancer</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <NotificationProvider>
      <MainDashboard />
    </NotificationProvider>
  );
};

export default App;
