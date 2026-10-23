import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { CallSession, sendCallWebhook, WebhookPayload } from '../services/api';
import { playIncomingCallChime, playSuccessChime } from '../utils/sound';

export type NotificationType =
  | 'incoming_call'
  | 'simulation_progress'
  | 'simulation_complete'
  | 'success'
  | 'warning'
  | 'info'
  | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  call?: CallSession;
  batchStats?: {
    current: number;
    total: number;
    created: number;
    duplicates: number;
    recurring: number;
    errors: number;
    speedMs?: number;
  };
  durationMs?: number; // 0 for persistent until dismissed or completed
  createdAt: number;
}

export interface BatchSimulationOptions {
  count: number;
  delayMs: number;
  recurrenceRate: number; // 0 to 100
  duplicateRate: number; // 0 to 80
  onCallSent?: (call?: CallSession, isDuplicate?: boolean) => void;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt'>) => string;
  updateNotification: (id: string, updates: Partial<AppNotification>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  // Sound
  isSoundMuted: boolean;
  toggleSound: () => void;
  // Global Simulation Controller
  isBatchRunning: boolean;
  batchProgress: {
    current: number;
    total: number;
    created: number;
    duplicates: number;
    recurring: number;
    errors: number;
  };
  startBatchSimulation: (options: BatchSimulationOptions) => Promise<void>;
  stopBatchSimulation: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    return localStorage.getItem('callcenter_sound_muted') === 'true';
  });

  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    created: 0,
    duplicates: 0,
    recurring: 0,
    errors: 0,
  });

  const stopBatchRef = useRef(false);
  const batchNotifIdRef = useRef<string | null>(null);

  const toggleSound = useCallback(() => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      localStorage.setItem('callcenter_sound_muted', String(next));
      return next;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<AppNotification>) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newNotif: AppNotification = {
      ...notif,
      id,
      createdAt: Date.now(),
      durationMs: notif.durationMs ?? (notif.type === 'simulation_progress' ? 0 : 5000),
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 5)]); // Keep maximum 6 notifications

    // Play chime sound if appropriate
    if (notif.type === 'incoming_call') {
      playIncomingCallChime(isSoundMuted);
    } else if (notif.type === 'simulation_complete' || notif.type === 'success') {
      playSuccessChime(isSoundMuted);
    }

    // Auto dismiss if duration is set
    if (newNotif.durationMs && newNotif.durationMs > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotif.durationMs);
    }

    return id;
  }, [isSoundMuted, removeNotification]);

  const stopBatchSimulation = useCallback(() => {
    stopBatchRef.current = true;
    setIsBatchRunning(false);
    if (batchNotifIdRef.current) {
      removeNotification(batchNotifIdRef.current);
      batchNotifIdRef.current = null;
    }
  }, [removeNotification]);

  const startBatchSimulation = useCallback(async (options: BatchSimulationOptions) => {
    if (isBatchRunning) return;

    setIsBatchRunning(true);
    stopBatchRef.current = false;

    const frequentPhones = [
      '+573001234567',
      '+573109876543',
      '+573123456789',
      '+573155556677',
      '+573201112233',
    ];
    const agents = ['agente-01', 'agente-07', 'agente-12', 'agente-18', 'agente-25'];
    const sentCallIds: string[] = [];

    const stats = {
      current: 0,
      total: options.count,
      created: 0,
      duplicates: 0,
      recurring: 0,
      errors: 0,
    };
    setBatchProgress({ ...stats });

    // Create a persistent simulation progress notification banner
    const notifId = addNotification({
      type: 'simulation_progress',
      title: `Simulación en Ráfaga Iniciada (${options.count} llamadas)`,
      message: `Enviando paquetes de webhook con intervalo de ${options.delayMs}ms`,
      durationMs: 0, // Keep until finished
      batchStats: { ...stats, speedMs: options.delayMs },
    });
    batchNotifIdRef.current = notifId;

    const startTime = Date.now();

    for (let i = 0; i < options.count; i++) {
      if (stopBatchRef.current) break;

      const isDuplicate = sentCallIds.length > 0 && Math.random() * 100 < options.duplicateRate;
      const isRecurrent = Math.random() * 100 < options.recurrenceRate;

      let targetCallId: string;
      if (isDuplicate) {
        targetCallId = sentCallIds[Math.floor(Math.random() * sentCallIds.length)];
      } else {
        const randId = Math.floor(10000 + Math.random() * 90000);
        targetCallId = `c-${randId}`;
        sentCallIds.push(targetCallId);
      }

      let phone: string;
      if (isRecurrent) {
        phone = frequentPhones[Math.floor(Math.random() * frequentPhones.length)];
      } else {
        phone = `+573${Math.floor(100000000 + Math.random() * 900000000).toString().substring(0, 9)}`;
      }

      const agent = agents[Math.floor(Math.random() * agents.length)];
      const duration = Math.floor(20 + Math.random() * 280);

      const payload: WebhookPayload = {
        callId: targetCallId,
        phoneNumber: phone,
        agent,
        durationSeconds: duration,
        recordingUrl: `https://grabaciones.ejemplo.com/${targetCallId}.mp3`,
      };

      try {
        const res = await sendCallWebhook(payload);
        if (res.isDuplicate) {
          stats.duplicates += 1;
        } else {
          stats.created += 1;
          if (isRecurrent) stats.recurring += 1;
        }

        // Live trigger UI update with the newly registered call session
        if (options.onCallSent) {
          options.onCallSent(res.data, res.isDuplicate);
        }
      } catch {
        stats.errors += 1;
      }

      stats.current = i + 1;
      setBatchProgress({ ...stats });

      // Live update persistent notification card
      updateNotification(notifId, {
        title: `Simulando Ráfaga: ${stats.current}/${stats.total}`,
        message: `${stats.created} creadas • ${stats.duplicates} idempotentes • ${stats.recurring} recurrentes`,
        batchStats: { ...stats, speedMs: options.delayMs },
      });

      if (options.delayMs > 0 && i < options.count - 1) {
        await new Promise((r) => setTimeout(r, options.delayMs));
      }
    }

    const elapsedSecs = ((Date.now() - startTime) / 1000).toFixed(1);
    setIsBatchRunning(false);

    // Remove ongoing progress notification
    removeNotification(notifId);
    batchNotifIdRef.current = null;

    // Trigger completion celebration toast
    addNotification({
      type: 'simulation_complete',
      title: '¡Ráfaga de Simulación Completada!',
      message: `${stats.created} nuevas llamadas registradas, ${stats.duplicates} duplicadas interceptadas por Redis en ${elapsedSecs}s.`,
      durationMs: 8000,
      batchStats: stats,
    });
  }, [isBatchRunning, addNotification, updateNotification, removeNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        updateNotification,
        removeNotification,
        clearNotifications,
        isSoundMuted,
        toggleSound,
        isBatchRunning,
        batchProgress,
        startBatchSimulation,
        stopBatchSimulation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

