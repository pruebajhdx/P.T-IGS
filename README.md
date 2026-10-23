# Sistema de Gestión de Llamadas Entrantes (Incoming Calls)

[![Laravel 11](https://img.shields.io/badge/Backend-Laravel%2011-red.svg)](https://laravel.com)
[![React 18](https://img.shields.io/badge/Frontend-React%2018-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178c6.svg)](https://www.typescriptlang.org)
[![Redis](https://img.shields.io/badge/Cache%2FLocks-Redis%207-dc382d.svg)](https://redis.io)
[![Nginx](https://img.shields.io/badge/Load%20Balancer-Nginx-009639.svg)](https://nginx.org)
[![Docker Compose](https://img.shields.io/badge/Orchestration-Docker%20Compose-2496ed.svg)](https://www.docker.com)

Sistema de alta concurrencia y tolerancia a fallos para la recepción de webhooks de telefonía, registro idempotente en dos capas (Redis + Base de datos), detección de recurrencia de llamantes y visualización en tiempo real sin recargar la página.

---

## 🏛️ 1. Arquitectura del Sistema

El proyecto está diseñado bajo los principios de **Clean Architecture** (Arquitectura Limpia) y organizado en un **Monorepo**:

```
                                  ┌────────────────────────┐
                                  │   Cliente Web (React)  │
                                  └───────────┬────────────┘
                                              │ HTTP / SSE
                                              ▼
                                  ┌────────────────────────┐
                                  │   Nginx Load Balancer  │
                                  │     (Puerto 8080)      │
                                  └─────┬────────────┬─────┘
                                        │            │
                           (Algoritmo: least_conn)   │
                                        │            │
                         ┌──────────────▼─┐        ┌─▼──────────────┐
                         │   API 1 (PHP)  │        │   API 2 (PHP)  │
                         │   Puerto 8001  │        │   Puerto 8002  │
                         └───────┬────────┘        └────────┬───────┘
                                 │                          │
                                 ├───────────┬──────────────┤
                                 │           │              │
                                 ▼           ▼              ▼
                          ┌────────────┐┌──────────┐ ┌──────────────┐
                          │ PostgreSQL ││  Redis   │ │ Redis Pub/Sub│
                          │ (DB Data)  ││ (Locks/  │ │ (SSE Stream) │
                          │            ││ Idemp.)  │ │              │
                          └────────────┘└──────────┘ └──────────────┘
```

### Separación de Capas (Backend)
1. **Dominio (`apps/api/app/Domain`)**:
   - Modelos puros e independientes de frameworks o persistencia.
   - **Value Objects**: `CallId`, `PhoneNumber` (validación de formato internacional y normalización canónica), `Duration` (invariantes de duración no negativa y formateo `mm:ss`), `RecordingUrl`.
   - **Entidad `Call`**: Encapsula el ciclo de vida, estado de spam (`markAsSpam()`, `unmarkAsSpam()`) y detección de recurrencia.
   - **Repositorios (Contratos)**: `CallRepositoryInterface`.

2. **Aplicación (`apps/api/app/Application`)**:
   - **Casos de Uso**: `RegisterIncomingCallUseCase`, `ToggleSpamCallUseCase`, `ListCallsUseCase`, `GetCallStatsUseCase`.
   - **DTOs**: `IncomingCallDTO`, `CallResponseDTO`, `CallStatsDTO`.

3. **Infraestructura (`apps/api/app/Infrastructure`)**:
   - **Servicio de Idempotencia**: `RedisIdempotencyService` (bloqueo atómico distribuido con `SETNX`/locks y caché de resultado).
   - **Servicio de Streaming en Tiempo Real**: `RedisBroadcastService` (publicación a canales de Redis y buffer de eventos).
   - **Persistencia**: `EloquentCallRepository` implementando `CallRepositoryInterface` sobre PostgreSQL con restricción de unicidad.
   - **Controladores HTTP**: `CallWebhookController`, `CallController`, `CallStreamController`.

---

## 🔒 2. Estrategia de Idempotencia en Dos Capas

Para garantizar que un webhook duplicado no genere registros redundantes ni condiciones de carrera entre réplicas del balanceador:

1. **Capa 1: Bloqueo y Replay Distribuido en Redis**:
   - Al recibir una solicitud, se evalúa si la respuesta previa ya está en caché en `idempotency:call:result:{callId}`. Si existe, se devuelve inmediatamente con código HTTP `200` y el encabezado `X-Idempotent-Replay: true`.
   - Si no existe, se adquiere un candado atómico distribuido (`idempotency:call:lock:{callId}`). Si llegan dos llamadas concurrentes a réplicas distintas (`api-1` y `api-2`), solo una adquiere el candado mientras la otra espera de manera segura el resultado consolidado.
2. **Capa 2: Restricción Única en Base de Datos**:
   - La columna `call_id` cuenta con un índice `UNIQUE` en PostgreSQL, impidiendo duplicados a nivel de almacenamiento incluso ante caídas o reinicios de caché.

---

## 📞 3. Detección de Llamante Previo (Recurrencia)

Cada llamada evalúa el historial previo del número telefónico consultando llamadas registradas con anterioridad:
- Si no existen llamadas anteriores: `hasCalledBefore = false`, `previousCallsCount = 0` (Insignia visual: **Primerizo**).
- Si existen llamadas anteriores: `hasCalledBefore = true`, `previousCallsCount = N` (Insignia visual: **Recurrente (N previas)**).

---

## ⚡ 4. Tiempo Real y Balanceo de Carga

- **Nginx**: Configurado con algoritmo `least_conn` dirigiendo tráfico balanceado a `api-1` y `api-2`. Inyecta el encabezado `X-Served-By` en cada respuesta para auditar el nodo ejecutor.
- **Server-Sent Events (SSE)**: La interfaz web se suscribe a `/api/v1/calls/stream` sin recargar la página. Cada evento publicado vía Redis Pub/Sub es emitido inmediatamente a los clientes activos.

---

## 🚀 5. Instrucciones de Ejecución

### Prerrequisitos
- [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/) instalados.

### Paso a Paso para Levantar el Entorno

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/pruebajhdx/P.T-IGS.git
   cd P.T-IGS
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   ```

3. **Construir y levantar contenedores**:
   ```bash
   docker-compose up -d --build
   ```

4. **Verificar el estado de los servicios**:
   ```bash
   docker-compose ps
   ```

### URLs de Acceso
- **Frontend Web**: [http://localhost:8080/](http://localhost:8080/) (o directamente en [http://localhost:3000/](http://localhost:3000/))
- **API Health Check**: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- **API SSE Stream**: [http://localhost:8080/api/v1/calls/stream](http://localhost:8080/api/v1/calls/stream)

---

## 🧪 6. Pruebas Automatizadas

Se desarrollaron pruebas unitarias y de integración que cubren los requerimientos solicitados:
1. `WebhookIdempotencyTest`: Verifica el registro inicial (201 Created) y que llamadas idénticas subsiguientes sean reconocidas como duplicadas (200 OK con `X-Idempotent-Replay: true`) sin duplicar filas en base de datos.
2. `PriorCallerDetectionTest`: Verifica que llamadas subsiguientes del mismo número marquen correctamente `hasCalledBefore: true` y el contador de llamadas previas.
3. `MarkSpamTest`: Verifica el marcado y desmarcado de una llamada como spam vía `PATCH /api/v1/calls/{id}/spam`.
4. `DomainCallTest`: Pruebas unitarias de las entidades y objetos de valor del dominio (validación de número, duración y reglas de invariantes).

### Ejecución de Pruebas:
```bash
docker-compose exec api-1 php artisan test
```

---

## 🎮 7. Pruebas Manuales y Simulación

### Opción A: Desde la Interfaz Web (Recomendada)
Haz clic en el botón superior derecho **"Simular Webhook"** en el Frontend.
- Permite disparar llamadas nuevas.
- Permite reenviar el mismo `callId` con un clic para ver el aviso de idempotencia en vivo.
- Permite alternar números para probar la detección de llamantes recurrentes.

### Opción B: Mediante Script Automatizado
- En Linux / macOS / Git Bash:
  ```bash
  chmod +x ./scripts/simulate-calls.sh
  ./scripts/simulate-calls.sh
  ```
- En Windows PowerShell:
  ```powershell
  ./scripts/simulate-calls.ps1
  ```

### Opción C: Con cURL directo
```bash
# Registrar una llamada
curl -X POST http://localhost:8080/api/v1/webhooks/calls \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "c-10234",
    "phoneNumber": "+573001234567",
    "agent": "agente-07",
    "durationSeconds": 185,
    "recordingUrl": "https://grabaciones.ejemplo.com/c-10234.mp3"
  }'

# Reenviar el mismo evento para verificar idempotencia
curl -i -X POST http://localhost:8080/api/v1/webhooks/calls \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "c-10234",
    "phoneNumber": "+573001234567",
    "agent": "agente-07",
    "durationSeconds": 185,
    "recordingUrl": "https://grabaciones.ejemplo.com/c-10234.mp3"
  }'
```

---

## 📦 8. Estructura del Repositorio

```
.
├── apps/
│   ├── api/                     # Laravel 11 (Clean Architecture)
│   │   ├── app/
│   │   │   ├── Domain/          # Entidades, Value Objects, Repositorios (Interfaces)
│   │   │   ├── Application/     # Casos de uso y DTOs
│   │   │   └── Infrastructure/  # Eloquent, Redis Idempotency, SSE, Controllers
│   │   ├── tests/               # Pruebas automatizadas (Feature y Unit)
│   │   └── Dockerfile
│   └── frontend/                # React 18, TypeScript, Vite, Tailwind CSS
│       ├── src/
│       │   ├── components/      # UI (Header, Stats, CallList, SimulatorModal)
│       │   └── services/        # Cliente API y SSE Realtime Listener
│       └── Dockerfile
├── packages/
│   └── contracts/               # Tipos TypeScript, interfaces y esquemas JSON compartidos
├── docker/
│   ├── nginx/                   # Configuración del Load Balancer
│   └── php/                     # Configuración PHP
├── scripts/                     # Scripts cURL y PowerShell para pruebas
├── docker-compose.yml           # Orquestación multicontenedor
└── README.md
```
