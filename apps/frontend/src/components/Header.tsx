import React from 'react';
import {
  PhoneCall,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Activity,
  Volume2,
  VolumeX,
  Zap,
  LayoutDashboard,
  History,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export type ActiveTab = 'dashboard' | 'history';

interface HeaderProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  streamStatus: 'connected' | 'reconnecting' | 'disconnected';
  servedBy?: string;
  onRefresh: () => void;
  onOpenSimulate: () => void;
  onOpenMonitoring: () => void;
  isRefreshing: boolean;
  totalCallsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  streamStatus,
  servedBy,
  onRefresh,
  onOpenSimulate,
  onOpenMonitoring,
  isRefreshing,
  totalCallsCount,
}) => {
  const { isSoundMuted, toggleSound, isBatchRunning, batchProgress } = useNotifications();

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Title, Brand & Navigation Links */}
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white ring-1 ring-white/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  CallCenter <span className="text-sky-400">Live</span>
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 uppercase tracking-wider">
                  Cluster v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Gestión reactiva de telefonía con balanceo Nginx, réplicas PHP y caché Redis
              </p>
            </div>
          </div>

          {/* Navigation Bar / Tabs */}
          <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentTab === 'dashboard'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard en Vivo</span>
            </button>

            <button
              onClick={() => onTabChange('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentTab === 'history'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Registro Histórico</span>
              {totalCallsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300 font-mono">
                  {totalCallsCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Live Status Indicators & Action Buttons */}
        <div className="flex items-center flex-wrap justify-end gap-2 w-full md:w-auto">
          {/* Stream connection status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              streamStatus === 'connected'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-950/50'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/60 animate-pulse'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {streamStatus === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  streamStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </span>
            <span>{streamStatus === 'connected' ? 'En Vivo' : 'Reconectando...'}</span>
          </div>

          {/* Node Served By indicator */}
          {servedBy && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Nodo: <span className="text-white font-mono font-semibold">{servedBy}</span></span>
            </div>
          )}

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            title={isSoundMuted ? 'Activar sonido de llamadas' : 'Silenciar sonido de llamadas'}
            className={`p-2 rounded-xl border text-xs font-medium transition ${
              isSoundMuted
                ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                : 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25'
            }`}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Cluster & Observability Monitoring button */}
          <button
            onClick={onOpenMonitoring}
            title="Abrir panel de monitoreo de cluster, balanceadores y errores"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/60 text-xs font-medium transition hover:border-indigo-600"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Monitoreo</span>
          </button>

          {/* Manual Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refrescar lista"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {/* Simulate Webhook Call button */}
          <button
            onClick={onOpenSimulate}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition shadow-lg ${
              isBatchRunning
                ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-indigo-600/30 ring-2 ring-indigo-400/50 animate-pulse'
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-600/25'
            }`}
          >
            {isBatchRunning ? (
              <>
                <Zap className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Simulando ({batchProgress.current}/{batchProgress.total})</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Simulador Webhook</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
