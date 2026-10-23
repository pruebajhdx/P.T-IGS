import React, { useState } from 'react';
import {
  X,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { sendCallWebhook, WebhookPayload, CallSession } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

interface SimulateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallSent: (call?: CallSession, isDuplicate?: boolean) => void;
}

export const SimulateCallModal: React.FC<SimulateCallModalProps> = ({
  isOpen,
  onClose,
  onCallSent,
}) => {
  const {
    isBatchRunning,
    batchProgress,
    startBatchSimulation,
    stopBatchSimulation,
    addNotification,
  } = useNotifications();

  // Tabs: 'single' | 'batch'
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('batch');

  // Single mode state
  const [callId, setCallId] = useState(`c-${Math.floor(10000 + Math.random() * 90000)}`);
  const [phoneNumber, setPhoneNumber] = useState('+573001234567');
  const [agent, setAgent] = useState('agente-07');
  const [durationSeconds, setDurationSeconds] = useState(185);
  const [recordingUrl, setRecordingUrl] = useState('https://grabaciones.ejemplo.com/c-10234.mp3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    isDuplicate: boolean;
    servedBy?: string;
    message?: string;
  } | null>(null);

  // Batch mode state
  const [batchCount, setBatchCount] = useState(10);
  const [batchDelayMs, setBatchDelayMs] = useState(300);
  const [recurrenceRate, setRecurrenceRate] = useState(40); // 40% recurrent
  const [duplicateRate, setDuplicateRate] = useState(20); // 20% duplicate

  if (!isOpen) return null;

  const handleRandomize = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setCallId(`c-${randomNum}`);
    setRecordingUrl(`https://grabaciones.ejemplo.com/c-${randomNum}.mp3`);
    setDurationSeconds(Math.floor(20 + Math.random() * 300));
    const randomAgents = ['agente-01', 'agente-07', 'agente-12', 'agente-25', 'agente-33'];
    setAgent(randomAgents[Math.floor(Math.random() * randomAgents.length)]);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLastResult(null);

    const payload: WebhookPayload = {
      callId,
      phoneNumber,
      agent,
      durationSeconds: Number(durationSeconds),
      recordingUrl,
    };

    try {
      const res = await sendCallWebhook(payload);
      setLastResult({
        success: true,
        isDuplicate: res.isDuplicate,
        servedBy: res.servedBy,
      });

      if (res.isDuplicate) {
        addNotification({
          type: 'warning',
          title: 'Idempotencia: Evento Duplicado',
          message: `El callId "${callId}" ya existía en Redis. Se respondió 200 OK Replay.`,
          durationMs: 4000,
        });
      } else {
        addNotification({
          type: 'incoming_call',
          title: 'Nueva Llamada Webhook Registrada',
          call: res.data,
          durationMs: 6000,
        });
      }

      onCallSent(res.data, res.isDuplicate);
    } catch (err: any) {
      setLastResult({
        success: false,
        isDuplicate: false,
        message: err.message || 'Error al enviar webhook',
      });
      addNotification({
        type: 'error',
        title: 'Error de Envío',
        message: err.message || 'No se pudo conectar con el endpoint de webhook.',
        durationMs: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartBatch = () => {
    startBatchSimulation({
      count: batchCount,
      delayMs: batchDelayMs,
      recurrenceRate,
      duplicateRate,
      onCallSent,
    });
  };

  const percent = batchProgress.total > 0
    ? Math.round((batchProgress.current / batchProgress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-950/40">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Simulador de Webhooks Telefónicos</span>
              {isBatchRunning && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse">
                  Ráfaga Activa
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera eventos HTTP al endpoint <span className="font-mono text-sky-300 font-semibold">POST /api/v1/webhooks/calls</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1 bg-slate-950 rounded-2xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'batch'
                ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Simulación en Ráfaga (Lotes)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'single'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Llamada Individual</span>
          </button>
        </div>

        {/* ===================== TAB 1: BATCH MODE ===================== */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Configuración de Tráfico en Ráfaga</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Total a simular: <strong className="text-white font-mono">{batchCount}</strong>
                </span>
              </div>

              {/* Quantity Preset Buttons & Custom Input */}
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-2">
                  Cantidad de Llamadas:
                </label>
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={isBatchRunning}
                      onClick={() => setBatchCount(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                        batchCount === num
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm shadow-indigo-600/30'
                          : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="300"
                    disabled={isBatchRunning}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-slate-900 border border-slate-700/80 rounded-xl px-2 text-center text-xs text-white font-mono font-bold focus:border-indigo-500"
                    placeholder="Custom"
                  />
                </div>
              </div>

              {/* Sliders for Delays, Recurrence and Duplicates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Intervalo:</span>
                    <strong className="font-mono text-sky-400">{batchDelayMs}ms</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="100"
                    disabled={isBatchRunning}
                    value={batchDelayMs}
                    onChange={(e) => setBatchDelayMs(Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>% Recurrencia:</span>
                    <strong className="font-mono text-indigo-400">{recurrenceRate}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    disabled={isBatchRunning}
                    value={recurrenceRate}
                    onChange={(e) => setRecurrenceRate(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>% Duplicados:</span>
                    <strong className="font-mono text-amber-400">{duplicateRate}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="10"
                    disabled={isBatchRunning}
                    value={duplicateRate}
                    onChange={(e) => setDuplicateRate(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Progress Bar & Counters */}
            <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-2">
                  <span>Progreso de la Ráfaga:</span>
                  {isBatchRunning && (
                    <span className="text-[10px] text-sky-400 animate-pulse">
                      ● Transmitiendo en tiempo real...
                    </span>
                  )}
                </span>
                <span className="font-mono text-white font-bold">
                  {batchProgress.current} / {batchProgress.total || batchCount} ({percent}%)
                </span>
              </div>

              {/* Progress bar line */}
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-200"
                  style={{
                    width: `${percent}%`,
                  }}
                />
              </div>

              {/* Live Metric Counters */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-center">
                  <div className="text-lg font-bold text-emerald-400 font-mono">{batchProgress.created}</div>
                  <div className="text-[10px] text-emerald-300 font-medium">Nuevas (201)</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/50 text-center">
                  <div className="text-lg font-bold text-amber-400 font-mono">{batchProgress.duplicates}</div>
                  <div className="text-[10px] text-amber-300 font-medium">Idempotentes (200)</div>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/50 text-center">
                  <div className="text-lg font-bold text-indigo-400 font-mono">{batchProgress.recurring}</div>
                  <div className="text-[10px] text-indigo-300 font-medium">Recurrentes</div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50 text-center">
                  <div className="text-lg font-bold text-rose-400 font-mono">{batchProgress.errors}</div>
                  <div className="text-[10px] text-rose-300 font-medium">Errores</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Puedes cerrar esta ventana; la simulación seguirá en segundo plano.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cerrar
                </button>

                {isBatchRunning ? (
                  <button
                    type="button"
                    onClick={stopBatchSimulation}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Detener Ráfaga</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartBatch}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/40 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Iniciar Ráfaga de {batchCount} Llamadas</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: SINGLE MODE ===================== */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ID de Llamada (callId) - <span className="text-slate-400">Reenvía el mismo para validar idempotencia</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={callId}
                  onChange={(e) => setCallId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleRandomize}
                  title="Generar nuevo callId aleatorio"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition"
                >
                  Nuevo ID
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Número Telefónico (phoneNumber)
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="+573001234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Agente (agent)
                </label>
                <input
                  type="text"
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  required
                  placeholder="agente-07"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Duración en Segundos
                </label>
                <input
                  type="number"
                  min="0"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Acceso rápido a números
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPhoneNumber('+573001234567')}
                    className="px-2.5 py-1.5 bg-slate-800 text-[11px] font-semibold text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700"
                  >
                    Frecuente (+57300...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneNumber(`+57310${Math.floor(1000000 + Math.random() * 9000000)}`)}
                    className="px-2.5 py-1.5 bg-slate-800 text-[11px] font-semibold text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700"
                  >
                    Nuevo (+57310...)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                URL de Grabación
              </label>
              <input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            {/* Feedback alert */}
            {lastResult && (
              <div
                className={`p-3.5 rounded-xl text-xs border ${
                  lastResult.isDuplicate
                    ? 'bg-amber-950/50 border-amber-800 text-amber-200'
                    : lastResult.success
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {lastResult.isDuplicate ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>¡IDEMPOTENCIA ACTIVADA! Evento Duplicado Detectado</span>
                    </>
                  ) : lastResult.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Llamada registrada exitosamente (201 Created)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Error al procesar: {lastResult.message}</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[11px] opacity-90">
                  {lastResult.isDuplicate
                    ? `El callId "${callId}" ya existía en Redis y la BD. Se respondió 200 OK Replay sin duplicar registros.`
                    : `Se procesó la llamada por el nodo ${lastResult.servedBy || 'Nginx'}.`}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-lg shadow-sky-900/40 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Enviando...' : 'Disparar Webhook'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
