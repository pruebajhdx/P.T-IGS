import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header, ActiveTab } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { CallList } from './components/CallList';
import { CallHistoryView } from './components/CallHistoryView';
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

  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
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
        fetchCalls({ limit: 200 }),
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

          // Update stats in background
          fetchStats().then(setStats).catch(() => {});
        } else if (event === 'call.updated') {
          // Update call in place
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
  }, [addNotification]);

  // Handle toggling spam status
  const handleToggleSpam = useCallback(
    async (id: string, isSpam: boolean) => {
      // Optimistic update
      setAllCalls((prev) =>
        prev.map((call) =>
          call.id === id || call.callId === id ? { ...call, isSpam } : call
        )
      );

      try {
        const updated = await toggleCallSpam(id, isSpam);
        // Sync with actual response
        setAllCalls((prev) =>
          prev.map((call) =>
            call.id === id || call.callId === id ? updated : call
          )
        );

        // Feedback toast notification
        addNotification({
          type: isSpam ? 'spam_alert' : 'info',
          title: isSpam ? 'Llamada Marcada como Spam' : 'Llamada Desmarcada de Spam',
          message: `El número ${updated.phoneNumber} ha sido actualizado correctamente.`,
          durationMs: 3500,
        });

        // Re-fetch stats
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

  // Filtered calls for live dashboard
  const filteredCalls = useMemo(() => {
    return allCalls.filter((call) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        call.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.callId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.agent.toLowerCase().includes(searchTerm.toLowerCase());

      // Spam filter
      const matchesSpam =
        !spamFilter ||
        (spamFilter === 'true' && call.isSpam) ||
        (spamFilter === 'false' && !call.isSpam);

      return matchesSearch && matchesSpam;
    });
  }, [allCalls, searchTerm, spamFilter]);

  // Derived counts for segmented tabs in CallList
  const validCallsCount = useMemo(() => allCalls.filter((c) => !c.isSpam).length, [allCalls]);
  const spamCallsCount = useMemo(() => allCalls.filter((c) => c.isSpam).length, [allCalls]);

  // Re-compute live stats dynamically
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

  // Handler for newly emitted calls from simulations
  const handleCallSent = useCallback((newCall?: CallSession, isDuplicate?: boolean) => {
    if (newCall && !isDuplicate) {
      setAllCalls((prev) => {
        if (prev.some((c) => c.callId === newCall.callId || c.id === newCall.id)) return prev;
        return [newCall, ...prev];
      });
    }
    fetchStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        streamStatus={streamStatus}
        servedBy={servedBy}
        onRefresh={() => loadData()}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onOpenMonitoring={() => setIsMonitoringOpen(true)}
        isRefreshing={isRefreshing}
        totalCallsCount={allCalls.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-7">
        {currentTab === 'dashboard' ? (
          <>
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
          </>
        ) : (
          /* Detailed Historical Records View with Date, Time, Sorting & CSV Export */
          <CallHistoryView
            calls={allCalls}
            onToggleSpam={handleToggleSpam}
            isLoading={isLoading}
          />
        )}
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

      {/* Floating Simulation Dock */}
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
