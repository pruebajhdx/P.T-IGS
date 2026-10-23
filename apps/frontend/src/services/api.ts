export interface CallSession {
  id: string;
  callId: string;
  phoneNumber: string;
  agent: string;
  durationSeconds: number;
  durationFormatted?: string;
  recordingUrl: string;
  hasCalledBefore: boolean;
  previousCallsCount: number;
  isSpam: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallStats {
  totalCalls: number;
  recurringCalls: number;
  spamCalls: number;
  avgDurationSeconds: number;
}

export interface WebhookPayload {
  callId: string;
  phoneNumber: string;
  agent: string;
  durationSeconds: number;
  recordingUrl: string;
}

const API_BASE = '/api/v1';

export async function fetchCalls(filterParams: { search?: string; is_spam?: string } = {}): Promise<CallSession[]> {
  const params = new URLSearchParams();
  if (filterParams.search) params.set('search', filterParams.search);
  if (filterParams.is_spam !== undefined && filterParams.is_spam !== '') {
    params.set('is_spam', filterParams.is_spam);
  }

  const res = await fetch(`${API_BASE}/calls?${params.toString()}`);
  if (!res.ok) throw new Error(`Error fetching calls: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchStats(): Promise<CallStats> {
  const res = await fetch(`${API_BASE}/calls/stats`);
  if (!res.ok) throw new Error(`Error fetching stats: ${res.statusText}`);
  const json = await res.json();
  return json.data || { totalCalls: 0, recurringCalls: 0, spamCalls: 0, avgDurationSeconds: 0 };
}

export async function toggleCallSpam(id: string, isSpam: boolean): Promise<CallSession> {
  const res = await fetch(`${API_BASE}/calls/${id}/spam`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isSpam }),
  });
  if (!res.ok) throw new Error(`Error updating spam status: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

export async function sendCallWebhook(payload: WebhookPayload): Promise<{ data: CallSession; isDuplicate: boolean; servedBy?: string }> {
  const res = await fetch(`${API_BASE}/webhooks/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok && res.status !== 422) {
    throw new Error(json.message || 'Error sending webhook');
  }
  return {
    data: json.data,
    isDuplicate: Boolean(json.meta?.isDuplicate),
    servedBy: json.meta?.servedBy,
  };
}

export function subscribeToCallsStream(
  onEvent: (event: string, data: any) => void,
  onStatus: (status: 'connected' | 'reconnecting' | 'disconnected') => void
): () => void {
  let eventSource: EventSource | null = null;
  let reconnectTimeout: any = null;

  function connect() {
    onStatus('reconnecting');
    eventSource = new EventSource(`${API_BASE}/calls/stream`);

    eventSource.onopen = () => {
      onStatus('connected');
    };

    eventSource.addEventListener('connected', (e) => {
      onStatus('connected');
      try {
        const payload = JSON.parse(e.data);
        onEvent('connected', payload);
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('call.created', (e) => {
      try {
        const payload = JSON.parse(e.data);
        onEvent('call.created', payload);
      } catch (err) {
        console.error('Failed to parse call.created event', err);
      }
    });

    eventSource.addEventListener('call.spam_toggled', (e) => {
      try {
        const payload = JSON.parse(e.data);
        onEvent('call.spam_toggled', payload);
      } catch (err) {
        console.error('Failed to parse call.spam_toggled event', err);
      }
    });

    eventSource.onerror = () => {
      onStatus('reconnecting');
      if (eventSource) {
        eventSource.close();
      }
      // Reconnect after 3 seconds
      reconnectTimeout = setTimeout(connect, 3000);
    };
  }

  connect();

  return () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (eventSource) eventSource.close();
  };
}
