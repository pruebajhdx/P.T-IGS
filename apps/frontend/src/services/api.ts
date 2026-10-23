import type {
  CallSessionDTO,
  CallStatsDTO,
  IncomingCallWebhookPayload,
  ToggleSpamPayload,
  ApiResponse,
} from '@monorepo/contracts';

export type CallSession = CallSessionDTO;
export type CallStats = CallStatsDTO;
export type WebhookPayload = IncomingCallWebhookPayload;
export type { ToggleSpamPayload, ApiResponse };

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

    eventSource.onmessage = () => {
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
      onStatus('connected');
      try {
        const payload = JSON.parse(e.data);
        onEvent('call.created', payload);
      } catch (err) {
        console.error('Failed to parse call.created event', err);
      }
    });

    eventSource.addEventListener('call.spam_toggled', (e) => {
      onStatus('connected');
      try {
        const payload = JSON.parse(e.data);
        onEvent('call.spam_toggled', payload);
      } catch (err) {
        console.error('Failed to parse call.spam_toggled event', err);
      }
    });

    eventSource.onerror = () => {
      if (eventSource?.readyState === EventSource.CONNECTING) {
        // Native EventSource is reconnecting automatically
        onStatus('reconnecting');
        return;
      }
      onStatus('reconnecting');
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      // Reconnect after 2 seconds
      reconnectTimeout = setTimeout(connect, 2000);
    };
  }

  connect();

  return () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (eventSource) eventSource.close();
  };
}

export interface ClusterStatus {
  success: boolean;
  timestamp: string;
  cluster: {
    load_balancer: {
      name: string;
      algorithm: string;
      port: number;
      status: string;
      active_connections: number;
      reading: number;
      writing: number;
      waiting: number;
      total_requests: number;
      upstream_nodes: Array<{ id: string; target: string; status: string; weight: number }>;
    };
    api_instances: {
      current: string;
      workers_per_replica: number;
      php_version: string;
      memory_usage_mb: number;
      peak_memory_mb: number;
    };
    database: {
      engine: string;
      status: string;
      latency_ms: number;
      total_records: number;
      disk_size: string;
    };
    cache: {
      engine: string;
      status: string;
      latency_ms: number;
      memory_used: string;
      connected_clients: number;
    };
    observability: {
      sentry_enabled: boolean;
      sentry_dsn_masked: string | null;
      environment: string;
      error_tracking: string;
    };
  };
  meta: {
    servedBy: string;
    responseTimeMs: number;
  };
}

export interface ErrorLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export async function fetchClusterStatus(): Promise<ClusterStatus> {
  const res = await fetch(`${API_BASE}/monitoring/cluster`);
  if (!res.ok) throw new Error(`Error fetching cluster status: ${res.statusText}`);
  return await res.json();
}

export async function fetchRecentErrors(): Promise<ErrorLogEntry[]> {
  const res = await fetch(`${API_BASE}/monitoring/errors`);
  if (!res.ok) throw new Error(`Error fetching errors: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function triggerTestError(message?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/monitoring/test-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return await res.json();
}

