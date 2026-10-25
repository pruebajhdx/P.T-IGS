import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCalls, fetchStats, toggleCallSpam, sendCallWebhook } from '../../services/api';

describe('Frontend API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchCalls queries backend with filters and returns call list', async () => {
    const mockCalls = [{ id: '1', callId: 'c-100', phoneNumber: '+123456789' }];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockCalls }),
    } as any);

    const calls = await fetchCalls({ search: '123', is_spam: 'false' });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/calls?limit=100&search=123&is_spam=false');
    expect(calls).toEqual(mockCalls);
  });

  it('fetchStats queries /api/v1/calls/stats and returns metrics', async () => {
    const mockStats = { totalCalls: 5, recurringCalls: 2, spamCalls: 1, avgDurationSeconds: 120 };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStats }),
    } as any);

    const stats = await fetchStats();

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/calls/stats');
    expect(stats).toEqual(mockStats);
  });

  it('toggleCallSpam executes PATCH with proper JSON body', async () => {
    const updatedCall = { callId: 'c-100', isSpam: true };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedCall }),
    } as any);

    const result = await toggleCallSpam('c-100', true);

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/calls/c-100/spam', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSpam: true }),
    });
    expect(result).toEqual(updatedCall);
  });

  it('sendCallWebhook sends POST and flags duplicate metadata correctly', async () => {
    const webhookPayload = {
      callId: 'c-dup',
      phoneNumber: '+573001234567',
      agent: 'agente-test',
      durationSeconds: 60,
      recordingUrl: 'https://example.com/audio.mp3',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { ...webhookPayload, isSpam: false },
        meta: { isDuplicate: true, servedBy: 'api-replica-1' },
      }),
    } as any);

    const res = await sendCallWebhook(webhookPayload);

    expect(res.isDuplicate).toBe(true);
    expect(res.servedBy).toBe('api-replica-1');
  });
});

