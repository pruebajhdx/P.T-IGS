#!/usr/bin/env bash
# ==============================================================================
# Script de prueba rápida para el Webhook de Llamadas Entrantes e Idempotencia
# ==============================================================================

BASE_URL="http://localhost:8080/api/v1"

echo "=================================================="
echo " 1. Enviando Primera Llamada (Nueva)"
echo "=================================================="
curl -i -X POST "$BASE_URL/webhooks/calls" \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "c-10234",
    "phoneNumber": "+573001234567",
    "agent": "agente-07",
    "durationSeconds": 185,
    "recordingUrl": "https://grabaciones.ejemplo.com/c-10234.mp3"
  }'

echo -e "\n\n=================================================="
echo " 2. Enviando LLAMADA DUPLICADA (Prueba de Idempotencia)"
echo " Debe retornar HTTP 200 con encabezado X-Idempotent-Replay: true"
echo "=================================================="
curl -i -X POST "$BASE_URL/webhooks/calls" \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "c-10234",
    "phoneNumber": "+573001234567",
    "agent": "agente-07",
    "durationSeconds": 185,
    "recordingUrl": "https://grabaciones.ejemplo.com/c-10234.mp3"
  }'

echo -e "\n\n=================================================="
echo " 3. Enviando Segunda Llamada del Mismo Número (Prueba de Recurrencia)"
echo " Debe detectar hasCalledBefore: true y previousCallsCount: 1"
echo "=================================================="
curl -i -X POST "$BASE_URL/webhooks/calls" \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "c-10235",
    "phoneNumber": "+573001234567",
    "agent": "agente-02",
    "durationSeconds": 90,
    "recordingUrl": "https://grabaciones.ejemplo.com/c-10235.mp3"
  }'

echo -e "\n\n=================================================="
echo " 4. Consultando Métricas Globales"
echo "=================================================="
curl -s "$BASE_URL/calls/stats" | json_pp || curl -s "$BASE_URL/calls/stats"

echo -e "\n\nPruebas finalizadas con éxito."
