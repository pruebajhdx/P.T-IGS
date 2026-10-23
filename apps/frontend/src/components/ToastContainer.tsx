import React from 'react';
import {
  PhoneCall,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Square,
  Sparkles,
  Volume2,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import { useNotifications, AppNotification } from '../context/NotificationContext';

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification, stopBatchSimulation } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 sm:px-0 pointer-events-none"
    >
      {notifications.map((notif) => (
        <ToastItem
          key={notif.id}
          notif={notif}
          onClose={() => removeNotification(notif.id)}
          onStopBatch={stopBatchSimulation}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  notif: AppNotification;
  onClose: () => void;
  onStopBatch: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notif, onClose, onStopBatch }) => {
  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Incoming Call Card
  if (notif.type === 'incoming_call' && notif.call) {
    const call = notif.call;
    return (
      <div className="pointer-events-auto bg-slate-900/95 border border-sky-500/40 shadow-2xl shadow-sky-950/80 rounded-2xl p-4 backdrop-blur-xl transition-all duration-300 animate-slide-in hover:border-sky-400">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                <PhoneCall className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  Llamada Entrante
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {call.callId}
                </span>
              </div>
              <h4 className="font-bold text-white font-mono text-sm tracking-wide">
                {call.phoneNumber}
              </h4>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details Pills */}
        <div className="flex items-center flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-800 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-300">
            <User className="w-3 h-3 text-slate-400" />
            <span className="font-medium">{call.agent}</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatDuration(call.durationSeconds)}</span>
          </span>
          <span className="text-slate-600">•</span>
          {call.hasCalledBefore ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              🔄 Recurrente ({call.previousCallsCount})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ✨ Primeriza
            </span>
          )}
        </div>
      </div>
    );
  }

  // Render Simulation In-Progress Card
  if (notif.type === 'simulation_progress' && notif.batchStats) {
    const s = notif.batchStats;
    const percent = s.total > 0 ? Math.round((s.current / s.total) * 100) : 0;
    return (
      <div className="pointer-events-auto bg-slate-900/95 border border-indigo-500/40 shadow-2xl shadow-indigo-950/80 rounded-2xl p-4 backdrop-blur-xl transition-all duration-300 animate-slide-in">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 animate-spin">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">Simulación en Ráfaga</h4>
              <p className="text-[11px] text-slate-400">
                Progreso: {s.current} de {s.total} llamadas ({percent}%)
              </p>
            </div>
          </div>

          <button
            onClick={onStopBatch}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Detener</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 my-2">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Live Counters */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="text-emerald-400 font-medium">✓ {s.created} nuevas</span>
          <span className="text-amber-400 font-medium">⚡ {s.duplicates} duplicadas (200)</span>
          <span className="text-indigo-400 font-medium">🔄 {s.recurring} recurrentes</span>
        </div>
      </div>
    );
  }

  // Render Simulation Completed Summary Card
  if (notif.type === 'simulation_complete' && notif.batchStats) {
    const s = notif.batchStats;
    return (
      <div className="pointer-events-auto bg-slate-900/95 border border-emerald-500/40 shadow-2xl shadow-emerald-950/80 rounded-2xl p-4 backdrop-blur-xl transition-all duration-300 animate-slide-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">{notif.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">{notif.message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800 text-center">
          <div className="bg-slate-950/80 rounded-lg p-1.5 border border-slate-800">
            <div className="text-emerald-400 font-bold text-xs">{s.created}</div>
            <div className="text-[9px] text-slate-400 uppercase">Creadas</div>
          </div>
          <div className="bg-slate-950/80 rounded-lg p-1.5 border border-slate-800">
            <div className="text-amber-400 font-bold text-xs">{s.duplicates}</div>
            <div className="text-[9px] text-slate-400 uppercase">Idempotentes</div>
          </div>
          <div className="bg-slate-950/80 rounded-lg p-1.5 border border-slate-800">
            <div className="text-indigo-400 font-bold text-xs">{s.recurring}</div>
            <div className="text-[9px] text-slate-400 uppercase">Recurrentes</div>
          </div>
        </div>
      </div>
    );
  }

  // General Toast (Success / Warning / Error / Info)
  const colorMap = {
    success: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
    warning: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
    error: 'border-rose-500/40 bg-rose-950/30 text-rose-300',
    info: 'border-sky-500/40 bg-sky-950/30 text-sky-300',
  };

  const IconMap = {
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertTriangle,
    info: Info,
  };

  const Icon = IconMap[notif.type as keyof typeof IconMap] || Info;
  const style = colorMap[notif.type as keyof typeof colorMap] || colorMap.info;

  return (
    <div className="pointer-events-auto bg-slate-900/95 border border-slate-800 shadow-2xl rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-300 animate-slide-in flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <div className={`p-1.5 rounded-lg border ${style}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-semibold text-white text-xs">{notif.title}</h4>
          {notif.message && <p className="text-[11px] text-slate-400 mt-0.5">{notif.message}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

