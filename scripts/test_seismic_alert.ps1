# ==============================================================================
# ALERA - Script de Simulacro de Alerta Sismica en Vivo
# Despacha un evento de prueba M 6.2 hacia los dispositivos registrados en la app
# ==============================================================================

Write-Host ">>> Iniciando simulacro de alerta sismica en ALERA..." -ForegroundColor Cyan

$backendUrl = "http://localhost:8085/api/v1/seismic-events/test-alert"

try {
    Write-Host ">> Conectando con backend en $backendUrl..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $backendUrl -Method Post -TimeoutSec 10 -Headers @{
        "Accept" = "application/json"
    }

    if ($response -and $response.success) {
        $data = $response.data
        Write-Host "`n[OK] SIMULACRO DESPACHADO CON EXITO!" -ForegroundColor Green
        Write-Host "     Estado: $($data.status)" -ForegroundColor White
        Write-Host "     Dispositivos detectados: $($data.devicesFound)" -ForegroundColor White
        Write-Host "     Notificaciones enviadas: $($data.notificationsSent)" -ForegroundColor White
        Write-Host "     Mensaje: $($data.message)" -ForegroundColor Gray
        Write-Host "`n>>> Revisa ahora la pantalla de tu celular:" -ForegroundColor Cyan
        Write-Host "    - Debe sonar la sirena sismica oficial en bucle durante 5 segundos." -ForegroundColor White
        Write-Host "    - Debe aparecer el banner de ALERA con 'ALERTA SISMICA ALERA - M 6.2'." -ForegroundColor White
        Write-Host "    - La vibracion haptica continua debe estar activa." -ForegroundColor White
    } else {
        Write-Host "[ALERTA] Respuesta inesperada del backend: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n[ERROR] No fue posible conectar con el backend de ALERA (puerto 8085)." -ForegroundColor Red
    Write-Host "        Detalle: $($_.Exception.Message)" -ForegroundColor DarkRed
    Write-Host "`nPor favor verifica que el backend de Spring Boot este en ejecucion:" -ForegroundColor Yellow
    Write-Host "  Set-Location 'C:\Users\LENOVO\OneDrive\Escritorio\Alera\backend'; .\mvnw.cmd spring-boot:run" -ForegroundColor White
}
