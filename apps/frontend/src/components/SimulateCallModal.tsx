import React, { useState, useRef } from 'react';
import {
  X,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Sliders,
} from 'lucide-react';
import { sendCallWebhook, WebhookPayload } from '../services/api';

interface SimulateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallSent: () => void;
}

export const SimulateCallModal: React.FC<SimulateCallModalProps> = ({
  isOpen,
  onClose,
  onCallSent,
}) => {
  // Tabs: 'single' | 'batch'
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

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
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    created: number;
    duplicates: number;
    recurring: number;
    errors: number;
  }>({ current: 0, total: 0, created: 0, duplicates: 0, recurring: 0, errors: 0 });

  const stopBatchRef = useRef(false);

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
      onCallSent();
    } catch (err: any) {
      setLastResult({
        success: false,
        isDuplicate: false,
        message: err.message || 'Error al enviar webhook',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartBatch = async () => {
    setIsBatchRunning(true);
    stopBatchRef.current = false;

    setBatchProgress({
      current: 0,
      total: batchCount,
      created: 0,
      duplicates: 0,
      recurring: 0,
      errors: 0,
    });

    const frequentPhones = [
      '+573001234567',
      '+573109876543',
      '+573123456789',
      '+573155556677',
      '+573201112233',
    ];

    const agentsList = ['agente-01', 'agente-07', 'agente-12', 'agente-18', 'agente-25', 'agente-33'];
    const generatedCallIds: string[] = [];

    let createdCount = 0;
    let duplicateCount = 0;
    let recurringCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batchCount; i++) {
      if (stopBatchRef.current) break;

      // 1. Determine if this call should be an intentional duplicate
      let curCallId: string;
      const shouldDuplicate = generatedCallIds.length > 0 && Math.random() * 100 < duplicateRate;

      if (shouldDuplicate) {
        curCallId = generatedCallIds[Math.floor(Math.random() * generatedCallIds.length)];
      } else {
        curCallId = `c-${Math.floor(10000 + Math.random() * 90000)}`;
        generatedCallIds.push(curCallId);
      }

      // 2. Determine phone number (recurrent from pool or completely fresh)
      const isRecurrent = Math.random() * 100 < recurrenceRate;
      const curPhone = isRecurrent
        ? frequentPhones[Math.floor(Math.random() * frequentPhones.length)]
        : `+573${Math.floor(100000000 + Math.random() * 900000000)}`;

      const curAgent = agentsList[Math.floor(Math.random() * agentsList.length)];
      const curDuration = Math.floor(20 + Math.random() * 320);

      const payload: WebhookPayload = {
        callId: curCallId,
        phoneNumber: curPhone,
        agent: curAgent,
        durationSeconds: curDuration,
        recordingUrl: `https://grabaciones.ejemplo.com/${curCallId}.mp3`,
      };

      try {
        const res = await sendCallWebhook(payload);
        if (res.isDuplicate) {
          duplicateCount++;
        } else {
          createdCount++;
          if (res.data?.hasCalledBefore) {
            recurringCount++;
          }
        }
      } catch {
        errorCount++;
      }

      setBatchProgress({
        current: i + 1,
        total: batchCount,
        created: createdCount,
        duplicates: duplicateCount,
        recurring: recurringCount,
        errors: errorCount,
      });

      // Refresh list periodically during batch
      if ((i + 1) % 3 === 0 || i === batchCount - 1) {
        onCallSent();
      }

      // Delay between calls
      if (batchDelayMs > 0 && i < batchCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
      }
    }

    setIsBatchRunning(false);
    onCallSent();
  };

  const handleStopBatch = () => {
    stopBatchRef.current = true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Simulador de Webhooks Telefónicos</h2>
            <p className="text-xs text-slate-400">
              Genera eventos HTTP al endpoint <span className="font-mono text-sky-300">POST /api/v1/webhooks/calls</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'single'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Llamada Individual</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'batch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulación en Ráfaga (Lote Aleatorio)</span>
          </button>
        </div>

        {/* ===================== TAB 1: SINGLE MODE ===================== */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ID de Llamada (callId) - <span className="text-slate-400">Reenvía el mismo para validar idempotencia</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={callId}
                  onChange={(e) => setCallId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleRandomize}
                  title="Generar nuevo callId aleatorio"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg border border-slate-700 transition"
                >
                  Nuevo ID
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número Telefónico (phoneNumber)
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="+573001234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Agente (agent)
                </label>
                <input
                  type="text"
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  required
                  placeholder="agente-07"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Duración en Segundos
                </label>
                <input
                  type="number"
                  min="0"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Acceso rápido a números
                </label>
                <div className="flex gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setPhoneNumber('+573001234567')}
                    className="px-2 py-1 bg-slate-800 text-[11px] text-slate-300 rounded hover:bg-slate-700"
                  >
                    Frecuente (+57300...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneNumber(`+57310${Math.floor(1000000 + Math.random() * 9000000)}`)}
                    className="px-2 py-1 bg-slate-800 text-[11px] text-slate-300 rounded hover:bg-slate-700"
                  >
                    Nuevo
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL de Grabación
              </label>
              <input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            {/* Feedback alert */}
            {lastResult && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  lastResult.isDuplicate
                    ? 'bg-amber-950/50 border-amber-800 text-amber-200'
                    : lastResult.success
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
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
                    ? `El callId "${callId}" ya existía en Redis y la BD. Se respondió sin duplicar registros.`
                    : `Se procesó la llamada por el nodo ${lastResult.servedBy || 'Nginx'}.`}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium text-xs shadow-md shadow-sky-600/20 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Enviando...' : 'Disparar Webhook'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ===================== TAB 2: BATCH MODE ===================== */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Parámetros de la Ráfaga de Tráfico</span>
              </div>

              {/* Quantity Preset Buttons & Custom Input */}
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                  Cantidad de Llamadas a Simular: <strong className="text-white font-mono">{batchCount}</strong>
                </label>
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={isBatchRunning}
                      onClick={() => setBatchCount(num)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        batchCount === num
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="200"
                    disabled={isBatchRunning}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 text-center text-xs text-white font-mono focus:border-indigo-500"
                    placeholder="Custom"
                  />
                </div>
              </div>

              {/* Sliders for Delays, Recurrence and Duplicates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
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
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
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
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
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
            <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Progreso de la Ráfaga:</span>
                <span className="font-mono text-white">
                  {batchProgress.current} / {batchProgress.total || batchCount}
                </span>
              </div>

              {/* Progress bar line */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-200"
                  style={{
                    width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Live Metric Counters */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-center">
                  <div className="text-base font-bold text-emerald-400 font-mono">{batchProgress.created}</div>
                  <div className="text-[10px] text-emerald-300">Nuevas (201)</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-900/50 text-center">
                  <div className="text-base font-bold text-amber-400 font-mono">{batchProgress.duplicates}</div>
                  <div className="text-[10px] text-amber-300">Idempotentes (200)</div>
                </div>
                <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-900/50 text-center">
                  <div className="text-base font-bold text-indigo-400 font-mono">{batchProgress.recurring}</div>
                  <div className="text-[10px] text-indigo-300">Recurrentes</div>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/50 text-center">
                  <div className="text-base font-bold text-rose-400 font-mono">{batchProgress.errors}</div>
                  <div className="text-[10px] text-rose-300">Errores</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isBatchRunning}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cerrar
              </button>

              {isBatchRunning ? (
                <button
                  type="button"
                  onClick={handleStopBatch}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Detener Ráfaga</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartBatch}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Iniciar Ráfaga de {batchCount} Llamadas</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
