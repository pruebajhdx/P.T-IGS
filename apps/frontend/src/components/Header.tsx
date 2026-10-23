import React from 'react';
import { PhoneCall, RefreshCw, PlusCircle, ShieldCheck, Activity } from 'lucide-react';

interface HeaderProps {
  streamStatus: 'connected' | 'reconnecting' | 'disconnected';
  servedBy?: string;
  onRefresh: () => void;
  onOpenSimulate: () => void;
  onOpenMonitoring: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  streamStatus,
  servedBy,
  onRefresh,
  onOpenSimulate,
  onOpenMonitoring,
  isRefreshing,
}) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">CallCenter Live</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v1.0 Monorepo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gestión de llamadas entrantes con caché de idempotencia Redis y balanceo Nginx
            </p>
          </div>
        </div>

        {/* Live Status Indicators & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Stream connection status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              streamStatus === 'connected'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/60 animate-pulse'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                streamStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {streamStatus === 'connected' ? 'En Vivo (SSE Activo)' : 'Reconectando Stream...'}
          </div>

          {/* Node Served By indicator */}
          {servedBy && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Nodo: <span className="text-white font-mono">{servedBy}</span></span>
            </div>
          )}

          {/* Cluster & Observability Monitoring button */}
          <button
            onClick={onOpenMonitoring}
            title="Abrir panel de monitoreo de cluster, balanceadores y errores"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/60 text-xs font-medium transition"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Monitoreo Cluster</span>
          </button>

          {/* Manual Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refrescar lista"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {/* Simulate Webhook Call button */}
          <button
            onClick={onOpenSimulate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium text-xs shadow-md shadow-sky-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simular Webhook</span>
          </button>
        </div>
      </div>
    </header>
  );
};

