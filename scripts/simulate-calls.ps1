# ==============================================================================
# Script PowerShell para prueba rápida y ráfagas del Webhook de Llamadas Entrantes
# ==============================================================================
param(
    [switch]$Batch,
    [int]$Count = 10,
    [int]$DelayMs = 250,
    [string]$BaseUrl = "http://localhost:8080/api/v1"
)

function Send-Request {
    param(
        [string]$Uri,
        [string]$Body
    )
    try {
        $res = Invoke-WebRequest -Uri $Uri -Method Post -Body $Body -ContentType "application/json" -UseBasicParsing
        return $res
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $content = $reader.ReadToEnd()
            return [PSCustomObject]@{
                StatusCode = [int]$resp.StatusCode
                Content = $content
                Headers = $resp.Headers
            }
        }
        throw $_
    }
}

if ($Batch) {
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " Modo Ráfaga: Disparando $Count llamadas aleatorias" -ForegroundColor Cyan
    Write-Host " Intervalo: ${DelayMs}ms | Base URL: $BaseUrl" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan

    $frequentPool = @('+573001234567', '+573109876543', '+573123456789')
    $agents = @('agente-01', 'agente-07', 'agente-12', 'agente-25', 'agente-33')
    $generatedCallIds = @()

    $created = 0
    $duplicates = 0

    for ($i = 1; $i -le $Count; $i++) {
        # 20% duplicate probability if we have prior callIds
        $isDuplicate = ($generatedCallIds.Count -gt 0) -and ((Get-Random -Minimum 0 -Maximum 100) -lt 25)
        if ($isDuplicate) {
            $curCallId = $generatedCallIds | Get-Random
        } else {
            $curCallId = "c-$((Get-Random -Minimum 10000 -Maximum 99999))"
            $generatedCallIds += $curCallId
        }

        # 40% recurrence probability
        $isRecurrent = (Get-Random -Minimum 0 -Maximum 100) -lt 40
        $curPhone = if ($isRecurrent) { $frequentPool | Get-Random } else { "+573$((Get-Random -Minimum 100000000 -Maximum 999999999))" }
        $curAgent = $agents | Get-Random
        $curDuration = Get-Random -Minimum 15 -Maximum 300

        $body = @{
            callId = $curCallId
            phoneNumber = $curPhone
            agent = $curAgent
            durationSeconds = $curDuration
            recordingUrl = "https://grabaciones.ejemplo.com/$curCallId.mp3"
        } | ConvertTo-Json

        $res = Send-Request -Uri "$BaseUrl/webhooks/calls" -Body $body
        $isDupHeader = if ($res.Headers -is [System.Collections.IDictionary]) { $res.Headers['X-Idempotent-Replay'] } else { $res.Headers.Get('X-Idempotent-Replay') }

        if ($res.StatusCode -eq 200 -or $isDupHeader -eq 'true') {
            $duplicates++
            Write-Host "[$i/$Count] IDEMPOTENTE (200 OK) -> $curCallId (Replay)" -ForegroundColor Yellow
        } else {
            $created++
            Write-Host "[$i/$Count] CREADA (201 Created) -> $curCallId | $curPhone | $curAgent" -ForegroundColor Green
        }

        if ($DelayMs -gt 0 -and $i -lt $Count) {
            Start-Sleep -Milliseconds $DelayMs
        }
    }

    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host " Resumen de Ráfaga: $created Nuevas, $duplicates Idempotentes Duplicadas" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
    exit 0
}

# Standard test mode
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " 1. Enviando Primera Llamada (Nueva)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$body1 = @{
    callId = "c-10234"
    phoneNumber = "+573001234567"
    agent = "agente-07"
    durationSeconds = 185
    recordingUrl = "https://grabaciones.ejemplo.com/c-10234.mp3"
} | ConvertTo-Json

$res1 = Send-Request -Uri "$BaseUrl/webhooks/calls" -Body $body1
Write-Host "Status Code: $($res1.StatusCode)" -ForegroundColor Green
Write-Host "Response Body: $($res1.Content)"

Write-Host "`n==================================================" -ForegroundColor Yellow
Write-Host " 2. Enviando LLAMADA DUPLICADA (Prueba de Idempotencia)" -ForegroundColor Yellow
Write-Host " Debe retornar HTTP 200 con encabezado X-Idempotent-Replay: true" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow

$res2 = Send-Request -Uri "$BaseUrl/webhooks/calls" -Body $body1
Write-Host "Status Code: $($res2.StatusCode)" -ForegroundColor Yellow
Write-Host "Response Body: $($res2.Content)"
$replayHeader = if ($res2.Headers -is [System.Collections.IDictionary]) { $res2.Headers['X-Idempotent-Replay'] } else { $res2.Headers.Get('X-Idempotent-Replay') }
Write-Host "X-Idempotent-Replay: $replayHeader" -ForegroundColor Magenta

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host " 3. Enviando Segunda Llamada del Mismo Número (Prueba de Recurrencia)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$body2 = @{
    callId = "c-10235"
    phoneNumber = "+573001234567"
    agent = "agente-02"
    durationSeconds = 90
    recordingUrl = "https://grabaciones.ejemplo.com/c-10235.mp3"
} | ConvertTo-Json

$res3 = Send-Request -Uri "$BaseUrl/webhooks/calls" -Body $body2
Write-Host "Status Code: $($res3.StatusCode)" -ForegroundColor Green
Write-Host "Response Body: $($res3.Content)"

Write-Host "`nPruebas finalizadas." -ForegroundColor Green
