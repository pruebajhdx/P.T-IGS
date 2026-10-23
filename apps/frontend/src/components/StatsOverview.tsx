import React from 'react';
import { Phone, Users, ShieldAlert, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { CallStats } from '../services/api';

interface StatsOverviewProps {
  stats: CallStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const formatDuration = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const recurrencePercentage = stats.totalCalls > 0
    ? Math.round((stats.recurringCalls / stats.totalCalls) * 100)
    : 0;

  const spamPercentage = stats.totalCalls > 0
    ? ((stats.spamCalls / stats.totalCalls) * 100).toFixed(1)
    : '0.0';

  const cards = [
    {
      title: 'Total de Llamadas',
      value: stats.totalCalls.toLocaleString(),
      icon: Phone,
      color: 'from-sky-500/15 via-sky-500/5 to-transparent',
      iconBg: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
      borderColor: 'border-sky-500/20 hover:border-sky-500/40',
      badge: 'Cluster Live',
      badgeColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      subtext: 'Eventos persistidos en PostgreSQL',
    },
    {
      title: 'Llamantes Recurrentes',
      value: stats.recurringCalls.toLocaleString(),
      icon: Users,
      color: 'from-indigo-500/15 via-indigo-500/5 to-transparent',
      iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
      borderColor: 'border-indigo-500/20 hover:border-indigo-500/40',
      badge: `${recurrencePercentage}% del total`,
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      subtext: 'Teléfonos con historial previo',
    },
    {
      title: 'Marcadas como Spam',
      value: stats.spamCalls.toLocaleString(),
      icon: ShieldAlert,
      color: 'from-rose-500/15 via-rose-500/5 to-transparent',
      iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      borderColor: 'border-rose-500/20 hover:border-rose-500/40',
      badge: `${spamPercentage}% tasa spam`,
      badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      subtext: 'Supervisión y control de fraude',
    },
    {
      title: 'Duración Promedio',
      value: formatDuration(stats.avgDurationSeconds),
      icon: Clock,
      color: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      borderColor: 'border-emerald-500/20 hover:border-emerald-500/40',
      badge: `${stats.avgDurationSeconds.toFixed(1)}s`,
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      subtext: 'Tiempo medio de conversación',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br ${card.color} bg-slate-900/90 border ${card.borderColor} shadow-xl shadow-slate-950/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono">
                {card.value}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};

