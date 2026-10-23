import React from 'react';
import { Phone, Users, ShieldAlert, Clock } from 'lucide-react';
import { CallStats } from '../services/api';

interface StatsOverviewProps {
  stats: CallStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const formatDuration = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${mins}m ${secs}s`;
  };

  const cards = [
    {
      title: 'Total de Llamadas',
      value: stats.totalCalls,
      icon: Phone,
      color: 'from-sky-500/20 to-sky-600/5',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/30',
      subtext: 'Registros recibidos vía webhook',
    },
    {
      title: 'Llamantes Recurrentes',
      value: stats.recurringCalls,
      icon: Users,
      color: 'from-indigo-500/20 to-indigo-600/5',
      textColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/30',
      subtext: stats.totalCalls > 0 
        ? `${Math.round((stats.recurringCalls / stats.totalCalls) * 100)}% de recurrencia previa`
        : 'Historial previo detectado',
    },
    {
      title: 'Detectadas como Spam',
      value: stats.spamCalls,
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-rose-600/5',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      subtext: 'Marcadas por los supervisores',
    },
    {
      title: 'Duración Promedio',
      value: formatDuration(stats.avgDurationSeconds),
      icon: Clock,
      color: 'from-emerald-500/20 to-emerald-600/5',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      subtext: `${stats.avgDurationSeconds.toFixed(1)} segundos exactos`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl bg-gradient-to-br ${card.color} bg-slate-900 border ${card.borderColor} shadow-sm backdrop-blur transition-all duration-200 hover:border-slate-600`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`p-2 rounded-lg bg-slate-800/80 ${card.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
            <p className="text-xs text-slate-400 mt-1">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};

