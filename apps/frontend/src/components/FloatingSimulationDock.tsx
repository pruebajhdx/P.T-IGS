import React from 'react';
import { Zap, Square, Eye, Sliders } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface FloatingSimulationDockProps {
  onOpenModal: () => void;
  isModalOpen: boolean;
}

export const FloatingSimulationDock: React.FC<FloatingSimulationDockProps> = ({
  onOpenModal,
  isModalOpen,
}) => {
  const { isBatchRunning, batchProgress, stopBatchSimulation } = useNotifications();

  // If simulation is not running or modal is already open, do not display floating dock
  if (!isBatchRunning || isModalOpen) return null;

  const percent = batchProgress.total > 0
    ? Math.round((batchProgress.current / batchProgress.total) * 100)
    : 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="bg-slate-900/90 border border-indigo-500/50 shadow-2xl shadow-indigo-950/80 backdrop-blur-xl px-4 py-2.5 rounded-full flex items-center gap-3.5 text-xs text-white">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="font-semibold text-indigo-300">Ráfaga Activa:</span>
          <span className="font-mono text-white">
            {batchProgress.current}/{batchProgress.total} ({percent}%)
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="w-24 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
          <button
            onClick={onOpenModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
          >
            <Sliders className="w-3 h-3 text-sky-400" />
            <span>Consola</span>
          </button>
          <button
            onClick={stopBatchSimulation}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>Detener</span>
          </button>
        </div>
      </div>
    </div>
  );
};
