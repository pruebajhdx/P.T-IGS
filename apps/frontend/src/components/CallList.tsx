import React, { useState } from 'react';
import {
  Search,
  Shield,
  ShieldAlert,
  Volume2,
  Clock,
  User,
  ExternalLink,
  Copy,
  Check,
  X,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { CallSession } from '../services/api';

interface CallListProps {
  calls: CallSession[];
  allCallsCount?: number;
  validCallsCount?: number;
  spamCallsCount?: number;
  onToggleSpam: (id: string, isSpam: boolean) => Promise<void>;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  spamFilter: string;
  onSpamFilterChange: (val: string) => void;
}

export const CallList: React.FC<CallListProps> = ({
  calls,
  allCallsCount,
  validCallsCount,
  spamCallsCount,
  onToggleSpam,
  isLoading,
  searchTerm,
  onSearchChange,
  spamFilter,
  onSpamFilterChange,
}) => {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 1800);
  };

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
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Search & Filter Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3.5 bg-slate-900/70">
        {/* Search Input */}
        <div className="relative w-full md:w-88">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por teléfono, agente o callId..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => onSpamFilterChange('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              spamFilter === ''
                ? 'bg-sky-600 border-sky-400 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>Todas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              spamFilter === '' ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'
            }`}>
              {allCallsCount ?? calls.length}
            </span>
          </button>
          <button
            onClick={() => onSpamFilterChange('false')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              spamFilter === 'false'
                ? 'bg-sky-600 border-sky-400 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>Válidas</span>
            {validCallsCount !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                spamFilter === 'false' ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'
              }`}>
                {validCallsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSpamFilterChange('true')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              spamFilter === 'true'
                ? 'bg-rose-600 border-rose-400 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Spam</span>
            {spamCallsCount !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                spamFilter === 'true' ? 'bg-white/20 text-white' : 'bg-slate-900 text-rose-400'
              }`}>
                {spamCallsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Calls Table for Medium/Large Screens */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-5">ID de Llamada</th>
              <th className="py-3.5 px-5">Número & Recurrencia</th>
              <th className="py-3.5 px-5">Agente Asignado</th>
              <th className="py-3.5 px-5">Duración</th>
              <th className="py-3.5 px-5">Grabación de Audio</th>
              <th className="py-3.5 px-5">Hora de Entrada</th>
              <th className="py-3.5 px-5 text-center">Acción de Supervisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {calls.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 px-4">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="p-3 rounded-2xl bg-slate-800/60 text-slate-400 mb-3 border border-slate-700/60">
                      <PhoneCall className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-200 text-sm mb-1">
                      {isLoading ? 'Cargando llamadas...' : 'No se encontraron sesiones de llamada'}
                    </p>
                    <p className="text-xs text-slate-400 text-center">
                      {spamFilter === 'true'
                        ? 'No hay llamadas marcadas como Spam en este momento.'
                        : spamFilter === 'false'
                        ? 'No hay llamadas válidas registradas.'
                        : searchTerm
                        ? `No hay llamadas que coincidan con el término "${searchTerm}".`
                        : 'El sistema está a la espera de eventos entrantes vía webhook.'}
                    </p>
                    {(searchTerm || spamFilter) && (
                      <button
                        onClick={() => {
                          onSearchChange('');
                          onSpamFilterChange('');
                        }}
                        className="mt-4 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 transition"
                      >
                        Restablecer Filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr
                  key={call.id}
                  className={`transition-colors hover:bg-slate-800/40 ${
                    call.isSpam ? 'bg-rose-950/15' : ''
                  }`}
                >
                  {/* Call ID with quick copy */}
                  <td className="py-3.5 px-5 font-mono font-medium">
                    <button
                      onClick={() => copyToClipboard(call.callId, `id-${call.id}`)}
                      title="Copiar ID de llamada"
                      className="group inline-flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/20 text-sky-400 transition"
                    >
                      <span>{call.callId}</span>
                      {copiedKey === `id-${call.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 transition" />
                      )}
                    </button>
                  </td>

                  {/* Phone & Recurrence Badge */}
                  <td className="py-3.5 px-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white tracking-wide font-mono text-sm">
                          {call.phoneNumber}
                        </span>
                        <button
                          onClick={() => copyToClipboard(call.phoneNumber, `phone-${call.id}`)}
                          title="Copiar número"
                          className="text-slate-400 hover:text-white transition p-0.5"
                        >
                          {copiedKey === `phone-${call.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </div>

                      <div>
                        {call.hasCalledBefore ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <span>🔄 Recurrente ({call.previousCallsCount} previas)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span>✨ Primerizo</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Agent */}
                  <td className="py-3.5 px-5 text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">{call.agent}</span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="py-3.5 px-5 font-mono text-slate-300">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-white">{formatDuration(call.durationSeconds)}</span>
                    </div>
                  </td>

                  {/* Recording Audio Link */}
                  <td className="py-3.5 px-5">
                    <a
                      href={call.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Reproducir o descargar grabación"
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700/80 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition" />
                      <span>Audio .mp3</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                    </a>
                  </td>

                  {/* Time */}
                  <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px]">
                    {formatTimeAgo(call.createdAt)}
                  </td>

                  {/* Spam Toggle Button */}
                  <td className="py-3.5 px-5 text-center">
                    <button
                      onClick={() => handleToggleSpam(call)}
                      disabled={togglingId === call.id}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        call.isSpam
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 shadow-sm shadow-rose-950/50'
                          : 'bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-slate-700 border border-slate-700/80'
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
          <div className="text-center py-12 px-4 text-slate-400 text-xs">
            {isLoading ? 'Cargando llamadas...' : (
              spamFilter === 'true'
                ? 'No hay llamadas marcadas como Spam.'
                : spamFilter === 'false'
                ? 'No hay llamadas válidas.'
                : searchTerm
                ? `No se encontraron llamadas que coincidan con "${searchTerm}".`
                : 'No se encontraron sesiones de llamada.'
            )}
          </div>
        ) : (
          calls.map((call) => (
            <div
              key={call.id}
              className={`p-4 transition-colors ${call.isSpam ? 'bg-rose-950/20' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Recurrente ({call.previousCallsCount})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Primerizo
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{call.agent}</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(call.durationSeconds)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <a
                  href={call.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 font-medium"
                >
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Audio</span>
                </a>
                <button
                  onClick={() => handleToggleSpam(call)}
                  disabled={togglingId === call.id}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold ${
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
