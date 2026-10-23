/**
 * Incoming Call Webhook Payload matching external provider specifications.
 */
export interface IncomingCallWebhookPayload {
  /** Unique call identifier from the telephony system (e.g., "c-10234") */
  callId: string;
  /** Caller telephone number in international E.164 or local format (e.g., "+573001234567") */
  phoneNumber: string;
  /** Identifier of the agent who answered (e.g., "agente-07") */
  agent: string;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Audio URL of the recording */
  recordingUrl: string;
}

/**
 * Call Session Representation exposed to client interfaces and services.
 */
export interface CallSessionDTO {
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

/**
 * Request payload for toggling spam status.
 */
export interface ToggleSpamPayload {
  isSpam: boolean;
  reason?: string;
}

/**
 * Aggregated metrics for call center supervision.
 */
export interface CallStatsDTO {
  totalCalls: number;
  recurringCalls: number;
  spamCalls: number;
  avgDurationSeconds: number;
}

/**
 * Standard API response wrapper.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    isDuplicate?: boolean;
    servedBy?: string;
    timestamp?: string;
  };
}

/**
 * Real-time event types published over SSE / WebSockets.
 */
export type RealtimeEventType = 'call.created' | 'call.updated' | 'call.spam_toggled';

export interface RealtimeCallEvent {
  event: RealtimeEventType;
  data: CallSessionDTO;
  timestamp: string;
}

