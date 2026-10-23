# ==============================================================================
# Script PowerShell para prueba rápida del Webhook de Llamadas Entrantes e Idempotencia
# ==============================================================================

$BaseUrl = "http://localhost:8080/api/v1"

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
Write-Host "Headers: $($res1.Headers | Out-String)"

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

