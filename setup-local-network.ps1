# Script de configuración para red local
# Ejecutar como Administrador

Write-Host "🎮 Configurando Impostor Game para red local..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar puerto 3000
Write-Host "📡 Verificando puerto 3000..." -ForegroundColor Yellow
$portCheck = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($portCheck) {
    Write-Host "✅ El servidor ya está escuchando en el puerto 3000" -ForegroundColor Green
} else {
    Write-Host "⚠️  El servidor NO está corriendo. Inicia el servidor primero:" -ForegroundColor Red
    Write-Host "   cd server" -ForegroundColor Gray
    Write-Host "   node server.js" -ForegroundColor Gray
}

Write-Host ""

# 2. Configurar firewall
Write-Host "🔥 Configurando firewall..." -ForegroundColor Yellow
$existingRule = Get-NetFirewallRule -DisplayName "Impostor Game Server" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "✅ Regla de firewall ya existe" -ForegroundColor Green
} else {
    try {
        New-NetFirewallRule -DisplayName "Impostor Game Server" `
                           -Direction Inbound `
                           -LocalPort 3000 `
                           -Protocol TCP `
                           -Action Allow `
                           -Profile Any `
                           -ErrorAction Stop | Out-Null
        Write-Host "✅ Regla de firewall creada correctamente" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error al crear regla de firewall. Ejecuta PowerShell como Administrador." -ForegroundColor Red
        Write-Host "   Click derecho en PowerShell -> Ejecutar como Administrador" -ForegroundColor Gray
    }
}

Write-Host ""

# 3. Mostrar IP local
Write-Host "🌐 Tu dirección IP local:" -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"}).IPAddress
Write-Host "   $ipAddress" -ForegroundColor Cyan
Write-Host ""

# 4. Instrucciones
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Asegúrate de que el servidor esté corriendo:" -ForegroundColor White
Write-Host "      cd server" -ForegroundColor Gray
Write-Host "      node server.js" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Inicia el cliente con acceso de red:" -ForegroundColor White
Write-Host "      cd client" -ForegroundColor Gray
Write-Host "      npm run dev -- --host" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Desde OTRO dispositivo, abre el navegador y ve a:" -ForegroundColor White
Write-Host "      http://${ipAddress}:5173" -ForegroundColor Cyan
Write-Host ""

Write-Host "✨ ¡Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Lee LOCAL-NETWORK.md para más detalles" -ForegroundColor Gray
