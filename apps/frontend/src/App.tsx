import React, { useState, useMemo } from 'react';
import { Header, ActiveTab } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { CallList } from './components/CallList';
import { CallHistoryView } from './components/CallHistoryView';
import { SimulateCallModal } from './components/SimulateCallModal';
import { ClusterMonitoringModal } from './components/ClusterMonitoringModal';
import { ToastContainer } from './components/ToastContainer';
import { LiveResolutionInspector } from './components/LiveResolutionInspector';
import { NotificationProvider } from './context/NotificationContext';
import { useCallsManager } from './hooks/useCallsManager';

const MainDashboard: React.FC = () => {
  const {
    allCalls,
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
  } = useCallsManager();

  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [spamFilter, setSpamFilter] = useState('');
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);

  // Filtered calls for live dashboard
  const filteredCalls = useMemo(() => {
    return allCalls.filter((call) => {
      const matchesSearch =
        !searchTerm ||
        call.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.callId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.agent.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSpam =
        !spamFilter ||
        (spamFilter === 'true' && call.isSpam) ||
        (spamFilter === 'false' && !call.isSpam);

      return matchesSearch && matchesSpam;
    });
  }, [allCalls, searchTerm, spamFilter]);

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

      {/* Live Cluster Resolution & Failover Telemetry Inspector */}
      <LiveResolutionInspector />

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
