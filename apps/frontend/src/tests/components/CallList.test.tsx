import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { CallList } from '../../components/CallList';
import { CallSession } from '../../services/api';

const mockCalls: CallSession[] = [
  {
    id: 'db-1',
    callId: 'c-1001',
    phoneNumber: '+573001234567',
    agent: 'Agente-01',
    durationSeconds: 150,
    recordingUrl: 'https://grabaciones.ejemplo.com/c-1001.mp3',
    isSpam: false,
    hasCalledBefore: false,
    previousCallsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'db-2',
    callId: 'c-1002',
    phoneNumber: '+573009876543',
    agent: 'Agente-02',
    durationSeconds: 200,
    recordingUrl: 'https://grabaciones.ejemplo.com/c-1002.mp3',
    isSpam: true,
    hasCalledBefore: true,
    previousCallsCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('CallList Component', () => {
  it('renders calls table with recurring badges and spam tags', () => {
    const onToggleSpam = vi.fn().mockResolvedValue(undefined);
    const onSearchChange = vi.fn();
    const onSpamFilterChange = vi.fn();

    render(
      <CallList
        calls={mockCalls}
        allCallsCount={2}
        validCallsCount={1}
        spamCallsCount={1}
        onToggleSpam={onToggleSpam}
        isLoading={false}
        searchTerm=""
        onSearchChange={onSearchChange}
        spamFilter=""
        onSpamFilterChange={onSpamFilterChange}
      />
    );

    // Assert Phone Numbers exist
    expect(screen.getAllByText('+573001234567').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+573009876543').length).toBeGreaterThan(0);

    // Assert Agents exist
    expect(screen.getAllByText('Agente-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agente-02').length).toBeGreaterThan(0);

    // Assert Recurrence Badges
    expect(screen.getAllByText(/Primerizo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Recurrente \(3 previas\)/i).length).toBeGreaterThan(0);

    // Assert Action Buttons for Spam
    expect(screen.getAllByText(/Marcar Spam/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Es Spam/i).length).toBeGreaterThan(0);
  });

  it('triggers onToggleSpam when spam button is clicked', async () => {
    const onToggleSpam = vi.fn().mockResolvedValue(undefined);
    const onSearchChange = vi.fn();
    const onSpamFilterChange = vi.fn();

    render(
      <CallList
        calls={mockCalls}
        allCallsCount={2}
        validCallsCount={1}
        spamCallsCount={1}
        onToggleSpam={onToggleSpam}
        isLoading={false}
        searchTerm=""
        onSearchChange={onSearchChange}
        spamFilter=""
        onSpamFilterChange={onSpamFilterChange}
      />
    );

    const spamButtons = screen.getAllByRole('button', { name: /Marcar Spam/i });
    expect(spamButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(spamButtons[0]);
    });

    expect(onToggleSpam).toHaveBeenCalledWith('db-1', true);
  });
});

