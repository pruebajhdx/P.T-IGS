import React, { useState } from 'react';
import { X, Send, Play, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleRandomize = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setCallId(`c-${randomNum}`);
    setRecordingUrl(`https://grabaciones.ejemplo.com/c-${randomNum}.mp3`);
    setDurationSeconds(Math.floor(20 + Math.random() * 300));
    const randomAgents = ['agente-01', 'agente-07', 'agente-12', 'agente-25', 'agente-33'];
    setAgent(randomAgents[Math.floor(Math.random() * randomAgents.length)]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Simulador de Webhook Telefónico</h2>
            <p className="text-xs text-slate-400">
              Envía un evento simulado al endpoint <span className="font-mono text-sky-300">POST /api/v1/webhooks/calls</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              ID de Llamada (callId) - <span className="text-slate-400">Prueba reenviar el mismo para validar idempotencia</span>
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
                Duración en Segundos (durationSeconds)
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
                  Frecuente
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
              URL de Grabación (recordingUrl)
            </label>
            <input
              type="url"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Feedback response alert */}
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
                  ? `El evento con callId "${callId}" ya existía en Redis y la BD. Se respondió sin duplicar registros.`
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
      </div>
    </div>
  );
};
