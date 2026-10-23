import React, { useState } from 'react';
import {
  Search,
  Shield,
  ShieldAlert,
  Volume2,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import { CallSession } from '../services/api';

interface CallListProps {
  calls: CallSession[];
  onToggleSpam: (id: string, isSpam: boolean) => Promise<void>;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  spamFilter: string;
  onSpamFilterChange: (val: string) => void;
}

export const CallList: React.FC<CallListProps> = ({
  calls,
  onToggleSpam,
  isLoading,
  searchTerm,
  onSearchChange,
  spamFilter,
  onSpamFilterChange,
}) => {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleSpam = async (call: CallSession) => {
    setTogglingId(call.id);
    try {
      await onToggleSpam(call.id, !call.isSpam);
    } finally {
      setTogglingId(null);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/60">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por teléfono, agente o callId..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => onSpamFilterChange('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              spamFilter === ''
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todas ({calls.length})
          </button>
          <button
            onClick={() => onSpamFilterChange('false')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              spamFilter === 'false'
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Válidas
          </button>
          <button
            onClick={() => onSpamFilterChange('true')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              spamFilter === 'true'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Spam
          </button>
        </div>
      </div>

      {/* Calls Table for Medium/Large Screens */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">ID de Llamada</th>
              <th className="py-3 px-4">Número & Recurrencia</th>
              <th className="py-3 px-4">Agente</th>
              <th className="py-3 px-4">Duración</th>
              <th className="py-3 px-4">Grabación</th>
              <th className="py-3 px-4">Hora</th>
              <th className="py-3 px-4 text-center">Acción Spam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {calls.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  {isLoading ? 'Cargando llamadas...' : 'No se encontraron sesiones de llamada.'}
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr
                  key={call.id}
                  className={`transition-colors hover:bg-slate-800/40 ${
                    call.isSpam ? 'bg-rose-950/10' : ''
                  }`}
                >
                  {/* Call ID */}
                  <td className="py-3 px-4 font-mono font-medium text-sky-400">
                    <span className="bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {call.callId}
                    </span>
                  </td>

                  {/* Phone & Recurrence Badge */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-white tracking-wide font-mono">
                        {call.phoneNumber}
                      </span>
                      <div>
                        {call.hasCalledBefore ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <span>🔄 Recurrente ({call.previousCallsCount} previas)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span>✨ Primerizo</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Agent */}
                  <td className="py-3 px-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{call.agent}</span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDuration(call.durationSeconds)}</span>
                    </div>
                  </td>

                  {/* Recording Player / Link */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={call.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir URL de grabación"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
                      >
                        <Volume2 className="w-3 h-3 text-sky-400" />
                        <span>Audio</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>
                  </td>

                  {/* Time */}
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {formatTimeAgo(call.createdAt)}
                  </td>

                  {/* Spam Toggle Button */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleSpam(call)}
                      disabled={togglingId === call.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        call.isSpam
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {call.isSpam ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          <span>Es Spam</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5" />
                          <span>Marcar Spam</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards List for Small Screens */}
      <div className="block lg:hidden divide-y divide-slate-800">
        {calls.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            {isLoading ? 'Cargando llamadas...' : 'No se encontraron sesiones de llamada.'}
          </div>
        ) : (
          calls.map((call) => (
            <div
              key={call.id}
              className={`p-4 transition-colors ${call.isSpam ? 'bg-rose-950/15' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {call.callId}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatTimeAgo(call.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-white">
                  {call.phoneNumber}
                </span>
                {call.hasCalledBefore ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Recurrente ({call.previousCallsCount})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Primerizo
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>{call.agent}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(call.durationSeconds)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <a
                  href={call.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-[11px] text-slate-300"
                >
                  <Volume2 className="w-3 h-3 text-sky-400" />
                  <span>Grabación</span>
                </a>
                <button
                  onClick={() => handleToggleSpam(call)}
                  disabled={togglingId === call.id}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium ${
                    call.isSpam
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{call.isSpam ? 'Es Spam' : 'Marcar Spam'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

