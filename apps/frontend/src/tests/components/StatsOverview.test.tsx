import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatsOverview } from '../../components/StatsOverview';

describe('StatsOverview Component', () => {
  it('renders stats with formatted values and percentages correctly', () => {
    const mockStats = {
      totalCalls: 10,
      recurringCalls: 4,
      spamCalls: 2,
      avgDurationSeconds: 125, // 2m 05s
    };

    render(<StatsOverview stats={mockStats} />);

    // Total calls card
    expect(screen.getByText('Total de Llamadas')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    // Recurring callers card
    expect(screen.getByText('Llamantes Recurrentes')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('40% del total')).toBeInTheDocument();

    // Spam calls card
    expect(screen.getByText('Marcadas como Spam')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('20.0% tasa spam')).toBeInTheDocument();

    // Average duration card
    expect(screen.getByText('Duración Promedio')).toBeInTheDocument();
    expect(screen.getByText('2m 05s')).toBeInTheDocument();
  });

  it('handles zero calls gracefully without division by zero errors', () => {
    const zeroStats = {
      totalCalls: 0,
      recurringCalls: 0,
      spamCalls: 0,
      avgDurationSeconds: 0,
    };

    render(<StatsOverview stats={zeroStats} />);

    expect(screen.getByText('0% del total')).toBeInTheDocument();
    expect(screen.getByText('0.0% tasa spam')).toBeInTheDocument();
    expect(screen.getByText('0m 00s')).toBeInTheDocument();
  });
});

