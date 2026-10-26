import React, { useState } from 'react';
import {
  Activity,
  Server,
  Zap,
  ShieldCheck,
  RotateCcw,
  X,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ServerCrash,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useNotifications, LiveResolutionLog } from '../context/NotificationContext';

export const LiveResolutionInspector: React.FC = () => {
  const {
    isBatchRunning,
    batchProgress,
    stopBatchSimulation,
    activeChaos,
    resolutionLogs,
    clearResolutionLogs,
  } = useNotifications();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'created' | 'duplicate' | 'failover'>('all');

  // Automatically make visible if chaos is active or batch is running
  if (!isOpen && !isBatchRunning && !activeChaos) {
    return null;
  }

  // If closed by user, give a small floating pill to re-open if there is activity
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/90 border border-indigo-500/50 shadow-2xl shadow-indigo-950/80 backdrop-blur-md text-xs font-bold text-white hover:border-indigo-400 transition"
      >
        <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
        <span>Inspector de Clúster</span>
        {activeChaos && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        )}
      </button>
    );
  }

  const percent = batchProgress.total > 0
    ? Math.round((batchProgress.current / batchProgress.total) * 100)
    : 0;

  const filteredLogs = resolutionLogs.filter((log) => {
    if (filterType === 'created') return !log.isDuplicate && log.status === 201;
    if (filterType === 'duplicate') return log.isDuplicate;
    if (filterType === 'failover') return Boolean(log.failoverDetected);
    return true;
  });

  return (
    <div
      className={`fixed left-4 sm:left-6 bottom-4 sm:bottom-6 z-50 w-[95vw] sm:w-[480px] transition-all duration-300 ease-in-out ${
        isMinimized ? 'h-14' : 'max-h-[82vh]'
      }`}
    >
      <div className="bg-slate-900/95 border border-slate-700/80 shadow-2xl shadow-slate-950/90 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden text-xs text-white border-t-2 border-t-sky-500">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
              {activeChaos && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-[13px]">
                  Telemetría de Resolución en Vivo
                </span>
                {activeChaos ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    Fallo Forzado: {activeChaos}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Clúster Balanceado
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Auditoría Nginx Load Balancer & Réplicas en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isMinimized ? 'Maximizar panel' : 'Minimizar panel'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar panel flotante"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body (Visible only when not minimized) */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-3.5">
            {/* Live Failover banner if Chaos is active */}
            {activeChaos && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/70 to-slate-900 border border-rose-500/40 flex items-start gap-3">
                <ServerCrash className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-rose-200">
                    Modo Chaos Activo: Réplica {activeChaos} marcada como caída.
                  </span>
                  <p className="text-slate-300 mt-0.5">
                    Nginx intercepta el código de degradación e invoca de inmediato a la réplica hermana mediante{' '}
                    <span className="font-mono text-amber-300 font-semibold">proxy_next_upstream</span>. Observa abajo cómo las peticiones son resueltas por el nodo alternativo con <strong className="text-emerald-400">cero errores 500</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Ráfaga en Progreso / Resumen de Lote */}
            {isBatchRunning ? (
              <div className="p-3 bg-slate-950/70 rounded-xl border border-indigo-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Lote en Ejecución: {batchProgress.current}/{batchProgress.total}</span>
                  </div>
                  <span className="font-mono text-white font-bold">{percent}%</span>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-150"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Counters strip */}
                <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono text-[11px]">
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold block">{batchProgress.created}</span>
                    <span className="text-[9px] text-slate-400">Nuevas (201)</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-amber-400 font-bold block">{batchProgress.duplicates}</span>
                    <span className="text-[9px] text-slate-400">Idempotentes</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-indigo-400 font-bold block">{batchProgress.recurring}</span>
                    <span className="text-[9px] text-slate-400">Recurrentes</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-rose-400 font-bold block">{batchProgress.errors}</span>
                    <span className="text-[9px] text-slate-400">Errores</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={stopBatchSimulation}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition flex items-center gap-1"
                  >
                    <span>Detener Ráfaga</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Logs stream section */}
            <div className="flex-1 flex flex-col min-h-[220px] max-h-[340px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              {/* Filter Tabs */}
              <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      filterType === 'all'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({resolutionLogs.length})
                  </button>
                  <button
                    onClick={() => setFilterType('failover')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      filterType === 'failover'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Failover
                  </button>
                  <button
                    onClick={() => setFilterType('duplicate')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      filterType === 'duplicate'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Idempotencia
                  </button>
                </div>

                <button
                  onClick={clearResolutionLogs}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition"
                  title="Limpiar registro"
                >
                  Limpiar
                </button>
              </div>

              {/* Resolution Log Rows */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                {filteredLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-8 text-slate-500 text-center">
                    <Activity className="w-6 h-6 mb-1.5 opacity-30 animate-pulse" />
                    <span>A la espera de peticiones webhook...</span>
                    <span className="text-[10px] text-slate-600 mt-0.5">
                      Dispara una llamada individual o ráfaga para ver el ruteo del balanceador.
                    </span>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isApi1 = log.servedBy?.toLowerCase().includes('1');
                    const badgeColor = isApi1
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

                    return (
                      <div
                        key={log.id}
                        className={`p-2 rounded-lg border transition-all ${
                          log.failoverDetected
                            ? 'bg-rose-950/30 border-rose-500/40 hover:bg-rose-950/40'
                            : log.isDuplicate
                            ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30'
                            : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-bold">{log.callId}</span>
                            <span className="text-slate-400 font-sans text-[10px]">
                              {log.phoneNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                log.status === 201
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              HTTP {log.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans">
                              {log.latencyMs}ms
                            </span>
                          </div>
                        </div>

                        {/* Node routing & Idempotency info */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60">
                          <div className="flex items-center gap-1.5">
                            <Server className="w-3 h-3 text-slate-500" />
                            <span>Resuelto por:</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold border ${badgeColor}`}>
                              {log.servedBy || 'nginx-upstream'}
                            </span>
                          </div>

                          {log.failoverDetected && (
                            <span className="text-rose-400 font-sans font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-rose-400" />
                              Failover Exitoso
                            </span>
                          )}

                          {log.isDuplicate && !log.failoverDetected && (
                            <span className="text-amber-400 font-sans font-semibold">
                              Redis Cache Replay
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Architecture Tip footer */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Nginx: <strong className="text-slate-300">least_conn</strong> + failover activo</span>
              </div>
              <span className="text-slate-500 font-mono">X-Served-By Header</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

