import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Terminal,
} from 'lucide-react';
import {
  fetchClusterStatus,
  fetchRecentErrors,
  triggerTestError,
  ClusterStatus,
  ErrorLogEntry,
} from '../services/api';

interface ClusterMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClusterMonitoringModal: React.FC<ClusterMonitoringModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggeringError, setIsTriggeringError] = useState(false);
  const [testErrorFeedback, setTestErrorFeedback] = useState<string | null>(null);

  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      const [clusterData, errorLogs] = await Promise.all([
        fetchClusterStatus(),
        fetchRecentErrors(),
      ]);
      setStatus(clusterData);
      setErrors(errorLogs);
    } catch (err) {
      console.error('Error fetching cluster monitoring info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMonitoringData();
      const interval = setInterval(loadMonitoringData, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerTestError = async () => {
    setIsTriggeringError(true);
    setTestErrorFeedback(null);
    try {
      const res = await triggerTestError('Excepción de auditoría y prueba de observabilidad/Sentry generada desde el panel');
      setTestErrorFeedback(res.message);
      await loadMonitoringData();
    } catch (err: any) {
      setTestErrorFeedback(`Error: ${err.message}`);
    } finally {
      setIsTriggeringError(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 pr-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Monitoreo de Cluster, Balanceadores & Observabilidad</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoría en tiempo real de Nginx Load Balancer, réplicas PHP, PostgreSQL, Redis y Sentry
              </p>
            </div>
          </div>

          <button
            onClick={loadMonitoringData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Status Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Nginx Load Balancer Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Nginx Load Balancer
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Activo
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Algoritmo:</span>
                  <span className="font-mono text-white">least_conn</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Conexiones activas:</span>
                  <span className="font-mono text-white">{status?.cluster?.load_balancer?.active_connections ?? 1}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Nodos Upstream:</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    {status?.cluster?.load_balancer?.upstream_nodes ? (
                      status.cluster.load_balancer.upstream_nodes.map((node) => (
                        <span
                          key={node.id}
                          className={`px-1.5 py-0.2 rounded border ${
                            node.status === 'outage_simulated'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold line-through'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={node.status === 'outage_simulated' ? 'Caída Simulada Activa' : 'Nodo Saludable'}
                        >
                          {node.id}
                        </span>
                      ))
                    ) : (
                      <span className="text-sky-300">api-1, api-2</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. API Replicas Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Réplicas PHP
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {status?.cluster?.api_instances?.workers_per_replica ?? 8} Workers c/u
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Nodo ejecutor:</span>
                  <span className="font-mono text-emerald-300 font-semibold">{status?.meta?.servedBy ?? 'api-replica'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Memoria nodo:</span>
                  <span className="font-mono text-white">{status?.cluster?.api_instances?.memory_usage_mb ?? 0} MB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PHP Version:</span>
                  <span className="font-mono text-white">{status?.cluster?.api_instances?.php_version?.split('-')[0] ?? '8.3'}</span>
                </div>
              </div>
            </div>

            {/* 3. PostgreSQL Database Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  PostgreSQL 16
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {status?.cluster?.database?.latency_ms ?? 0} ms
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Estado:</span>
                  <span className="text-emerald-400 font-medium">Conectado</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Llamadas en BD:</span>
                  <span className="font-mono text-white font-semibold">{status?.cluster?.database?.total_records ?? 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tamaño disco:</span>
                  <span className="font-mono text-white">{status?.cluster?.database?.disk_size ?? '8 MB'}</span>
                </div>
              </div>
            </div>

            {/* 4. Redis Distributed Cache Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Redis 7.4 (Locks/SSE)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {status?.cluster?.cache?.latency_ms ?? 0} ms
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Idempotencia:</span>
                  <span className="text-emerald-400 font-medium">Activa</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Clientes conex.:</span>
                  <span className="font-mono text-white">{status?.cluster?.cache?.connected_clients ?? 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Memoria en uso:</span>
                  <span className="font-mono text-white">{status?.cluster?.cache?.memory_used ?? '1.2M'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sentry & Observability Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Monitoreo de Errores & Sentry SDK</span>
                    {status?.cluster?.observability?.sentry_enabled ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Sentry DSN Configurado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        Capturador Local Activo (Sentry Ready)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Captura excepciones no controladas, fallos de consultas y 500s. Configurable con <code className="text-sky-300 bg-slate-900 px-1 rounded">SENTRY_DSN</code> en el <code className="text-slate-300">.env</code>.
                  </p>
                </div>
              </div>

              {/* Trigger test exception button */}
              <button
                onClick={handleTriggerTestError}
                disabled={isTriggeringError}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTriggeringError ? 'Disparando...' : 'Probar Captura de Error'}</span>
              </button>
            </div>

            {testErrorFeedback && (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{testErrorFeedback}</span>
              </div>
            )}
          </div>

          {/* Error & Warning Audit Log Viewer */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Registro de Errores y Auditoría del Servidor ({errors.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">storage/logs/laravel.log</span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
              {errors.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-75" />
                  <span>Sin errores registrados. El cluster opera de manera estable.</span>
                </div>
              ) : (
                errors.map((err, i) => (
                  <div key={i} className="p-3 hover:bg-slate-900/40 transition">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          err.level === 'CRITICAL' || err.level === 'EMERGENCY'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : err.level === 'ERROR'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {err.level}
                      </span>
                      <span className="text-[11px] text-slate-400">{err.timestamp}</span>
                    </div>
                    <p className="text-slate-300 break-words text-[11px] mt-0.5">{err.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Tiempo de respuesta de monitoreo: <strong className="text-slate-200">{status?.meta?.responseTimeMs ?? 5} ms</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

