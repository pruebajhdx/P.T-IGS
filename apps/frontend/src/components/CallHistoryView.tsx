import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  User,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  PhoneIncoming,
} from 'lucide-react';
import { CallSession } from '../services/api';

interface CallHistoryViewProps {
  calls: CallSession[];
  onToggleSpam: (id: string, isSpam: boolean) => void;
  isLoading: boolean;
}

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({
  calls,
  onToggleSpam,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [spamFilter, setSpamFilter] = useState<'all' | 'valid' | 'spam'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  // Unique agents list for filter dropdown
  const agentsList = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c) => {
      if (c.agent) set.add(c.agent);
    });
    return Array.from(set).sort();
  }, [calls]);

  // Filtered and sorted calls
  const filteredCalls = useMemo(() => {
    return calls
      .filter((call) => {
        // Search filter (number, callId, agent)
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          call.phoneNumber.toLowerCase().includes(term) ||
          call.callId.toLowerCase().includes(term) ||
          call.agent.toLowerCase().includes(term);

        // Agent filter
        const matchesAgent = selectedAgent === 'all' || call.agent === selectedAgent;

        // Spam filter
        const matchesSpam =
          spamFilter === 'all' ||
          (spamFilter === 'valid' && !call.isSpam) ||
          (spamFilter === 'spam' && call.isSpam);

        // Date filter (YYYY-MM-DD)
        const callDateStr = call.createdAt ? new Date(call.createdAt).toISOString().split('T')[0] : '';
        const matchesDate = !selectedDate || callDateStr === selectedDate;

        return matchesSearch && matchesAgent && matchesSpam && matchesDate;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [calls, searchTerm, selectedAgent, spamFilter, selectedDate, sortOrder]);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return { date: 'N/A', time: 'N/A' };
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
      time: date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredCalls.length === 0) return;
    const headers = ['ID Llamada', 'Número Teléfono', 'Agente', 'Duración (seg)', 'Recurrente', 'Spam', 'Fecha', 'Hora', 'Grabación'];
    const rows = filteredCalls.map((c) => {
      const { date, time } = formatDate(c.createdAt);
      return [
        `"${c.callId}"`,
        `"${c.phoneNumber}"`,
        `"${c.agent}"`,
        c.durationSeconds,
        c.hasCalledBefore ? 'Sí' : 'No',
        c.isSpam ? 'Sí' : 'No',
        `"${date}"`,
        `"${time}"`,
        `"${c.recordingUrl || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registro_llamadas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedAgent('all');
    setSelectedDate('');
    setSpamFilter('all');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats of History */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Bitácora Histórica y Registro de Llamadas
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registro cronológico persistido en PostgreSQL con marcas de tiempo (fecha/hora), duración, agente y estado de spam.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={filteredCalls.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Exportar CSV ({filteredCalls.length})
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar teléfono, ID o agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition [color-scheme:dark]"
            />
          </div>

          {/* Agent Dropdown */}
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition appearance-none cursor-pointer"
            >
              <option value="all">Todos los agentes</option>
              {agentsList.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Spam Status Dropdown */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={spamFilter}
              onChange={(e) => setSpamFilter(e.target.value as any)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition appearance-none cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="valid">Solo legítimas</option>
              <option value="spam">Solo marcadas Spam</option>
            </select>
          </div>

          {/* Order and Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              title="Cambiar orden cronológico"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 transition"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
              <span>{sortOrder === 'desc' ? 'Más recientes' : 'Más antiguas'}</span>
            </button>

            {(searchTerm || selectedAgent !== 'all' || selectedDate || spamFilter !== 'all' || sortOrder !== 'desc') && (
              <button
                onClick={handleResetFilters}
                title="Limpiar filtros"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-xl text-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table / Records */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-4">ID de Llamada</th>
                <th className="py-3.5 px-4">Número Telefónico</th>
                <th className="py-3.5 px-4">Agente</th>
                <th className="py-3.5 px-4">Duración</th>
                <th className="py-3.5 px-4">Recurrencia</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Grabación / Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                      <span>Cargando registros históricos...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PhoneIncoming className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-400">No se encontraron llamadas registradas</p>
                      <p className="text-xs text-slate-600">
                        Prueba ajustando los filtros de fecha/búsqueda o genera llamadas desde el Simulador Webhook.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => {
                  const { date, time } = formatDate(call.createdAt);
                  return (
                    <tr
                      key={call.id || call.callId}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-sky-400" />
                          <div>
                            <div className="font-medium text-white">{date}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {time}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Call ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-300 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800 text-[11px]">
                          {call.callId}
                        </span>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-mono text-white font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{call.phoneNumber}</span>
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="capitalize">{call.agent}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-200">
                          {call.durationFormatted || `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s`}
                        </span>
                      </td>

                      {/* Recurrence */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {call.hasCalledBefore ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
                            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                            Recurrente ({call.previousCallsCount || 1}+)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
                            Primera vez
                          </span>
                        )}
                      </td>

                      {/* Spam Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {call.isSpam ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/60">
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            Spam
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Legítima
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {call.recordingUrl ? (
                            <button
                              onClick={() => {
                                if (activeAudioUrl === call.recordingUrl) {
                                  setActiveAudioUrl(null);
                                } else {
                                  setActiveAudioUrl(call.recordingUrl);
                                }
                              }}
                              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                                activeAudioUrl === call.recordingUrl
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                              title="Reproducir/Ver grabación"
                            >
                              <Play className="w-3.5 h-3.5 text-sky-400" />
                            </button>
                          ) : null}

                          <button
                            onClick={() => onToggleSpam(call.id || call.callId, !call.isSpam)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                              call.isSpam
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
                            }`}
                          >
                            {call.isSpam ? 'Quitar Spam' : 'Marcar Spam'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Audio Player Drawer if active */}
        {activeAudioUrl && (
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <Play className="w-4 h-4" />
              <span>Reproduciendo grabación de llamada:</span>
              <span className="font-mono text-slate-300">{activeAudioUrl}</span>
            </div>
            <audio controls autoPlay src={activeAudioUrl} className="h-8 max-w-sm" />
            <button
              onClick={() => setActiveAudioUrl(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Table Footer info */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Mostrando <strong className="text-white">{filteredCalls.length}</strong> de{' '}
            <strong className="text-white">{calls.length}</strong> llamadas totales en base de datos
          </span>
          <span>Actualización en tiempo real vía Server-Sent Events (SSE)</span>
        </div>
      </div>
    </div>
  );
};
